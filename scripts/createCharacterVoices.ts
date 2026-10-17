/**
 * Step A: Gemini 3.8 TTS Custom Voice Designer (`POST /v1beta/voices`)
 *
 * Creates and stores a persistent, unique `voice_...` persona for each
 * `Character + Language` pair in `CHARACTER_REGISTRY` using natural-language
 * Voice Design (`type: "prompted"`, `store: true`), and saves the returned
 * voice IDs into `src/data/customVoices.json`.
 *
 * Usage:
 *   npx tsx scripts/createCharacterVoices.ts [--lang=pt-PT]
 */

import * as fs from 'fs';
import * as path from 'path';
import { CHARACTER_REGISTRY } from '../src/data/characters';
import { LanguageCode } from '../src/types/scene';

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

const BCP47_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  'pt-PT': 'pt-PT',
};

async function createPromptedVoice(
  displayName: string,
  lang: LanguageCode,
  voiceDesignPrompt: string,
  attempt = 1
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/voices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          store: true,
          voice: {
            model: 'gemini-3.8-flash-tts',
            type: 'prompted',
            display_name: displayName,
            gender: 'male',
            language_code: BCP47_MAP[lang],
            prompted: {
              input: voiceDesignPrompt,
            },
          },
        }),
      }
    );

    if (response.status === 429 && attempt <= 4) {
      const waitSec = 22 * attempt;
      console.log(`  [RATE LIMIT 429] Waiting ${waitSec}s before retrying voice creation...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return createPromptedVoice(displayName, lang, voiceDesignPrompt, attempt + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  [ERROR ${response.status}] Failed to create voice "${displayName}": ${errText}`);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (err) {
    console.error(`  [EXCEPTION] Failed to create voice "${displayName}":`, err);
    return null;
  }
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('No VITE_GEMINI_API_KEY found in .env');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const langFilter = args.find((a) => a.startsWith('--lang='))?.split('=')[1] as
    | LanguageCode
    | undefined;

  const languages: LanguageCode[] = langFilter
    ? [langFilter]
    : ['pt-PT', 'en', 'ru', 'de'];

  const jsonPath = path.resolve(process.cwd(), 'src', 'data', 'customVoices.json');
  const existingMap: Record<string, Partial<Record<LanguageCode, string>>> = fs.existsSync(
    jsonPath
  )
    ? JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    : {};

  // 1. Check already-stored prompted voices on the server so we can reuse them
  console.log('Checking existing stored custom voices on Gemini API...');
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/voices?type=prompted`,
      {
        headers: { 'x-goog-api-key': GEMINI_API_KEY },
      }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      for (const v of listData.voices || []) {
        console.log(`  Found server voice: ${v.id} -> ${v.display_name || v.displayName}`);
      }
    }
  } catch {
    // Ignore
  }

  // 2. Design custom voices for each Character + Language
  for (const lang of languages) {
    for (const char of Object.values(CHARACTER_REGISTRY)) {
      if (!existingMap[char.id]) {
        existingMap[char.id] = {};
      }

      if (existingMap[char.id][lang]) {
        console.log(`[EXISTS] ${char.id} (${lang}) -> ${existingMap[char.id][lang]}`);
        continue;
      }

      const displayName = `MethodTalk_${char.id}_${lang}`;
      const prompt = char.voices[lang].voiceDesignPrompt;
      console.log(`[DESIGNING VOICE] ${displayName}: "${prompt}"`);

      const voiceId = await createPromptedVoice(displayName, lang, prompt);
      if (voiceId) {
        existingMap[char.id][lang] = voiceId;
        fs.writeFileSync(jsonPath, JSON.stringify(existingMap, null, 2) + '\n', 'utf-8');
        console.log(`  [CREATED & SAVED] ${char.id} (${lang}) => ${voiceId}`);
      }
    }
  }

  console.log('\nCustom voice creation complete! Saved to src/data/customVoices.json');
}

main().catch(console.error);
