/**
 * MethodTalk v2: 4-Stage Character+Language Batched Audio Production Pipeline
 *
 * - Exclusively uses `gemini-3.8-flash-tts` with custom designed `voice_...` personas
 *   (`speechConfig.voiceConfig.voice`).
 * - Groups lines by `Character + Language` within a scene so an entire character's
 *   performance (e.g. all 5 Morpheus lines or all 8 Aragorn lines) is synthesized
 *   in 1 API request separated by `<long pause> <long pause>`.
 * - Archives the raw batch WAV in `public/audio/batches/`, slices it along silence
 *   valleys via `audioBatchSlicer.ts`, verifies that the sliced parts line up with
 *   every script line, and updates `src/data/audioManifest.json`.
 *
 * Commands:
 *   npm run audio:status                                       -> Audit cast & audio provenance table
 *   npm run audio:cast                                         -> Stage 1: Ensure custom voices exist
 *   npm run audio:synth -- --scene=matrix-red-pill --lang=pt-PT -> Stage 2 & 3: Batch synthesize, slice & verify
 *   npm run audio:slice -- --scene=matrix-red-pill --lang=pt-PT -> Re-slice & verify from saved master batch WAVs
 */

import * as fs from 'fs';
import * as path from 'path';
import { SCENES_LIBRARY } from '../src/data/scenes';
import { getCharacterById } from '../src/data/characters';
import { DialogueLine, LanguageCode, SceneEntry } from '../src/types/scene';
import {
  buildCharacterBatchText,
  sliceWavBufferIntoLines,
  wrapPcmInWavHeader,
  BatchSliceVerificationResult,
} from './audioBatchSlicer';

const MODEL_NAME = 'gemini-3.8-flash-tts';
const ALL_LANGS: LanguageCode[] = ['pt-PT', 'en', 'ru', 'de'];

export type LineAudioStatus = 'verified' | 'legacy_voice' | 'missing';

export interface LineProvenanceRecord {
  status: LineAudioStatus;
  voiceId: string;
  model: string;
  durationSec?: number;
  charsPerSec?: number;
  updatedAt?: string;
}

export interface SceneLanguageManifest {
  voicedLines: string[];
  verifiedLines: string[];
  legacyLines: string[];
  totalLines: number;
  isComplete: boolean;
  isVerifiedComplete: boolean;
  lineRecords: Record<string, LineProvenanceRecord>;
}

export type AudioManifest = Record<string, Record<LanguageCode, SceneLanguageManifest>>;

function loadEnvKey(): string {
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return '';
}

const GEMINI_API_KEY = loadEnvKey();

/**
 * Stage 3: Provenance-Aware Audio Manifest Sync
 */
