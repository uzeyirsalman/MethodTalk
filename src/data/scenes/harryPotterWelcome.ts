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

export const harryPotterWelcomeScene: SceneEntry = {
  metadata: {
    id: 'harry-potter-welcome',
    movieTitle: {
      en: "Harry Potter and the Philosopher's Stone",
      ru: 'Гарри Поттер и философский камень',
      de: 'Harry Potter und der Stein der Weisen',
      'pt-PT': 'Harry Potter e a Pedra Filosofal',
    },
    releaseYear: 2001,
    genre: 'Fantasy',
    sceneType: 'monologue',
    cefrLevel: 'A1',
    durationSeconds: 60,
    backdropGradient: 'from-indigo-950 via-purple-950 to-amber-950',
    sceneTitle: {
      en: "Dumbledore's Start-of-Term Welcome",
      ru: 'Приветственная речь Дамблдора в Большом зале',
      de: 'Dumbledores Begrüßungsrede in der Großen Halle',
      'pt-PT': 'O Discurso de Boas-Vindas de Dumbledore',
    },
    blurb: {
      en: 'Under the enchanted ceiling of the Great Hall, glowing with floating candles, Headmaster Albus Dumbledore rises before the newly arrived first-years to announce the start-of-term rules and summon the Hogwarts feast.',
      ru: 'Под зачарованным потолком Большого зала, сияющим парящими свечами, директор Альбус Дамблдор поднимается перед первокурсниками, чтобы объявить школьные правила и начать праздничный пир Хогвартса.',
      de: 'Unter der verzauberten Decke der Großen Halle erhebt sich Schulleiter Albus Dumbledore vor den neuen Erstklässlern, um die wichtigen Hinweise zum Schuljahresbeginn zu verkünden und das Festmahl zu eröffnen.',
      'pt-PT': 'Sob o teto encantado do Salão Principal, iluminado por velas flutuantes, o Diretor Albus Dumbledore ergue-se perante os alunos do primeiro ano para anunciar os avisos de início de período e abrir o banquete.',
    },
    famousQuote: {
      en: 'The third-floor corridor on the right-hand side is out of bounds to everyone who does not wish to die a most painful death.',
      ru: 'Коридор на третьем этаже с правой стороны закрыт для всех, кто не желает умереть самой мучительной смертью.',
      de: 'Der Korridor im dritten Stock auf der rechten Seite ist für jeden tabu, der nicht einen äußerst qualvollen Tod sterben möchte.',
      'pt-PT': 'O corredor do terceiro andar, do lado direito, é proibido a todos aqueles que não queiram sofrer uma morte extremamente dolorosa.',
    },
    officialSources: {
      en: 'Warner Bros. Original Screenplay (Steve Kloves, 2001)',
      ru: 'Официальный русский дубляж (Мосфильм-Мастер / Всеволод Абдулов)',
      de: 'Offizielle deutsche Synchronfassung (FFS Film- & Fernseh-Synchron / Klaus Höhne)',
      'pt-PT': 'Versão Oficial Portuguesa de Cinema e Dobragem (Warner Bros. Portugal)',
    },
  },
  characterIds: ['albus_dumbledore'],
  lines: [
    buildLine(
      'harry-potter-welcome',
      'hp_01',
      1,
      'albus_dumbledore',
      'warm, grand, welcoming with open arms',
      {
        en: 'Welcome! Welcome to a new year at Hogwarts!',
        ru: 'Добро пожаловать! Добро пожаловать в Хогвартс на новый учебный год!',
        de: 'Willkommen! Willkommen zu einem neuen Jahr in Hogwarts!',
        'pt-PT': 'Bem-vindos! Bem-vindos a um novo ano em Hogwarts!',
      },
      {
        en: 'A clear, high-frequency A1/A2 greeting structure ideal for practicing warm intonation.',
        ru: 'Классическое приветствие: «Добро пожаловать в... на новый учебный год!».',
        de: 'Präpositionale Wendung: „Willkommen zu einem neuen Jahr in Hogwarts!“ (Dativ).',
        'pt-PT': 'Saudação no plural: «Bem-vindos a um novo ano em Hogwarts!».',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_02',
      2,
      'albus_dumbledore',
      'gentle, polite',
      {
        en: 'I have a few start-of-term notices I wish to announce.',
        ru: 'Прежде чем мы начнём, я хочу сделать несколько объявлений к началу учебного года.',
        de: 'Ich habe noch ein paar Hinweise zum Schuljahresbeginn, die ich bekannt geben möchte.',
        'pt-PT': 'Tenho alguns avisos de início de período que gostaria de anunciar.',
      },
      {
        'pt-PT': 'Em Portugal, o trimestre/semestre escolar chama-se «período» («início de período»).',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_03',
      3,
      'albus_dumbledore',
      'serious, clear warning',
      {
        en: 'First years, please note that the Dark Forest is strictly forbidden to all students.',
        ru: 'Первокурсники, прошу принять к сведению, что посещать Запретный лес категорически запрещено всем ученикам.',
        de: 'Die Erstklässler mögen bitte beachten, dass der Verbotene Wald für alle Schüler strengstens verboten ist.',
        'pt-PT': 'Os alunos do primeiro ano devem tomar nota de que a Floresta Proibida é estritamente interditada a todos os estudantes.',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_04',
      4,
      'albus_dumbledore',
      'mildly wry, conversational',
      {
        en: 'Also, our caretaker, Mr. Filch, has asked me to remind you of an important rule.',
        ru: 'Кроме того, наш смотритель, мистер Филч, просил меня напомнить вам об одном важном правиле.',
        de: 'Außerdem hat mich unser Hausmeister, Mister Filch, gebeten, euch an eine wichtige Regel zu erinnern.',
        'pt-PT': 'Além disso, o nosso zelador, o senhor Filch, pediu-me para vos lembrar de uma regra importante.',
      },
      {
        'pt-PT': 'Colocação pronominal em Portugal: «pediu-me para vos lembrar».',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_05',
      5,
      'albus_dumbledore',
      'solemn, lowering voice dramatically',
      {
        en: 'The third-floor corridor on the right-hand side is out of bounds.',
        ru: 'Коридор на третьем этаже с правой стороны закрыт для посещения.',
        de: 'Der Korridor im dritten Stock auf der rechten Seite ist strengstens tabu.',
        'pt-PT': 'O corredor do terceiro andar, do lado direito, é de acesso proibido.',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_06',
      6,
      'albus_dumbledore',
      'grave with a subtle eccentric twinkle',
      {
        en: 'It is forbidden to everyone who does not wish to die a most painful death.',
        ru: 'Туда запрещено входить всем, кто не желает умереть самой мучительной смертью.',
        de: 'Er ist für jeden verboten, der nicht einen äußerst qualvollen Tod sterben möchte.',
        'pt-PT': 'É proibido a todos aqueles que não queiram sofrer uma morte extremamente dolorosa.',
      },
      {
        ru: 'Творительный падеж образа действия: «умереть самой мучительной смертью».',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_07',
      7,
      'albus_dumbledore',
      'playful, cheerful',
      {
        en: 'And before we begin our banquet, I would like to say a few words: Nitwit! Blubber! Oddment! Tweak!',
        ru: 'И прежде чем мы начнём наш банкет, я хотел бы сказать несколько слов: Олух! Пузырь! Остаток! Уловка!',
        de: 'Und bevor wir mit unserem Bankett beginnen, möchte ich ein paar Worte sagen: Schwachkopf! Schwabbelspeck! Krimskrams! Quiek!',
        'pt-PT': 'E antes de começarmos o nosso banquete, gostaria de dizer algumas palavras: Pateta! Chorão! Bugiganga! Beliscão!',
      },
      {
        en: 'Dumbledore’s famous four whimsical words from the Great Hall welcome speech.',
        ru: 'Знаменитые четыре слова Дамблдора в классическом русском переводе: «Олух! Пузырь! Остаток! Уловка!».',
        de: 'Die vier berühmten Wörter in der deutschen Fassung: „Schwachkopf! Schwabbelspeck! Krimskrams! Quiek!“.',
      }
    ),
    buildLine(
      'harry-potter-welcome',
      'hp_08',
      8,
      'albus_dumbledore',
      'clapping hands warmly, joyful',
      {
        en: 'Thank you! Let the feast begin.',
        ru: 'Спасибо! Да начнётся пир.',
        de: 'Danke sehr! Möge das Festmahl beginnen.',
        'pt-PT': 'Muito obrigado! Que comece o banquete.',
      }
    ),
  ],
};
