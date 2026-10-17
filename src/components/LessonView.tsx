import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Volume2,
  Mic,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FastForward,
} from 'lucide-react';
import {
  CharacterProfile,
  DialogueLine,
  LanguageCode,
  SceneEntry,
  SUPPORTED_LANGUAGES,
} from '../types/scene';
import { KaraokeState, LineEvaluation, SceneDebriefReport } from '../types/audio';
import { getCharacterById, getSceneCharacters } from '../data/characters';
import { ttsService } from '../services/ttsService';
import { speechRecognitionService } from '../services/speechRecognitionService';
import { compileDebriefReport, evaluateLineSpeech } from '../services/geminiAudioService';

export type LessonMode = 'study' | 'roleplay' | 'shadowing';

/**
 * Extracts a crisp short/first cue name for inline screenplay flow
 * (e.g., "Don Vito Corleone" -> "Vito", "Johnny Fontane" -> "Johnny",
 *  "Professor Albus Dumbledore" -> "Dumbledore").
 */
export function getCharacterShortName(char: CharacterProfile): string {
  const shortMap: Record<string, string> = {
    vito_corleone: 'Vito',
    johnny_fontane: 'Johnny',
    morpheus: 'Morpheus',
    neo: 'Neo',
    jules_winnfield: 'Jules',
    brett: 'Brett',
    aragorn: 'Aragorn',
    albus_dumbledore: 'Dumbledore',
  };
  return shortMap[char.id] || char.name.split(' ')[0];
}

interface LessonViewProps {
  scene: SceneEntry;
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  selectedCharacterId: string;
  onSelectCharacterId: (id: string) => void;
  evaluations: Record<string, LineEvaluation>;
  onUpdateEvaluation: (lineId: string, ev: LineEvaluation) => void;
  onOpenReview: (report: SceneDebriefReport) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({
  scene,
  nativeLanguage,
  targetLanguage,
  selectedCharacterId,
  onSelectCharacterId,
  evaluations,
  onUpdateEvaluation,
  onOpenReview,
}) => {
  const { metadata, lines } = scene;
  const cast = getSceneCharacters(scene.characterIds);

  const [mode, setMode] = useState<LessonMode>('roleplay');
  const [showTranslationsAndNotes, setShowTranslationsAndNotes] = useState<boolean>(false);
  const [showSceneContextDrawer, setShowSceneContextDrawer] = useState<boolean>(false);

  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [isSessionRunning, setIsSessionRunning] = useState<boolean>(false);
  const [sessionPhase, setSessionPhase] = useState<
    'idle' | 'ai_speaking' | 'user_recording' | 'completed'
  >('idle');

  const [karaokeState, setKaraokeState] = useState<KaraokeState>({
    spokenText: '',
    matchedIndices: [],
    completionPercentage: 0,
    isComplete: false,
  });

  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const isSessionRunningRef = useRef<boolean>(false);

  const nativeLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage)!;

  useEffect(() => {
    isSessionRunningRef.current = isSessionRunning;
  }, [isSessionRunning]);

  useEffect(() => {
    return () => {
      stopAllAudioAndMic();
    };
  }, []);

