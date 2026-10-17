import React from 'react';
import { Search } from 'lucide-react';
import {
  CEFRLevel,
  LanguageCode,
  SceneEntry,
  SceneType,
} from '../types/scene';
import { getSceneCharacters } from '../data/characters';

interface HomeViewProps {
  scenes: SceneEntry[];
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  searchQuery: string;
  selectedLevel: CEFRLevel | 'ALL';
  selectedType: SceneType | 'ALL';
  onSearchChange: (q: string) => void;
  onLevelChange: (level: CEFRLevel | 'ALL') => void;
  onTypeChange: (type: SceneType | 'ALL') => void;
  onSelectScene: (scene: SceneEntry) => void;
}

const LEVELS: (CEFRLevel | 'ALL')[] = ['ALL', 'A1', 'A2', 'B1', 'B2'];

export const HomeView: React.FC<HomeViewProps> = ({
  scenes,
  nativeLanguage,
  targetLanguage,
  searchQuery,
  selectedLevel,
  selectedType,
  onSearchChange,
  onLevelChange,
  onTypeChange,
  onSelectScene,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Compact Search & Filters Bar (No Hero Banner) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movie title or famous quote..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#9A3412] shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format Filter */}
          <div className="flex items-center gap-1 bg-[#F3EFEA] p-1 rounded-xl border border-stone-200">
            {(
              [
                { value: 'ALL', label: 'All' },
                { value: 'dialogue', label: 'Dialogues' },
                { value: 'monologue', label: 'Monologues' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                onClick={() => onTypeChange(item.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedType === item.value
                    ? 'bg-[#9A3412] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CEFR Filter */}
          <div className="flex items-center gap-1 bg-[#F3EFEA] p-1 rounded-xl border border-stone-200">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => onLevelChange(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedLevel === lvl
                    ? 'bg-[#9A3412] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {lvl === 'ALL' ? 'All Levels' : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decluttered 2-Column Scene Cards Grid */}
      {scenes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8">
          <p className="text-stone-600 text-sm font-medium">No scenes match your filters.</p>
          <button
            onClick={() => {
              onSearchChange('');
              onLevelChange('ALL');
              onTypeChange('ALL');
            }}
            className="mt-3 px-4 py-1.5 rounded-lg bg-[#9A3412] text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map((scene) => {
            const { metadata, lines } = scene;
            const cast = getSceneCharacters(scene.characterIds);

            return (
              <div
                key={metadata.id}
                onClick={() => onSelectScene(scene)}
                className="group cursor-pointer rounded-2xl border border-stone-200/90 hover:border-[#9A3412]/60 bg-white p-5 transition-all hover:shadow-md flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  {/* Top Meta Row: CEFR Badge + Format + Year */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-[#9A3412]">
                        {metadata.cefrLevel}
                      </span>
                      <span className="text-stone-500 font-medium">
                        {metadata.sceneType === 'dialogue' ? 'Dialogue' : 'Monologue'} &bull;{' '}
                        {lines.length} Lines
                      </span>
                    </div>
                    <span className="text-stone-400 font-medium">{metadata.releaseYear}</span>
                  </div>

                  {/* Movie Title */}
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 group-hover:text-[#9A3412] transition-colors">
                      {metadata.movieTitle[targetLanguage]}
                    </h2>
                    {nativeLanguage !== targetLanguage && (
                      <p className="text-xs text-stone-500">
                        {metadata.movieTitle[nativeLanguage]} &mdash;{' '}
                        {metadata.sceneTitle[targetLanguage]}
                      </p>
                    )}
                  </div>

                  {/* Famous Climax Quote with Terracotta Left Accent */}
                  <p className="text-xs sm:text-sm italic text-stone-700 pl-3 border-l-2 border-[#9A3412] leading-relaxed">
                    &ldquo;{metadata.famousQuote[targetLanguage]}&rdquo;
                  </p>
                </div>

                {/* Minimal Card Footer: Cast Names + Practice Link */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <span className="text-stone-500 truncate pr-2">
                    {cast.map((c) => `${c.avatarEmoji} ${c.name}`).join(' · ')}
                  </span>
                  <span className="font-bold text-[#9A3412] shrink-0 group-hover:translate-x-0.5 transition-transform">
                    Practice &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
