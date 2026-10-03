export const progress = {
  delta: {
    nothing: ['nothing last week either', 'nta n’icyumweru gishize', 'rien la semaine dernière non plus'],
    new: ['new this week', 'bishya iki cyumweru', 'nouveau cette semaine'],
    same: ['same as last week', 'kimwe n’icyumweru gishize', 'comme la semaine dernière'],
    more: ['{n}% more than last week', '{n}% kurusha icyumweru gishize', '{n} % de plus que la semaine dernière'],
    less: ['{n}% less than last week', '{n}% munsi y’icyumweru gishize', '{n} % de moins que la semaine dernière'],
  },
  heatmap: {
    nothing: ['{date} — nothing logged', '{date} — nta cyanditswe', '{date} — rien d’enregistré'],
    day: [
      '{date} — {tasks} tasks, {modules} modules, {studied} studied',
      '{date} — imirimo {tasks}, ibice {modules}, wize {studied}',
      '{date} — {tasks} tâches, {modules} modules, {studied} d’étude',
    ],
    mon: ['Mon', 'Mbe', 'Lun'],
    wed: ['Wed', 'Gtu', 'Mer'],
    fri: ['Fri', 'Gnu', 'Ven'],
  },
  stats: {
    tasks: ['Tasks completed', 'Imirimo yarangiye', 'Tâches terminées'],
    tasksCaption: ['{n} still open', '{n} itarakorwa', '{n} encore ouvertes'],
    time: ['Time studied', 'Igihe wize', 'Temps d’étude'],
    timeCaptionOne: ['across {n} path', 'mu nzira {n}', 'sur {n} parcours'],
    timeCaptionMany: ['across {n} paths', 'mu nzira {n}', 'sur {n} parcours'],
    goals: ['Goals achieved', 'Intego zagezweho', 'Objectifs atteints'],
    goalsCaption: ['{active} in progress · {milestones} milestones', '{active} zirimo gukorwa · intambwe {milestones}', '{active} en cours · {milestones} étapes'],
    events: ['Events attended', 'Ibirori witabiriye', 'Événements suivis'],
    eventsCaption: ['checked in at the door', 'winjiye ku muryango', 'présence validée à l’entrée'],
  },
  week: {
    title: ['Your week in a sentence or four', 'Icyumweru cyawe mu nteruro nke', 'Votre semaine en quelques phrases'],
    twelve: ['The last twelve weeks', 'Ibyumweru cumi na bibiri bishize', 'Les douze dernières semaines'],
    activeDays: ['{n} active days of {total}', 'Iminsi {n} ikora kuri {total}', '{n} jours actifs sur {total}'],
    activeDay: ['{n} active day of {total}', 'Umunsi {n} ukora kuri {total}', '{n} jour actif sur {total}'],
    legend: [
      'A square fills in on any day you finished a task, completed a module, or logged study time. Counted in {zone}.',
      'Agasanduku kuzura ku munsi warangijeho umurimo, igice, cyangwa wanditse igihe wize. Bibarwa ku isaha ya {zone}.',
      'Une case se remplit chaque jour où vous avez fini une tâche, un module ou noté du temps d’étude. Compté en {zone}.',
    ],
    streak: ['Current streak', 'Uruhererekane rw’ubu', 'Série en cours'],
    streakStart: ['Finish one thing today to start it.', 'Rangiza ikintu kimwe uyu munsi uyitangire.', 'Terminez une chose aujourd’hui pour la lancer.'],
    streakDay: ['consecutive day with something done', 'umunsi ukurikiranye hari icyakozwe', 'jour consécutif avec quelque chose de fait'],
    streakDays: ['consecutive days with something done', 'iminsi ikurikiranye hari icyakozwe', 'jours consécutifs avec quelque chose de fait'],
    thisWeek: ['This week', 'Iki cyumweru', 'Cette semaine'],
    tasksDone: ['Tasks done', 'Imirimo yakozwe', 'Tâches faites'],
    studied: ['Studied', 'Wize', 'Étudié'],
    modules: ['Modules finished', 'Ibice byarangiye', 'Modules terminés'],
    rooms: ['Rooms you turned up in', 'Aho witabiriye', 'Les salles où vous étiez'],
  },
  insights: {
    study: {
      new: ['{value} of study this week, up from nothing last week.', 'Wize {value} iki cyumweru, mu gihe icyashize nta cyo.', '{value} d’étude cette semaine, contre rien la semaine dernière.'],
      steady: ['Study held steady at {value} this week.', 'Kwiga byagumye kuri {value} iki cyumweru.', 'L’étude est restée stable à {value} cette semaine.'],
      up: ['{value} of study this week, {change}% more than last week.', 'Wize {value} iki cyumweru, {change}% kurusha icyashize.', '{value} d’étude cette semaine, {change} % de plus que la semaine dernière.'],
      down: ['{value} of study this week, {change}% less than last week.', 'Wize {value} iki cyumweru, {change}% munsi y’icyashize.', '{value} d’étude cette semaine, {change} % de moins que la semaine dernière.'],
    },
    tasks: {
      new: ['{value} finished tasks this week, up from nothing last week.', 'Imirimo {value} yarangiye iki cyumweru, icyashize nta n’umwe.', '{value} tâches terminées cette semaine, contre aucune la semaine dernière.'],
      steady: ['Finished tasks held steady at {value} this week.', 'Imirimo yarangiye yagumye kuri {value} iki cyumweru.', 'Les tâches terminées sont restées à {value} cette semaine.'],
      up: ['{value} finished tasks this week, {change}% more than last week.', 'Imirimo {value} yarangiye iki cyumweru, {change}% kurusha icyashize.', '{value} tâches terminées cette semaine, {change} % de plus que la semaine dernière.'],
      down: ['{value} finished tasks this week, {change}% less than last week.', 'Imirimo {value} yarangiye iki cyumweru, {change}% munsi y’icyashize.', '{value} tâches terminées cette semaine, {change} % de moins que la semaine dernière.'],
    },
    bestDay: [
      '{day} is your strongest day. Put the hardest work there.',
      '{day} ni wo munsi ukoreraho cyane. Shyiraho akazi gakomeye.',
      '{day} est votre meilleur jour. Placez-y le travail le plus dur.',
    ],
    streak: [
      '{n} days in a row. One small session today keeps it going.',
      'Iminsi {n} ikurikiranye. Isomo rito uyu munsi rirayikomeza.',
      '{n} jours d’affilée. Une petite session aujourd’hui la prolonge.',
    ],
    idle: [
      'Nothing logged for {n} days. A 25 minute session is enough to restart.',
      'Nta cyanditswe mu minsi {n}. Iminota 25 irahagije ngo wongere utangire.',
      'Rien d’enregistré depuis {n} jours. Une session de 25 minutes suffit pour repartir.',
    ],
    start: [
      'Log a study session or finish a task and your patterns start showing here.',
      'Andika igihe wize cyangwa urangize umurimo, imiterere yawe itangire kugaragara hano.',
      'Notez une session d’étude ou terminez une tâche et vos habitudes apparaîtront ici.',
    ],
    manyOpen: [
      '{n} tasks are open. Closing or dropping a few makes the rest feel lighter.',
      'Imirimo {n} irafunguye. Kurangiza cyangwa kureka imwe bituma isigaye yoroha.',
      '{n} tâches sont ouvertes. En fermer ou en abandonner quelques-unes allège le reste.',
    ],
    noGoal: [
      'No active goal yet. One clear goal gives your week a direction.',
      'Nta ntego irimo gukorwa. Intego imwe isobanutse iha icyumweru cyawe icyerekezo.',
      'Aucun objectif actif. Un objectif clair donne une direction à votre semaine.',
    ],
  },
} as const;