  useEffect(() => {
    const activeLine = lines[activeLineIndex];
    if (activeLine && lineRefs.current[activeLine.lineId]) {
      lineRefs.current[activeLine.lineId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, lines]);

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const stopAllAudioAndMic = () => {
    clearAutoAdvanceTimer();
    ttsService.stop();
    speechRecognitionService.stopListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handlePlaySingleLine = (index: number) => {
    stopAllAudioAndMic();
    setIsSessionRunning(false);
    setActiveLineIndex(index);
    setSessionPhase('ai_speaking');

    const line = lines[index];
    const character = getCharacterById(line.characterId);

    ttsService.speak({
      text: line.spokenText[targetLanguage],
      language: targetLanguage,
      character,
      audioUrl: line.audioUrl?.[targetLanguage],
      onEnd: () => {
        setSessionPhase('idle');
      },
    });
  };

  const startInteractiveSession = (chosenMode: LessonMode, startIndex = 0) => {
    stopAllAudioAndMic();
    setMode(chosenMode);
    setIsSessionRunning(true);
    isSessionRunningRef.current = true;
    runStepAtIndex(chosenMode, startIndex);
  };

  const stopInteractiveSession = () => {
    stopAllAudioAndMic();
    setIsSessionRunning(false);
    isSessionRunningRef.current = false;
    setSessionPhase('idle');
  };

  const runStepAtIndex = (currentMode: LessonMode, index: number) => {
    if (!isSessionRunningRef.current) return;

    if (index >= lines.length) {
      stopAllAudioAndMic();
      setIsSessionRunning(false);
      isSessionRunningRef.current = false;
      setSessionPhase('completed');
      return;
    }

    setActiveLineIndex(index);
    const line = lines[index];
    const character = getCharacterById(line.characterId);

    if (currentMode === 'study') {
      setSessionPhase('ai_speaking');
      ttsService.speak({
        text: line.spokenText[targetLanguage],
        language: targetLanguage,
        character,
        audioUrl: line.audioUrl?.[targetLanguage],
        onEnd: () => {
          if (isSessionRunningRef.current) {
            runStepAtIndex('study', index + 1);
          }
        },
      });
    } else if (currentMode === 'roleplay') {
      if (line.characterId === selectedCharacterId) {
        beginUserTurnForLine(line, character, currentMode, index);
      } else {
        setSessionPhase('ai_speaking');
        ttsService.speak({
          text: line.spokenText[targetLanguage],
          language: targetLanguage,
          character,
          audioUrl: line.audioUrl?.[targetLanguage],
          onEnd: () => {
            if (isSessionRunningRef.current) {
              runStepAtIndex('roleplay', index + 1);
            }
          },
        });
      }
    } else if (currentMode === 'shadowing') {
      setSessionPhase('ai_speaking');
      ttsService.speak({
        text: line.spokenText[targetLanguage],
        language: targetLanguage,
        character,
        audioUrl: line.audioUrl?.[targetLanguage],
        onEnd: () => {
          if (isSessionRunningRef.current) {
            beginUserTurnForLine(line, character, 'shadowing', index);
          }
        },
      });
    }
  };

  const beginUserTurnForLine = async (
    line: DialogueLine,
    character: CharacterProfile,
    currentMode: LessonMode,
    index: number
  ) => {
    setSessionPhase('user_recording');
    const targetWords = line.targetWords[targetLanguage];
    setKaraokeState({
      spokenText: '',
      matchedIndices: [],
      completionPercentage: 0,
      isComplete: false,
    });

    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start();
    } catch {
      // Mic unavailable
    }

    speechRecognitionService.startListening({
      language: targetLanguage,
      targetWords,
      onProgress: (state) => {
        setKaraokeState(state);
        if (state.isComplete && !autoAdvanceTimerRef.current) {
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            finishUserTurnAndAdvance(line, character, currentMode, index);
          }, 1200);
        }
      },
    });
  };

