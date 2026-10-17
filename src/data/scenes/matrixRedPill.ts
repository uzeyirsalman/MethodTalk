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

export const matrixRedPillScene: SceneEntry = {
  metadata: {
    id: 'matrix-red-pill',
    movieTitle: {
      en: 'The Matrix',
      ru: 'Матрица',
      de: 'Matrix',
      'pt-PT': 'Matrix',
    },
    releaseYear: 1999,
    genre: 'Sci-Fi',
    sceneType: 'dialogue',
    cefrLevel: 'B1',
    durationSeconds: 85,
    backdropGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    sceneTitle: {
      en: 'The Red Pill or the Blue Pill',
      ru: 'Красная или синяя таблетка',
      de: 'Die rote oder die blaue Kapsel',
      'pt-PT': 'O Comprimido Vermelho ou o Azul',
    },
    blurb: {
      en: 'Inside the dilapidated Lafayette Hotel while thunder rumbles outside, Morpheus sits across from computer hacker Neo and offers him an irreversible choice between comfortable illusion and the harsh truth of the Matrix.',
      ru: 'Под раскаты грома в полуразрушенном отеле «Лафайет» Морфеус сидит напротив хакера Нео и предлагает ему бесповоротный выбор между привычной иллюзией и суровой правдой о Матрице.',
      de: 'Während draußen ein Gewitter tobt, sitzt Morpheus im verfallenen Hotel Lafayette dem Hacker Neo gegenüber und stellt ihn vor die unwiderrufliche Wahl zwischen bequemer Illusion und der Wahrheit über die Matrix.',
      'pt-PT': 'Enquanto a trovoada ecoa lá fora no decadente Hotel Lafayette, Morpheus senta-se frente ao pirata informático Neo e coloca-o perante uma escolha irreversível entre a ilusão confortável e a verdade sobre a Matrix.',
    },
    famousQuote: {
      en: 'You take the red pill — you stay in Wonderland, and I show you how deep the rabbit hole goes.',
      ru: 'Выберешь красную — останешься в Стране чудес, и я покажу тебе, насколько глубока кроличья нора.',
      de: 'Schluckst du die rote Kapsel, bleibst du im Wunderland und ich führe dich in die tiefsten Tiefen des Kaninchenbaus.',
      'pt-PT': 'Se tomares o comprimido vermelho, ficas no País das Maravilhas e eu mostro-te até onde vai a toca do coelho.',
    },
    officialSources: {
      en: 'Warner Bros. Original Screenplay (The Wachowskis, 1999)',
      ru: 'Официальный русский дубляж (Мосфильм-Мастер / Владимир Антоник и Всеволод Кузнецов)',
      de: 'Offizielle deutsche Synchronfassung (FFS Film- & Fernseh-Synchron / Tom Vogt)',
      'pt-PT': 'Versão Oficial Portuguesa de Cinema (Warner Bros. Portugal)',
    },
  },
  characterIds: ['morpheus', 'neo'],
  lines: [
    buildLine(
      'matrix-red-pill',
      'mx_01',
      1,
      'morpheus',
      'calm, resonant, welcoming',
      {
        en: 'At last. Welcome, Neo. As you no doubt have guessed, I am Morpheus.',
        ru: 'Наконец-то. Добро пожаловать, Нео. Как ты, без сомнения, догадался, я — Морфеус.',
        de: 'Endlich. Willkommen, Neo. Wie du zweifellos erraten hast, bin ich Morpheus.',
        'pt-PT': 'Finalmente. Bem-vindo, Neo. Como sem dúvida já adivinhaste, eu sou o Morpheus.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_02',
      2,
      'neo',
      'earnest, slightly nervous',
      {
        en: "It's an honor to meet you.",
        ru: 'Для меня честь познакомиться с тобой.',
        de: 'Es ist mir eine Ehre, dich kennenzulernen.',
        'pt-PT': 'É uma honra conhecer-te.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_03',
      3,
      'morpheus',
      'warm, measured',
      {
        en: 'No, the honor is mine. Please, come. Sit.',
        ru: 'Нет, честь для меня. Прошу, проходи. Садись.',
        de: 'Nein, die Ehre ist ganz meinerseits. Bitte, komm. Setz dich.',
        'pt-PT': 'Não, a honra é toda minha. Por favor, entra. Senta-te.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_04',
      4,
      'morpheus',
      'empathetic, probing',
      {
        en: "You have the look of a man who accepts what he sees because he is expecting to wake up. Ironically, this is not far from the truth.",
        ru: 'У тебя взгляд человека, который принимает видимое за действительность, потому что надеется проснуться. Как ни странно, это недалеко от истины.',
        de: 'Du siehst aus wie ein Mann, der das, was er sieht, hinnimmt, weil er darauf wartet, aufzuwachen. Ironischerweise ist das nicht weit von der Wahrheit entfernt.',
        'pt-PT': 'Tens o olhar de um homem que aceita aquilo que vê porque espera acordar. Ironicamente, isso não está longe da verdade.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_05',
      5,
      'morpheus',
      'quiet intensity',
      {
        en: 'Let me tell you why you’re here. You’re here because you know something. What you know you can’t explain, but you feel it.',
        ru: 'Давай я скажу, почему ты здесь. Ты здесь, потому что ты что-то знаешь. То, что ты знаешь, невозможно объяснить, но ты это чувствуешь.',
        de: 'Ich sage dir, warum du hier bist. Du bist hier, weil du etwas weißt. Etwas, das du nicht erklären kannst, aber du fühlst es.',
        'pt-PT': 'Deixa-me dizer-te porque estás aqui. Estás aqui porque sabes alguma coisa. Aquilo que sabes não o consegues explicar, mas sente-lo.',
      },
      {
        'pt-PT': 'Note a assimilação fonética do pronome enclítico em português europeu: «sentes + o» transforma-se em «sente-lo».',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_06',
      6,
      'morpheus',
      'grave, philosophical',
      {
        en: "You've felt it your entire life, that there's something wrong with the world. Do you know what I'm talking about?",
        ru: 'Ты чувствовал это всю свою жизнь: с нашим миром что-то не так. Ты понимаешь, о чём я говорю?',
        de: 'Du hast es dein ganzes Leben lang gespürt, dass mit der Welt etwas nicht stimmt. Weißt du, wovon ich spreche?',
        'pt-PT': 'Sentiste isso durante toda a tua vida: que há algo de errado com o mundo. Sabes do que estou a falar?',
      },
      {
        'pt-PT': 'Construção progressiva do português europeu: «estou a falar» (infinitivo preposicionado) em vez do gerúndio.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_07',
      7,
      'neo',
      'hushed, awestruck',
      {
        en: 'The Matrix. Do you want to tell me what it is?',
        ru: 'О Матрице. Ты хочешь узнать, что это такое?',
        de: 'Die Matrix. Willst du wissen, was sie ist?',
        'pt-PT': 'A Matrix. Queres saber o que ela é?',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_08',
      8,
      'morpheus',
      'solemn, enigmatic',
      {
        en: 'The Matrix is everywhere. It is all around us, even now in this very room. Unfortunately, no one can be told what the Matrix is. You have to see it for yourself.',
        ru: 'Матрица повсюду. Она окружает нас, даже сейчас она с нами в этой комнате. К сожалению, невозможно объяснить, что такое Матрица. Ты должен увидеть это сам.',
        de: 'Die Matrix ist allgegenwärtig. Sie umgibt uns, selbst jetzt, in diesem Zimmer. Leider kann man niemandem erklären, was die Matrix ist. Du musst sie selbst erleben.',
        'pt-PT': 'A Matrix está em todo o lado. Está à nossa volta, mesmo agora nesta própria sala. Infelizmente, ninguém pode explicar o que é a Matrix. Tens de a ver por ti mesmo.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_09',
      9,
      'morpheus',
      'commanding, deliberate',
      {
        en: 'This is your last chance. After this, there is no turning back. You take the blue pill — the story ends, you wake up in your bed and believe whatever you want to believe.',
        ru: 'Это твой последний шанс. Потом пути назад не будет. Примешь синюю таблетку — и сказке конец, ты проснёшься в своей постели и поверишь, что это был сон.',
        de: 'Dies ist deine letzte Chance. Danach gibt es kein Zurück. Schluckst du die blaue Kapsel, ist alles aus. Du wachst in deinem Bett auf und glaubst an das, was du glauben willst.',
        'pt-PT': 'Esta é a tua última oportunidade. Depois disto, não há retorno. Se tomares o comprimido azul, a história acaba, acordas na tua cama e acreditas no que quiseres acreditar.',
      },
      {
        de: 'In der klassischen deutschen Synchronfassung sagt Morpheus „Kapsel“ (nicht „Pille“) und nutzt den konditionalen Stirnsatz: „Schluckst du die blaue Kapsel...“.',
      }
    ),
    buildLine(
      'matrix-red-pill',
      'mx_10',
      10,
      'morpheus',
      'hypnotic, climactic whisper',
      {
        en: 'You take the red pill — you stay in Wonderland, and I show you how deep the rabbit hole goes. Remember: all I’m offering is the truth. Nothing more.',
        ru: 'Примешь красную таблетку — войдёшь в Страну чудес, и я покажу тебе, глубока ли кроличья нора. Помни: я лишь предлагаю узнать правду. Больше ничего.',
        de: 'Schluckst du die rote Kapsel, bleibst du im Wunderland und ich führe dich in die tiefsten Tiefen des Kaninchenbaus. Bedenke: Alles, was ich dir anbiete, ist die Wahrheit. Nicht mehr.',
        'pt-PT': 'Se tomares o comprimido vermelho, ficas no País das Maravilhas e eu mostro-te até onde vai a toca do coelho. Lembra-te: tudo o que te ofereço é a verdade. Nada mais.',
      },
      {
        ru: 'В официальном дубляже звучит классический оборот: «и я покажу тебе, глубока ли кроличья нора».',
        'pt-PT': 'Futuro do conjuntivo após «Se»: «Se tomares o comprimido vermelho, ficas...».',
      }
    ),
  ],
};
