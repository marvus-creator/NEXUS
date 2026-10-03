export const nav = {
  groups: {
    nexus: ['NEXUS', 'NEXUS', 'NEXUS'],
    life: ['Your life', 'Ubuzima bwawe', 'Votre vie'],
    world: ['Your world', 'Isi yawe', 'Votre monde'],
    staff: ['Staff', 'Abakozi', 'Équipe'],
  },
  items: {
    home: ['Home', 'Ahabanza', 'Accueil'],
    discover: ['Discover', 'Kuvumbura', 'Découvrir'],
    people: ['People', 'Abantu', 'Personnes'],
    feed: ['Feed', 'Amakuru', "Fil d'actualité"],
    messages: ['Messages', 'Ubutumwa', 'Messages'],
    calendar: ['Calendar', 'Kalendari', 'Calendrier'],
    tasks: ['Tasks', 'Imirimo', 'Tâches'],
    goals: ['Goals', 'Intego', 'Objectifs'],
    learn: ['Learn', 'Kwiga', 'Apprendre'],
    progress: ['Progress', 'Iterambere', 'Progrès'],
    circles: ['Circles', 'Amatsinda', 'Cercles'],
    events: ['Events', 'Ibirori', 'Événements'],
    nearby: ['Nearby', 'Hafi yawe', 'À proximité'],
    market: ['Market', 'Isoko', 'Marché'],
    wallet: ['Wallet', 'Ikofi', 'Portefeuille'],
    ai: ['Plan my day', 'Tegura umunsi wanjye', 'Planifier ma journée'],
    admin: ['Control center', "Ikigo cy'ubugenzuzi", 'Centre de contrôle'],
  },
  aiBlurb: [
    'Let NEXUS fit your tasks and study into the free time you actually have.',
    'Reka NEXUS ishyire imirimo yawe no kwiga mu gihe cyawe cy’ubusa.',
    'Laissez NEXUS caser vos tâches et révisions dans votre temps libre réel.',
  ],
  home: ['NEXUS home', 'Ahabanza ha NEXUS', 'Accueil NEXUS'],
  more: ['More', 'Ibindi', 'Plus'],
  aiBlurbShort: [
    'Fit your tasks and study into the free time you actually have.',
    'Shyira imirimo yawe no kwiga mu gihe cyawe cy’ubusa.',
    'Casez vos tâches et révisions dans votre temps libre réel.',
  ],
  expand: ['Expand sidebar', 'Agura uruhande', 'Déplier la barre latérale'],
  collapse: ['Collapse sidebar', 'Funga uruhande', 'Replier la barre latérale'],
  openMenu: ['Open menu', 'Fungura menu', 'Ouvrir le menu'],
  closeMenu: ['Close menu', 'Funga menu', 'Fermer le menu'],
  accountMenu: ['Account menu', 'Menu ya konti', 'Menu du compte'],
  searchPlaceholder: [
    'Search people, places, events…',
    'Shakisha abantu, ahantu, ibirori…',
    'Rechercher des personnes, lieux, événements…',
  ],
  searchLabel: ['Search NEXUS', 'Shakisha muri NEXUS', 'Rechercher dans NEXUS'],
  tour: ['Tour', 'Uruzinduko', 'Visite'],
} as const;