export function syncAudioManifest(
  newlyVerifiedBatch?: {
    sceneId: string;
    lang: LanguageCode;
    voiceId: string;
    lines: Array<{
      lineId: string;
      durationSec: number;
      charsPerSec: number;
    }>;
  }
): AudioManifest {
  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio', 'scenes');
  const manifestPath = path.resolve(process.cwd(), 'src', 'data', 'audioManifest.json');

  let existingManifest: AudioManifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      existingManifest = {};
    }
  }

  const newlyVerifiedMap = new Map<
    string,
    { durationSec: number; charsPerSec: number }
  >();
  if (newlyVerifiedBatch) {
    for (const item of newlyVerifiedBatch.lines) {
      newlyVerifiedMap.set(item.lineId, {
        durationSec: item.durationSec,
        charsPerSec: item.charsPerSec,
      });
    }
  }

  const manifest: AudioManifest = {};

  for (const scene of SCENES_LIBRARY) {
    const sceneId = scene.metadata.id;
    manifest[sceneId] = {} as Record<LanguageCode, SceneLanguageManifest>;

    for (const lang of ALL_LANGS) {
      const voicedLines: string[] = [];
      const verifiedLines: string[] = [];
      const legacyLines: string[] = [];
      const lineRecords: Record<string, LineProvenanceRecord> = {};

      const prevRecords = existingManifest[sceneId]?.[lang]?.lineRecords || {};

      for (const line of scene.lines) {
        const filePath = path.join(publicAudioDir, sceneId, `${line.lineId}_${lang}.wav`);
        const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
        const character = getCharacterById(line.characterId);
        const expectedVoiceId = character.voices[lang].customVoiceId || '';

        if (!fileExists) {
          lineRecords[line.lineId] = {
            status: 'missing',
            voiceId: 'none',
            model: MODEL_NAME,
          };
          continue;
        }

        voicedLines.push(line.lineId);

        if (
          newlyVerifiedBatch &&
          newlyVerifiedBatch.sceneId === sceneId &&
          newlyVerifiedBatch.lang === lang &&
          newlyVerifiedMap.has(line.lineId)
        ) {
          const metrics = newlyVerifiedMap.get(line.lineId)!;
          const isCustom = newlyVerifiedBatch.voiceId.startsWith('voice_');
          const status: LineAudioStatus = isCustom ? 'verified' : 'legacy_voice';
          lineRecords[line.lineId] = {
            status,
            voiceId: newlyVerifiedBatch.voiceId,
            model: MODEL_NAME,
            durationSec: metrics.durationSec,
            charsPerSec: metrics.charsPerSec,
            updatedAt: new Date().toISOString(),
          };
          if (status === 'verified') verifiedLines.push(line.lineId);
          else legacyLines.push(line.lineId);
        } else if (
          prevRecords[line.lineId]?.status === 'verified' &&
          prevRecords[line.lineId]?.voiceId === expectedVoiceId &&
          expectedVoiceId.startsWith('voice_')
        ) {
          lineRecords[line.lineId] = prevRecords[line.lineId];
          verifiedLines.push(line.lineId);
        } else {
          lineRecords[line.lineId] = {
            status: 'legacy_voice',
            voiceId:
              prevRecords[line.lineId]?.voiceId ||
              `prebuilt:${character.voices[lang].fallbackPrebuiltVoice}`,
            model: MODEL_NAME,
          };
          legacyLines.push(line.lineId);
        }
      }

      manifest[sceneId][lang] = {
        voicedLines,
        verifiedLines,
        legacyLines,
        totalLines: scene.lines.length,
        isComplete: voicedLines.length === scene.lines.length,
        isVerifiedComplete: verifiedLines.length === scene.lines.length,
        lineRecords,
      };
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  return manifest;
}

/**
 * Stage 4: Print Structured CLI Status Table
 */
export function printAudioStatusTable(manifest: AudioManifest) {
  console.log('\n==============================================================================================');
  console.log(
    ` METHODTALK v2 — BATCH AUDIO PRODUCTION STATUS (Model: ${MODEL_NAME})`
  );
  console.log('==============================================================================================');
  console.log(
    'Scene ID               | Req/Lang | Cast (PT/EN/RU/DE) | pt-PT          | en             | ru             | de'
  );
  console.log('----------------------------------------------------------------------------------------------');

  let totalVerifiedScenes = 0;
  let totalSceneLangPairs = 0;

  for (const scene of SCENES_LIBRARY) {
    const sceneId = scene.metadata.id;
    const chars = scene.characterIds.map((id) => getCharacterById(id));
    const reqPerLang = `${chars.length} batch`;

    const castStatus = ALL_LANGS.map((lang) => {
      const castCount = chars.filter((c) =>
        c.voices[lang].customVoiceId?.startsWith('voice_')
      ).length;
      return `${castCount}/${chars.length}`;
    }).join(' ');

    const langCells = ALL_LANGS.map((lang) => {
      totalSceneLangPairs++;
      const info = manifest[sceneId][lang];
      const v = info.verifiedLines.length;
      const l = info.legacyLines.length;
      const t = info.totalLines;
      if (v === t) {
        totalVerifiedScenes++;
        return `🟢 ${v}/${t} Custom`.padEnd(14);
      }
      if (v > 0 || l > 0) {
        return `🟡 ${v}c+${l}p/${t}`.padEnd(14);
      }
      return `⚪ 0/${t}`.padEnd(14);
    });

    console.log(
      `${sceneId.padEnd(22)} | ${reqPerLang.padEnd(8)} | ${castStatus.padEnd(18)} | ${langCells.join(' | ')}`
    );
  }
  console.log('----------------------------------------------------------------------------------------------');
  console.log(
    `Progress: ${totalVerifiedScenes}/${totalSceneLangPairs} Scene+Language tracks fully verified with custom voices.`
  );
  console.log(
    'Legend  : 🟢 c = Verified Custom Voice (voice_...) | 🟡 p = Legacy Prebuilt Voice | ⚪ Missing\n'
  );
}

/**
 * Prints a line-by-line verification table after slicing a character batch WAV.
 */
export function printSliceVerificationTable(
  sceneId: string,
  characterId: string,
  lang: LanguageCode,
  voiceId: string,
  verification: BatchSliceVerificationResult
) {
  console.log(
    `\n  ┌── SLICE & ALIGNMENT VERIFICATION: ${sceneId} | ${characterId} (${lang}) | Voice: ${voiceId}`
  );
  console.log(
    `  │   Expected Lines: ${verification.expectedLineCount} | Sliced Parts: ${verification.detectedSegmentCount} | Total Batch Audio: ${verification.totalDurationSec}s`
  );
  console.log(
    `  ├─────────┬───────┬──────────┬──────────┬──────────────┬──────────┬───────────────────────────────`
  );
  console.log(
    `  │ Line ID │ Order │ Duration │ Chars/s  │ Gap After    │ Aligned  │ Script Line Preview`
  );
  console.log(
    `  ├─────────┼───────┼──────────┼──────────┼──────────────┼──────────┼───────────────────────────────`
  );
  for (const s of verification.slices) {
    const gapStr = s.silenceGapAfterMs !== null ? `${s.silenceGapAfterMs}ms` : 'END';
    const statusStr = s.isAligned ? '✅ YES' : '❌ NO';
    const preview =
      s.spokenText.length > 28 ? s.spokenText.slice(0, 28) + '...' : s.spokenText;
    console.log(
      `  │ ${s.lineId.padEnd(7)} │ #${String(s.order).padEnd(4)} │ ${String(
        s.durationSec + 's'
      ).padEnd(8)} │ ${String(s.charsPerSec).padEnd(8)} │ ${gapStr.padEnd(
        12
      )} │ ${statusStr.padEnd(8)} │ "${preview}"`
    );
  }
  console.log(
    `  └─────────┴───────┴──────────┴──────────┴──────────────┴──────────┴───────────────────────────────`
  );
  if (!verification.success) {
    for (const err of verification.errors) {
      console.error(`  [ALIGNMENT ERROR] ${err}`);
    }
  }
}

interface ParsedQuotaError {
  isDailyQuota: boolean;
  quotaId: string;
  quotaLimit: string;
  retrySeconds: number;
  summary: string;
}

function parseQuotaError(errJsonText: string): ParsedQuotaError {
  try {
    const parsed = JSON.parse(errJsonText);
    const details: any[] = parsed?.error?.details || [];
    const quotaFailure = details.find((d) => d['@type']?.includes('QuotaFailure'));
    const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));

    const violation = quotaFailure?.violations?.[0] || {};
    const quotaId: string = violation.quotaId || 'UnknownQuota';
    const quotaLimit: string = violation.quotaValue || 'unknown';
    const retryDelayStr: string = retryInfo?.retryDelay || '22s';
    const retrySeconds = Math.ceil(parseFloat(retryDelayStr.replace('s', '')) || 22);
    const isDailyQuota =
      quotaId.toLowerCase().includes('perday') || retrySeconds > 300;

    const hours = Math.floor(retrySeconds / 3600);
    const mins = Math.floor((retrySeconds % 3600) / 60);
    const secs = retrySeconds % 60;
    const formattedWait =
      hours > 0 ? `${hours}h ${mins}m ${secs}s` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return {
      isDailyQuota,
      quotaId,
      quotaLimit,
      retrySeconds,
      summary: `${quotaId} (limit: ${quotaLimit}, retry in ${formattedWait})`,
    };
  } catch {
    return {
      isDailyQuota: false,
      quotaId: 'UnparsedRateLimit',
      quotaLimit: 'unknown',
      retrySeconds: 22,
      summary: errJsonText.slice(0, 200),
    };
  }
}

