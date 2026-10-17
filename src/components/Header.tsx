import React from 'react';
import { ArrowRightLeft, Key, Sparkles, BookOpen, Award, LayoutGrid, Sliders } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../types/scene';
import { getStoredApiKey } from '../services/geminiAudioService';

export type ActiveAppView = 'home' | 'lesson' | 'review' | 'audio-studio';

interface HeaderProps {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  activeView: ActiveAppView;
  hasSelectedScene: boolean;
  onNativeLanguageChange: (lang: LanguageCode) => void;
  onTargetLanguageChange: (lang: LanguageCode) => void;
  onSwapLanguages: () => void;
  onOpenApiKeyModal: () => void;
  onNavigate: (view: ActiveAppView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  nativeLanguage,
  targetLanguage,
  activeView,
  hasSelectedScene,
  onNativeLanguageChange,
  onTargetLanguageChange,
  onSwapLanguages,
  onOpenApiKeyModal,
  onNavigate,
}) => {
  const hasApiKey = Boolean(getStoredApiKey());
  const isHomeView = activeView === 'home';
  const isAudioStudioView = activeView === 'audio-studio';

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: MethodTalk Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#9A3412] flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-orange-900 transition-colors">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-stone-900">
            MethodTalk
          </span>
        </button>

        {/* Right: Contextual Content */}
        {isHomeView || isAudioStudioView ? (
          <div className="flex items-center gap-2.5">
            {isHomeView && (
              <div className="flex items-center gap-2 bg-[#F3EFEA] border border-stone-200 rounded-xl px-2.5 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500 font-medium hidden sm:inline">
                    I speak
                  </span>
                  <select
                    aria-label="I Speak Language"
                    value={nativeLanguage}
                    onChange={(e) => onNativeLanguageChange(e.target.value as LanguageCode)}
                    className="bg-white text-stone-800 text-xs font-medium rounded-lg px-2 py-1 border border-stone-200 focus:outline-none focus:border-[#9A3412]"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={onSwapLanguages}
                  title="Swap Languages"
                  className="p-1 rounded-md hover:bg-stone-200/70 text-stone-600 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#9A3412] font-semibold hidden sm:inline">
                    Learning
                  </span>
                  <select
                    aria-label="Learning Language"
                    value={targetLanguage}
                    onChange={(e) => onTargetLanguageChange(e.target.value as LanguageCode)}
                    className="bg-amber-50 text-[#9A3412] text-xs font-bold rounded-lg px-2 py-1 border border-amber-300/80 focus:outline-none focus:border-[#9A3412]"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-white text-stone-900">
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={() =>
                onNavigate(isAudioStudioView ? 'home' : 'audio-studio')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                isAudioStudioView
                  ? 'bg-[#9A3412] text-white border-[#9A3412] shadow-2xs'
                  : 'bg-[#FDF6EC] text-[#9A3412] border-amber-300 hover:bg-amber-100/70'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isAudioStudioView ? '← Back to Library' : 'Audio Studio'}</span>
            </button>

            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                hasApiKey
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {hasApiKey ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">AI Ready</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-[#9A3412]" />
                  <span>API Key</span>
                </>
              )}
            </button>
          </div>
        ) : (
          hasSelectedScene && (
            <nav
              aria-label="Scene Navigation"
              className="flex items-center gap-1 bg-[#F3EFEA] p-1 rounded-xl border border-stone-200"
            >
              <button
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>

              <button
                onClick={() => onNavigate('lesson')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'lesson'
                    ? 'bg-[#9A3412] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Scene Script</span>
              </button>

              <button
                onClick={() => onNavigate('review')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'review'
                    ? 'bg-[#9A3412] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Studio Review</span>
              </button>

              <button
                onClick={() => onNavigate('audio-studio')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
              >
                <Sliders className="w-3.5 h-3.5 text-[#9A3412]" />
                <span>Audio Studio</span>
              </button>
            </nav>
          )
        )}
      </div>
    </header>
  );
};
