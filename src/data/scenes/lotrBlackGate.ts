import { DialogueLine, LanguageCode, SceneEntry, tokenizeSpokenText } from '../../types/scene';

function buildLine(
  sceneId: string,
  lineId: string,
  order: number,
  characterId: string,
  emotionCue: string,
  spokenText: Record<LanguageCode, string>,
  grammarNote?: Partial<Record<LanguageCode, string>>
): DialogueLine {
  return {
    lineId,
    order,
    characterId,
    emotionCue,
    spokenText,
    targetWords: {
      en: tokenizeSpokenText(spokenText.en),
      ru: tokenizeSpokenText(spokenText.ru),
      de: tokenizeSpokenText(spokenText.de),
      'pt-PT': tokenizeSpokenText(spokenText['pt-PT']),
    },
    audioUrl: {
      en: `/audio/scenes/${sceneId}/${lineId}_en.wav`,
      ru: `/audio/scenes/${sceneId}/${lineId}_ru.wav`,
      de: `/audio/scenes/${sceneId}/${lineId}_de.wav`,
      'pt-PT': `/audio/scenes/${sceneId}/${lineId}_pt-PT.wav`,
    },
    grammarNote,
  };
}

export const lotrBlackGateScene: SceneEntry = {
  metadata: {
    id: 'lotr-black-gate',
    movieTitle: {
      en: 'The Lord of the Rings: The Return of the King',
      ru: 'Властелин колец: Возвращение короля',
      de: 'Der Herr der Ringe: Die Rückkehr des Königs',
      'pt-PT': 'O Senhor dos Anéis: O Regresso do Rei',
    },
    releaseYear: 2003,
    genre: 'Fantasy',
    sceneType: 'monologue',
    cefrLevel: 'B1',
    durationSeconds: 70,
    backdropGradient: 'from-slate-950 via-amber-950 to-stone-950',
    sceneTitle: {
      en: "Aragorn's Speech at the Black Gate",
      ru: 'Речь Арагорна у Чёрных Врат',
      de: 'Aragorns Rede vor dem Schwarzen Tor',
      'pt-PT': 'O Discurso de Aragorn no Portão Negro',
    },
    blurb: {
      en: 'Before the towering Black Gate of Mordor, as vast armies of Orcs surround the outnumbered Men of Gondor and Rohan, Aragorn rides along the front ranks to banish fear and rally his brothers for one final stand.',
      ru: 'Перед исполинскими Чёрными Вратами Мордора, когда несметные полчища орков окружают войско Гондора и Рохана, Арагорн скачет вдоль строя, чтобы развеять страх и вдохновить своих братьев на последний бой.',
      de: 'Vor dem gewaltigen Schwarzen Tor von Mordor, während riesige Ork-Heere die Streiter aus Gondor und Rohan umzingeln, reitet Aragorn die Reihen entlang, um ihren Mut für das letzte Gefecht zu entfachen.',
      'pt-PT': 'Perante o imponente Portão Negro de Mordor, enquanto vastos exércitos de Orcs cercam as forças de Gondor e Rohan, Aragorn cavalga em frente às fileiras para afastar o medo e unir os seus irmãos.',
    },
    famousQuote: {
      en: 'A day may come when the courage of men fails... but it is not this day! This day we fight!',
      ru: 'Возможно, наступит день, когда мужество оставит род людей... но только не сегодня! Сегодня мы сразимся!',
      de: 'Der Tag mag kommen, da der Mut der Menschen erlischt... doch dieser Tag ist noch fern! Denn heute kämpfen wir!',
      'pt-PT': 'Pode chegar o dia em que a coragem dos homens falhe... mas não é este dia! Hoje nós lutamos!',
    },
    officialSources: {
      en: 'New Line Cinema Original Screenplay (Fran Walsh, Philippa Boyens & Peter Jackson, 2003)',
      ru: 'Официальный русский дубляж (Мосфильм-Мастер / Андрей Бархударов)',
      de: 'Offizielle deutsche Synchronfassung (FFS Film- & Fernseh-Synchron / Jacques Breuer)',
      'pt-PT': 'Versão Oficial Portuguesa de Cinema (New Line / Castello Lopes Multimédia)',
    },
  },
  characterIds: ['aragorn'],
  lines: [
    buildLine(
      'lotr-black-gate',
      'lotr_01',
      1,
      'aragorn',
      'steady, commanding battlefield shout',
      {
        en: 'Hold your ground! Hold your ground!',
        ru: 'Держать строй! Держать строй!',
        de: 'Haltet eure Stellung! Haltet eure Stellung!',
        'pt-PT': 'Mantenham as vossas posições! Mantenham as vossas posições!',
      },
      {
        ru: 'Инфинитив в значении воинского приказа: «Держать строй!».',
        de: 'Imperativ Plural (2. Person Plural): „Haltet eure Stellung!“.',
        'pt-PT': 'Imperativo plural formal em português europeu com possessivo «vossas»: «Mantenham as vossas posições!».',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_02',
      2,
      'aragorn',
      'brotherly, resonant, empathetic',
      {
        en: 'Sons of Gondor, of Rohan, my brothers!',
        ru: 'Сыны Гондора, сыны Рохана, мои братья!',
        de: 'Söhne Gondors und Rohans, meine Brüder!',
        'pt-PT': 'Filhos de Gondor, de Rohan, meus irmãos!',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_03',
      3,
      'aragorn',
      'deeply sincere, looking into their eyes',
      {
        en: 'I see in your eyes the same fear that would take the heart of me.',
        ru: 'Я вижу в ваших глазах тот же страх, который сжимал и моё сердце.',
        de: 'In euren Augen sehe ich dieselbe Furcht, die auch mich verzagen ließe.',
        'pt-PT': 'Vejo nos vossos olhos o mesmo medo que me tiraria a coragem.',
      },
      {
        de: 'Gehobener Konjunktiv II im Relativsatz: „die auch mich verzagen ließe“.',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_04',
      4,
      'aragorn',
      'solemn, building momentum',
      {
        en: 'A day may come when the courage of men fails, when we forsake our friends and break all bonds of fellowship.',
        ru: 'Возможно, наступит день, когда мужество оставит род людей, и мы предадим друзей и разорвём все узы братства.',
        de: 'Der Tag mag kommen, da der Mut der Menschen erlischt, da wir unsere Gefährten im Stich lassen und aller Freundschaft Bande bricht.',
        'pt-PT': 'Pode chegar o dia em que a coragem dos homens falhe, em que abandonemos os nossos amigos e quebremos todos os laços de irmandade.',
      },
      {
        'pt-PT': 'Presente do conjuntivo para eventualidade futura: «em que a coragem falhe, em que abandonemos...».',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_05',
      5,
      'aragorn',
      'defiant, ringing declaration',
      {
        en: 'But it is not this day!',
        ru: 'Но только не сегодня!',
        de: 'Doch dieser Tag ist noch fern!',
        'pt-PT': 'Mas não é este dia!',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_06',
      6,
      'aragorn',
      'fierce, dramatic crescendo',
      {
        en: 'An hour of wolves and shattered shields, when the age of men comes crashing down! But it is not this day!',
        ru: 'Час волков и разбитых щитов, когда настанет конец эпохи людей! Но только не сегодня!',
        de: 'Die Stunde der Wölfe und zerschmetterter Schilde, da das Zeitalter der Menschen tosend untergeht! Doch dieser Tag ist noch fern!',
        'pt-PT': 'Uma hora de lobos e de escudos despedaçados, quando a era dos homens ruir! Mas não é este dia!',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_07',
      7,
      'aragorn',
      'roaring, heroic rally',
      {
        en: 'This day we fight!',
        ru: 'Сегодня мы сразимся!',
        de: 'Denn heute kämpfen wir!',
        'pt-PT': 'Hoje nós lutamos!',
      }
    ),
    buildLine(
      'lotr-black-gate',
      'lotr_08',
      8,
      'aragorn',
      'raising sword aloft, triumphant conviction',
      {
        en: 'By all that you hold dear on this good Earth, I bid you stand, Men of the West!',
        ru: 'Во имя всего, что вам дорого на этой славной земле, я призываю вас выстоять, Люди Запада!',
        de: 'Bei allem, was euch teuer ist auf dieser Erde, sage ich: Haltet stand, Menschen des Westens!',
        'pt-PT': 'Por tudo o que vos é querido nesta boa Terra, eu ordeno-vos que resistam, Homens do Oeste!',
      },
      {
        'pt-PT': 'Uso autêntico do pronome «vos» (2.ª pessoa do plural em Portugal): «o que vos é querido», «eu ordeno-vos».',
      }
    ),
  ],
};
