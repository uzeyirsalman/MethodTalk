/**
 * MethodTalk v2: Local Vite Dev Server Audio Studio API Plugin (`/api/audio-studio/*`)
 *
 * Connects the in-app `AudioStudioDashboard.tsx` directly to the local filesystem,
 * `src/data/customVoices.json`, `src/data/audioManifest.json`, `public/audio/`,
 * and `gemini-3.8-flash-tts` (`POST /v1beta/voices` & `generateContent`).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Plugin } from 'vite';
import { SCENES_LIBRARY } from '../src/data/scenes';
import { CHARACTER_REGISTRY } from '../src/data/characters';
import { LanguageCode } from '../src/types/scene';
import {
  buildCharacterBatchText,
  extractPcmFromWav,
  normalizeWavBufferRms,
  sliceWavBufferIntoLines,
  wrapPcmInWavHeader,
} from './audioBatchSlicer';
import { syncAudioManifest } from './generateAudioClips';

const MODEL_NAME = 'gemini-3.8-flash-tts';

const BCP47_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  'pt-PT': 'pt-PT',
};

function getEnvApiKey(): string {
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return '';
}

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: any, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseGoogleQuotaError(errText: string, status: number) {
  try {
    const parsed = JSON.parse(errText);
    const details: any[] = parsed?.error?.details || [];
    const quotaFailure = details.find((d) => d['@type']?.includes('QuotaFailure'));
    const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));
    const violation = quotaFailure?.violations?.[0] || {};
    const quotaId: string = violation.quotaId || (status === 429 ? 'RateLimitExceeded' : 'HttpError');
    const quotaLimit: string = violation.quotaValue || 'unknown';
    const retryDelayStr: string = retryInfo?.retryDelay || '0s';
    const retrySeconds = Math.ceil(parseFloat(retryDelayStr.replace('s', '')) || 0);
    const isDailyQuota = quotaId.toLowerCase().includes('perday') || retrySeconds > 300;

    return {
      status,
      isDailyQuota,
      quotaId,
      quotaLimit,
      retrySeconds,
      message: parsed?.error?.message || errText.slice(0, 300),
    };
  } catch {
    return {
      status,
      isDailyQuota: false,
      quotaId: 'Error',
      quotaLimit: 'unknown',
      retrySeconds: 0,
      message: errText.slice(0, 300),
    };
  }
}

export function viteAudioStudioPlugin(): Plugin {
  return {
    name: 'methodtalk-audio-studio-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/audio-studio/')) {
          return next();
        }

        const rootDir = process.cwd();
        const customVoicesPath = path.resolve(rootDir, 'src', 'data', 'customVoices.json');
        const promptOverridesPath = path.resolve(
          rootDir,
          'src',
          'data',
          'voicePromptOverrides.json'
        );
        const publicVoicesDir = path.resolve(rootDir, 'public', 'audio', 'voices');
        const publicBatchesDir = path.resolve(rootDir, 'public', 'audio', 'batches');
        const publicScenesDir = path.resolve(rootDir, 'public', 'audio', 'scenes');

        fs.mkdirSync(publicVoicesDir, { recursive: true });
        fs.mkdirSync(publicBatchesDir, { recursive: true });
        fs.mkdirSync(publicScenesDir, { recursive: true });

        const loadCustomVoices = (): Record<string, Partial<Record<LanguageCode, string>>> =>
          fs.existsSync(customVoicesPath)
            ? JSON.parse(fs.readFileSync(customVoicesPath, 'utf-8'))
            : {};

        const loadPromptOverrides = (): Record<string, Partial<Record<LanguageCode, string>>> =>
          fs.existsSync(promptOverridesPath)
            ? JSON.parse(fs.readFileSync(promptOverridesPath, 'utf-8'))
            : {};

        try {
          // 1. GET /api/audio-studio/state
          if (req.method === 'GET' && url.startsWith('/api/audio-studio/state')) {
            const manifest = syncAudioManifest();
            const customVoices = loadCustomVoices();
            const promptOverrides = loadPromptOverrides();

            const batchFiles = fs.existsSync(publicBatchesDir)
              ? fs.readdirSync(publicBatchesDir).filter((f) => f.endsWith('.wav'))
              : [];

            const voicePreviewFiles = fs.existsSync(publicVoicesDir)
              ? fs.readdirSync(publicVoicesDir).filter((f) => f.endsWith('.wav'))
              : [];

            return sendJson(res, 200, {
              model: MODEL_NAME,
              hasEnvApiKey: Boolean(getEnvApiKey()),
              manifest,
              customVoices,
              promptOverrides,
              batchFiles,
              voicePreviewFiles,
            });
          }

          // 2. POST /api/audio-studio/update-voice-prompt
          if (req.method === 'POST' && url === '/api/audio-studio/update-voice-prompt') {
            const { characterId, lang, prompt } = await readJsonBody(req);
            const overrides = loadPromptOverrides();
            if (!overrides[characterId]) overrides[characterId] = {};
            overrides[characterId][lang as LanguageCode] = prompt;
            fs.writeFileSync(
              promptOverridesPath,
              JSON.stringify(overrides, null, 2) + '\n',
              'utf-8'
            );
            return sendJson(res, 200, { ok: true, promptOverrides: overrides });
          }

          // 3. POST /api/audio-studio/fetch-voice-preview (0 generateContent Quota!)
          if (req.method === 'POST' && url === '/api/audio-studio/fetch-voice-preview') {
            const { voiceId, apiKey: clientKey } = await readJsonBody(req);
            const apiKey = clientKey || getEnvApiKey();
            if (!apiKey) {
              return sendJson(res, 400, { error: 'Missing Gemini API key.' });
            }

            const previewFileName = `${voiceId}_preview.wav`;
            const previewFilePath = path.join(publicVoicesDir, previewFileName);

            if (fs.existsSync(previewFilePath) && fs.statSync(previewFilePath).size > 1000) {
              return sendJson(res, 200, {
                ok: true,
                cached: true,
                previewUrl: `/audio/voices/${previewFileName}`,
              });
            }

            const gRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/voices/${voiceId}`,
              {
                headers: { 'x-goog-api-key': apiKey },
              }
            );

            if (!gRes.ok) {
              const errText = await gRes.text();
              return sendJson(res, gRes.status, {
                ok: false,
                quotaError: parseGoogleQuotaError(errText, gRes.status),
              });
            }

            const data: any = await gRes.json();
            const b64 = data?.sample_audio?.data || data?.sampleAudio?.data;
            if (!b64) {
              return sendJson(res, 404, {
                ok: false,
                error: `Voice ${voiceId} found on server, but no sample_audio preview was attached.`,
              });
            }

            const wavBuf = wrapPcmInWavHeader(Buffer.from(b64, 'base64'), 24000);
            fs.writeFileSync(previewFilePath, wavBuf);

            return sendJson(res, 200, {
              ok: true,
              cached: false,
              previewUrl: `/audio/voices/${previewFileName}`,
            });
          }

          // 4. POST /api/audio-studio/cast-voice (Stage 1: Design Custom Voice via POST /v1beta/voices)
          if (req.method === 'POST' && url === '/api/audio-studio/cast-voice') {
            const { characterId, lang, prompt, apiKey: clientKey } = await readJsonBody(req);
            const apiKey = clientKey || getEnvApiKey();
            if (!apiKey) {
              return sendJson(res, 400, { error: 'Missing Gemini API key.' });
            }

            const char = CHARACTER_REGISTRY[characterId];
            if (!char) {
              return sendJson(res, 404, { error: `Unknown character ${characterId}` });
            }

            const voiceDesignPrompt =
              prompt || char.voices[lang as LanguageCode].voiceDesignPrompt;
            const displayName = `MethodTalk_${characterId}_${lang}`;

            const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/voices`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                store: true,
                voice: {
                  model: MODEL_NAME,
                  type: 'prompted',
                  display_name: displayName,
                  gender: 'male',
                  language_code: BCP47_MAP[lang as LanguageCode],
                  prompted: {
                    input: voiceDesignPrompt,
                  },
                },
              }),
            });

            if (!gRes.ok) {
              const errText = await gRes.text();
              return sendJson(res, gRes.status, {
                ok: false,
                quotaError: parseGoogleQuotaError(errText, gRes.status),
              });
            }

            const data: any = await gRes.json();
            const newVoiceId: string = data.id;

            // Update customVoices.json and in-memory CHARACTER_REGISTRY
            const customVoices = loadCustomVoices();
            if (!customVoices[characterId]) customVoices[characterId] = {};
            customVoices[characterId][lang as LanguageCode] = newVoiceId;
            fs.writeFileSync(
              customVoicesPath,
              JSON.stringify(customVoices, null, 2) + '\n',
              'utf-8'
            );
            CHARACTER_REGISTRY[characterId].voices[lang as LanguageCode].customVoiceId =
              newVoiceId;

            // Save sample_audio preview if returned by CreateVoice
            let previewUrl: string | undefined;
            const b64 = data?.sample_audio?.data || data?.sampleAudio?.data;
            if (b64) {
              const previewFileName = `${newVoiceId}_preview.wav`;
              const previewFilePath = path.join(publicVoicesDir, previewFileName);
              fs.writeFileSync(
                previewFilePath,
                wrapPcmInWavHeader(Buffer.from(b64, 'base64'), 24000)
              );
              previewUrl = `/audio/voices/${previewFileName}`;
            }

            const manifest = syncAudioManifest();
            return sendJson(res, 200, {
              ok: true,
              voiceId: newVoiceId,
              previewUrl,
              customVoices,
              manifest,
            });
          }

          // 5. POST /api/audio-studio/test-line (Single-Line Audition / Recording via gemini-3.8-flash-tts)
          if (req.method === 'POST' && url === '/api/audio-studio/test-line') {
            const {
              sceneId,
              lineId,
              characterId,
              lang,
              customText,
              apiKey: clientKey,
            } = await readJsonBody(req);
            const apiKey = clientKey || getEnvApiKey();
            if (!apiKey) {
              return sendJson(res, 400, { error: 'Missing Gemini API key.' });
            }

            const scene = SCENES_LIBRARY.find((s) => s.metadata.id === sceneId);
            const line = scene?.lines.find((l) => l.lineId === lineId);
            const customVoices = loadCustomVoices();
            const voiceId =
              customVoices[characterId]?.[lang as LanguageCode] ||
              CHARACTER_REGISTRY[characterId]?.voices[lang as LanguageCode]?.customVoiceId;

            if (!voiceId || !voiceId.startsWith('voice_')) {
              return sendJson(res, 400, {
                ok: false,
                error: `Character ${characterId} does not have a custom voice_... ID in ${lang}. Cast the voice first.`,
              });
            }

            const textToSpeak =
              customText?.trim() || line?.spokenText[lang as LanguageCode] || '';

            const gRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: textToSpeak }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: { voice: voiceId },
                    },
                  },
                }),
              }
            );

            if (!gRes.ok) {
              const errText = await gRes.text();
              return sendJson(res, gRes.status, {
                ok: false,
                quotaError: parseGoogleQuotaError(errText, gRes.status),
              });
            }

            const data: any = await gRes.json();
            const audioPart = data.candidates?.[0]?.content?.parts?.find(
              (p: any) => p.inlineData && p.inlineData.data
            );
            if (!audioPart?.inlineData?.data) {
              return sendJson(res, 500, { ok: false, error: 'No audio returned by model.' });
            }

            const wavBuf = wrapPcmInWavHeader(
              Buffer.from(audioPart.inlineData.data, 'base64'),
              24000
            );

            if (sceneId && lineId) {
              const sceneDir = path.join(publicScenesDir, sceneId);
              fs.mkdirSync(sceneDir, { recursive: true });
              const destPath = path.join(sceneDir, `${lineId}_${lang}.wav`);
              fs.writeFileSync(destPath, wavBuf);

              const { pcmBuffer, sampleRate } = extractPcmFromWav(wavBuf);
              const durationSec = Number((pcmBuffer.length / 2 / sampleRate).toFixed(2));
              const charsPerSec =
                durationSec > 0 ? Number((textToSpeak.length / durationSec).toFixed(1)) : 0;

              const manifest = syncAudioManifest({
                sceneId,
                lang: lang as LanguageCode,
                voiceId,
                lines: [{ lineId, durationSec, charsPerSec }],
              });

              return sendJson(res, 200, {
                ok: true,
                audioUrl: `/audio/scenes/${sceneId}/${lineId}_${lang}.wav?t=${Date.now()}`,
                durationSec,
                charsPerSec,
                voiceId,
                manifest,
              });
            }

            return sendJson(res, 200, { ok: true, voiceId });
          }

          // 6. POST /api/audio-studio/synth-batch (Stage 2 & 3: Character+Language Batch Synth + Slice + Verify)
          if (req.method === 'POST' && url === '/api/audio-studio/synth-batch') {
            const {
              sceneId,
              characterId,
              lang,
              padMs,
              minValleyMs,
              apiKey: clientKey,
            } = await readJsonBody(req);
            const apiKey = clientKey || getEnvApiKey();
            if (!apiKey) {
              return sendJson(res, 400, { error: 'Missing Gemini API key.' });
            }

            const scene = SCENES_LIBRARY.find((s) => s.metadata.id === sceneId);
            if (!scene) {
              return sendJson(res, 404, { error: `Unknown scene ${sceneId}` });
            }

            const characterLines = scene.lines.filter((l) => l.characterId === characterId);
            const customVoices = loadCustomVoices();
            const voiceId =
              customVoices[characterId]?.[lang as LanguageCode] ||
              CHARACTER_REGISTRY[characterId]?.voices[lang as LanguageCode]?.customVoiceId;

            if (!voiceId || !voiceId.startsWith('voice_')) {
              return sendJson(res, 400, {
                ok: false,
                error: `Character ${characterId} does not have a locked custom voice_... ID for ${lang}.`,
              });
            }

            const batchTranscript = buildCharacterBatchText(
              characterLines,
              lang as LanguageCode
            );

            const gRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: batchTranscript }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: { voice: voiceId },
                    },
                  },
                }),
              }
            );

            if (!gRes.ok) {
              const errText = await gRes.text();
              return sendJson(res, gRes.status, {
                ok: false,
                quotaError: parseGoogleQuotaError(errText, gRes.status),
              });
            }

            const data: any = await gRes.json();
            const audioPart = data.candidates?.[0]?.content?.parts?.find(
              (p: any) => p.inlineData && p.inlineData.data
            );
            if (!audioPart?.inlineData?.data) {
              return sendJson(res, 500, { ok: false, error: 'No audio returned by model.' });
            }

            const masterWav = wrapPcmInWavHeader(
              Buffer.from(audioPart.inlineData.data, 'base64'),
              24000
            );

            // Archive raw master batch WAV before slicing
            const batchFileName = `${sceneId}__${characterId}__${lang}.wav`;
            const batchFilePath = path.join(publicBatchesDir, batchFileName);
            fs.writeFileSync(batchFilePath, masterWav);

            const verification = sliceWavBufferIntoLines(
              masterWav,
              characterLines,
              lang as LanguageCode,
              { padMs, minValleyMs }
            );

            const sceneDir = path.join(publicScenesDir, sceneId);
            fs.mkdirSync(sceneDir, { recursive: true });

            if (verification.success) {
              const verifiedMeta: Array<{
                lineId: string;
                durationSec: number;
                charsPerSec: number;
              }> = [];

              for (const s of verification.slices) {
                fs.writeFileSync(path.join(sceneDir, `${s.lineId}_${lang}.wav`), s.wavBuffer);
                verifiedMeta.push({
                  lineId: s.lineId,
                  durationSec: s.durationSec,
                  charsPerSec: s.charsPerSec,
                });
              }

              syncAudioManifest({
                sceneId,
                lang: lang as LanguageCode,
                voiceId,
                lines: verifiedMeta,
              });
            }

            const manifest = syncAudioManifest();
            return sendJson(res, 200, {
              ok: true,
              voiceId,
              batchAudioUrl: `/audio/batches/${batchFileName}?t=${Date.now()}`,
              verification: {
                ...verification,
                slices: verification.slices.map(({ wavBuffer, ...rest }) => rest),
              },
              manifest,
            });
          }

          // 7. POST /api/audio-studio/reslice-batch (0 API Calls! Slices saved master batch or stitches existing line WAVs)
          if (req.method === 'POST' && url === '/api/audio-studio/reslice-batch') {
            const {
              sceneId,
              characterId,
              lang,
              padMs,
              minValleyMs,
              customSplitSeconds,
              buildFromExistingLineWavs,
            } = await readJsonBody(req);

            const scene = SCENES_LIBRARY.find((s) => s.metadata.id === sceneId);
            if (!scene) {
              return sendJson(res, 404, { error: `Unknown scene ${sceneId}` });
            }

            const characterLines = scene.lines.filter((l) => l.characterId === characterId);
            const batchFileName = `${sceneId}__${characterId}__${lang}.wav`;
            const batchFilePath = path.join(publicBatchesDir, batchFileName);
            const sceneDir = path.join(publicScenesDir, sceneId);
            fs.mkdirSync(sceneDir, { recursive: true });

            let masterWav: Buffer;

            if (!fs.existsSync(batchFilePath) || buildFromExistingLineWavs) {
              // If no master batch exists yet, allow stitching existing per-line WAVs on disk with 1.1s <long pause> gaps
              // so the user can visually test the waveform slicer on existing recordings (e.g. Godfather pt-PT) for 0 API calls!
              const silenceGap = Buffer.alloc(Math.floor(24000 * 2 * 1.15), 0);
              const pcmParts: Buffer[] = [];
              for (let i = 0; i < characterLines.length; i++) {
                const lineWavPath = path.join(
                  sceneDir,
                  `${characterLines[i].lineId}_${lang}.wav`
                );
                if (!fs.existsSync(lineWavPath)) {
                  return sendJson(res, 404, {
                    ok: false,
                    error: `No master batch WAV found at ${batchFileName} and line ${characterLines[i].lineId}_${lang}.wav is not on disk yet.`,
                  });
                }
                const lineWav = fs.readFileSync(lineWavPath);
                pcmParts.push(extractPcmFromWav(lineWav).pcmBuffer);
                if (i < characterLines.length - 1) {
                  pcmParts.push(silenceGap);
                }
              }
              masterWav = wrapPcmInWavHeader(Buffer.concat(pcmParts), 24000);
              fs.writeFileSync(batchFilePath, masterWav);
            } else {
              masterWav = fs.readFileSync(batchFilePath);
            }

            const verification = sliceWavBufferIntoLines(
              masterWav,
              characterLines,
              lang as LanguageCode,
              { padMs, minValleyMs, customSplitSeconds }
            );

            const customVoices = loadCustomVoices();
            const voiceId =
              customVoices[characterId]?.[lang as LanguageCode] ||
              CHARACTER_REGISTRY[characterId]?.voices[lang as LanguageCode]?.customVoiceId ||
              'voice_custom';

            // Only write sliced WAVs if verification succeeded
            if (verification.success && !buildFromExistingLineWavs) {
              const verifiedMeta: Array<{
                lineId: string;
                durationSec: number;
                charsPerSec: number;
              }> = [];
              for (const s of verification.slices) {
                fs.writeFileSync(path.join(sceneDir, `${s.lineId}_${lang}.wav`), s.wavBuffer);
                verifiedMeta.push({
                  lineId: s.lineId,
                  durationSec: s.durationSec,
                  charsPerSec: s.charsPerSec,
                });
              }
              syncAudioManifest({
                sceneId,
                lang: lang as LanguageCode,
                voiceId,
                lines: verifiedMeta,
              });
            }

            const manifest = syncAudioManifest();
            return sendJson(res, 200, {
              ok: true,
              batchAudioUrl: `/audio/batches/${batchFileName}?t=${Date.now()}`,
              verification: {
                ...verification,
                slices: verification.slices.map(({ wavBuffer, ...rest }) => rest),
              },
              manifest,
            });
          }

          // 8. POST /api/audio-studio/normalize-scene (0 API Calls! Balances RMS loudness across all WAVs in a scene+lang)
          if (req.method === 'POST' && url === '/api/audio-studio/normalize-scene') {
            const { sceneId, lang } = await readJsonBody(req);
            const scene = SCENES_LIBRARY.find((s) => s.metadata.id === sceneId);
            if (!scene) {
              return sendJson(res, 404, { error: `Unknown scene ${sceneId}` });
            }

            const sceneDir = path.join(publicScenesDir, sceneId);
            let normalizedCount = 0;

            for (const line of scene.lines) {
              const wavPath = path.join(sceneDir, `${line.lineId}_${lang}.wav`);
              if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 1000) {
                const rawWav = fs.readFileSync(wavPath);
                const normWav = normalizeWavBufferRms(rawWav, 3800);
                fs.writeFileSync(wavPath, normWav);
                normalizedCount++;
              }
            }

            return sendJson(res, 200, {
              ok: true,
              normalizedCount,
              manifest: syncAudioManifest(),
            });
          }

          return sendJson(res, 404, { error: `Unknown studio endpoint ${url}` });
        } catch (err: any) {
          console.error('[AudioStudioPlugin Error]', err);
          return sendJson(res, 500, {
            ok: false,
            error: err?.message || String(err),
          });
        }
      });
    },
  };
}
