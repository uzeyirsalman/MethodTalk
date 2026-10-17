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

export const pulpFictionEzekielScene: SceneEntry = {
  metadata: {
    id: 'pulp-fiction-ezekiel',
    movieTitle: {
      en: 'Pulp Fiction',
      ru: 'Криминальное чтиво',
      de: 'Pulp Fiction',
      'pt-PT': 'Pulp Fiction',
    },
    releaseYear: 1994,
    genre: 'Crime',
    sceneType: 'dialogue',
    cefrLevel: 'B2',
    durationSeconds: 90,
    backdropGradient: 'from-red-950 via-amber-950 to-zinc-950',
    sceneTitle: {
      en: 'Big Kahuna Burger & Ezekiel 25:17',
      ru: 'Бургер «Биг Кахуна» и Иезекииль 25:17',
      de: 'Big Kahuna Burger & Hesekiel 25,17',
      'pt-PT': 'Big Kahuna Burger e Ezequiel 25:17',
    },
    blurb: {
      en: 'Jules Winnfield interrupts Brett’s early-morning fast-food breakfast with deceptively polite small talk before reciting his thunderous biblical passage from Ezekiel 25:17.',
      ru: 'Джулс Уиннфилд прерывает утренний завтрак Бретта обманчиво вежливой светской беседой о гавайских бургерах, после чего произносит свой громогласный библейский отрывок из книги пророка Иезекииля 25:17.',
      de: 'Jules Winnfield unterbricht Bretts morgendliches Fast-Food-Frühstück mit trügerisch höflichem Smalltalk, bevor er seine donnernde Bibelstelle aus Hesekiel 25,17 rezitiert.',
      'pt-PT': 'Jules Winnfield interrompe o pequeno-almoço matinal de Brett com uma conversa enganadoramente cortês sobre hambúrgueres antes de recitar a sua trovejante passagem bíblica de Ezequiel 25:17.',
    },
    famousQuote: {
      en: 'The path of the righteous man is beset on all sides by the inequities of the selfish and the tyranny of evil men.',
      ru: 'Путь праведника труден, ибо препятствуют ему себялюбивые и тираны из злых людей.',
      de: 'Der Pfad der Gerechten ist zu beiden Seiten gesäumt mit Freveleien der Selbstsüchtigen und der Tyrannei böser Männer.',
      'pt-PT': 'O caminho do homem justo está cercado por todos os lados pelas iniquidades dos egoístas e pela tirania dos homens maus.',
    },
    officialSources: {
      en: 'Miramax Original Screenplay (Quentin Tarantino, 1994)',
      ru: 'Официальный русский дубляж (Невафильм / Артур Ваха)',
      de: 'Offizielle deutsche Synchronfassung (TaunusFilm Synchron / Helmut Krauss)',
      'pt-PT': 'Versão Oficial Portuguesa de Cinema e Edição Especial (Miramax / Lusomundo)',
    },
  },
  characterIds: ['jules_winnfield', 'brett'],
  lines: [
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_01',
      1,
      'jules_winnfield',
      'relaxed, conversational, menacingly polite',
      {
        en: 'Hamburgers! The cornerstone of any nutritious breakfast. What kind of hamburgers?',
        ru: 'Гамбургеры! Основа любого питательного завтрака. А что это за гамбургеры?',
        de: 'Hamburger! Der Grundstein eines jeden nahrhaften Frühstücks. Was sind das für Hamburger?',
        'pt-PT': 'Hambúrgueres! A pedra basilar de qualquer pequeno-almoço nutritivo. Que tipo de hambúrgueres são?',
      },
      {
        'pt-PT': 'Vocabulário autêntico de Portugal: «pequeno-almoço» (breakfast) e «pedra basilar» (cornerstone).',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_02',
      2,
      'brett',
      'nervous, eager to please',
      {
        en: 'Ch-cheeseburgers. They’re from Big Kahuna Burger.',
        ru: 'Ч-чизбургеры. Из «Биг Кахуна Бургер».',
        de: 'Ch-Cheeseburger. Die sind von Big Kahuna Burger.',
        'pt-PT': 'Ch-cheeseburgers. São do Big Kahuna Burger.',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_03',
      3,
      'jules_winnfield',
      'enthusiastic, smiling',
      {
        en: "Big Kahuna Burger! That's that Hawaiian burger joint. I hear they got some tasty burgers. Do you mind if I try one of yours?",
        ru: '«Биг Кахуна Бургер»! Та самая гавайская закусочная. Слышал, у них чертовски вкусные бургеры. Не возражаешь, если я попробую твой?',
        de: 'Big Kahuna Burger! Das ist doch dieser hawaiianische Burgerladen. Ich hab gehört, die machen echt leckere Burger. Hast du was dagegen, wenn ich mal abbeiße?',
        'pt-PT': 'Big Kahuna Burger! É aquele restaurante havaiano de hambúrgueres. Ouvi dizer que fazem hambúrgueres muito saborosos. Importas-te que prove um dos teus?',
      },
      {
        'pt-PT': 'Pedido de permissão natural em português europeu: «Importas-te que prove...?» (+ presente do conjuntivo).',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_04',
      4,
      'brett',
      'timid, nodding quickly',
      {
        en: "No, go right ahead. It's yours.",
        ru: 'Нет, пожалуйста, угощайтесь. Берите.',
        de: 'Nein, greif ruhig zu. Er gehört dir.',
        'pt-PT': 'Não, esteja à vontade. É todo seu.',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_05',
      5,
      'jules_winnfield',
      'savoring, emphatic',
      {
        en: 'Mmm-mmmm! That is a tasty burger! Mind if I have some of your tasty beverage to wash this down?',
        ru: 'Ммм-мммм! Это и правда чертовски вкусный бургер! Не возражаешь, если я запишу это твоим вкусным напитком?',
        de: 'Mmm-mmmm! Das ist wirklich ein leckerer Burger! Hast du was dagegen, wenn ich einen Schluck von deinem köstlichen Getränk nehme, um nachzuspülen?',
        'pt-PT': 'Mmm-mmmm! Este é mesmo um hambúrguer saboroso! Importas-te que beba um pouco da tua bebida saborosa para ajudar a empurrar isto?',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_06',
      6,
      'brett',
      'trembling, terrified',
      {
        en: 'Listen, we had a misunderstanding, and I really want to make this right.',
        ru: 'Послушайте, у нас вышло недоразумение, и я очень хочу всё исправить.',
        de: 'Hör zu, das war ein Missverständnis, und ich möchte das wirklich wieder in Ordnung bringen.',
        'pt-PT': 'Ouça, houve um mal-entendido, e eu quero mesmo resolver isto.',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_07',
      7,
      'jules_winnfield',
      'cold, solemn, rhythmic',
      {
        en: "You read the Bible, Brett? Well, there's this passage I've got memorized. Ezekiel twenty-five, seventeen.",
        ru: 'Ты читаешь Библию, Бретт? Есть там один отрывок, который я помню наизусть. Иезекииль, глава двадцать пятая, стих семнадцатый.',
        de: 'Liest du die Bibel, Brett? Nun, es gibt da eine Stelle, die ich auswendig kann. Hesekiel fünfundzwanzig, siebzehn.',
        'pt-PT': 'Tu lês a Bíblia, Brett? Bem, há uma passagem que eu tenho decorada. Ezequiel vinte e cinco, dezassete.',
      },
      {
        'pt-PT': 'Grafia e pronúncia de Portugal para o número 17: «dezassete» (com "a", e não "dezessete").',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_08',
      8,
      'jules_winnfield',
      'measured, prophetic cadence',
      {
        en: 'The path of the righteous man is beset on all sides by the inequities of the selfish and the tyranny of evil men.',
        ru: 'Путь праведника труден, ибо препятствуют ему себялюбивые и тираны из злых людей.',
        de: 'Der Pfad der Gerechten ist zu beiden Seiten gesäumt mit Freveleien der Selbstsüchtigen und der Tyrannei böser Männer.',
        'pt-PT': 'O caminho do homem justo está cercado por todos os lados pelas iniquidades dos egoístas e pela tirania dos homens maus.',
      },
      {
        ru: 'Знаменитая цитата из официального дубляжа: архаичный союз «ибо» (for/because) создаёт библейский стиль.',
        de: 'Gehobenes Deutsch im Passiv Zustand: „ist zu beiden Seiten gesäumt mit...“.',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_09',
      9,
      'jules_winnfield',
      'rising intensity, fervent',
      {
        en: 'Blessed is he who, in the name of charity and good will, shepherds the weak through the valley of darkness, for he is truly his brother’s keeper.',
        ru: 'Блажен тот пастырь, кто во имя милосердия и доброты ведёт слабых за собой сквозь долину тьмы, ибо именно он и есть тот, кто печётся о ближнем своём.',
        de: 'Gesegnet sei der, der im Namen der Barmherzigkeit und des guten Willens die Schwachen durch das Tal der Dunkelheit geleitet, denn er ist der wahre Hüter seines Bruders.',
        'pt-PT': 'Bendito é aquele que, em nome da caridade e da boa vontade, pastoreia os fracos pelo vale das trevas, pois ele é verdadeiramente o guardião do seu irmão.',
      }
    ),
    buildLine(
      'pulp-fiction-ezekiel',
      'pf_10',
      10,
      'jules_winnfield',
      'thunderous, righteous fury',
      {
        en: 'And I will strike down upon thee with great vengeance and furious anger those who attempt to poison and destroy my brothers. And you will know I am the Lord when I lay my vengeance upon you!',
        ru: 'И совершу над ними великое мщение наказаниями яростными над теми, кто замыслит отравить и повредить братьям моим. И узнаешь ты, что имя моё — Господь, когда мщение моё падёт на тебя!',
        de: 'Und ich will große Rachetaten an denen vollführen, die da versuchen, meine Brüder zu vergiften und zu vernichten! Und du sollst erkennen, dass ich der Herr bin, wenn ich meine Rache über dich bringe!',
        'pt-PT': 'E eu abaterei com grande vingança e raiva furiosa aqueles que tentarem envenenar e destruir os meus irmãos. E tu saberás que o meu nome é o Senhor quando a minha vingança cair sobre ti!',
      }
    ),
  ],
};
