import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Scissors,
  RefreshCw,
  Mic2,
  Waves,
  Save,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  LanguageCode,
  SceneEntry,
  SUPPORTED_LANGUAGES,
} from '../types/scene';
import { SCENES_LIBRARY } from '../data/scenes';
import { CHARACTER_REGISTRY, getCharacterById } from '../data/characters';
import { getStoredApiKey } from '../services/geminiAudioService';
import audioManifestData from '../data/audioManifest.json';
import customVoicesData from '../data/customVoices.json';

interface LineProvenanceRecord {
  status: 'verified' | 'legacy_voice' | 'missing';
  voiceId: string;
  model: string;
  durationSec?: number;
  charsPerSec?: number;
  updatedAt?: string;
}

interface SceneLanguageManifest {
  voicedLines: string[];
  verifiedLines: string[];
  legacyLines: string[];
  totalLines: number;
  isComplete: boolean;
  isVerifiedComplete: boolean;
  lineRecords: Record<string, LineProvenanceRecord>;
}

type AudioManifestMap = Record<string, Record<LanguageCode, SceneLanguageManifest>>;

interface SlicedPartClient {
  lineId: string;
  order: number;
  characterId: string;
  spokenText: string;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  wordCount: number;
  charCount: number;
  charsPerSec: number;
  silenceGapAfterMs: number | null;
  peakRms: number;
  isAligned: boolean;
  alignmentNote: string;
}

interface BatchVerificationClient {
  success: boolean;
  expectedLineCount: number;
  detectedSegmentCount: number;
  totalDurationSec: number;
  sampleRate: number;
  splitTimestampsSec: number[];
  waveformPeaks: number[];
  slices: SlicedPartClient[];
  errors: string[];
}

interface QuotaTelemetry {
  status: number;
  isDailyQuota: boolean;
  quotaId: string;
  quotaLimit: string;
  retrySeconds: number;
  message: string;
  timestamp: string;
}

const BATCH_PAUSE_DELIMITER = ' <long pause> <long pause> ';

