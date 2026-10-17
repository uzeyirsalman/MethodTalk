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

export const godfatherOfferScene: SceneEntry = {
  metadata: {
    id: 'godfather-offer',
    movieTitle: {
      en: 'The Godfather',
      ru: 'Крёстный отец',
      de: 'Der Pate',
      'pt-PT': 'O Padrinho',
    },
    releaseYear: 1972,
    genre: 'Crime',
    sceneType: 'dialogue',
    cefrLevel: 'A2',
    durationSeconds: 75,
    backdropGradient: 'from-amber-950 via-stone-900 to-neutral-950',
    sceneTitle: {
      en: "An Offer He Can't Refuse",
      ru: 'Предложение, от которого невозможно отказаться',
      de: 'Ein Angebot, das er nicht ablehnen kann',
      'pt-PT': 'Uma Proposta Que Ele Não Pode Recusar',
    },
    blurb: {
      en: 'During his daughter Connie’s wedding, Don Vito Corleone listens in his darkened study as his godson, singer Johnny Fontane, despairs over losing a career-saving Hollywood war movie role refused by studio mogul Jack Woltz.',
      ru: 'В день свадьбы своей дочери Конни Дон Вито Корлеоне принимает в полутёмном кабинете своего крестника, певца Джонни Фонтейна, который в отчаянии рассказывает, как глава киностудии Джек Вольц отказывает ему в главной роли.',
      de: 'Während der Hochzeit seiner Tochter Connie empfängt Don Vito Corleone in seinem abgedunkelten Arbeitszimmer sein Patenkind, den Sänger Johnny Fontane, der verzweifelt ist, weil Studioboss Jack Woltz ihm eine entscheidende Filmrolle verweigert.',
      'pt-PT': 'Durante o casamento da sua filha Connie, Don Vito Corleone recebe no seu escritório sombrio o seu afilhado, o cantor Johnny Fontane, que desespera por perder o papel principal num filme de guerra recusado pelo magnata Jack Woltz.',
    },
    famousQuote: {
      en: "I'm gonna make him an offer he can't refuse.",
      ru: 'Я сделаю ему предложение, от которого он не сможет отказаться.',
      de: 'Ich mache ihm ein Angebot, das er nicht ablehnen kann.',
      'pt-PT': 'Vou fazer-lhe uma proposta que ele não pode recusar.',
    },
    officialSources: {
      en: 'Paramount Pictures Original Screenplay (Mario Puzo & Francis Ford Coppola, 1972)',
      ru: 'Официальный русский дубляж (Мосфильм-Мастер)',
      de: 'Offizielle deutsche Synchronfassung (Berliner Synchron / Gottfried Kramer)',
      'pt-PT': 'Versão Oficial Portuguesa de Cinema e Edição Clássica (RTP / Lusomundo)',
    },
  },
  characterIds: ['johnny_fontane', 'vito_corleone'],
  lines: [
    buildLine(
      'godfather-offer',
      'gf_01',
      1,
      'johnny_fontane',
      'desperate, hushed, pleading',
      {
        en: "Godfather, I don't know what to do. My voice is weak, and if I had this part in the picture, it would put me right back on top.",
        ru: 'Крёстный, я не знаю, что мне делать. Голос слабеет, но если бы я получил эту роль в фильме, я бы снова оказался на вершине.',
        de: 'Pate, ich weiß nicht, was ich tun soll. Meine Stimme wird schwach, aber wenn ich diese Rolle in dem Film bekäme, wäre ich wieder ganz oben.',
        'pt-PT': 'Padrinho, não sei o que fazer. A minha voz está fraca, mas se eu conseguisse este papel no filme, voltava logo para o topo.',
      },
      {
        en: 'Notice the second conditional structure: "if I had this part... it would put me".',
        ru: 'Сослагательное наклонение с частицей «бы»: «если бы я получил... я бы оказался».',
        de: 'Konjunktiv II für irreale Wünsche: „wenn ich diese Rolle bekäme, wäre ich wieder ganz oben“.',
        'pt-PT': 'Imperfeito do conjuntivo + condicional/imperfeito: «se eu conseguisse este papel, voltava logo».',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_02',
      2,
      'johnny_fontane',
      'bitter, anxious',
      {
        en: 'But this studio head, Jack Woltz, he won’t give it to me. He says there is no chance at all.',
        ru: 'Но глава студии, Джек Вольц, ни за что не даст мне эту роль. Он говорит, что у меня нет ни единого шанса.',
        de: 'Aber dieser Studioboss, Jack Woltz, will sie mir nicht geben. Er sagt, es gibt überhaupt keine Chance.',
        'pt-PT': 'Mas o diretor do estúdio, Jack Woltz, não ma quer dar. Ele diz que não há hipótese nenhuma.',
      },
      {
        'pt-PT': 'Repare na contração pronominal típica do português europeu: «não ma quer dar» (não me + a quer dar).',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_03',
      3,
      'vito_corleone',
      'stern, sudden intensity',
      {
        en: 'You can act like a man! What’s the matter with you?',
        ru: 'Веди себя как мужчина! Что с тобой такое?',
        de: 'Benimm dich wie ein Mann! Was ist denn los mit dir?',
        'pt-PT': 'Comporta-te como um homem! O que é que se passa contigo?',
      },
      {
        ru: 'Повелительное наклонение: «Веди себя как мужчина!» (Act like a man!).',
        de: 'Imperativ im Singular: „Benimm dich wie ein Mann!“',
        'pt-PT': 'Imperativo afirmativo com ênclise: «Comporta-te como um homem!».',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_04',
      4,
      'vito_corleone',
      'mocking softly, then firm',
      {
        en: 'Is this how you turned out, a Hollywood finocchio that cries like a woman?',
        ru: 'И это в кого ты превратился — в голливудского нытика, который плачет как женщина?',
        de: 'Ist das aus dir geworden, ein Jammerlappen aus Hollywood, der weint wie eine Frau?',
        'pt-PT': 'Foi nisto que te tornaste, um chorão de Hollywood que chora como uma mulher?',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_05',
      5,
      'johnny_fontane',
      'ashamed, apologetic',
      {
        en: "Godfather, I'm sorry. This role is perfect for me, and Woltz just wants to ruin me.",
        ru: 'Прости меня, Крёстный. Эта роль создана для меня, а Вольц просто хочет меня уничтожить.',
        de: 'Es tut mir leid, Pate. Diese Rolle ist perfekt für mich, und Woltz will mich einfach nur ruinieren.',
        'pt-PT': 'Desculpe-me, Padrinho. Este papel é perfeito para mim, e o Woltz só me quer arruinar.',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_06',
      6,
      'vito_corleone',
      'warm, paternal, measured',
      {
        en: 'Do you spend time with your family? Good. Because a man who doesn’t spend time with his family can never be a real man.',
        ru: 'Ты проводишь время со своей семьёй? Хорошо. Потому что человек, который не проводит время с семьёй, никогда не станет настоящим мужчиной.',
        de: 'Verbringst du Zeit mit deiner Familie? Gut. Denn ein Mann, der keine Zeit mit seiner Familie verbringt, kann niemals ein richtiger Mann sein.',
        'pt-PT': 'Passas tempo com a tua família? Muito bem. Porque um homem que não passa tempo com a sua família nunca pode ser um verdadeiro homem.',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_07',
      7,
      'vito_corleone',
      'calm, reassuring',
      {
        en: 'Come here. Look at me. You look terrible. I want you to eat, I want you to rest well.',
        ru: 'Подойди сюда. Посмотри на меня. На тебе лица нет. Я хочу, чтобы ты поел, хочу, чтобы ты хорошенько отдохнул.',
        de: 'Komm her. Sieh mich an. Du siehst furchtbar aus. Ich will, dass du isst, und ich will, dass du dich gut ausruhst.',
        'pt-PT': 'Anda cá. Olha para mim. Tens um aspeto terrível. Quero que comas e quero que descanses bem.',
      },
      {
        ru: 'Идиома «На тебе лица нет» — классический русский оборот для «You look terrible».',
        'pt-PT': 'Em português de Portugal usa-se «Anda cá» e a grafia «aspeto» (acordo ortográfico em vigor).',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_08',
      8,
      'vito_corleone',
      'quietly decisive',
      {
        en: 'And in a month from now, this Hollywood big shot is gonna give you what you want.',
        ru: 'А через месяц эта голливудская шишка сам даст тебе всё, чего ты хочешь.',
        de: 'Und in einem Monat wird dieses hohe Tier in Hollywood dir genau das geben, was du willst.',
        'pt-PT': 'E daqui a um mês, esse magnata de Hollywood vai dar-te exatamente o que tu queres.',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_09',
      9,
      'johnny_fontane',
      'skeptical, hopeless',
      {
        en: 'It’s too late, Godfather. They start shooting in a week.',
        ru: 'Уже слишком поздно, Крёстный. Они начинают съёмки через неделю.',
        de: 'Es ist zu spät, Pate. Sie fangen schon in einer Woche an zu drehen.',
        'pt-PT': 'Já é tarde demais, Padrinho. Eles começam as filmagens daqui a uma semana.',
      }
    ),
    buildLine(
      'godfather-offer',
      'gf_10',
      10,
      'vito_corleone',
      'iconic, raspy, cold certainty',
      {
        en: "I'm gonna make him an offer he can't refuse.",
        ru: 'Я сделаю ему предложение, от которого он не сможет отказаться.',
        de: 'Ich mache ihm ein Angebot, das er nicht ablehnen kann.',
        'pt-PT': 'Vou fazer-lhe uma proposta que ele não pode recusar.',
      },
      {
        en: 'The signature climax line of The Godfather (AFI #2 movie quote of all time).',
        ru: 'Легендарная крылатая фраза: придаточное определительное «от которого он не сможет отказаться».',
        de: 'Relativsatz mit Modalverb am Ende: „das er nicht ablehnen kann“.',
        'pt-PT': 'Ênclise com pronome de complemento indireto no infinitivo: «fazer-lhe uma proposta».',
      }
    ),
  ],
};
