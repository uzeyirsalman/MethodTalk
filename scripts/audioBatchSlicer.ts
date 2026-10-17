/**
 * MethodTalk v2: Character+Language Batch Audio Slicer, Waveform Analyzer & Alignment Verifier
 *
 * Joins all dialogue lines for a single Character + Language in a scene using
 * Gemini 3.8 Flash TTS's native `<long pause>` inline tags, slices the returned
 * 24kHz 16-bit mono WAV buffer along silence valleys, generates a normalized
 * waveform envelope with exact cut timestamps for visual inspection, and verifies
 * that every sliced audio clip lines up with its target script line.
 */

import { DialogueLine, LanguageCode } from '../src/types/scene';

export const BATCH_PAUSE_DELIMITER = ' <long pause> <long pause> ';

export interface SliceOptions {
  padMs?: number;
  minValleyMs?: number;
  customSplitSeconds?: number[];
}

export interface SlicedLineResult {
  lineId: string;
  order: number;
  characterId: string;
  spokenText: string;
  wavBuffer: Buffer;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  wordCount: number;
  charCount: number;
  charsPerSec: number;
  silenceGapAfterMs: number | null;
  peakRms: number;
  isAligned: boolean;
  alignmentNote: string;
}

export interface BatchSliceVerificationResult {
  success: boolean;
  expectedLineCount: number;
  detectedSegmentCount: number;
  totalDurationSec: number;
  sampleRate: number;
  splitTimestampsSec: number[];
  waveformPeaks: number[];
  slices: SlicedLineResult[];
  errors: string[];
}

/**
 * Builds the pure transcript payload for a single Character + Language batch.
 * Strictly contains only the character's verbatim lines separated by `<long pause>`.
 */
export function buildCharacterBatchText(
  lines: DialogueLine[],
  lang: LanguageCode
): string {
  return lines
    .map((l) => l.spokenText[lang].trim())
    .join(BATCH_PAUSE_DELIMITER);
}

/**
 * Wraps raw 16-bit signed little-endian mono PCM bytes in a 44-byte RIFF WAV header.
 */
export function wrapPcmInWavHeader(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  if (pcmBuffer.length > 44 && pcmBuffer.toString('ascii', 0, 4) === 'RIFF') {
    return pcmBuffer;
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Extracts raw 16-bit mono PCM bytes and sample rate from a WAV or raw PCM buffer.
 */
export function extractPcmFromWav(buffer: Buffer): {
  pcmBuffer: Buffer;
  sampleRate: number;
} {
  if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const sampleRate = buffer.readUInt32LE(24) || 24000;
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        const start = offset + 8;
        const end = Math.min(buffer.length, start + chunkSize);
        return { pcmBuffer: buffer.subarray(start, end), sampleRate };
      }
      offset += 8 + chunkSize;
    }
    return { pcmBuffer: buffer.subarray(44), sampleRate };
  }
  return { pcmBuffer: buffer, sampleRate: 24000 };
}

/**
 * Computes a compact 180-bin normalized waveform envelope (0.0 to 1.0)
 * for rendering on the Audio Studio Dashboard canvas.
 */
export function computeWaveformEnvelope(pcmBuffer: Buffer, bins = 180): number[] {
  const totalSamples = Math.floor(pcmBuffer.length / 2);
  if (totalSamples === 0) return new Array(bins).fill(0);

  const samplesPerBin = Math.max(1, Math.floor(totalSamples / bins));
  const rawRms: number[] = [];
  let maxRms = 1;

  for (let b = 0; b < bins; b++) {
    const startSample = b * samplesPerBin;
    const endSample = Math.min(totalSamples, startSample + samplesPerBin);
    if (startSample >= endSample) {
      rawRms.push(0);
      continue;
    }
    let sumSq = 0;
    for (let s = startSample; s < endSample; s++) {
      const val = pcmBuffer.readInt16LE(s * 2);
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / (endSample - startSample));
    if (rms > maxRms) maxRms = rms;
    rawRms.push(rms);
  }

  return rawRms.map((v) => Number((v / maxRms).toFixed(3)));
}

