import { describe, it, expect } from 'vitest';
import { SCENES_LIBRARY } from '../data/scenes';
import { CHARACTER_REGISTRY, getCharacterById } from '../data/characters';
import { LanguageCode } from '../types/scene';

const LANGUAGES: LanguageCode[] = ['en', 'ru', 'de', 'pt-PT'];

describe('MethodTalk v2 3-Tier Database & Character Registry', () => {
  it('contains exactly the 5 full-length iconic scenes', () => {
    expect(SCENES_LIBRARY).toHaveLength(5);
    const ids = SCENES_LIBRARY.map((s) => s.metadata.id);
    expect(ids).toEqual([
      'godfather-offer',
      'matrix-red-pill',
      'pulp-fiction-ezekiel',
      'lotr-black-gate',
      'harry-potter-welcome',
    ]);
  });

  it('ensures every scene has 8 to 12 lines and complete 4-language metadata', () => {
    for (const scene of SCENES_LIBRARY) {
      expect(scene.lines.length).toBeGreaterThanOrEqual(8);
      expect(scene.lines.length).toBeLessThanOrEqual(12);

      for (const lang of LANGUAGES) {
        expect(scene.metadata.movieTitle[lang].trim().length).toBeGreaterThan(0);
        expect(scene.metadata.sceneTitle[lang].trim().length).toBeGreaterThan(0);
        expect(scene.metadata.blurb[lang].trim().length).toBeGreaterThan(20);
        expect(scene.metadata.famousQuote[lang].trim().length).toBeGreaterThan(5);
        expect(scene.metadata.officialSources[lang].trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('ensures every referenced character exists in CHARACTER_REGISTRY with per-language native voice profiles', () => {
    for (const scene of SCENES_LIBRARY) {
      for (const charId of scene.characterIds) {
        const char = getCharacterById(charId);
        expect(char).toBeDefined();
        for (const lang of LANGUAGES) {
          expect(char.description[lang].trim().length).toBeGreaterThan(10);
          expect(char.voices[lang].voiceDesignPrompt.trim().length).toBeGreaterThan(15);
          expect(char.voices[lang].fallbackPrebuiltVoice.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('strictly isolates spokenText from character descriptions, voice prompts, and stage directions', () => {
    const forbiddenPatterns = [
      /Act and vocalize/i,
      /Style:/i,
      /Line:/i,
      /\[.*\]/, // No bracketed stage directions in spokenText
      /Marlon Brando/i,
      /Patriarch of the Corleone/i,
      /Native .* speaker/i,
    ];

    for (const scene of SCENES_LIBRARY) {
      for (const line of scene.lines) {
        expect(CHARACTER_REGISTRY[line.characterId]).toBeDefined();

        for (const lang of LANGUAGES) {
          const text = line.spokenText[lang];
          expect(text.trim().length).toBeGreaterThan(0);

          for (const pattern of forbiddenPatterns) {
            expect(text).not.toMatch(pattern);
          }

          // Ensure character bio is never embedded in spokenText
          const charBio = CHARACTER_REGISTRY[line.characterId].description[lang];
          expect(text).not.toContain(charBio);

          // Ensure targetWords are properly tokenized
          expect(line.targetWords[lang].length).toBeGreaterThan(0);
        }
      }
    }
  });
});
