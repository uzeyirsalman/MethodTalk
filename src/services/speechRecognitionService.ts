import { KaraokeState } from '../types/audio';
import { LanguageCode } from '../types/scene';

type SpeechRecognitionInstance = any;

const languageLocaleMap: Record<LanguageCode, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  'pt-PT': 'pt-PT',
};

/**
 * Normalizes a word across English, Russian (Cyrillic), German, and European Portuguese
 * by stripping punctuation and normalizing diacritics for resilient live karaoke matching.
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/ё/g, 'е') // Russian ё/е equivalence
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’«»„“”—–[\]]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchSpokenWords(
  spokenTranscript: string,
  targetWords: string[]
): KaraokeState {
  if (!spokenTranscript.trim() || targetWords.length === 0) {
    return {
      spokenText: spokenTranscript,
      matchedIndices: [],
      completionPercentage: 0,
      isComplete: false,
    };
  }

  const spokenTokens = spokenTranscript
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  const matchedIndices: number[] = [];
  let tokenPointer = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const targetNorm = normalizeWord(targetWords[i]);
    if (!targetNorm) {
      matchedIndices.push(i);
      continue;
    }

    let foundIndex = -1;
    // Allow a small lookahead window so a missed word doesn't block the rest of the sentence
    for (let j = Math.max(0, tokenPointer - 1); j < spokenTokens.length; j++) {
      const spokenToken = spokenTokens[j];
      if (
        spokenToken === targetNorm ||
        (targetNorm.length >= 4 && spokenToken.includes(targetNorm)) ||
        (spokenToken.length >= 4 && targetNorm.includes(spokenToken))
      ) {
        foundIndex = j;
        break;
      }
    }

    if (foundIndex !== -1) {
      matchedIndices.push(i);
      tokenPointer = foundIndex + 1;
    }
  }

  const validTargetWordsCount = targetWords.filter((w) => normalizeWord(w).length > 0).length;
  const completionPercentage =
    validTargetWordsCount > 0
      ? Math.round((matchedIndices.length / validTargetWordsCount) * 100)
      : 0;

  return {
    spokenText: spokenTranscript,
    matchedIndices,
    completionPercentage,
    isComplete:
      completionPercentage >= 85 ||
      (validTargetWordsCount <= 4 && matchedIndices.length >= Math.max(1, validTargetWordsCount - 1)),
  };
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(params: {
    language: LanguageCode;
    targetWords: string[];
    onProgress: (state: KaraokeState) => void;
    onError?: (error: any) => void;
  }): void {
    if (!this.recognition) {
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognition.lang = languageLocaleMap[params.language] || 'en-US';

    this.recognition.onresult = (event: any) => {
      let accumulatedTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        accumulatedTranscript += event.results[i][0].transcript + ' ';
      }

      const matchState = matchSpokenWords(accumulatedTranscript, params.targetWords);
      params.onProgress(matchState);
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        if (params.onError) {
          params.onError(event.error);
        }
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch {
      // Ignore already started error
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.isListening = false;
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
