export type LanguageCode = 'en' | 'ru' | 'de' | 'pt-PT';

// Backward-compatible alias where helpful
export type SupportedLanguage = LanguageCode;

export type SceneType = 'dialogue' | 'monologue';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type MovieGenre =
  | 'Crime'
  | 'Drama'
  | 'Sci-Fi'
  | 'Action'
  | 'Fantasy'
  | 'Adventure';

export const SUPPORTED_LANGUAGES: {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  bcp47: string;
  dubLabel: string;
}[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    bcp47: 'en-US',
    dubLabel: 'Original Screenplay',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    bcp47: 'ru-RU',
    dubLabel: 'Официальный дубляж',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    bcp47: 'de-DE',
    dubLabel: 'Deutsche Synchronfassung',
  },
  {
    code: 'pt-PT',
    name: 'Portuguese (PT)',
    nativeName: 'Português (Portugal)',
    flag: '🇵🇹',
    bcp47: 'pt-PT',
    dubLabel: 'Versão Oficial Portuguesa',
  },
];

// ============================================================================
// TIER 2: SHARED CHARACTER REGISTRY (Reusable across scenes from the same movie)
// ============================================================================
export interface LanguageVoiceProfile {
  /**
   * Used ONLY ONCE during `voices.create` to design the native voice in this language.
   * NEVER sent as spoken text during line synthesis!
   */
  voiceDesignPrompt: string;
  /**
   * Persistent Voice ID returned by Gemini `voices.create(store=true)` for this
   * specific Character + Language pair. Ensures 100% identical voice across all lines.
   */
  customVoiceId?: string;
  /**
   * Fallback locked prebuilt voice name (e.g., 'Fenrir', 'Charon', 'Orus', 'Puck', 'Kore')
   */
  fallbackPrebuiltVoice: string;
}

export interface CharacterProfile {
  id: string; // e.g., "vito_corleone"
  name: string; // "Don Vito Corleone"
  movieTitle: string; // "The Godfather"
  actorName: string; // "Marlon Brando"
  avatarEmoji: string; // UI badge / avatar icon
  description: Record<LanguageCode, string>; // UI-ONLY bio. NEVER sent to TTS!
  // Per-language voice profile ensures authentic native pronunciation + vocal consistency
  voices: Record<LanguageCode, LanguageVoiceProfile>;
}

// ============================================================================
// TIER 1: SCENE METADATA & BLURB
// ============================================================================
export interface SceneMetadata {
  id: string; // e.g., "godfather-offer"
  movieTitle: Record<LanguageCode, string>;
  releaseYear: number;
  genre: MovieGenre;
  sceneType: SceneType; // 'dialogue' | 'monologue'
  cefrLevel: CEFRLevel; // 'A1' | 'A2' | 'B1' | 'B2'
  durationSeconds: number;
  backdropGradient: string;
  sceneTitle: Record<LanguageCode, string>; // Title of this specific scene
  blurb: Record<LanguageCode, string>; // 2-3 sentence context setting the stage (UI only)
  famousQuote: Record<LanguageCode, string>; // The signature climax line of the scene
  officialSources: Record<LanguageCode, string>; // Attribution of the official dub/sub source
}

// ============================================================================
// TIER 3: DIALOGUE / MONOLOGUE LINES (Strictly Isolated Spoken Text)
// ============================================================================
export interface DialogueLine {
  lineId: string; // e.g., "gf_01"
  order: number; // 1, 2, 3...
  characterId: string; // Foreign key to CharacterProfile.id
  /**
   * UI & optional speech_metadata annotation ONLY (e.g., "calm, raspy").
   * Strictly isolated from spokenText so TTS never reads it aloud.
   */
  emotionCue?: string;
  /**
   * PURE verbatim spoken dialogue ONLY (1-3 sentences max).
   * Zero character descriptions, zero bracketed stage directions.
   */
  spokenText: Record<LanguageCode, string>;
  /**
   * Pre-tokenized words for live karaoke word matching.
   */
  targetWords: Record<LanguageCode, string[]>;
  /**
   * Pre-generated static audio path per language (`/audio/scenes/...`)
   */
  audioUrl?: Partial<Record<LanguageCode, string>>;
  /**
   * Optional pedagogical language note for learners.
   */
  grammarNote?: Partial<Record<LanguageCode, string>>;
}

// ============================================================================
// COMPLETE SCENE ENTRY
// ============================================================================
export interface SceneEntry {
  metadata: SceneMetadata;
  characterIds: string[]; // References CharacterProfile IDs in the shared Character Registry
  lines: DialogueLine[];
}

/**
 * Helper to tokenize a pure spoken line into clean target words for live karaoke.
 */
export function tokenizeSpokenText(text: string): string[] {
  return text
    .replace(/[«»„“”"'.!?,;:—–\-()[\]]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