/**
 * Calls `gemini-3.8-flash-tts` once for all of a character's lines in a scene+language.
 */
async function synthesizeCharacterBatchWithGemini38FlashTts(
  scene: SceneEntry,
  characterId: string,
  lang: LanguageCode,
  characterLines: DialogueLine[],
  attempt = 1
): Promise<{ wavBuffer: Buffer | null; voiceIdUsed: string; haltAll?: boolean }> {
  const character = getCharacterById(characterId);
  const customVoiceId = character.voices[lang].customVoiceId;

  if (!customVoiceId || !customVoiceId.startsWith('voice_')) {
    console.error(
      `[STAGE 1 GATE FAILED] Character "${character.name}" (${characterId}) does not have a custom voice_... ID for language "${lang}". Run "npm run audio:cast" first.`
    );
    return { wavBuffer: null, voiceIdUsed: 'none', haltAll: true };
  }

  const batchTranscript = buildCharacterBatchText(characterLines, lang);
  const lineIdsList = characterLines.map((l) => l.lineId).join(', ');

  console.log(
    `\n[BATCH SYNTHESIZING] ${scene.metadata.id} | ${character.name} (${lang}) | ${characterLines.length} lines [${lineIdsList}] in 1 request | Model: ${MODEL_NAME} | Voice: ${customVoiceId}`
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                // STRICT ISOLATION: Verbatim character lines separated only by `<long pause> <long pause>`
                text: batchTranscript,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              voice: customVoiceId,
            },
          },
        },
      }),
    }
  );

  if (response.status === 429) {
    const errText = await response.text();
    const quotaInfo = parseQuotaError(errText);

    if (quotaInfo.isDailyQuota) {
      console.error(
        `\n[QUOTA HALT — DAILY LIMIT REACHED] ${MODEL_NAME}\n` +
          `  Metric : ${quotaInfo.quotaId}\n` +
          `  Limit  : ${quotaInfo.quotaLimit} requests/day (Free Tier)\n` +
          `  Reset  : ${quotaInfo.summary}\n` +
          `  Action : Stopping batch immediately instead of retrying in a loop.\n`
      );
      return { wavBuffer: null, voiceIdUsed: customVoiceId, haltAll: true };
    }

    if (attempt <= 3) {
      console.warn(
        `  [RATE LIMIT 429 — PER MINUTE] ${quotaInfo.summary}. Waiting ${quotaInfo.retrySeconds}s (attempt ${attempt}/3)...`
      );
      await new Promise((r) => setTimeout(r, quotaInfo.retrySeconds * 1000));
      return synthesizeCharacterBatchWithGemini38FlashTts(
        scene,
        characterId,
        lang,
        characterLines,
        attempt + 1
      );
    }

    console.error(`  [HALT] Exceeded 3 per-minute retries on ${characterId} (${lang}).`);
    return { wavBuffer: null, voiceIdUsed: customVoiceId, haltAll: true };
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(
      `  [HTTP ERROR ${response.status}] ${MODEL_NAME} failed on ${characterId} (${lang}):\n  ${errText}`
    );
    return { wavBuffer: null, voiceIdUsed: customVoiceId, haltAll: true };
  }

  const data: any = await response.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData && p.inlineData.data
  );

  if (!audioPart?.inlineData?.data) {
    console.error(`  [EMPTY AUDIO] No inlineData returned for ${characterId} (${lang}).`);
    return { wavBuffer: null, voiceIdUsed: customVoiceId };
  }

  const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
  return {
    wavBuffer: wrapPcmInWavHeader(rawBuffer, 24000),
    voiceIdUsed: customVoiceId,
  };
}