  const finishUserTurnAndAdvance = (
    line: DialogueLine,
    character: CharacterProfile,
    currentMode: LessonMode,
    index: number
  ) => {
    clearAutoAdvanceTimer();
    speechRecognitionService.stopListening();

    const finalizeBlobAndQueueEvaluation = (blob: Blob) => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const immediateAudioUrl =
        blob.size > 0 ? URL.createObjectURL(blob) : undefined;

      onUpdateEvaluation(line.lineId, {
        lineId: line.lineId,
        order: line.order,
        characterId: line.characterId,
        targetText: line.spokenText[targetLanguage],
        overallScore: 88,
        accuracyScore: 89,
        fluencyScore: 87,
        recordedAudioUrl: immediateAudioUrl,
        recordedBlob: blob,
        wordsToPolish: [],
        coachingTip: 'Evaluating delivery...',
        languageInsights: [],
        isEvaluating: true,
      });

      evaluateLineSpeech({
        lineId: line.lineId,
        order: line.order,
        characterId: line.characterId,
        audioBlob: blob,
        targetText: line.spokenText[targetLanguage],
        language: targetLanguage,
        characterName: character.name,
      }).then((evaluated) => {
        onUpdateEvaluation(line.lineId, {
          ...evaluated,
          isEvaluating: false,
        });
      });
    };

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        finalizeBlobAndQueueEvaluation(audioBlob);
      };
      recorder.stop();
    } else {
      finalizeBlobAndQueueEvaluation(new Blob([], { type: 'audio/webm' }));
    }

    if (isSessionRunningRef.current) {
      runStepAtIndex(currentMode, index + 1);
    } else {
      setSessionPhase('idle');
    }
  };

  const handleOpenStudioReport = () => {
    stopAllAudioAndMic();
    const evalList = Object.values(evaluations);
    const report = compileDebriefReport({
      scene,
      characterId: selectedCharacterId,
      modeUsed: mode === 'shadowing' ? 'shadowing' : 'roleplay',
      targetLanguage,
      nativeLanguage,
      evaluations: evalList,
    });
    onOpenReview(report);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Clean Scene Title Heading */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="px-2 py-0.5 rounded font-bold text-xs bg-amber-100 text-[#9A3412]">
            {metadata.cefrLevel}
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900">
            {metadata.movieTitle[targetLanguage]}
          </h1>
          <span className="text-xs sm:text-sm text-stone-500">
            &mdash; {metadata.sceneTitle[targetLanguage]}
          </span>
        </div>

        <button
          onClick={() => setShowSceneContextDrawer(!showSceneContextDrawer)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F3EFEA] hover:bg-stone-200/70 text-stone-700 text-xs font-medium transition-colors"
        >
          <span>Scene Blurb &amp; Cast</span>
          {showSceneContextDrawer ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Collapsible Scene Blurb & Cast Drawer */}
      {showSceneContextDrawer && (
        <div className="rounded-2xl bg-white border border-stone-200 p-4 space-y-3 shadow-xs">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9A3412] mb-1">
              Scene Setting
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              {metadata.blurb[nativeLanguage]}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-stone-100">
            {cast.map((char) => {
              const isUserChar = char.id === selectedCharacterId;
              return (
                <div
                  key={char.id}
                  onClick={() => onSelectCharacterId(char.id)}
                  className={`cursor-pointer p-3 rounded-xl border text-xs space-y-1 transition-colors ${
                    isUserChar
                      ? 'bg-[#FDF6EC] border-[#9A3412]/50'
                      : 'bg-[#FAF8F5] border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-stone-900">
                    <span>
                      {char.avatarEmoji} {char.name}{' '}
                      <span className="font-normal text-stone-500">({char.actorName})</span>
                    </span>
                    {isUserChar && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-[#9A3412] text-xs">
                        Your Role
                      </span>
                    )}
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    {char.description[nativeLanguage]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STICKY COMPACT MODE & ROLE CONTROL BAR */}
      <div className="sticky top-14 z-30 rounded-2xl bg-white/95 backdrop-blur-sm border border-stone-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F3EFEA] p-1 rounded-xl border border-stone-200">
          {(
            [
              { id: 'study', label: 'Study' },
              { id: 'roleplay', label: 'Roleplay' },
              { id: 'shadowing', label: 'Shadowing' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                stopInteractiveSession();
                setMode(m.id);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mode === m.id
                  ? 'bg-[#9A3412] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {cast.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">Your Role:</span>
              <select
                aria-label="Select Character Role"
                value={selectedCharacterId}
                onChange={(e) => onSelectCharacterId(e.target.value)}
                className="bg-[#FDF6EC] border border-amber-300/90 rounded-lg px-2.5 py-1 font-bold text-[#9A3412] focus:outline-none focus:border-[#9A3412]"
              >
                {cast.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-stone-900">
                    {c.avatarEmoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-stone-600 hover:text-stone-900">
            <input
              type="checkbox"
              checked={showTranslationsAndNotes}
              onChange={(e) => setShowTranslationsAndNotes(e.target.checked)}
              className="rounded accent-[#9A3412]"
            />
            <span>Translations &amp; Notes</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {!isSessionRunning ? (
            <button
              onClick={() => startInteractiveSession(mode, 0)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9A3412] hover:bg-orange-900 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {mode === 'study'
                ? 'Play Scene'
                : mode === 'roleplay'
                ? 'Start Roleplay'
                : 'Start Shadowing'}
            </button>
          ) : (
            <button
              onClick={stopInteractiveSession}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {sessionPhase === 'completed' && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-950">
              Scene complete! Compare your voice recordings side-by-side with the AI Actor.
            </span>
          </div>
          <button
            onClick={handleOpenStudioReport}
            className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
          >
            Open Studio Review &rarr;
          </button>
        </div>
      )}

      {/* INLINE COMPACT SCREENPLAY TELEPROMPTER */}
      <div className="space-y-2 pb-10">
        {lines.map((line, index) => {
          const character = getCharacterById(line.characterId);
          const shortName = getCharacterShortName(character);
          const prevLine = index > 0 ? lines[index - 1] : null;
          // Only show the speaker prefix if the speaker changed from the previous line
          const isSameSpeakerAsPrevious =
            prevLine !== null && prevLine.characterId === line.characterId;

          const isActive = activeLineIndex === index;
          const isUserCharacterLine = line.characterId === selectedCharacterId;
          const isUserPracticeable = mode === 'shadowing' || isUserCharacterLine;
          const isRecordingThisLine = isActive && sessionPhase === 'user_recording';
          const isAiSpeakingThisLine = isActive && sessionPhase === 'ai_speaking';
          const lineEval = evaluations[line.lineId];
          const targetWords = line.targetWords[targetLanguage];

          const cardSurfaceClasses = isRecordingThisLine
            ? 'bg-[#FEF3C7]/60 border-2 border-[#9A3412] shadow-md'
            : isAiSpeakingThisLine
            ? 'bg-white border-2 border-stone-400 shadow-sm'
            : isUserCharacterLine
            ? 'bg-[#FDF6EC] border border-amber-200/90 border-l-4 border-l-[#9A3412]'
            : 'bg-white border border-stone-200/90';

          return (
            <div
              key={line.lineId}
              ref={(el) => {
                lineRefs.current[line.lineId] = el;
              }}
              onClick={() => {
                if (!isSessionRunning) {
                  setActiveLineIndex(index);
                }
              }}
              className={`rounded-xl px-4 py-3 transition-all ${cardSurfaceClasses}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Inline Emoticon + Short Name (only on speaker change) + Spoken Line */}
                <div className="flex-1 min-w-0">
                  {isRecordingThisLine ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-baseline gap-1.5 text-base sm:text-lg font-bold leading-relaxed text-stone-900">
                        {!isSameSpeakerAsPrevious && (
                          <span
                            className={`font-serif font-extrabold uppercase tracking-wider text-xs sm:text-sm mr-1.5 select-none ${
                              isUserCharacterLine ? 'text-[#9A3412]' : 'text-stone-600'
                            }`}
                          >
                            {character.avatarEmoji} {shortName}:
                          </span>
                        )}
                        {targetWords.map((word, wIdx) => {
                          const isMatched = karaokeState.matchedIndices.includes(wIdx);
                          return (
                            <span
                              key={wIdx}
                              className={`px-1 py-0.5 rounded transition-colors ${
                                isMatched
                                  ? 'bg-emerald-200/90 text-emerald-950'
                                  : 'text-stone-900'
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-300/70">
                        <span className="text-xs font-semibold text-[#9A3412]">
                          🎙️ Speak aloud ({karaokeState.completionPercentage}% matched)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            finishUserTurnAndAdvance(line, character, mode, index);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#9A3412] hover:bg-orange-900 text-white text-xs font-bold shadow-2xs"
                        >
                          <FastForward className="w-3.5 h-3.5 fill-current" />
                          Done / Next Line &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base sm:text-lg font-medium text-stone-900 leading-relaxed">
                      {!isSameSpeakerAsPrevious && (
                        <span
                          className={`font-serif font-extrabold uppercase tracking-wider text-xs sm:text-sm mr-2 select-none ${
                            isUserCharacterLine ? 'text-[#9A3412]' : 'text-stone-600'
                          }`}
                        >
                          {character.avatarEmoji} {shortName}:
                        </span>
                      )}
                      {line.spokenText[targetLanguage]}
                    </p>
                  )}
                </div>

                {/* Compact Right-Hand Line Actions */}
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5 text-xs">
                  {lineEval && (
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                      {lineEval.isEvaluating ? '...' : `${lineEval.overallScore}%`}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySingleLine(index);
                    }}
                    title="Listen to line"
                    className="p-1.5 rounded-lg bg-[#F3EFEA] hover:bg-stone-200/80 text-stone-700 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#9A3412]" />
                  </button>

                  {!isSessionRunning && isUserPracticeable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLineIndex(index);
                        setIsSessionRunning(true);
                        isSessionRunningRef.current = true;
                        beginUserTurnForLine(line, character, mode, index);
                      }}
                      title="Practice speaking this line"
                      className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-[#9A3412] border border-amber-300 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toggled Translations & Grammar Notes (Hidden by Default) */}
              {showTranslationsAndNotes && (
                <div className="mt-2 pt-2 border-t border-stone-200/60 space-y-1 text-xs">
                  {nativeLanguage !== targetLanguage && (
                    <p className="text-stone-500">
                      <span className="font-semibold uppercase mr-1">
                        [{nativeLangMeta.code}]
                      </span>
                      {line.spokenText[nativeLanguage]}
                      {line.emotionCue && (
                        <span className="italic text-stone-400 ml-2">
                          ({line.emotionCue})
                        </span>
                      )}
                    </p>
                  )}
                  {line.grammarNote?.[targetLanguage] && (
                    <p className="text-[#9A3412] font-medium">
                      💡 {line.grammarNote[targetLanguage]}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