export const tour = {
  close: ['Close tour', 'Funga uruzinduko', 'Fermer la visite'],
  of: ['{n} of {total}', '{n} kuri {total}', '{n} sur {total}'],
  steps: {
    greeting: {
      title: ['Your day, at a glance', 'Umunsi wawe mu ncamake', 'Votre journée en un coup d’œil'],
      body: [
        'NEXUS greets you with what matters today: your streak, what is on and what is open.',
        'NEXUS iguha ikaze n’ibikureba uyu munsi: uruhererekane rwawe, ibiri ku gahunda n’ibitarakorwa.',
        'NEXUS vous accueille avec l’essentiel du jour : votre série, le programme et ce qui reste à faire.',
      ],
    },
    needs: {
      title: ['What needs you', 'Ibigukeneye', 'Ce qui vous attend'],
      body: [
        'Overdue tasks, unconfirmed email and setup gaps surface here before anything else.',
        'Imirimo yatinze, imeyili itaremezwa n’ibitaruzuzwa bigaragara hano mbere y’ibindi.',
        'Tâches en retard, e-mail non confirmé et réglages manquants apparaissent ici en premier.',
      ],
    },
    timeline: {
      title: ['Your real timeline', 'Gahunda yawe nyayo', 'Votre vraie journée'],
      body: [
        'Classes, events and the free time between them. Free gaps are highlighted so you can use them.',
        'Amasomo, ibirori n’igihe cy’ubusa kiri hagati yabyo. Igihe cy’ubusa kigaragazwa kugira ngo ukibyaze umusaruro.',
        'Cours, événements et temps libre entre les deux. Les créneaux libres sont mis en avant pour que vous les utilisiez.',
      ],
    },
    ai: {
      title: ['Plan my day', 'Tegura umunsi wanjye', 'Planifier ma journée'],
      body: [
        'NEXUS proposes study and task blocks for your free time, each with a reason. Nothing is added until you accept.',
        'NEXUS igusabira igihe cyo kwiga n’imirimo mu gihe cyawe cy’ubusa, buri kimwe gifite impamvu. Nta kintu cyongerwaho utabyemeye.',
        'NEXUS propose des créneaux d’étude et de tâches dans votre temps libre, chacun avec une raison. Rien n’est ajouté sans votre accord.',
      ],
    },
    streak: {
      title: ['Streaks and goals', 'Uruhererekane n’intego', 'Séries et objectifs'],
      body: [
        'Study sessions, finished tasks and check-ins keep the streak alive. Goals fill as milestones get done.',
        'Kwiga, kurangiza imirimo no kwitabira bituma uruhererekane rukomeza. Intego zuzura uko intambwe zigerwaho.',
        'Sessions d’étude, tâches terminées et présences entretiennent la série. Les objectifs se remplissent au fil des étapes.',
      ],
    },
    sidebar: {
      title: ['Everything is connected', 'Byose birahuzwa', 'Tout est connecté'],
      body: [
        'People, circles with live chat, events, a live map of Kigali, a marketplace with a wallet, learning and more.',
        'Abantu, amatsinda afite ikiganiro kizima, ibirori, ikarita ya Kigali, isoko n’ikofi, kwiga n’ibindi.',
        'Personnes, cercles avec chat en direct, événements, carte de Kigali, marché avec portefeuille, apprentissage et plus.',
      ],
    },
    search: {
      title: ['Find anything', 'Shakisha icyo ari cyo cyose', 'Trouvez tout'],
      body: [
        'Search people, places, events and circles from anywhere in NEXUS.',
        'Shakisha abantu, ahantu, ibirori n’amatsinda aho uri hose muri NEXUS.',
        'Recherchez personnes, lieux, événements et cercles depuis n’importe où dans NEXUS.',
      ],
    },
    bell: {
      title: ['Notifications', 'Imenyesha', 'Notifications'],
      body: [
        'Friend requests, event invites, orders and messages from the NEXUS team land here.',
        'Ubusabe bw’ubucuti, ubutumire, ibyo watumije n’ubutumwa bw’ikipe ya NEXUS biza hano.',
        'Demandes d’amis, invitations, commandes et messages de l’équipe NEXUS arrivent ici.',
      ],
    },
  },
} as const;

export const language = {
  label: ['Language', 'Ururimi', 'Langue'],
  hint: [
    'NEXUS speaks English, Kinyarwanda and French.',
    'NEXUS ivuga Icyongereza, Ikinyarwanda n’Igifaransa.',
    'NEXUS parle anglais, kinyarwanda et français.',
  ],
  changed: ['Language updated', 'Ururimi rwahinduwe', 'Langue mise à jour'],
} as const;

export const pwa = {
  offlineTitle: ['You are offline', 'Nta murandasi ufite', 'Vous êtes hors ligne'],
  offlineBody: [
    'NEXUS needs a connection to load your world. Your tasks, messages and plans are safe and will be right here when you are back.',
    'NEXUS ikeneye murandasi kugira ngo yerekane isi yawe. Imirimo yawe, ubutumwa na gahunda byawe biri amahoro, uzabisanga hano ugarutse.',
    'NEXUS a besoin d’une connexion pour charger votre monde. Vos tâches, messages et plans sont en sécurité et vous attendront ici.',
  ],
} as const;
