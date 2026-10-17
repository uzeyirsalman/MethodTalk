import { LanguageCode } from './scene';

export interface WordToPolish {
  word: string;
  expectedIpa: string;
  actualSpoken?: string;
  note: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface LineEvaluation {
  lineId: string;
  order: number;
  characterId: string;
  targetText: string;
  overallScore: number; // 0 - 100
  accuracyScore: number;
  fluencyScore: number;
  recordedAudioUrl?: string; // Object URL from recorded Blob for instant playback
  recordedBlob?: Blob;
  wordsToPolish: WordToPolish[];
  coachingTip: string;
  languageInsights: string[];
  isEvaluating?: boolean;
}

export interface SceneDebriefReport {
  sceneId: string;
  movieTitle: string;
  sceneTitle: string;
  characterPlayed: string;
  modeUsed: 'roleplay' | 'shadowing';
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  overallScore: number;
  fluencyScore: number;
  accuracyScore: number;
  linesCompleted: number;
  totalUserLines: number;
  evaluations: LineEvaluation[];
  allWordsToPolish: WordToPolish[];
  keyGrammarInsights: string[];
  strengths: string[];
}

export interface KaraokeState {
  spokenText: string;
  matchedIndices: number[];
  completionPercentage: number;
  isComplete: boolean;
}