/**
 * Normalizes a 16-bit mono WAV buffer to a target RMS amplitude (default 3800)
 * with soft clipping protection so all lines in a scene play at matched volume.
 */
export function normalizeWavBufferRms(wavBuffer: Buffer, targetRms = 3800): Buffer {
  const { pcmBuffer, sampleRate } = extractPcmFromWav(wavBuffer);
  const totalSamples = Math.floor(pcmBuffer.length / 2);
  if (totalSamples === 0) return wavBuffer;

  // Measure active speech RMS (ignoring silent frames)
  let sumSq = 0;
  let activeCount = 0;
  for (let i = 0; i < totalSamples; i++) {
    const s = pcmBuffer.readInt16LE(i * 2);
    if (Math.abs(s) > 250) {
      sumSq += s * s;
      activeCount++;
    }
  }

  if (activeCount < 100) return wavBuffer;
  const currentRms = Math.sqrt(sumSq / activeCount);
  if (currentRms < 50) return wavBuffer;

  // Clamp gain between 0.4x and 3.0x
  const gain = Math.max(0.4, Math.min(3.0, targetRms / currentRms));
  const outPcm = Buffer.alloc(pcmBuffer.length);

  for (let i = 0; i < totalSamples; i++) {
    const s = pcmBuffer.readInt16LE(i * 2);
    const scaled = Math.max(-32000, Math.min(32000, Math.round(s * gain)));
    outPcm.writeInt16LE(scaled, i * 2);
  }

  return wrapPcmInWavHeader(outPcm, sampleRate);
}

interface SilenceValley {
  startFrame: number;
  endFrame: number;
  centerFrame: number;
  durationMs: number;
  meanRms: number;
}

/**
 * Slices a batched character WAV buffer into N individual dialogue line WAV buffers
 * and verifies that the parts line up with the script lines in count, silence boundaries,
 * and duration proportionality.
 */
