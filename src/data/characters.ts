import { CharacterProfile, LanguageCode } from '../types/scene';
import customVoicesMap from './customVoices.json';

const storedVoices = customVoicesMap as Record<string, Partial<Record<LanguageCode, string>>>;

function getCustomVoiceId(charId: string, lang: LanguageCode): string | undefined {
  return storedVoices[charId]?.[lang];
}

/**
 * TIER 2: SHARED CHARACTER REGISTRY
 * Reusable across multiple scenes from the same movie.
 * Every character has:
 * - A unique customVoiceId per Character + Language created via `POST /v1beta/voices` (Voice Design)
 * - A unique fallbackPrebuiltVoice so no two characters ever share a voice.
 */
export const CHARACTER_REGISTRY: Record<string, CharacterProfile> = {
  vito_corleone: {
    id: 'vito_corleone',
    name: 'Don Vito Corleone',
    movieTitle: 'The Godfather (1972)',
    actorName: 'Marlon Brando',
    avatarEmoji: '🌹',
    description: {
      en: 'Patriarch of the Corleone family. Speaks with quiet, gravelly authority, deliberate pauses, and paternal command.',
      ru: 'Патриарх семьи Корлеоне. Говорит тихо, с хрипотцой, неторопливыми паузами и непререкаемым отцовским авторитетом.',
      de: 'Oberhaupt der Familie Corleone. Spricht mit ruhiger, heiserer Autorität, bedächtigen Pausen und väterlicher Strenge.',
      'pt-PT': 'Patriarca da família Corleone. Fala com uma autoridade calma e rouca, pausas deliberadas e comando paternal.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 68-year-old Italian-American patriarch in New York. Deep, raspy, gravelly baritone voice, slow deliberate pacing, hushed and calm paternal authority.',
        customVoiceId: getCustomVoiceId('vito_corleone', 'en'),
        fallbackPrebuiltVoice: 'Charon',
      },
      ru: {
        voiceDesignPrompt:
          'A 68-year-old Russian mafia patriarch dubbing actor. Deep, raspy, gravelly baritone with flawless native Russian theatrical diction, slow and measured delivery.',
        customVoiceId: getCustomVoiceId('vito_corleone', 'ru'),
        fallbackPrebuiltVoice: 'Charon',
      },
      de: {
        voiceDesignPrompt:
          'A 68-year-old German patriarch dubbing actor speaking Standard High German. Deep, gravelly, calm baritone voice with authoritative theatrical warmth.',
        customVoiceId: getCustomVoiceId('vito_corleone', 'de'),
        fallbackPrebuiltVoice: 'Charon',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 68-year-old European Portuguese patriarch from Lisbon. Deep, raspy, calm baritone with clear continental Portuguese phonetics and slow, measured pacing.',
        customVoiceId: getCustomVoiceId('vito_corleone', 'pt-PT'),
        fallbackPrebuiltVoice: 'Charon',
      },
    },
  },

  johnny_fontane: {
    id: 'johnny_fontane',
    name: 'Johnny Fontane',
    movieTitle: 'The Godfather (1972)',
    actorName: 'Al Martino',
    avatarEmoji: '🎙️',
    description: {
      en: 'Don Vito’s godson, a famous singer and actor desperate to revive his fading Hollywood career with a dramatic war-movie role.',
      ru: 'Крестник Дона Вито, известный певец и актёр, отчаянно пытающийся спасти свою карьеру в Голливуде.',
      de: 'Don Vitos Patensohn, ein berühmter Sänger und Schauspieler, der verzweifelt versucht, seine Karriere in Hollywood zu retten.',
      'pt-PT': 'Afilhado de Don Vito, um famoso cantor e ator desesperado por salvar a sua carreira em Hollywood.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 38-year-old classic crooner and actor in 1940s America. Smooth, emotional mid-tenor voice, pleading, anxious, and slightly breathless.',
        customVoiceId: getCustomVoiceId('johnny_fontane', 'en'),
        fallbackPrebuiltVoice: 'Puck',
      },
      ru: {
        voiceDesignPrompt:
          'A 38-year-old Russian male singer and actor. Expressive, emotional mid-tenor voice, pleading delivery with clean native Russian pronunciation.',
        customVoiceId: getCustomVoiceId('johnny_fontane', 'ru'),
        fallbackPrebuiltVoice: 'Puck',
      },
      de: {
        voiceDesignPrompt:
          'A 38-year-old German singer and actor speaking Standard High German. Expressive mid-tenor voice, anxious and pleading tone.',
        customVoiceId: getCustomVoiceId('johnny_fontane', 'de'),
        fallbackPrebuiltVoice: 'Puck',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 38-year-old European Portuguese singer and actor. Expressive mid-tenor voice, emotional and pleading delivery with continental Portuguese pronunciation.',
        customVoiceId: getCustomVoiceId('johnny_fontane', 'pt-PT'),
        fallbackPrebuiltVoice: 'Puck',
      },
    },
  },

  morpheus: {
    id: 'morpheus',
    name: 'Morpheus',
    movieTitle: 'The Matrix (1999)',
    actorName: 'Laurence Fishburne',
    avatarEmoji: '🕶️',
    description: {
      en: 'Captain of the Nebuchadnezzar. Philosophical, resonant, and enigmatic mentor who offers Neo the truth about reality.',
      ru: 'Капитан «Навуходоносора». Мудрый, загадочный наставник с глубоким баритоном, открывающий Нео правду о реальности.',
      de: 'Kapitän der Nebukadnezar. Philosophischer, rätselhafter Mentor mit sonorer Stimme, der Neo die Wahrheit über die Realität offenbart.',
      'pt-PT': 'Capitão da Nabucodonosor. Mentor filosófico, enigmático e de voz grave e ressonante que revela a verdade a Neo.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 42-year-old American philosophical mentor. Rich, resonant, velvety bass-baritone voice. Calm, hypnotic cadence with crisp articulation.',
        customVoiceId: getCustomVoiceId('morpheus', 'en'),
        fallbackPrebuiltVoice: 'Orus',
      },
      ru: {
        voiceDesignPrompt:
          'A 42-year-old Russian philosophical mentor. Deep, resonant, velvety bass-baritone voice with calm, hypnotic native Russian delivery.',
        customVoiceId: getCustomVoiceId('morpheus', 'ru'),
        fallbackPrebuiltVoice: 'Orus',
      },
      de: {
        voiceDesignPrompt:
          'A 42-year-old German philosophical mentor speaking Standard High German. Deep, resonant, velvety baritone voice, calm and enigmatic.',
        customVoiceId: getCustomVoiceId('morpheus', 'de'),
        fallbackPrebuiltVoice: 'Orus',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 42-year-old European Portuguese philosophical mentor. Deep, resonant, velvety bass-baritone voice with calm, hypnotic continental Portuguese diction.',
        customVoiceId: getCustomVoiceId('morpheus', 'pt-PT'),
        fallbackPrebuiltVoice: 'Orus',
      },
    },
  },

  neo: {
    id: 'neo',
    name: 'Neo (Thomas Anderson)',
    movieTitle: 'The Matrix (1999)',
    actorName: 'Keanu Reeves',
    avatarEmoji: '💻',
    description: {
      en: 'A brilliant computer hacker searching for the answer to the question: "What is the Matrix?" Curious, hesitant, and awe-struck.',
      ru: 'Талантливый хакер, ищущий ответ на вопрос: «Что такое Матрица?». Настороженный, искренний и жаждущий правды.',
      de: 'Ein brillanter Hacker auf der Suche nach der Antwort auf die Frage: „Was ist die Matrix?“. Nachdenklich, zögernd und staunend.',
      'pt-PT': 'Um brilhante pirata informático que procura a resposta para a pergunta: «O que é a Matrix?». Curioso, hesitante e atento.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 32-year-old American computer hacker. Clear, understated, calm young male baritone voice, earnest, curious, and slightly hushed.',
        customVoiceId: getCustomVoiceId('neo', 'en'),
        fallbackPrebuiltVoice: 'Enceladus',
      },
      ru: {
        voiceDesignPrompt:
          'A 32-year-old Russian computer hacker. Clear, earnest young adult male baritone voice, thoughtful and slightly cautious.',
        customVoiceId: getCustomVoiceId('neo', 'ru'),
        fallbackPrebuiltVoice: 'Enceladus',
      },
      de: {
        voiceDesignPrompt:
          'A 32-year-old German computer hacker speaking Standard High German. Clear, earnest young adult male baritone voice, understated and curious.',
        customVoiceId: getCustomVoiceId('neo', 'de'),
        fallbackPrebuiltVoice: 'Enceladus',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 32-year-old European Portuguese computer hacker. Clear, understated young adult male baritone voice with authentic continental Portuguese pronunciation.',
        customVoiceId: getCustomVoiceId('neo', 'pt-PT'),
        fallbackPrebuiltVoice: 'Enceladus',
      },
    },
  },

  jules_winnfield: {
    id: 'jules_winnfield',
    name: 'Jules Winnfield',
    movieTitle: 'Pulp Fiction (1994)',
    actorName: 'Samuel L. Jackson',
    avatarEmoji: '🍔',
    description: {
      en: 'Charismatic, intimidating hitman who shifts effortlessly from casual fast-food banter to thunderous biblical prophecy.',
      ru: 'Харизматичный и грозный киллер, мгновенно переходящий от непринуждённой беседы о бургерах к громогласному библейскому пророчеству.',
      de: 'Charismatischer, einschüchternder Auftragskiller, der mühelos von lockerem Fast-Food-Geplauder zu donnernder biblischer Prophezeiung wechselt.',
      'pt-PT': 'Assassino profissional carismático e intimidante, que passa de uma conversa casual sobre hambúrgueres para uma profecia bíblica trovejante.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 45-year-old charismatic American enforcer. Commanding, dynamic, deeply expressive baritone voice with sharp rhythmic cadence and intense dramatic presence.',
        customVoiceId: getCustomVoiceId('jules_winnfield', 'en'),
        fallbackPrebuiltVoice: 'Fenrir',
      },
      ru: {
        voiceDesignPrompt:
          'A 45-year-old charismatic Russian enforcer. Powerful, commanding baritone voice with dynamic theatrical energy and crisp Russian diction.',
        customVoiceId: getCustomVoiceId('jules_winnfield', 'ru'),
        fallbackPrebuiltVoice: 'Fenrir',
      },
      de: {
        voiceDesignPrompt:
          'A 45-year-old charismatic German enforcer speaking Standard High German. Commanding, energetic, intense baritone voice with sharp rhythmic delivery.',
        customVoiceId: getCustomVoiceId('jules_winnfield', 'de'),
        fallbackPrebuiltVoice: 'Fenrir',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 45-year-old charismatic European Portuguese enforcer. Commanding, intense baritone voice with sharp continental Portuguese articulation.',
        customVoiceId: getCustomVoiceId('jules_winnfield', 'pt-PT'),
        fallbackPrebuiltVoice: 'Fenrir',
      },
    },
  },

  brett: {
    id: 'brett',
    name: 'Brett',
    movieTitle: 'Pulp Fiction (1994)',
    actorName: 'Frank Whaley',
    avatarEmoji: '🥤',
    description: {
      en: 'Nervous young associate caught in over his head during an early-morning visit from Jules and Vincent.',
      ru: 'Нервный молодой парень, застигнутый врасплох утренним визитом Джулса и Винсента.',
      de: 'Nervöser junger Geschäftspartner, der beim morgendlichen Besuch von Jules und Vincent völlig die Fassung verliert.',
      'pt-PT': 'Jovem associado nervoso, apanhado de surpresa pela visita matinal de Jules e Vincent.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 26-year-old nervous young American man. High-strung, polite, slightly trembling light tenor voice, hesitant and intimidated.',
        customVoiceId: getCustomVoiceId('brett', 'en'),
        fallbackPrebuiltVoice: 'Iapetus',
      },
      ru: {
        voiceDesignPrompt:
          'A 26-year-old nervous young Russian man. Polite, slightly trembling light tenor voice with clean native Russian pronunciation.',
        customVoiceId: getCustomVoiceId('brett', 'ru'),
        fallbackPrebuiltVoice: 'Iapetus',
      },
      de: {
        voiceDesignPrompt:
          'A 26-year-old nervous young German man speaking Standard High German. Hesitant, polite light tenor voice.',
        customVoiceId: getCustomVoiceId('brett', 'de'),
        fallbackPrebuiltVoice: 'Iapetus',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 26-year-old nervous young European Portuguese man. Hesitant, polite light tenor voice with continental Portuguese pronunciation.',
        customVoiceId: getCustomVoiceId('brett', 'pt-PT'),
        fallbackPrebuiltVoice: 'Iapetus',
      },
    },
  },

  aragorn: {
    id: 'aragorn',
    name: 'Aragorn (Elessar)',
    movieTitle: 'The Lord of the Rings: The Return of the King (2003)',
    actorName: 'Viggo Mortensen',
    avatarEmoji: '⚔️',
    description: {
      en: 'Heir of Isildur and King of Gondor. Delivers a stirring battlefield address at the Black Gate of Mordor to rally the Men of the West.',
      ru: 'Наследник Исилдура и король Гондора. Произносит вдохновляющую речь у Чёрных Врат Мордора, призывая Людей Запада выстоять.',
      de: 'Isildurs Erbe und König von Gondor. Hält vor dem Schwarzen Tor von Mordor eine mitreißende Rede, um den Mut der Menschen des Westens zu entfachen.',
      'pt-PT': 'Herdeiro de Isildur e Rei de Gondor. Profere um discurso inspirador perante o Portão Negro de Mordor para unir os Homens do Oeste.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 42-year-old noble warrior king speaking British-tinged heroic English. Weathered, resonant baritone voice with passionate conviction and inspiring battlefield projection.',
        customVoiceId: getCustomVoiceId('aragorn', 'en'),
        fallbackPrebuiltVoice: 'Schedar',
      },
      ru: {
        voiceDesignPrompt:
          'A 42-year-old noble warrior king speaking Russian. Heroic, resonant baritone voice with epic theatrical power and crystal-clear Russian diction.',
        customVoiceId: getCustomVoiceId('aragorn', 'ru'),
        fallbackPrebuiltVoice: 'Schedar',
      },
      de: {
        voiceDesignPrompt:
          'A 42-year-old noble warrior king speaking Standard High German. Heroic baritone voice with passionate, inspiring battlefield delivery.',
        customVoiceId: getCustomVoiceId('aragorn', 'de'),
        fallbackPrebuiltVoice: 'Schedar',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 42-year-old noble warrior king speaking European Portuguese. Heroic, resonant baritone voice with inspiring continental Portuguese delivery.',
        customVoiceId: getCustomVoiceId('aragorn', 'pt-PT'),
        fallbackPrebuiltVoice: 'Schedar',
      },
    },
  },

  albus_dumbledore: {
    id: 'albus_dumbledore',
    name: 'Professor Albus Dumbledore',
    movieTitle: "Harry Potter and the Philosopher's Stone (2001)",
    actorName: 'Richard Harris',
    avatarEmoji: '🧙‍♂️',
    description: {
      en: 'Headmaster of Hogwarts School of Witchcraft and Wizardry. Wise, warm, and gently eccentric as he welcomes first-year students to the Great Hall.',
      ru: 'Директор Школы чародейства и волшебства Хогвартс. Мудрый, добрый и слегка чудаковатый волшебник, приветствующий учеников в Большом зале.',
      de: 'Schulleiter von Hogwarts. Weiser, warmherziger und sanft exzentrischer Zauberer, der die Schüler in der Großen Halle willkommen heißt.',
      'pt-PT': 'Diretor da Escola de Magia e Feitiçaria de Hogwarts. Sábio, caloroso e gentilmente excêntrico ao dar as boas-vindas aos alunos no Salão Principal.',
    },
    voices: {
      en: {
        voiceDesignPrompt:
          'A 75-year-old British headmaster and wizard. Warm, gentle, wise, slightly raspy elderly baritone voice with grand theatrical charm and a twinkle of humor.',
        customVoiceId: getCustomVoiceId('albus_dumbledore', 'en'),
        fallbackPrebuiltVoice: 'Algieba',
      },
      ru: {
        voiceDesignPrompt:
          'A 75-year-old wise Russian headmaster. Warm, gentle elderly baritone voice with classic fairy-tale grandeur and clear Russian pronunciation.',
        customVoiceId: getCustomVoiceId('albus_dumbledore', 'ru'),
        fallbackPrebuiltVoice: 'Algieba',
      },
      de: {
        voiceDesignPrompt:
          'A 75-year-old wise German headmaster speaking Standard High German. Warm, gentle elderly baritone voice with dignified theatrical presence.',
        customVoiceId: getCustomVoiceId('albus_dumbledore', 'de'),
        fallbackPrebuiltVoice: 'Algieba',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'A 75-year-old wise European Portuguese headmaster. Warm, gentle elderly baritone voice with classic continental Portuguese pronunciation.',
        customVoiceId: getCustomVoiceId('albus_dumbledore', 'pt-PT'),
        fallbackPrebuiltVoice: 'Algieba',
      },
    },
  },
};

export function getCharacterById(characterId: string): CharacterProfile {
  const character = CHARACTER_REGISTRY[characterId];
  if (!character) {
    throw new Error(`Character "${characterId}" not found in CHARACTER_REGISTRY.`);
  }
  return character;
}

export function getSceneCharacters(characterIds: string[]): CharacterProfile[] {
  return characterIds.map((id) => getCharacterById(id));
}

export function getCharacterVoiceProfile(characterId: string, lang: LanguageCode) {
  return getCharacterById(characterId).voices[lang];
}
