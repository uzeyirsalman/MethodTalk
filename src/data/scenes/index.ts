import { CEFRLevel, MovieGenre, SceneEntry, SceneType } from '../../types/scene';
import { godfatherOfferScene } from './godfatherOffer';
import { matrixRedPillScene } from './matrixRedPill';
import { pulpFictionEzekielScene } from './pulpFictionEzekiel';
import { lotrBlackGateScene } from './lotrBlackGate';
import { harryPotterWelcomeScene } from './harryPotterWelcome';

export const SCENES_LIBRARY: SceneEntry[] = [
  godfatherOfferScene,
  matrixRedPillScene,
  pulpFictionEzekielScene,
  lotrBlackGateScene,
  harryPotterWelcomeScene,
];

export function getSceneById(id: string): SceneEntry | undefined {
  return SCENES_LIBRARY.find((scene) => scene.metadata.id === id);
}

export interface SceneFilterOptions {
  searchQuery?: string;
  cefrLevel?: CEFRLevel | 'ALL';
  sceneType?: SceneType | 'ALL';
  genre?: MovieGenre | 'ALL';
}

export function filterScenes(filters: SceneFilterOptions): SceneEntry[] {
  return SCENES_LIBRARY.filter((scene) => {
    const { metadata } = scene;

    if (filters.cefrLevel && filters.cefrLevel !== 'ALL' && metadata.cefrLevel !== filters.cefrLevel) {
      return false;
    }

    if (filters.sceneType && filters.sceneType !== 'ALL' && metadata.sceneType !== filters.sceneType) {
      return false;
    }

    if (filters.genre && filters.genre !== 'ALL' && metadata.genre !== filters.genre) {
      return false;
    }

    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchesTitle = Object.values(metadata.movieTitle).some((t) =>
        t.toLowerCase().includes(q)
      );
      const matchesSceneTitle = Object.values(metadata.sceneTitle).some((t) =>
        t.toLowerCase().includes(q)
      );
      const matchesQuote = Object.values(metadata.famousQuote).some((t) =>
        t.toLowerCase().includes(q)
      );
      const matchesBlurb = Object.values(metadata.blurb).some((t) =>
        t.toLowerCase().includes(q)
      );
      return matchesTitle || matchesSceneTitle || matchesQuote || matchesBlurb;
    }

    return true;
  });
}