export const AudioStudioDashboard: React.FC = () => {
  const [manifest, setManifest] = useState<AudioManifestMap>(
    audioManifestData as unknown as AudioManifestMap
  );
  const [customVoices, setCustomVoices] = useState<
    Record<string, Partial<Record<LanguageCode, string>>>
  >(customVoicesData as Record<string, Partial<Record<LanguageCode, string>>>);
  const [promptOverrides, setPromptOverrides] = useState<
    Record<string, Partial<Record<LanguageCode, string>>>
  >({});
  const [batchFiles, setBatchFiles] = useState<string[]>([]);
  const [voicePreviewFiles, setVoicePreviewFiles] = useState<string[]>([]);

  // Active Selection in Studio
  const [selectedSceneId, setSelectedSceneId] = useState<string>('matrix-red-pill');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('pt-PT');
  const [selectedBatchCharacterId, setSelectedBatchCharacterId] =
    useState<string>('morpheus');

  // Editable Voice Prompts Map (`${characterId}_${lang}`)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});

  // Slicer Tuning Controls (for 0-API-Call Offline Re-Slicing)
  const [padMs, setPadMs] = useState<number>(100);
  const [minValleyMs, setMinValleyMs] = useState<number>(180);
  const [activeVerification, setActiveVerification] =
    useState<BatchVerificationClient | null>(null);
  const [activeBatchAudioUrl, setActiveBatchAudioUrl] = useState<string | null>(
    null
  );

  // Loading & Status Banner States
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [quotaTelemetry, setQuotaTelemetry] = useState<QuotaTelemetry | null>(
    null
  );

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isTableReadPlaying, setIsTableReadPlaying] = useState<boolean>(false);
  const [tableReadActiveLineId, setTableReadActiveLineId] = useState<
    string | null
  >(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tableReadAbortRef = useRef<boolean>(false);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedScene: SceneEntry =
    SCENES_LIBRARY.find((s) => s.metadata.id === selectedSceneId) ||
    SCENES_LIBRARY[0];

  // Ensure selectedBatchCharacterId belongs to selectedScene
  useEffect(() => {
    if (!selectedScene.characterIds.includes(selectedBatchCharacterId)) {
      setSelectedBatchCharacterId(selectedScene.characterIds[0]);
    }
    setActiveVerification(null);
    setActiveBatchAudioUrl(null);
  }, [selectedSceneId, selectedLang]);

  const fetchStudioState = async () => {
    try {
      const res = await fetch('/api/audio-studio/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.manifest) setManifest(data.manifest);
      if (data.customVoices) setCustomVoices(data.customVoices);
      if (data.promptOverrides) setPromptOverrides(data.promptOverrides);
      if (data.batchFiles) setBatchFiles(data.batchFiles);
      if (data.voicePreviewFiles) setVoicePreviewFiles(data.voicePreviewFiles);
    } catch {
      // Static fallback already initialized
    }
  };

  useEffect(() => {
    fetchStudioState();
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Draw Waveform + Cut Markers whenever activeVerification updates
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !activeVerification) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    const totalSec = Math.max(0.1, activeVerification.totalDurationSec);

    // 1. Shade each sliced line's region in warm alternating cream / emerald tint
    activeVerification.slices.forEach((slice, idx) => {
      const x1 = (slice.startTimeSec / totalSec) * width;
      const x2 = (slice.endTimeSec / totalSec) * width;
      ctx.fillStyle = slice.isAligned
        ? idx % 2 === 0
          ? 'rgba(16, 185, 129, 0.11)'
          : 'rgba(154, 52, 18, 0.09)'
        : 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(x1, 0, Math.max(2, x2 - x1), height);

      // Draw lineId tag at top of region
      ctx.fillStyle = '#44403C';
      ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `${slice.lineId} (${slice.durationSec}s)`,
        x1 + 5,
        14 + (idx % 2) * 12
      );
    });

    // 2. Draw Waveform Bars
    const peaks = activeVerification.waveformPeaks || [];
    const barCount = peaks.length;
    if (barCount > 0) {
      const barWidth = width / barCount;
      const midY = height / 2 + 8;
      const maxBarHalfHeight = (height - 28) / 2;

      for (let i = 0; i < barCount; i++) {
        const amp = Math.max(0.03, peaks[i]);
        const halfH = amp * maxBarHalfHeight;
        const x = i * barWidth;
        ctx.fillStyle = amp > 0.12 ? '#9A3412' : '#D6D3D1';
        ctx.fillRect(x, midY - halfH, Math.max(1.5, barWidth - 1), halfH * 2);
      }
    }

    // 3. Draw Vertical Split Boundary Dashed Lines
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    activeVerification.splitTimestampsSec.forEach((splitSec) => {
      const x = (splitSec / totalSec) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = '#065F46';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`✂ ${splitSec}s`, Math.max(2, x - 18), height - 4);
    });
    ctx.setLineDash([]);
  }, [activeVerification]);

  const stopCurrentAudio = () => {
    tableReadAbortRef.current = true;
    setIsTableReadPlaying(false);
    setTableReadActiveLineId(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingAudioId(null);
  };

  const playAudioUrl = (url: string, id: string) => {
    if (playingAudioId === id) {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioId(id);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
      setStatusMessage({
        type: 'warning',
        text: `Audio file not found or not yet recorded (${url}).`,
      });
    };
    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioRef.current = null;
    });
  };

  const handlePlayFullSceneSequence = async () => {
    if (isTableReadPlaying) {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();
    tableReadAbortRef.current = false;
    setIsTableReadPlaying(true);

    for (const line of selectedScene.lines) {
      if (tableReadAbortRef.current) break;
      const lineRecord =
        manifest[selectedSceneId]?.[selectedLang]?.lineRecords?.[line.lineId];
      if (!lineRecord || lineRecord.status === 'missing') {
        continue;
      }

      setTableReadActiveLineId(line.lineId);
      const url = `/audio/scenes/${selectedSceneId}/${line.lineId}_${selectedLang}.wav?t=${Date.now()}`;

      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });

      if (tableReadAbortRef.current) break;
      // Natural 350ms conversational turn pause between lines
      await new Promise((r) => setTimeout(r, 350));
    }

    setIsTableReadPlaying(false);
    setTableReadActiveLineId(null);
    audioRef.current = null;
  };

  const getCharacterPrompt = (characterId: string, lang: LanguageCode): string => {
    const key = `${characterId}_${lang}`;
    if (editedPrompts[key] !== undefined) return editedPrompts[key];
    if (promptOverrides[characterId]?.[lang]) {
      return promptOverrides[characterId][lang]!;
    }
    return CHARACTER_REGISTRY[characterId]?.voices[lang]?.voiceDesignPrompt || '';
  };

  const getCharacterCustomVoiceId = (
    characterId: string,
    lang: LanguageCode
  ): string => {
    return (
      customVoices[characterId]?.[lang] ||
      CHARACTER_REGISTRY[characterId]?.voices[lang]?.customVoiceId ||
      ''
    );
  };

  const handleSaveVoicePrompt = async (
    characterId: string,
    lang: LanguageCode
  ) => {
    const prompt = getCharacterPrompt(characterId, lang);
    setBusyAction(`save-prompt-${characterId}`);
    try {
      const res = await fetch('/api/audio-studio/update-voice-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, lang, prompt }),
      });
      const data = await res.json();
      if (data.ok) {
        setPromptOverrides(data.promptOverrides);
        setStatusMessage({
          type: 'success',
          text: `Saved voice description for ${CHARACTER_REGISTRY[characterId].name} (${lang}).`,
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Save failed' });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePreviewCustomVoiceSample = async (
    characterId: string,
    lang: LanguageCode
  ) => {
    const voiceId = getCharacterCustomVoiceId(characterId, lang);
    if (!voiceId) return;

    const playId = `preview-${voiceId}`;
    if (playingAudioId === playId) {
      stopCurrentAudio();
      return;
    }

    setBusyAction(`preview-${characterId}`);
    try {
      const res = await fetch('/api/audio-studio/fetch-voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, apiKey: getStoredApiKey() }),
      });
      const data = await res.json();
      if (data.ok && data.previewUrl) {
        await fetchStudioState();
        playAudioUrl(`${data.previewUrl}?t=${Date.now()}`, playId);
        setStatusMessage({
          type: 'info',
          text: `Playing ${voiceId} sample_audio preview (0 generateContent quota used).`,
        });
      } else if (data.quotaError) {
        setQuotaTelemetry({
          ...data.quotaError,
          timestamp: new Date().toLocaleTimeString(),
        });
        setStatusMessage({
          type: 'error',
          text: `Voices API error (${data.quotaError.status}): ${data.quotaError.quotaId}`,
        });
      } else {
        setStatusMessage({
          type: 'warning',
          text: data.error || 'Could not load voice sample preview.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Preview failed' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCastCharacterVoice = async (
    characterId: string,
    lang: LanguageCode
  ) => {
    const prompt = getCharacterPrompt(characterId, lang);
    setBusyAction(`cast-${characterId}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio-studio/cast-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          lang,
          prompt,
          apiKey: getStoredApiKey(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCustomVoices(data.customVoices);
        if (data.manifest) setManifest(data.manifest);
        await fetchStudioState();
        setStatusMessage({
          type: 'success',
          text: `Created & locked custom voice ${data.voiceId} for ${CHARACTER_REGISTRY[characterId].name} (${lang})!`,
        });
        if (data.previewUrl) {
          playAudioUrl(`${data.previewUrl}?t=${Date.now()}`, `preview-${data.voiceId}`);
        }
      } else if (data.quotaError) {
        setQuotaTelemetry({
          ...data.quotaError,
          timestamp: new Date().toLocaleTimeString(),
        });
        setStatusMessage({
          type: 'error',
          text: `Voice Design Quota / Error (${data.quotaError.status}): ${data.quotaError.quotaId} (retry in ${data.quotaError.retrySeconds}s)`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to create custom voice.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Request failed' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSynthesizeBatch = async (characterId: string) => {
    setBusyAction(`synth-batch-${characterId}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio-studio/synth-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          characterId,
          lang: selectedLang,
          padMs,
          minValleyMs,
          apiKey: getStoredApiKey(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.manifest) setManifest(data.manifest);
        if (data.verification) setActiveVerification(data.verification);
        if (data.batchAudioUrl) setActiveBatchAudioUrl(data.batchAudioUrl);
        await fetchStudioState();
        setStatusMessage({
          type: data.verification?.success ? 'success' : 'warning',
          text: data.verification?.success
            ? `Batch synthesized, sliced into ${data.verification.detectedSegmentCount} lines, and verified 100% aligned!`
            : `Master batch saved, but alignment check reported ${data.verification?.errors?.length} issue(s). Adjust slicer sliders and click Re-Slice (0 API Calls).`,
        });
      } else if (data.quotaError) {
        setQuotaTelemetry({
          ...data.quotaError,
          timestamp: new Date().toLocaleTimeString(),
        });
        const mins = Math.floor((data.quotaError.retrySeconds || 0) / 60);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        const waitLabel =
          hours > 0
            ? `${hours}h ${remMins}m`
            : `${data.quotaError.retrySeconds}s`;
        setStatusMessage({
          type: 'error',
          text: `gemini-3.8-flash-tts HTTP ${data.quotaError.status}: ${data.quotaError.quotaId} (limit: ${data.quotaError.quotaLimit}, resets in ${waitLabel}).`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Batch synthesis failed.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Batch error' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleResliceMasterBatch = async (
    characterId: string,
    buildFromExistingLineWavs = false
  ) => {
    setBusyAction(`reslice-${characterId}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio-studio/reslice-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          characterId,
          lang: selectedLang,
          padMs,
          minValleyMs,
          buildFromExistingLineWavs,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.manifest) setManifest(data.manifest);
        if (data.verification) setActiveVerification(data.verification);
        if (data.batchAudioUrl) setActiveBatchAudioUrl(data.batchAudioUrl);
        await fetchStudioState();
        setStatusMessage({
          type: data.verification?.success ? 'success' : 'warning',
          text: `Offline Slicer (0 API Calls): Sliced ${data.verification.detectedSegmentCount}/${data.verification.expectedLineCount} lines (${data.verification.totalDurationSec}s master audio).`,
        });
      } else {
        setStatusMessage({
          type: 'warning',
          text: data.error || 'No master batch found on disk yet.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Reslice error' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleTestSingleLine = async (lineId: string, characterId: string) => {
    setBusyAction(`test-line-${lineId}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio-studio/test-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          lineId,
          characterId,
          lang: selectedLang,
          apiKey: getStoredApiKey(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.manifest) setManifest(data.manifest);
        setStatusMessage({
          type: 'success',
          text: `Recorded & verified single line ${lineId} (${data.durationSec}s, ${data.charsPerSec} ch/s) with ${data.voiceId}!`,
        });
        if (data.audioUrl) {
          playAudioUrl(data.audioUrl, `line-${lineId}`);
        }
      } else if (data.quotaError) {
        setQuotaTelemetry({
          ...data.quotaError,
          timestamp: new Date().toLocaleTimeString(),
        });
        setStatusMessage({
          type: 'error',
          text: `gemini-3.8-flash-tts HTTP ${data.quotaError.status}: ${data.quotaError.quotaId} (limit: ${data.quotaError.quotaLimit}).`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Single-line test failed.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Line test error' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleNormalizeSceneVolume = async () => {
    setBusyAction('normalize-scene');
    try {
      const res = await fetch('/api/audio-studio/normalize-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          lang: selectedLang,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Normalized RMS loudness across ${data.normalizedCount} WAV files in ${selectedSceneId} (${selectedLang}) (0 API calls).`,
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e?.message || 'Normalization failed',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // Global summary totals
  let totalCastVoices = 0;
  const totalPossibleVoices = Object.keys(CHARACTER_REGISTRY).length * 4;
  for (const charId of Object.keys(CHARACTER_REGISTRY)) {
    for (const lang of SUPPORTED_LANGUAGES) {
      if (getCharacterCustomVoiceId(charId, lang.code).startsWith('voice_')) {
        totalCastVoices++;
      }
    }
  }

  let totalVerifiedLinesAll = 0;
  let totalLegacyLinesAll = 0;
  const totalLinesAll =
    SCENES_LIBRARY.reduce((acc, s) => acc + s.lines.length, 0) * 4;

  for (const scene of SCENES_LIBRARY) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const cell = manifest[scene.metadata.id]?.[lang.code];
      totalVerifiedLinesAll += cell?.verifiedLines?.length ?? 0;
      totalLegacyLinesAll += cell?.legacyLines?.length ?? 0;
    }
  }

  const activeBatchChar = getCharacterById(selectedBatchCharacterId);
  const activeBatchLines = selectedScene.lines.filter(
    (l) => l.characterId === selectedBatchCharacterId
  );
  const activeBatchTranscript = activeBatchLines
    .map((l) => l.spokenText[selectedLang].trim())
    .join(BATCH_PAUSE_DELIMITER);
  const expectedBatchFileName = `${selectedSceneId}__${selectedBatchCharacterId}__${selectedLang}.wav`;
  const hasSavedMasterBatch = batchFiles.includes(expectedBatchFileName);

  const sceneLangManifest = manifest[selectedSceneId]?.[selectedLang];
  const canSimulateFromExistingLines = activeBatchLines.every((l) =>
    sceneLangManifest?.voicedLines?.includes(l.lineId)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. TOP STUDIO HEADER & QUOTA TELEMETRY BAR */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-[#9A3412] text-xs font-bold uppercase tracking-wider">
                Audio Producer Studio
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-mono font-semibold">
                Model Lock: gemini-3.8-flash-tts
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
              Voice Design, Character Batch Slicer &amp; Verification Control Room
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200">
              <div className="text-stone-500 font-medium">Stage 1: Custom Voices</div>
              <div className="text-sm font-bold text-stone-900">
                {totalCastVoices} / {totalPossibleVoices} Cast (`voice_...`)
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-emerald-800 font-medium">Verified Custom Lines</div>
              <div className="text-sm font-bold text-emerald-950">
                🟢 {totalVerifiedLinesAll} / {totalLinesAll} Lines
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-amber-800 font-medium">Legacy Prebuilt Lines</div>
              <div className="text-sm font-bold text-amber-950">
                🟡 {totalLegacyLinesAll} Playable
              </div>
            </div>
          </div>
        </div>

        {/* Live Status / Quota Telemetry Alert */}
        {statusMessage && (
          <div
            className={`rounded-xl px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-stone-100 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {quotaTelemetry && (
          <div className="rounded-xl bg-[#FDF6EC] border border-amber-300 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 text-stone-800">
            <div>
              <span className="font-bold text-[#9A3412]">
                Last API Quota Telemetry ({quotaTelemetry.timestamp}):
              </span>{' '}
              HTTP {quotaTelemetry.status} &bull; Metric:{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">
                {quotaTelemetry.quotaId}
              </code>{' '}
              &bull; Limit: <strong>{quotaTelemetry.quotaLimit}</strong>
            </div>
            <span className="font-semibold text-[#9A3412]">
              {quotaTelemetry.isDailyQuota
                ? `Daily Free Tier Cap (${Math.floor(
                    quotaTelemetry.retrySeconds / 3600
                  )}h ${Math.floor(
                    (quotaTelemetry.retrySeconds % 3600) / 60
                  )}m until midnight PT reset)`
                : `Retry Window: ${quotaTelemetry.retrySeconds}s`}
            </span>
          </div>
        )}

        {/* GLOBAL SCENE × LANGUAGE MATRIX */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider">
                <th className="py-2 pr-3">Movie Scene</th>
                <th className="py-2 px-3">Format &amp; Batch Cost</th>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <th key={lang.code} className="py-2 px-3">
                    {lang.flag} {lang.name} ({lang.code})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {SCENES_LIBRARY.map((scene) => {
                const sId = scene.metadata.id;
                const charCount = scene.characterIds.length;
                return (
                  <tr key={sId} className="hover:bg-[#FAF8F5]/70">
                    <td className="py-2.5 pr-3 font-bold text-stone-900">
                      {scene.metadata.movieTitle.en}
                      <div className="text-[11px] font-normal text-stone-500">
                        {scene.metadata.sceneTitle.en} ({scene.lines.length} lines)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">
                      <span className="font-semibold text-stone-800">
                        {charCount} {charCount === 1 ? 'Batch' : 'Batches'}
                      </span>{' '}
                      / lang
                      <div className="text-[10px] text-stone-400">
                        ({charCount} API {charCount === 1 ? 'call' : 'calls'})
                      </div>
                    </td>
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const cell = manifest[sId]?.[lang.code];
                      const vCount = cell?.verifiedLines?.length ?? 0;
                      const lCount = cell?.legacyLines?.length ?? 0;
                      const total = scene.lines.length;
                      const isSelected =
                        selectedSceneId === sId && selectedLang === lang.code;

                      const allCast = scene.characterIds.every((cId) =>
                        getCharacterCustomVoiceId(cId, lang.code).startsWith(
                          'voice_'
                        )
                      );

                      return (
                        <td key={lang.code} className="py-2 px-2">
                          <button
                            onClick={() => {
                              setSelectedSceneId(sId);
                              setSelectedLang(lang.code);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#FDF6EC] border-2 border-[#9A3412] shadow-2xs'
                                : vCount === total
                                ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
                                : vCount > 0 || lCount > 0
                                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                                : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-stone-900">
                                {vCount === total
                                  ? `🟢 ${vCount}/${total} Verified`
                                  : vCount > 0
                                  ? `🟡 ${vCount}c+${lCount}p/${total}`
                                  : lCount > 0
                                  ? `🟡 ${lCount}/${total} Legacy`
                                  : `⚪ 0/${total} Voiced`}
                              </div>
                              <div className="text-[10px] text-stone-500">
                                {allCast ? '🎙️ Voices Cast' : '⚠️ Needs Voice Cast'}
                              </div>
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. STAGE 1: CHARACTER VOICE DESIGN & CASTING PANEL */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Stage 1 &mdash; Character Voice Design &amp; Personas ({selectedLang})
            </span>
            <h2 className="text-lg font-bold text-stone-900">
              {selectedScene.metadata.movieTitle[selectedLang]} &mdash; Cast Voice Descriptions
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Endpoint: <code className="font-mono">POST /v1beta/voices</code> (Persistent 1-Year TTL)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedScene.characterIds.map((charId) => {
            const char = getCharacterById(charId);
            const lockedVoiceId = getCharacterCustomVoiceId(charId, selectedLang);
            const hasCustomVoice = lockedVoiceId.startsWith('voice_');
            const currentPrompt = getCharacterPrompt(charId, selectedLang);
            const charLinesCount = selectedScene.lines.filter(
              (l) => l.characterId === charId
            ).length;
            const hasCachedPreview = voicePreviewFiles.includes(
              `${lockedVoiceId}_preview.wav`
            );

            return (
              <div
                key={charId}
                className={`rounded-2xl border p-4 space-y-3 transition-all ${
                  selectedBatchCharacterId === charId
                    ? 'bg-[#FDF6EC]/80 border-[#9A3412]/60'
                    : 'bg-[#FAF8F5] border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{char.avatarEmoji}</span>
                      <h3 className="text-base font-bold text-stone-900">
                        {char.name}
                      </h3>
                      <span className="text-xs text-stone-500">
                        ({char.actorName} &bull; {charLinesCount} lines)
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      {char.description.en}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                      hasCustomVoice
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {hasCustomVoice ? `🟢 ${lockedVoiceId}` : '⚠️ Uncast'}
                  </span>
                </div>

                {/* Editable Voice Design Prompt */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Voice Design Prompt (<code className="font-mono">{selectedLang}</code>):
                  </label>
                  <textarea
                    rows={3}
                    value={currentPrompt}
                    onChange={(e) =>
                      setEditedPrompts((prev) => ({
                        ...prev,
                        [`${charId}_${selectedLang}`]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl bg-white border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#9A3412]"
                  />
                </div>

                {/* Voice Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSaveVoicePrompt(charId, selectedLang)}
                      disabled={busyAction !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Description
                    </button>

                    {hasCustomVoice && (
                      <button
                        onClick={() =>
                          handlePreviewCustomVoiceSample(charId, selectedLang)
                        }
                        disabled={busyAction !== null}
                        title="Auditions the sample_audio WAV from /v1beta/voices/{id} using 0 generateContent quota!"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                        {playingAudioId === `preview-${lockedVoiceId}`
                          ? 'Stop Preview'
                          : hasCachedPreview
                          ? 'Play Voice Sample (Cached)'
                          : 'Audition Voice (0 Quota)'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleCastCharacterVoice(charId, selectedLang)}
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#9A3412] hover:bg-orange-900 text-white text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {busyAction === `cast-${charId}`
                      ? 'Designing Voice...'
                      : hasCustomVoice
                      ? 'Re-Cast Custom Voice'
                      : 'Cast Custom Voice'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. STAGE 2 & 3: CHARACTER + LANGUAGE BATCH RECORDER & WAVEFORM SLICER */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Stage 2 &amp; 3 &mdash; Character + Language Batch Synthesis &amp; Silence Slicer
            </span>
            <h2 className="text-lg font-bold text-stone-900">
              Batch Recorder &amp; Visual Cut Alignment Workbench
            </h2>
          </div>

          {/* Character Selector Tabs within Scene */}
          <div className="flex items-center gap-1.5 bg-[#F3EFEA] p-1 rounded-xl border border-stone-200">
            {selectedScene.characterIds.map((charId) => {
              const char = getCharacterById(charId);
              const count = selectedScene.lines.filter(
                (l) => l.characterId === charId
              ).length;
              const isSelected = selectedBatchCharacterId === charId;
              return (
                <button
                  key={charId}
                  onClick={() => setSelectedBatchCharacterId(charId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#9A3412] text-white shadow-2xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  {char.avatarEmoji} {char.name} ({count} lines = 1 API Call)
                </button>
              );
            })}
          </div>
        </div>

        {/* Batch Transcript Preview Box */}
        <div className="rounded-xl bg-[#FAF8F5] border border-stone-200 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800">
              Exact Verbatim Batch Payload for {activeBatchChar.avatarEmoji}{' '}
              {activeBatchChar.name} ({activeBatchLines.length} lines in{' '}
              <code className="font-mono">{selectedLang}</code>,Voice:{' '}
              <code className="font-mono text-[#9A3412]">
                {getCharacterCustomVoiceId(
                  selectedBatchCharacterId,
                  selectedLang
                ) || 'Uncast'}
              </code>
              ):
            </span>
            <span className="text-stone-500">
              {activeBatchTranscript.length} chars &bull; Separated by{' '}
              <code className="font-mono bg-amber-100 text-[#9A3412] px-1 rounded">
                &lt;long pause&gt; &lt;long pause&gt;
              </code>
            </span>
          </div>
          <div className="text-xs text-stone-700 font-serif leading-relaxed bg-white border border-stone-200/80 rounded-lg p-3 max-h-28 overflow-y-auto">
            {activeBatchLines.map((l, idx) => (
              <React.Fragment key={l.lineId}>
                <span className="font-sans font-bold text-[#9A3412] mr-1">
                  [{l.lineId}]
                </span>
                <span>{l.spokenText[selectedLang]}</span>
                {idx < activeBatchLines.length - 1 && (
                  <span className="mx-2 px-1.5 py-0.5 rounded bg-amber-100 text-[#9A3412] font-mono text-[10px] font-bold">
                    &lt;long pause&gt; &lt;long pause&gt;
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Batch Recording & Offline Slicer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleSynthesizeBatch(selectedBatchCharacterId)}
              disabled={busyAction !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9A3412] hover:bg-orange-900 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Layers className="w-4 h-4" />
              {busyAction === `synth-batch-${selectedBatchCharacterId}`
                ? 'Synthesizing & Slicing Batch...'
                : `Record & Slice ${activeBatchChar.name} Batch (1 API Call)`}
            </button>

            <button
              onClick={() =>
                handleResliceMasterBatch(selectedBatchCharacterId, false)
              }
              disabled={busyAction !== null || !hasSavedMasterBatch}
              title={
                hasSavedMasterBatch
                  ? 'Re-slices the archived master WAV in public/audio/batches/ using 0 API calls'
                  : 'No archived master batch WAV on disk for this character+language yet'
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                hasSavedMasterBatch
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Re-Slice Master WAV (0 API Calls)
            </button>

            {canSimulateFromExistingLines && (
              <button
                onClick={() =>
                  handleResliceMasterBatch(selectedBatchCharacterId, true)
                }
                disabled={busyAction !== null}
                title="Stitches the existing recorded line WAVs on disk with <long pause> gaps and runs the visual waveform slicer (0 API calls)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDF6EC] hover:bg-amber-100/70 text-[#9A3412] border border-amber-300 text-xs font-semibold transition-colors"
              >
                <Waves className="w-3.5 h-3.5" />
                Inspect Waveform from Existing Clips (0 Quota)
              </button>
            )}

            {activeBatchAudioUrl && (
              <button
                onClick={() =>
                  playAudioUrl(activeBatchAudioUrl, 'master-batch-audio')
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {playingAudioId === 'master-batch-audio'
                  ? 'Stop Master WAV'
                  : 'Play Uncut Master WAV'}
              </button>
            )}
          </div>

          {/* Slicer Parameter Sliders */}
          <div className="flex flex-wrap items-center gap-4 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-stone-200 text-xs">
            <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
              <Sliders className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>Slicer Tuning:</span>
            </div>
            <label className="flex items-center gap-2 text-stone-600">
              <span>Min Pause: <strong>{minValleyMs}ms</strong></span>
              <input
                type="range"
                min={100}
                max={600}
                step={20}
                value={minValleyMs}
                onChange={(e) => setMinValleyMs(Number(e.target.value))}
                className="w-20 accent-[#9A3412]"
              />
            </label>
            <label className="flex items-center gap-2 text-stone-600">
              <span>Edge Pad: <strong>{padMs}ms</strong></span>
              <input
                type="range"
                min={20}
                max={260}
                step={20}
                value={padMs}
                onChange={(e) => setPadMs(Number(e.target.value))}
                className="w-20 accent-[#9A3412]"
              />
            </label>
          </div>
        </div>

        {/* Visual Waveform & Slice Cut Markers Canvas */}
        {activeVerification && (
          <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="font-bold text-stone-800">
                Master Batch Waveform &amp; Detected Silence Cut Boundaries ({activeVerification.totalDurationSec}s total &bull;{' '}
                {activeVerification.detectedSegmentCount}/{activeVerification.expectedLineCount} parts aligned)
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  activeVerification.success
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {activeVerification.success
                  ? '✅ All Sliced Parts Line Up With Script Lines'
                  : '⚠️ Alignment Mismatch Detected'}
              </span>
            </div>
            <canvas
              ref={waveformCanvasRef}
              width={960}
              height={96}
              className="w-full h-24 rounded-lg border border-stone-200 bg-[#FAF8F5]"
            />
          </div>
        )}
      </div>

      {/* 4. STAGE 4: FINAL LINE-BY-LINE VERIFICATION TABLE & CONTINUOUS SCENE PLAYER */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Stage 4 &mdash; Line-by-Line Verification &amp; Director&apos;s Cut Table Read
            </span>
            <h2 className="text-lg font-bold text-stone-900">
              {selectedScene.metadata.movieTitle[selectedLang]} ({selectedLang}) &mdash;{' '}
              {selectedScene.lines.length} Script Lines
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleNormalizeSceneVolume}
              disabled={busyAction !== null}
              title="Balances RMS volume across all recorded WAV files in this scene+language (0 API calls)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-200/70 text-stone-700 border border-stone-200 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#9A3412]" />
              Normalize Scene Volume (0 Quota)
            </button>

            <button
              onClick={handlePlayFullSceneSequence}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-colors ${
                isTableReadPlaying
                  ? 'bg-stone-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isTableReadPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Table Read
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play Full Scene Sequence
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full Scene Verification Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 px-2">Line ID</th>
                <th className="py-2 px-2">Character &amp; Locked Voice</th>
                <th className="py-2 px-3">Verbatim Spoken Line ({selectedLang})</th>
                <th className="py-2 px-2">Provenance Status</th>
                <th className="py-2 px-2">Slice Metrics</th>
                <th className="py-2 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedScene.lines.map((line) => {
                const char = getCharacterById(line.characterId);
                const record =
                  sceneLangManifest?.lineRecords?.[line.lineId];
                const sliceDetail = activeVerification?.slices?.find(
                  (s) => s.lineId === line.lineId
                );
                const isPlayingThis =
                  playingAudioId === `line-${line.lineId}` ||
                  tableReadActiveLineId === line.lineId;
                const hasFileOnDisk =
                  record?.status === 'verified' ||
                  record?.status === 'legacy_voice';

                return (
                  <tr
                    key={line.lineId}
                    className={`transition-colors ${
                      isPlayingThis
                        ? 'bg-amber-50/90'
                        : line.characterId === selectedBatchCharacterId
                        ? 'bg-[#FDF6EC]/40 hover:bg-[#FDF6EC]'
                        : 'bg-white hover:bg-stone-50/80'
                    }`}
                  >
                    <td className="py-3 pr-2 font-bold text-stone-400">
                      #{line.order}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-stone-800">
                      {line.lineId}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-stone-900">
                        {char.avatarEmoji} {char.name}
                      </div>
                      <div className="font-mono text-[10px] text-stone-500">
                        {getCharacterCustomVoiceId(char.id, selectedLang) ||
                          'Uncast'}
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-md">
                      <div className="text-xs sm:text-sm font-medium text-stone-900 leading-snug">
                        {line.spokenText[selectedLang]}
                      </div>
                      {selectedLang !== 'en' && (
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          [EN] {line.spokenText.en}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {record?.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Verified ({record.voiceId})
                        </span>
                      ) : record?.status === 'legacy_voice' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                          🟡 Legacy ({record.voiceId})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-500">
                          ⚪ Unvoiced
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-stone-600">
                      {sliceDetail ? (
                        <div>
                          <span className="font-bold text-stone-900">
                            {sliceDetail.durationSec}s
                          </span>{' '}
                          ({sliceDetail.charsPerSec} ch/s)
                          <div className="text-[10px] text-stone-400">
                            [{sliceDetail.startTimeSec}s &ndash;{' '}
                            {sliceDetail.endTimeSec}s]
                          </div>
                        </div>
                      ) : record?.durationSec ? (
                        <div>
                          <span className="font-bold text-stone-900">
                            {record.durationSec}s
                          </span>{' '}
                          ({record.charsPerSec} ch/s)
                        </div>
                      ) : (
                        <span className="text-stone-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            playAudioUrl(
                              `/audio/scenes/${selectedSceneId}/${line.lineId}_${selectedLang}.wav?t=${Date.now()}`,
                              `line-${line.lineId}`
                            )
                          }
                          disabled={!hasFileOnDisk}
                          title={
                            hasFileOnDisk
                              ? `Play ${line.lineId}_${selectedLang}.wav`
                              : 'Not recorded yet'
                          }
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPlayingThis
                              ? 'bg-[#9A3412] text-white border-[#9A3412]'
                              : hasFileOnDisk
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            handleTestSingleLine(line.lineId, line.characterId)
                          }
                          disabled={busyAction !== null}
                          title="Record/Test just this single line with gemini-3.8-flash-tts (1 API Call)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-[#9A3412] border border-amber-300 font-semibold transition-colors"
                        >
                          <Mic2 className="w-3 h-3" />
                          <span>
                            {busyAction === `test-line-${line.lineId}`
                              ? '...'
                              : 'Test 1x'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
