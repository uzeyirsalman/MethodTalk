/**
 * MethodTalk v2: Isolated TTS Batch Audio Pipeline
 *
 * Strictly separates Character Voice Identity (`CHARACTER_REGISTRY`) from pure
 * spoken dialogue (`line.spokenText[lang]`). Includes automatic rate-limit (429)
 * backoff for Gemini Free Tier (3 RPM).
 *
 * Usage:
 *   npx tsx scripts/generateAudioClips.ts [--scene=godfather-offer] [--lang=pt-PT] [--force]
 */

import * as fs from 'fs';
import * as path from 'path';
import { SCENES_LIBRARY } from '../src/data/scenes';
import { getCharacterById } from '../src/data/characters';
import { LanguageCode, SceneEntry } from '../src/types/scene';

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
 * Prepends a 44-byte RIFF/WAV header to raw 24kHz 16-bit mono PCM audio data
 * returned by `gemini-3.8-flash-tts` (`audio/L16;codec=pcm;rate=24000`).
 */
function wrapPcmInWavHeader(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  if (
    pcmBuffer.length > 4 &&
    pcmBuffer.toString('ascii', 0, 4) === 'RIFF'
  ) {
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

async function synthesizePureLine(
  scene: SceneEntry,
  lineId: string,
  characterId: string,
  lang: LanguageCode,
  pureSpokenText: string,
  attempt = 1
): Promise<Buffer | null> {
  if (!GEMINI_API_KEY) {
    console.warn(`[SKIP] No VITE_GEMINI_API_KEY found.`);
    return null;
  }

  const character = getCharacterById(characterId);
  const voiceProfile = character.voices[lang];

  const voiceConfigPayload = voiceProfile.customVoiceId
    ? { customVoiceConfig: { voiceId: voiceProfile.customVoiceId } }
    : { prebuiltVoiceConfig: { voiceName: voiceProfile.fallbackPrebuiltVoice } };

  console.log(
    `[SYNTHESIZING] ${scene.metadata.id} | ${lineId} (${lang}) | ${character.name} [Voice: ${
      voiceProfile.customVoiceId || voiceProfile.fallbackPrebuiltVoice
    }]`
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  // STRICT ISOLATION: Only the verbatim spoken dialogue is sent!
                  text: pureSpokenText,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: voiceConfigPayload,
            },
          },
        }),
      }
    );

    if (response.status === 429 && attempt <= 4) {
      const waitSec = 22 * attempt;
      console.log(`  [RATE LIMIT 429] Waiting ${waitSec}s before retrying ${lineId} (${lang})...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return synthesizePureLine(scene, lineId, characterId, lang, pureSpokenText, attempt + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini TTS API error (${response.status}): ${errText}`);
      return null;
    }

    const data = await response.json();
    const audioPart = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData && p.inlineData.data
    );

    if (audioPart?.inlineData?.data) {
      const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
      return wrapPcmInWavHeader(rawBuffer, 24000);
    }
  } catch (err) {
    console.error(`Failed to synthesize ${lineId} (${lang}):`, err);
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const sceneFilter = args.find((a) => a.startsWith('--scene='))?.split('=')[1];
  const langFilter = args.find((a) => a.startsWith('--lang='))?.split('=')[1] as
    | LanguageCode
    | undefined;
  const forceOverwrite = args.includes('--force');

  const scenesToProcess = sceneFilter
    ? SCENES_LIBRARY.filter((s) => s.metadata.id === sceneFilter)
    : SCENES_LIBRARY;

  const languagesToProcess: LanguageCode[] = langFilter
    ? [langFilter]
    : ['en', 'ru', 'de', 'pt-PT'];

  console.log(`=============================================================`);
  console.log(`MethodTalk v2: Isolated TTS Audio Pipeline (Zero Prompt Leak)`);
  console.log(`Scenes: ${scenesToProcess.map((s) => s.metadata.id).join(', ')}`);
  console.log(`Languages: ${languagesToProcess.join(', ')}`);
  console.log(`=============================================================\n`);

  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio', 'scenes');
  fs.mkdirSync(publicAudioDir, { recursive: true });

  for (const scene of scenesToProcess) {
    const sceneDir = path.join(publicAudioDir, scene.metadata.id);
    fs.mkdirSync(sceneDir, { recursive: true });

    for (const line of scene.lines) {
      for (const lang of languagesToProcess) {
        const destPath = path.join(sceneDir, `${line.lineId}_${lang}.wav`);
        if (!forceOverwrite && fs.existsSync(destPath)) {
          console.log(`[EXISTS] ${destPath}`);
          continue;
        }

        const wavBuffer = await synthesizePureLine(
          scene,
          line.lineId,
          line.characterId,
          lang,
          line.spokenText[lang]
        );

        if (wavBuffer) {
          fs.writeFileSync(destPath, wavBuffer);
          console.log(
            `[SAVED] -> ${destPath} (${Math.round(wavBuffer.length / 1024)} KB)`
          );
        }

        await new Promise((r) => setTimeout(r, 21000));
      }
    }
  }

  console.log(`\nAudio synthesis complete!`);
}

main().catch(console.error);
