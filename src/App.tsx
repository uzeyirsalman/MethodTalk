import React, { useState } from 'react';
import { ActiveAppView, Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LessonView } from './components/LessonView';
import { ReviewStudioView } from './components/ReviewStudioView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { filterScenes } from './data/scenes';
import { CEFRLevel, LanguageCode, SceneEntry, SceneType } from './types/scene';
import { LineEvaluation, SceneDebriefReport } from './types/audio';
import { compileDebriefReport } from './services/geminiAudioService';
import { ttsService } from './services/ttsService';
import { speechRecognitionService } from './services/speechRecognitionService';

export function App() {
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>('en');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('pt-PT');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<SceneType | 'ALL'>('ALL');

  const [selectedScene, setSelectedScene] = useState<SceneEntry | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [evaluations, setEvaluations] = useState<Record<string, LineEvaluation>>({});
  const [activeView, setActiveView] = useState<ActiveAppView>('home');
  const [activeReport, setActiveReport] = useState<SceneDebriefReport | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  const handleSwapLanguages = () => {
    const prevNative = nativeLanguage;
    setNativeLanguage(targetLanguage);
    setTargetLanguage(prevNative);
  };

  const handleSelectScene = (scene: SceneEntry) => {
    ttsService.stop();
    speechRecognitionService.stopListening();
    const defaultRole =
      scene.characterIds[scene.characterIds.length - 1] || scene.characterIds[0];
    setSelectedScene(scene);
    setSelectedCharacterId(defaultRole);
    setEvaluations({});
    setActiveReport(null);
    setActiveView('lesson');
  };

  const handleNavigate = (view: ActiveAppView) => {
    ttsService.stop();
    speechRecognitionService.stopListening();

    if (view === 'home') {
      setActiveView('home');
      return;
    }

    if (view === 'lesson' && selectedScene) {
      setActiveView('lesson');
      return;
    }

    if (view === 'review' && selectedScene) {
      const report = compileDebriefReport({
        scene: selectedScene,
        characterId: selectedCharacterId,
        modeUsed: 'roleplay',
        targetLanguage,
        nativeLanguage,
        evaluations: Object.values(evaluations),
      });
      setActiveReport(report);
      setActiveView('review');
    }
  };

  const filteredScenes = filterScenes({
    searchQuery,
    cefrLevel: selectedLevel,
    sceneType: selectedType,
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      <Header
        nativeLanguage={nativeLanguage}
        targetLanguage={targetLanguage}
        activeView={activeView}
        hasSelectedScene={Boolean(selectedScene)}
        onNativeLanguageChange={setNativeLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onSwapLanguages={handleSwapLanguages}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        {activeView === 'review' && selectedScene && activeReport ? (
          <ReviewStudioView
            scene={selectedScene}
            report={activeReport}
            selectedCharacterId={selectedCharacterId}
            targetLanguage={targetLanguage}
            nativeLanguage={nativeLanguage}
            onUpdateEvaluation={(lineId, ev) =>
              setEvaluations((prev) => ({ ...prev, [lineId]: ev }))
            }
          />
        ) : activeView === 'lesson' && selectedScene ? (
          <LessonView
            scene={selectedScene}
            nativeLanguage={nativeLanguage}
            targetLanguage={targetLanguage}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacterId={setSelectedCharacterId}
            evaluations={evaluations}
            onUpdateEvaluation={(lineId, ev) =>
              setEvaluations((prev) => ({ ...prev, [lineId]: ev }))
            }
            onOpenReview={(report) => {
              setActiveReport(report);
              setActiveView('review');
            }}
          />
        ) : (
          <HomeView
            scenes={filteredScenes}
            nativeLanguage={nativeLanguage}
            targetLanguage={targetLanguage}
            searchQuery={searchQuery}
            selectedLevel={selectedLevel}
            selectedType={selectedType}
            onSearchChange={setSearchQuery}
            onLevelChange={setSelectedLevel}
            onTypeChange={setSelectedType}
            onSelectScene={handleSelectScene}
          />
        )}
      </main>

      <footer className="border-t border-stone-200/80 bg-[#F3EFEA] py-5 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto px-4">
          MethodTalk &bull; Official Dubbed Cinema Scripts (English, Russian, German &amp; European Portuguese)
        </div>
      </footer>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}

export default App;
