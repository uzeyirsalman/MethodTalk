import { CharacterProfile, LanguageCode } from '../types/scene';

/**
 * TIER 2: SHARED CHARACTER REGISTRY
 * Reusable across multiple scenes from the same movie.
 * Character descriptions (`description`) are strictly for the UI Cast Card.
 * Voice profiles (`voices[lang]`) are anchored per Character + Language to guarantee
 * authentic native pronunciation and identical voice identity across every line.
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
          'Native American English male speaker in his late 60s. Deep, raspy, gravelly baritone voice with a subtle New York Italian-American timbre, calm and deliberate pacing, quiet authority.',
        fallbackPrebuiltVoice: 'Charon',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his 60s. Deep, raspy, authoritative baritone with flawless native Russian theatrical diction, slow and measured delivery.',
        fallbackPrebuiltVoice: 'Charon',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German (Hochdeutsch) male dubbing actor in his 60s. Deep, gravelly, calm baritone voice with authoritative theatrical warmth.',
        fallbackPrebuiltVoice: 'Charon',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese (Lisbon/Coimbra standard) male voice actor in his 60s. Deep, raspy, calm baritone with clear continental Portuguese phonetics and measured pacing.',
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
          'Native American English male speaker in his late 30s. Smooth mid-tenor voice, emotional, pleading, slightly breathless and anxious.',
        fallbackPrebuiltVoice: 'Puck',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his late 30s. Expressive mid-tenor voice, emotional and pleading delivery with clean native Russian pronunciation.',
        fallbackPrebuiltVoice: 'Puck',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his late 30s. Expressive mid-tenor voice, anxious and pleading tone.',
        fallbackPrebuiltVoice: 'Puck',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his late 30s. Expressive mid-tenor voice, emotional and pleading delivery with continental Portuguese pronunciation.',
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
          'Native American English male speaker in his 40s. Rich, resonant, velvety bass-baritone voice. Calm, philosophical, hypnotic cadence with crisp articulation.',
        fallbackPrebuiltVoice: 'Orus',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his 40s. Deep, resonant, velvety bass-baritone voice with calm, philosophical, hypnotic delivery.',
        fallbackPrebuiltVoice: 'Orus',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his 40s. Deep, resonant, velvety baritone voice (in the style of Tom Vogt), calm and enigmatic.',
        fallbackPrebuiltVoice: 'Orus',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his 40s. Deep, resonant bass-baritone voice with calm, philosophical continental Portuguese diction.',
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
          'Native American English male speaker in his early 30s. Clear, understated mid-baritone voice, slightly breathless, curious and earnest.',
        fallbackPrebuiltVoice: 'Puck',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his early 30s. Clear, earnest young adult baritone voice, thoughtful and slightly cautious.',
        fallbackPrebuiltVoice: 'Puck',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his early 30s. Clear, earnest young adult baritone voice, understated and curious.',
        fallbackPrebuiltVoice: 'Puck',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his early 30s. Clear, earnest young adult voice with authentic continental Portuguese pronunciation.',
        fallbackPrebuiltVoice: 'Puck',
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
          'Native American English male speaker in his 40s. Commanding, dynamic, deeply expressive baritone voice with sharp rhythmic cadence and intense dramatic presence.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his 40s. Powerful, charismatic, commanding baritone voice with dynamic theatrical energy and crisp Russian diction.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his 40s. Commanding, energetic, intense baritone voice with sharp rhythmic delivery.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his 40s. Commanding, intense, charismatic baritone voice with sharp continental Portuguese articulation.',
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
          'Native American English male speaker in his late 20s. High-strung, polite but trembling tenor voice, nervous and hesitant.',
        fallbackPrebuiltVoice: 'Puck',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his late 20s. Nervous, polite, slightly trembling tenor voice with clean native Russian pronunciation.',
        fallbackPrebuiltVoice: 'Puck',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his late 20s. Nervous, hesitant tenor voice.',
        fallbackPrebuiltVoice: 'Puck',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his late 20s. Nervous, hesitant tenor voice with continental Portuguese pronunciation.',
        fallbackPrebuiltVoice: 'Puck',
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
          'Native English male speaker in his 40s. Noble, weathered, resonant baritone voice with heroic conviction, rising from empathetic brotherhood to a ringing battlefield rallying cry.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his 40s. Noble, heroic, resonant baritone voice with epic theatrical power and crystal-clear Russian diction.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his 40s. Noble, heroic baritone voice with passionate, inspiring battlefield delivery.',
        fallbackPrebuiltVoice: 'Fenrir',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his 40s. Noble, heroic, resonant baritone voice with inspiring continental Portuguese delivery.',
        fallbackPrebuiltVoice: 'Fenrir',
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
          'Native British English male speaker in his 70s. Warm, gentle, wise, slightly raspy elderly baritone voice with grand theatrical charm and a twinkle of humor.',
        fallbackPrebuiltVoice: 'Charon',
      },
      ru: {
        voiceDesignPrompt:
          'Native Russian male dubbing actor in his 70s. Warm, wise, gentle elderly baritone voice with classic fairy-tale grandeur and clear Russian pronunciation.',
        fallbackPrebuiltVoice: 'Charon',
      },
      de: {
        voiceDesignPrompt:
          'Native Standard High German male dubbing actor in his 70s. Warm, wise, gentle elderly baritone voice with dignified theatrical presence.',
        fallbackPrebuiltVoice: 'Charon',
      },
      'pt-PT': {
        voiceDesignPrompt:
          'Native European Portuguese male voice actor in his 70s. Warm, wise, gentle elderly baritone voice with classic continental Portuguese pronunciation.',
        fallbackPrebuiltVoice: 'Charon',
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