/**
 * Slices a master character batch WAV buffer, verifies alignment, writes the individual
 * line WAV files if aligned, and updates `src/data/audioManifest.json`.
 */
function processAndVerifyMasterBatchWav(
  scene: SceneEntry,
  characterId: string,
  lang: LanguageCode,
  voiceId: string,
  characterLines: DialogueLine[],
  masterWavBuffer: Buffer,
  sceneDir: string
): boolean {
  const verification = sliceWavBufferIntoLines(
    masterWavBuffer,
    characterLines,
    lang
  );

  printSliceVerificationTable(
    scene.metadata.id,
    characterId,
    lang,
    voiceId,
    verification
  );

  if (!verification.success) {
    console.error(
      `  [VERIFICATION FAILED] Master batch saved in public/audio/batches/, but individual lines were NOT marked verified because parts did not cleanly align.`
    );
    return false;
  }

  const verifiedMeta: Array<{
    lineId: string;
    durationSec: number;
    charsPerSec: number;
  }> = [];

  for (const slice of verification.slices) {
    const destPath = path.join(sceneDir, `${slice.lineId}_${lang}.wav`);
    fs.writeFileSync(destPath, slice.wavBuffer);
    verifiedMeta.push({
      lineId: slice.lineId,
      durationSec: slice.durationSec,
      charsPerSec: slice.charsPerSec,
    });
  }

  syncAudioManifest({
    sceneId: scene.metadata.id,
    lang,
    voiceId,
    lines: verifiedMeta,
  });

  console.log(
    `  [BATCH VERIFIED & SAVED] Wrote ${verification.slices.length}/${characterLines.length} verified line WAVs for ${characterId} (${lang}).`
  );
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const manifest = syncAudioManifest();

  if (args.includes('--sync-only') || args.includes('--status')) {
    printAudioStatusTable(manifest);
    return;
  }

  const resliceOnly = args.includes('--reslice');
  const sceneFilter = args.find((a) => a.startsWith('--scene='))?.split('=')[1];
  const langFilter = args.find((a) => a.startsWith('--lang='))?.split('=')[1] as
    | LanguageCode
    | undefined;
  const charFilter = args.find((a) => a.startsWith('--char='))?.split('=')[1];
  const forceOverwrite = args.includes('--force');

  if (!sceneFilter) {
    console.error(
      '[STAGE 2 RULE] Please specify a target scene (e.g. --scene=matrix-red-pill) so batch production stays scoped and predictable.'
    );
    printAudioStatusTable(manifest);
    process.exit(1);
  }

  const scenesToProcess = SCENES_LIBRARY.filter((s) => s.metadata.id === sceneFilter);
  if (scenesToProcess.length === 0) {
    console.error(`[ERROR] Unknown scene "${sceneFilter}".`);
    process.exit(1);
  }

  const languagesToProcess: LanguageCode[] = langFilter
    ? [langFilter]
    : ['pt-PT', 'en', 'ru', 'de'];

  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio', 'scenes');
  const batchArchiveDir = path.resolve(process.cwd(), 'public', 'audio', 'batches');
  fs.mkdirSync(publicAudioDir, { recursive: true });
  fs.mkdirSync(batchArchiveDir, { recursive: true });

  for (const lang of languagesToProcess) {
    for (const scene of scenesToProcess) {
      const sceneId = scene.metadata.id;
      const sceneDir = path.join(publicAudioDir, sceneId);
      fs.mkdirSync(sceneDir, { recursive: true });

      const characterIds = charFilter
        ? scene.characterIds.filter((id) => id === charFilter)
        : scene.characterIds;

      for (const characterId of characterIds) {
        const characterLines = scene.lines.filter(
          (l) => l.characterId === characterId
        );
        if (characterLines.length === 0) continue;

        const character = getCharacterById(characterId);
        const customVoiceId = character.voices[lang].customVoiceId || '';
        const batchFilePath = path.join(
          batchArchiveDir,
          `${sceneId}__${characterId}__${lang}.wav`
        );

        // If --reslice is passed, slice and verify from saved master batch on disk (0 API calls)
        if (resliceOnly) {
          if (!fs.existsSync(batchFilePath)) {
            console.warn(
              `[RESLICE SKIP] No saved master batch found at ${batchFilePath}`
            );
            continue;
          }
          const savedBatchWav = fs.readFileSync(batchFilePath);
          processAndVerifyMasterBatchWav(
            scene,
            characterId,
            lang,
            customVoiceId || 'voice_archived',
            characterLines,
            savedBatchWav,
            sceneDir
          );
          continue;
        }

        // Check if all lines for this character+language are already verified with their custom voice
        const allLinesAlreadyVerified = characterLines.every(
          (l) =>
            manifest[sceneId]?.[lang]?.lineRecords?.[l.lineId]?.status ===
            'verified'
        );

        if (!forceOverwrite && allLinesAlreadyVerified) {
          console.log(
            `[BATCH SKIP] ${sceneId} | ${characterId} (${lang}): all ${characterLines.length} lines already verified with ${customVoiceId}.`
          );
          continue;
        }

        if (!GEMINI_API_KEY) {
          console.error('[ERROR] No VITE_GEMINI_API_KEY found in .env');
          process.exit(1);
        }

        const result = await synthesizeCharacterBatchWithGemini38FlashTts(
          scene,
          characterId,
          lang,
          characterLines
        );

        if (result.wavBuffer) {
          // 1. Archive raw master batch WAV before slicing so an API call is never wasted
          fs.writeFileSync(batchFilePath, result.wavBuffer);
          console.log(
            `  [ARCHIVED MASTER BATCH] -> ${batchFilePath} (${Math.round(
              result.wavBuffer.length / 1024
            )} KB)`
          );

          // 2. Slice into individual line WAVs and verify alignment
          processAndVerifyMasterBatchWav(
            scene,
            characterId,
            lang,
            result.voiceIdUsed,
            characterLines,
            result.wavBuffer,
            sceneDir
          );
        }

        if (result.haltAll) {
          printAudioStatusTable(syncAudioManifest());
          process.exit(1);
        }

        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  printAudioStatusTable(syncAudioManifest());
}

if (process.argv[1]?.includes('generateAudioClips')) {
  main().catch(console.error);
}
