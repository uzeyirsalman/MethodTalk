import { describe, it, expect } from 'vitest';
import { matrixRedPillScene } from '../data/scenes/matrixRedPill';
import {
  buildCharacterBatchText,
  sliceWavBufferIntoLines,
  wrapPcmInWavHeader,
  BATCH_PAUSE_DELIMITER,
} from '../../scripts/audioBatchSlicer';

/**
 * Generates a realistic 24kHz 16-bit mono PCM buffer simulating N spoken lines
 * with proportional durations separated by `<long pause>` silence gaps (e.g. 900ms),
 * plus a short 120ms mid-sentence comma pause inside line 2 to verify the DP
 * slicer picks the inter-line pauses rather than brief intra-line pauses.
 */
function createSyntheticCharacterBatchWav(
  lineLengthsChars: number[],
  sampleRate = 24000
): Buffer {
  const chunks: Buffer[] = [];

  const makeSilence = (durationMs: number): Buffer => {
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    return Buffer.alloc(numSamples * 2, 0);
  };

  const makeSpeechTone = (durationMs: number, amplitude = 4200): Buffer => {
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const buf = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      // 180Hz fundamental + 360Hz harmonic speech-like waveform
      const val = Math.round(
        amplitude *
          (0.7 * Math.sin((2 * Math.PI * 180 * i) / sampleRate) +
            0.3 * Math.sin((2 * Math.PI * 360 * i) / sampleRate))
      );
      buf.writeInt16LE(val, i * 2);
    }
    return buf;
  };

  // Leading breath silence (150ms)
  chunks.push(makeSilence(150));

  lineLengthsChars.forEach((charLen, idx) => {
    // Simulate ~14 chars/sec speaking rate
    const durationMs = Math.max(600, Math.round((charLen / 14) * 1000));

    // Add a brief 200ms intra-sentence comma pause inside the 2nd line to test robustness
    if (idx === 1 && durationMs > 1200) {
      const halfMs = Math.floor((durationMs - 200) / 2);
      chunks.push(makeSpeechTone(halfMs));
      chunks.push(makeSilence(200));
      chunks.push(makeSpeechTone(halfMs));
    } else {
      chunks.push(makeSpeechTone(durationMs));
    }

    // Add `<long pause> <long pause>` inter-line silence gap (1100ms) between lines
    if (idx < lineLengthsChars.length - 1) {
      chunks.push(makeSilence(1100));
    }
  });

  // Trailing silence (150ms)
  chunks.push(makeSilence(150));

  const fullPcm = Buffer.concat(chunks);
  return wrapPcmInWavHeader(fullPcm, sampleRate);
}

describe('Character+Language Batch Audio Slicer & Alignment Verifier', () => {
  const morpheusLines = matrixRedPillScene.lines.filter(
    (l) => l.characterId === 'morpheus'
  );

  it('builds a pure verbatim Character+Language batch transcript separated by <long pause>', () => {
    const batchText = buildCharacterBatchText(morpheusLines, 'pt-PT');
    expect(morpheusLines.length).toBe(8);
    const parts = batchText.split(BATCH_PAUSE_DELIMITER);
    expect(parts.length).toBe(8);
    expect(parts[0]).toBe(morpheusLines[0].spokenText['pt-PT']);
    expect(parts[7]).toBe(morpheusLines[7].spokenText['pt-PT']);
    // Must not leak character name or bio
    expect(batchText).not.toContain('Morpheus:');
    expect(batchText).not.toContain('baritone');
  });

  it('slices a batched character WAV into the exact 8 Morpheus lines and verifies alignment', () => {
    const charCounts = morpheusLines.map(
      (l) => l.spokenText['pt-PT'].trim().length
    );
    const syntheticBatchWav = createSyntheticCharacterBatchWav(charCounts);

    const verification = sliceWavBufferIntoLines(
      syntheticBatchWav,
      morpheusLines,
      'pt-PT'
    );

    expect(verification.success).toBe(true);
    expect(verification.expectedLineCount).toBe(8);
    expect(verification.detectedSegmentCount).toBe(8);
    expect(verification.errors).toEqual([]);

    verification.slices.forEach((slice, idx) => {
      expect(slice.lineId).toBe(morpheusLines[idx].lineId);
      expect(slice.characterId).toBe('morpheus');
      expect(slice.isAligned).toBe(true);
      expect(slice.durationSec).toBeGreaterThan(0.5);
      expect(slice.charsPerSec).toBeGreaterThan(8);
      expect(slice.charsPerSec).toBeLessThan(22);
      expect(slice.wavBuffer.toString('ascii', 0, 4)).toBe('RIFF');
    });
  });

  it('slices real Gemini TTS WAV recordings (Godfather pt-PT batches) and confirms 100% line alignment', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { godfatherOfferScene } = await import('../data/scenes/godfatherOffer');
    const { extractPcmFromWav } = await import('../../scripts/audioBatchSlicer');

    for (const charId of ['johnny_fontane', 'vito_corleone']) {
      const charLines = godfatherOfferScene.lines.filter(
        (l) => l.characterId === charId
      );
      const silenceGap = Buffer.alloc(Math.floor(24000 * 2 * 1.2), 0); // 1.2s <long pause>
      const pcmParts: Buffer[] = [];

      for (let i = 0; i < charLines.length; i++) {
        const wavPath = path.resolve(
          process.cwd(),
          'public',
          'audio',
          'scenes',
          'godfather-offer',
          `${charLines[i].lineId}_pt-PT.wav`
        );
        const wavBuf = fs.readFileSync(wavPath);
        pcmParts.push(extractPcmFromWav(wavBuf).pcmBuffer);
        if (i < charLines.length - 1) {
          pcmParts.push(silenceGap);
        }
      }

      const masterBatchWav = wrapPcmInWavHeader(Buffer.concat(pcmParts), 24000);
      const result = sliceWavBufferIntoLines(masterBatchWav, charLines, 'pt-PT');

      expect(result.success).toBe(true);
      expect(result.expectedLineCount).toBe(charLines.length);
      expect(result.detectedSegmentCount).toBe(charLines.length);
      result.slices.forEach((slice, idx) => {
        expect(slice.lineId).toBe(charLines[idx].lineId);
        expect(slice.isAligned).toBe(true);
      });
    }
  });
});