export const badges = {
  title: ['Achievements', 'Ibyagezweho', 'Succès'],
  summary: [
    '{earned} of {total} earned. Each one comes from something you actually did.',
    '{earned} kuri {total} wabibonye. Buri kimwe kiva ku byo wakoze koko.',
    '{earned} sur {total} obtenus. Chacun vient de quelque chose que vous avez vraiment fait.',
  ],
  collection: ['Collection', 'Icyegeranyo', 'Collection'],
  ofTotal: ['{earned} of {total}', '{earned} kuri {total}', '{earned} sur {total}'],
  none: ['No achievements yet.', 'Nta byagezweho birahari.', 'Aucun succès pour l’instant.'],
  groups: {
    focus: ['Focus', 'Kwibanda', 'Concentration'],
    growth: ['Growth', 'Gukura', 'Progression'],
    people: ['People', 'Abantu', 'Personnes'],
    world: ['Out in the world', 'Hanze mu isi', 'Dans le monde'],
  },
  items: {
    'first-steps': {
      title: ['First steps', 'Intambwe za mbere', 'Premiers pas'],
      description: ['Set up your NEXUS world', 'Tegura isi yawe ya NEXUS', 'Configurez votre monde NEXUS'],
    },
    'task-crusher': {
      title: ['Task crusher', 'Umurangiza w’imirimo', 'Briseur de tâches'],
      description: ['Finish 10 tasks', 'Rangiza imirimo 10', 'Terminez 10 tâches'],
    },
    'deep-focus': {
      title: ['Deep focus', 'Kwibanda cyane', 'Concentration profonde'],
      description: ['Study for 10 hours in total', 'Iga amasaha 10 yose hamwe', 'Étudiez 10 heures au total'],
    },
    'on-fire': {
      title: ['On fire', 'Uragurumana', 'En feu'],
      description: ['Keep a 7 day streak', 'Komeza iminsi 7 ikurikiranye', 'Tenez une série de 7 jours'],
    },
    unstoppable: {
      title: ['Unstoppable', 'Ntawe ukuzitira', 'Inarrêtable'],
      description: ['Keep a 30 day streak', 'Komeza iminsi 30 ikurikiranye', 'Tenez une série de 30 jours'],
    },
    'goal-getter': {
      title: ['Goal getter', 'Ugera ku ntego', 'Atteint ses objectifs'],
      description: ['Achieve a goal', 'Gera ku ntego', 'Atteignez un objectif'],
    },
    'module-master': {
      title: ['Module master', 'Umuhanga mu bice', 'Maître des modules'],
      description: ['Complete 10 learning modules', 'Rangiza ibice 10 byo kwiga', 'Terminez 10 modules'],
    },
    scholar: {
      title: ['Scholar', 'Intiti', 'Érudit'],
      description: ['Complete a whole learning path', 'Rangiza inzira yose yo kwiga', 'Terminez un parcours entier'],
    },
    connector: {
      title: ['Connector', 'Uhuza abantu', 'Rassembleur'],
      description: ['Make 5 friends', 'Gira inshuti 5', 'Faites-vous 5 amis'],
    },
    voice: {
      title: ['Voice', 'Ijwi', 'Voix'],
      description: ['Share 10 posts', 'Sangiza inyandiko 10', 'Partagez 10 publications'],
    },
    insider: {
      title: ['Insider', 'Uw’imbere', 'Initié'],
      description: ['Belong to 3 circles', 'Ba mu matsinda 3', 'Faites partie de 3 cercles'],
    },
    regular: {
      title: ['Regular', 'Uhoraho', 'Habitué'],
      description: ['Check in at 3 events', 'Injira mu birori 3', 'Validez votre présence à 3 événements'],
    },
    host: {
      title: ['Host', 'Utegura', 'Hôte'],
      description: ['Host an event', 'Tegura ikirori', 'Organisez un événement'],
    },
    'local-guide': {
      title: ['Local guide', 'Uyobora abandi', 'Guide local'],
      description: ['Review 3 places', 'Tanga igitekerezo ku hantu 3', 'Donnez votre avis sur 3 lieux'],
    },
    merchant: {
      title: ['Merchant', 'Umucuruzi', 'Marchand'],
      description: ['Complete a sale in the market', 'Rangiza igurisha mu isoko', 'Réalisez une vente sur le marché'],
    },
  },
} as const;