export function sliceWavBufferIntoLines(
  wavOrPcmBuffer: Buffer,
  expectedLines: DialogueLine[],
  lang: LanguageCode,
  options: SliceOptions = {}
): BatchSliceVerificationResult {
  const { pcmBuffer, sampleRate } = extractPcmFromWav(wavOrPcmBuffer);
  const expectedCount = expectedLines.length;
  const errors: string[] = [];

  const totalSamples = Math.floor(pcmBuffer.length / 2);
  const totalDurationSec = Number((totalSamples / sampleRate).toFixed(2));
  const waveformPeaks = computeWaveformEnvelope(pcmBuffer, 180);

  if (expectedCount === 0) {
    return {
      success: false,
      expectedLineCount: 0,
      detectedSegmentCount: 0,
      totalDurationSec,
      sampleRate,
      splitTimestampsSec: [],
      waveformPeaks,
      slices: [],
      errors: ['No expected lines provided to slicer.'],
    };
  }

  // Single-line shortcut (1 line in batch)
  if (expectedCount === 1) {
    const line = expectedLines[0];
    const text = line.spokenText[lang].trim();
    const words = line.targetWords[lang].length || text.split(/\s+/).length;
    const chars = text.length;
    const charsPerSec =
      totalDurationSec > 0 ? Number((chars / totalDurationSec).toFixed(1)) : 0;
    const isAligned = totalDurationSec >= 0.35;
    if (!isAligned) {
      errors.push(
        `Line ${line.lineId} audio duration (${totalDurationSec}s) is too short.`
      );
    }
    return {
      success: isAligned,
      expectedLineCount: 1,
      detectedSegmentCount: isAligned ? 1 : 0,
      totalDurationSec,
      sampleRate,
      splitTimestampsSec: [],
      waveformPeaks,
      slices: [
        {
          lineId: line.lineId,
          order: line.order,
          characterId: line.characterId,
          spokenText: text,
          wavBuffer: wrapPcmInWavHeader(pcmBuffer, sampleRate),
          startTimeSec: 0,
          endTimeSec: totalDurationSec,
          durationSec: totalDurationSec,
          wordCount: words,
          charCount: chars,
          charsPerSec,
          silenceGapAfterMs: null,
          peakRms: 1500,
          isAligned,
          alignmentNote: isAligned
            ? 'Verified (single-line batch)'
            : 'Audio too short',
        },
      ],
      errors,
    };
  }

  // 1. Compute RMS energy across 20ms frames (e.g. 480 samples at 24kHz)
  const frameDurationMs = 20;
  const samplesPerFrame = Math.floor((sampleRate * frameDurationMs) / 1000);
  const numFrames = Math.floor(totalSamples / samplesPerFrame);

  if (numFrames < expectedCount * 10) {
    return {
      success: false,
      expectedLineCount: expectedCount,
      detectedSegmentCount: 0,
      totalDurationSec,
      sampleRate,
      splitTimestampsSec: [],
      waveformPeaks,
      slices: [],
      errors: [
        `Batch audio too short (${totalDurationSec}s) for ${expectedCount} dialogue lines.`,
      ],
    };
  }

  const frameRms: number[] = new Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let sumSq = 0;
    const baseSample = f * samplesPerFrame;
    for (let i = 0; i < samplesPerFrame; i++) {
      const sample = pcmBuffer.readInt16LE((baseSample + i) * 2);
      sumSq += sample * sample;
    }
    frameRms[f] = Math.sqrt(sumSq / samplesPerFrame);
  }

  // 2. Determine adaptive silence threshold from frame RMS distribution
  const sortedRms = [...frameRms].sort((a, b) => a - b);
  const p20 = sortedRms[Math.floor(numFrames * 0.2)] || 0;
  const p85 = sortedRms[Math.floor(numFrames * 0.85)] || 2000;
  const silenceThreshold = Math.max(120, Math.min(600, p20 + (p85 - p20) * 0.08));

  // Trim overall leading & trailing silence frames
  let firstSpeechFrame = 0;
  while (
    firstSpeechFrame < numFrames &&
    frameRms[firstSpeechFrame] <= silenceThreshold
  ) {
    firstSpeechFrame++;
  }
  let lastSpeechFrame = numFrames - 1;
  while (
    lastSpeechFrame > firstSpeechFrame &&
    frameRms[lastSpeechFrame] <= silenceThreshold
  ) {
    lastSpeechFrame--;
  }

  const activeFrameSpan = Math.max(1, lastSpeechFrame - firstSpeechFrame + 1);

  // Check if custom split timestamps were provided by the user in the dashboard
  let chosenValleys: SilenceValley[] = [];

  if (
    options.customSplitSeconds &&
    options.customSplitSeconds.length === expectedCount - 1
  ) {
    chosenValleys = options.customSplitSeconds.map((sec) => {
      const centerFrame = Math.max(
        1,
        Math.min(numFrames - 2, Math.round((sec * 1000) / frameDurationMs))
      );
      return {
        startFrame: Math.max(0, centerFrame - 2),
        endFrame: Math.min(numFrames - 1, centerFrame + 2),
        centerFrame,
        durationMs: 100,
        meanRms: frameRms[centerFrame] || 0,
      };
    });
  } else {
    // 3. Collect all internal silence valleys of at least minValleyMs (default 180ms = 9 frames)
    const minValleyMs = options.minValleyMs ?? 180;
    const minValleyFrames = Math.max(4, Math.round(minValleyMs / frameDurationMs));
    const candidateValleys: SilenceValley[] = [];
    let f = firstSpeechFrame;
    while (f <= lastSpeechFrame) {
      if (frameRms[f] <= silenceThreshold) {
        const startF = f;
        let rmsSum = 0;
        while (f <= lastSpeechFrame && frameRms[f] <= silenceThreshold) {
          rmsSum += frameRms[f];
          f++;
        }
        const endF = f - 1;
        const lenFrames = endF - startF + 1;
        if (
          lenFrames >= minValleyFrames &&
          startF > firstSpeechFrame + 5 &&
          endF < lastSpeechFrame - 5
        ) {
          candidateValleys.push({
            startFrame: startF,
            endFrame: endF,
            centerFrame: Math.floor((startF + endF) / 2),
            durationMs: lenFrames * frameDurationMs,
            meanRms: rmsSum / lenFrames,
          });
        }
      } else {
        f++;
      }
    }

    if (candidateValleys.length < expectedCount - 1) {
      return {
        success: false,
        expectedLineCount: expectedCount,
        detectedSegmentCount: candidateValleys.length + 1,
        totalDurationSec,
        sampleRate,
        splitTimestampsSec: candidateValleys.map((v) =>
          Number(((v.centerFrame * frameDurationMs) / 1000).toFixed(2))
        ),
        waveformPeaks,
        slices: [],
        errors: [
          `Expected ${expectedCount - 1} silence boundaries for ${expectedCount} lines, but only found ${candidateValleys.length} silence valleys.`,
        ],
      };
    }

    // 4. Select the optimal (expectedCount - 1) silence valleys via Dynamic Programming
    const charLengths = expectedLines.map((l) =>
      Math.max(6, l.spokenText[lang].trim().length)
    );
    const totalChars = charLengths.reduce((acc, c) => acc + c, 0);

    const expectedFractions: number[] = [];
    let runningChars = 0;
    for (let i = 0; i < expectedCount - 1; i++) {
      runningChars += charLengths[i];
      expectedFractions.push(runningChars / totalChars);
    }

    const K = expectedCount - 1;
    const M = candidateValleys.length;
    const dp: number[][] = Array.from({ length: K }, () =>
      new Array(M).fill(-Infinity)
    );
    const parent: number[][] = Array.from({ length: K }, () =>
      new Array(M).fill(-1)
    );

    const valleyScore = (valleyIdx: number, splitIdx: number): number => {
      const v = candidateValleys[valleyIdx];
      const actualFrac = (v.centerFrame - firstSpeechFrame) / activeFrameSpan;
      const expectedFrac = expectedFractions[splitIdx];
      const fracDiff = Math.abs(actualFrac - expectedFrac);

      const durationScore = Math.min(v.durationMs, 2500) / 500;
      const positionPenalty = fracDiff * 6.5;
      return durationScore - positionPenalty;
    };

    for (let j = 0; j < M; j++) {
      dp[0][j] = valleyScore(j, 0);
    }

    for (let k = 1; k < K; k++) {
      for (let j = k; j < M; j++) {
        for (let prevJ = k - 1; prevJ < j; prevJ++) {
          const speechFramesBetween =
            candidateValleys[j].startFrame - candidateValleys[prevJ].endFrame;
          if (speechFramesBetween < 18) continue;

          const candidate = dp[k - 1][prevJ] + valleyScore(j, k);
          if (candidate > dp[k][j]) {
            dp[k][j] = candidate;
            parent[k][j] = prevJ;
          }
        }
      }
    }

    let bestLastJ = -1;
    let bestScore = -Infinity;
    for (let j = K - 1; j < M; j++) {
      if (dp[K - 1][j] > bestScore) {
        bestScore = dp[K - 1][j];
        bestLastJ = j;
      }
    }

    if (bestLastJ === -1 || !isFinite(bestScore)) {
      return {
        success: false,
        expectedLineCount: expectedCount,
        detectedSegmentCount: 0,
        totalDurationSec,
        sampleRate,
        splitTimestampsSec: [],
        waveformPeaks,
        slices: [],
        errors: [
          `Could not find ${K} well-spaced silence boundaries across ${M} candidate valleys.`,
        ],
      };
    }

    const chosenValleyIndices: number[] = new Array(K);
    let currJ = bestLastJ;
    for (let k = K - 1; k >= 0; k--) {
      chosenValleyIndices[k] = currJ;
      currJ = parent[k][currJ];
    }

    chosenValleys = chosenValleyIndices.map((idx) => candidateValleys[idx]);
  }

  const splitTimestampsSec = chosenValleys.map((v) =>
    Number(((v.centerFrame * frameDurationMs) / 1000).toFixed(2))
  );

  // 5. Extract and pad each of the N segments, then run alignment verification
  const padMs = options.padMs ?? 100;
  const padFrames = Math.max(0, Math.round(padMs / frameDurationMs));
  const slices: SlicedLineResult[] = [];

  for (let i = 0; i < expectedCount; i++) {
    const rawStartFrame =
      i === 0 ? firstSpeechFrame : chosenValleys[i - 1].endFrame + 1;
    const rawEndFrame =
      i === expectedCount - 1 ? lastSpeechFrame : chosenValleys[i].startFrame - 1;

    const paddedStartFrame = Math.max(0, rawStartFrame - padFrames);
    const paddedEndFrame = Math.min(numFrames - 1, rawEndFrame + padFrames);

    const startTimeSec = Number(
      ((paddedStartFrame * frameDurationMs) / 1000).toFixed(2)
    );
    const endTimeSec = Number(
      (((paddedEndFrame + 1) * frameDurationMs) / 1000).toFixed(2)
    );

    const startByte = paddedStartFrame * samplesPerFrame * 2;
    const endByte = Math.min(
      pcmBuffer.length,
      (paddedEndFrame + 1) * samplesPerFrame * 2
    );

    const segmentPcm = pcmBuffer.subarray(startByte, endByte);
    const segmentWav = wrapPcmInWavHeader(segmentPcm, sampleRate);
    const durationSec = Number((segmentPcm.length / 2 / sampleRate).toFixed(2));

    let peakRms = 0;
    for (
      let fIdx = Math.max(0, rawStartFrame);
      fIdx <= Math.min(numFrames - 1, rawEndFrame);
      fIdx++
    ) {
      if (frameRms[fIdx] > peakRms) peakRms = frameRms[fIdx];
    }

    const line = expectedLines[i];
    const spokenText = line.spokenText[lang].trim();
    const wordCount =
      line.targetWords[lang]?.length || spokenText.split(/\s+/).length;
    const charCount = spokenText.length;
    const charsPerSec =
      durationSec > 0 ? Number((charCount / durationSec).toFixed(1)) : 0;
    const silenceGapAfterMs =
      i < expectedCount - 1 ? chosenValleys[i].durationMs : null;

    const reasons: string[] = [];
    if (durationSec < 0.35) {
      reasons.push(`duration too short (${durationSec}s)`);
    }
    if (peakRms < silenceThreshold * 1.8) {
      reasons.push(`low speech energy (peakRms=${Math.round(peakRms)})`);
    }
    if (charsPerSec < 2.0 || charsPerSec > 38.0) {
      reasons.push(`unusual speaking rate (${charsPerSec} chars/s)`);
    }

    const isAligned = reasons.length === 0;
    if (!isAligned) {
      errors.push(`Line ${line.lineId}: ${reasons.join(', ')}`);
    }

    slices.push({
      lineId: line.lineId,
      order: line.order,
      characterId: line.characterId,
      spokenText,
      wavBuffer: segmentWav,
      startTimeSec,
      endTimeSec,
      durationSec,
      wordCount,
      charCount,
      charsPerSec,
      silenceGapAfterMs,
      peakRms: Math.round(peakRms),
      isAligned,
      alignmentNote: isAligned
        ? `OK (${durationSec}s, ${charsPerSec} ch/s${
            silenceGapAfterMs ? `, gap=${silenceGapAfterMs}ms` : ''
          })`
        : `FAILED: ${reasons.join('; ')}`,
    });
  }

  return {
    success: errors.length === 0 && slices.length === expectedCount,
    expectedLineCount: expectedCount,
    detectedSegmentCount: slices.length,
    totalDurationSec,
    sampleRate,
    splitTimestampsSec,
    waveformPeaks,
    slices,
    errors,
  };
}
