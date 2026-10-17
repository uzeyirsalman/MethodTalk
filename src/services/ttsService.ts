import { CharacterProfile, LanguageCode } from '../types/scene';
import { getStoredApiKey } from './geminiAudioService';

const languageLocaleMap: Record<LanguageCode, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  'pt-PT': 'pt-PT',
};

/**
 * Wraps raw 16-bit 24kHz mono PCM bytes (returned by Gemini TTS inlineData)
 * in a standard 44-byte RIFF WAV header so browser Audio elements can play it.
 */
export function pcmToWavBlob(pcmBytes: Uint8Array, sampleRate = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, 44);
  return new Blob([wavBytes], { type: 'audio/wav' });
}

class TTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  // Cache in-memory synthesized blobs by key (`${characterId}_${lang}_${text}`)
  private liveAudioCache: Map<string, string> = new Map();

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getVoicesForLanguage(lang: LanguageCode): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    const localePrefix = languageLocaleMap[lang].split('-')[0];
    const allVoices = window.speechSynthesis.getVoices();
    // Prefer exact locale match (e.g. pt-PT over pt-BR)
    const exactMatches = allVoices.filter(
      (v) => v.lang.toLowerCase().replace('_', '-') === languageLocaleMap[lang].toLowerCase()
    );
    if (exactMatches.length > 0) return exactMatches;

    return allVoices.filter((v) =>
      v.lang.toLowerCase().startsWith(localePrefix.toLowerCase())
    );
  }

  /**
   * Plays a dialogue line with strict voice continuity and zero prompt leakage:
   * 1. Tries pre-generated local static file (`audioUrl`) first.
   * 2. If not found on disk, synthesizes via Gemini 3.8 TTS using ONLY `text` (spokenText)
   *    and the locked character voice profile for `character + language`.
   * 3. Falls back to Web Speech API if offline or API quota reached.
   */
  public async speak(params: {
    text: string;
    language: LanguageCode;
    character?: CharacterProfile;
    audioUrl?: string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }): Promise<void> {
    this.stop();

    const playbackRate = params.rate || 1.0;

    // 1. Try pre-generated static .wav file first if provided
    if (params.audioUrl) {
      const playedStatic = await this.tryPlayAudioUrl(
        params.audioUrl,
        playbackRate,
        params.onStart,
        params.onEnd
      );
      if (playedStatic) return;
    }

    // 2. Try cached or live Gemini TTS with strict spokenText-only payload
    const cacheKey = `${params.character?.id || 'default'}_${params.language}_${params.text}`;
    const cachedBlobUrl = this.liveAudioCache.get(cacheKey);
    if (cachedBlobUrl) {
      const playedCached = await this.tryPlayAudioUrl(
        cachedBlobUrl,
        playbackRate,
        params.onStart,
        params.onEnd
      );
      if (playedCached) return;
    }

    const apiKey = getStoredApiKey();
    if (apiKey && params.character) {
      const generatedBlobUrl = await this.synthesizeWithGeminiLockedVoice(
        params.text,
        params.language,
        params.character,
        apiKey
      );
      if (generatedBlobUrl) {
        this.liveAudioCache.set(cacheKey, generatedBlobUrl);
        const playedLive = await this.tryPlayAudioUrl(
          generatedBlobUrl,
          playbackRate,
          params.onStart,
          params.onEnd
        );
        if (playedLive) return;
      }
    }

    // 3. Fallback to Browser Web Speech Synthesis
    this.speakWithBrowserTTS(params);
  }

  private tryPlayAudioUrl(
    url: string,
    rate: number,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = rate;

      let started = false;

      audio.onloadedmetadata = () => {
        // Guard against Vite SPA fallback returning HTML 200 for missing .wav files
        if (!audio.duration || isNaN(audio.duration) || audio.duration < 0.15) {
          this.currentAudio = null;
          resolve(false);
        }
      };

      audio.onplay = () => {
        started = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
        resolve(true);
      };

      audio.onerror = () => {
        this.currentAudio = null;
        if (started && onEnd) onEnd();
        resolve(false);
      };

      audio.play().catch(() => {
        this.currentAudio = null;
        resolve(false);
      });
    });
  }

  /**
   * Calls Gemini 3.8 TTS passing ONLY the pure spoken line text (`spokenText`).
   * Character voice identity is locked via `voiceConfig` (customVoiceId or fallbackPrebuiltVoice),
   * never concatenated into the text prompt.
   */
  private async synthesizeWithGeminiLockedVoice(
    pureSpokenText: string,
    language: LanguageCode,
    character: CharacterProfile,
    apiKey: string
  ): Promise<string | null> {
    try {
      const voiceProfile = character.voices[language];
      const voiceConfigPayload = voiceProfile.customVoiceId
        ? { customVoiceConfig: { voiceId: voiceProfile.customVoiceId } }
        : { prebuiltVoiceConfig: { voiceName: voiceProfile.fallbackPrebuiltVoice || 'Charon' } };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    // STRICT ISOLATION: Only the verbatim dialogue line is sent!
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

      if (!response.ok) return null;

      const data = await response.json();
      const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!part?.data) return null;

      const binaryString = atob(part.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if already RIFF WAV or raw PCM L16
      const isRiff =
        bytes.length > 4 &&
        bytes[0] === 0x52 && // 'R'
        bytes[1] === 0x49 && // 'I'
        bytes[2] === 0x46 && // 'F'
        bytes[3] === 0x46;   // 'F'

      const wavBlob = isRiff
        ? new Blob([bytes], { type: 'audio/wav' })
        : pcmToWavBlob(bytes, 24000);

      return URL.createObjectURL(wavBlob);
    } catch {
      return null;
    }
  }

  private speakWithBrowserTTS(params: {
    text: string;
    language: LanguageCode;
    character?: CharacterProfile;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }): void {
    if (!this.isSupported()) {
      if (params.onEnd) params.onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(params.text);
    this.currentUtterance = utterance;
    utterance.lang = languageLocaleMap[params.language] || 'en-US';

    const voices = this.getVoicesForLanguage(params.language);
    if (voices.length > 0) {
      const preferredVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('pavel') ||
          v.name.toLowerCase().includes('markus')
      );
      utterance.voice = preferredVoice || voices[0];
    }

    // Consistent pitch per character ID
    let pitch = 1.0;
    const charId = params.character?.id || '';
    if (charId === 'vito_corleone' || charId === 'morpheus' || charId === 'albus_dumbledore') {
      pitch = 0.82;
    } else if (charId === 'jules_winnfield' || charId === 'aragorn') {
      pitch = 0.9;
    } else if (charId === 'brett' || charId === 'johnny_fontane') {
      pitch = 1.08;
    }

    utterance.pitch = pitch;
    utterance.rate = params.rate || 0.95;

    utterance.onstart = () => {
      if (params.onStart) params.onStart();
    };
    utterance.onend = () => {
      this.currentUtterance = null;
      if (params.onEnd) params.onEnd();
    };
    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (params.onError) params.onError(e);
      else if (params.onEnd) params.onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }
}

export const ttsService = new TTSService();
