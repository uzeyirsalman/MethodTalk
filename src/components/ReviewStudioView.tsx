import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Square,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { LanguageCode, SceneEntry } from '../types/scene';
import { LineEvaluation, SceneDebriefReport } from '../types/audio';
import { getCharacterById } from '../data/characters';
import { getCharacterShortName } from './LessonView';
import { ttsService } from '../services/ttsService';
import { evaluateLineSpeech } from '../services/geminiAudioService';

interface ReviewStudioViewProps {
  scene: SceneEntry;
  report: SceneDebriefReport;
  selectedCharacterId: string;
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  onUpdateEvaluation: (lineId: string, ev: LineEvaluation) => void;
}

export const ReviewStudioView: React.FC<ReviewStudioViewProps> = ({
  scene,
  report,
  selectedCharacterId,
  targetLanguage,
  nativeLanguage,
  onUpdateEvaluation,
}) => {
  const [lineEvaluations, setLineEvaluations] = useState<Record<string, LineEvaluation>>(() => {
    const map: Record<string, LineEvaluation> = {};
    for (const ev of report.evaluations) {
      map[ev.lineId] = ev;
    }
    return map;
  });

  const [reRecordingLineId, setReRecordingLineId] = useState<string | null>(null);
  const [activeRecorder, setActiveRecorder] = useState<MediaRecorder | null>(null);
  const [playingUserAudioId, setPlayingUserAudioId] = useState<string | null>(null);

  const handlePlayAiActor = (lineId: string) => {
    const line = scene.lines.find((l) => l.lineId === lineId);
    if (!line) return;
    const character = getCharacterById(line.characterId);
    ttsService.speak({
      text: line.spokenText[targetLanguage],
      language: targetLanguage,
      character,
      audioUrl: line.audioUrl?.[targetLanguage],
    });
  };

  const handlePlayMyRecording = (lineId: string) => {
    ttsService.stop();
    const ev = lineEvaluations[lineId];
    if (!ev?.recordedAudioUrl) return;

    setPlayingUserAudioId(lineId);
    const audio = new Audio(ev.recordedAudioUrl);
    audio.onended = () => setPlayingUserAudioId(null);
    audio.onerror = () => setPlayingUserAudioId(null);
    audio.play().catch(() => setPlayingUserAudioId(null));
  };

  const handleStartReRecord = async (lineId: string) => {
    ttsService.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const line = scene.lines.find((l) => l.lineId === lineId);
        if (!line) return;
        const character = getCharacterById(line.characterId);

        const updatedEval = await evaluateLineSpeech({
          lineId: line.lineId,
          order: line.order,
          characterId: line.characterId,
          audioBlob: blob,
          targetText: line.spokenText[targetLanguage],
          language: targetLanguage,
          characterName: character.name,
        });

        setLineEvaluations((prev) => ({
          ...prev,
          [lineId]: updatedEval,
        }));
        onUpdateEvaluation(lineId, updatedEval);
        setReRecordingLineId(null);
        setActiveRecorder(null);
      };

      recorder.start();
      setActiveRecorder(recorder);
      setReRecordingLineId(lineId);
    } catch {
      setReRecordingLineId(null);
    }
  };

  const handleStopReRecord = () => {
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      activeRecorder.stop();
    }
  };

  const allEvals = Object.values(lineEvaluations);
  const avgOverall =
    allEvals.length > 0
      ? Math.round(allEvals.reduce((a, b) => a + b.overallScore, 0) / allEvals.length)
      : report.overallScore;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Compact Summary Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
            Studio Evaluation
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-0.5">
            {report.movieTitle} &mdash; {report.characterPlayed}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200">
            <div className="text-xl font-extrabold text-[#9A3412]">{avgOverall}%</div>
            <div className="text-xs text-stone-500">Overall</div>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200">
            <div className="text-lg font-bold text-emerald-700">{report.accuracyScore}%</div>
            <div className="text-xs text-stone-500">Accuracy</div>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200">
            <div className="text-lg font-bold text-stone-800">{report.fluencyScore}%</div>
            <div className="text-xs text-stone-500">Fluency</div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Audio Comparison (Inline Speaker Name + No Consecutive Duplication) */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
          Side-by-Side Line Comparison (AI Actor vs. Your Recording)
        </h2>

        <div className="space-y-2">
          {scene.lines.map((line, index) => {
            const character = getCharacterById(line.characterId);
            const shortName = getCharacterShortName(character);
            const prevLine = index > 0 ? scene.lines[index - 1] : null;
            const isSameSpeakerAsPrevious =
              prevLine !== null && prevLine.characterId === line.characterId;

            const isUserCharacterLine = line.characterId === selectedCharacterId;
            const ev = lineEvaluations[line.lineId];
            const isReRecording = reRecordingLineId === line.lineId;

            return (
              <div
                key={line.lineId}
                className={`rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isUserCharacterLine
                    ? 'bg-[#FDF6EC] border border-amber-200/90 border-l-4 border-l-[#9A3412]'
                    : 'bg-white border border-stone-200'
                }`}
              >
                <p className="text-sm sm:text-base font-medium text-stone-900 leading-relaxed flex-1">
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

                <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
                  {ev && (
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                      {ev.overallScore}%
                    </span>
                  )}

                  <button
                    onClick={() => handlePlayAiActor(line.lineId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F3EFEA] hover:bg-stone-200/80 text-stone-800 font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#9A3412]" />
                    <span>AI Actor</span>
                  </button>

                  {ev?.recordedAudioUrl && (
                    <button
                      onClick={() => handlePlayMyRecording(line.lineId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border ${
                        playingUserAudioId === line.lineId
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>My Voice</span>
                    </button>
                  )}

                  {!isReRecording ? (
                    <button
                      onClick={() => handleStartReRecord(line.lineId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{ev?.recordedAudioUrl ? 'Redo' : 'Record'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopReRecord}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#9A3412] text-white font-bold animate-pulse"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Save</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Words to Polish & Grammar Notes */}
      {(report.allWordsToPolish.length > 0 || report.keyGrammarInsights.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Pronunciation Polish
            </h3>
            {report.allWordsToPolish.map((w, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80 text-xs">
                <div className="flex items-center justify-between font-bold text-stone-900">
                  <span>{w.word}</span>
                  <span className="font-mono text-[#9A3412]">{w.expectedIpa}</span>
                </div>
                <p className="text-stone-600 mt-0.5">{w.note}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Grammar &amp; Dubbing Notes
            </h3>
            {report.keyGrammarInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80 text-xs text-stone-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
