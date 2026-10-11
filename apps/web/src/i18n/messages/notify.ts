export const notify = {
  welcome: {
    title: ['Welcome to NEXUS', 'Murakaza neza kuri NEXUS', 'Bienvenue sur NEXUS'],
    body: [
      'Build your NEXUS in five short steps and this place becomes yours.',
      'Tegura NEXUS yawe mu ntambwe eshanu ngufi maze aha habe ahawe.',
      'Construisez votre NEXUS en cinq étapes courtes et cet endroit devient le vôtre.',
    ],
  },
  ready: {
    title: ['Your NEXUS is ready', 'NEXUS yawe iriteguye', 'Votre NEXUS est prêt'],
    body: [
      'Home now works from your real schedule, interests and goals.',
      'Ahabanza ubu hakoresha gahunda yawe nyayo, ibyo ukunda n’intego zawe.',
      'L’accueil s’appuie désormais sur votre vrai emploi du temps, vos intérêts et vos objectifs.',
    ],
  },
  circleRequest: {
    title: ['{name} asked to join {circle}', '{name} yasabye kwinjira muri {circle}', '{name} demande à rejoindre {circle}'],
  },
  circleJoined: {
    title: ['You are in {circle}', 'Winjiye muri {circle}', 'Vous faites partie de {circle}'],
  },
  eventMoved: {
    title: ['{event} moved', '{event} cyimuriwe', '{event} a été déplacé'],
    body: ['Now {at}', 'Ubu ni {at}', 'Désormais {at}'],
  },
  eventGoing: {
    title: ['{name} is going to {event}', '{name} azitabira {event}', '{name} participe à {event}'],
  },
  eventInvite: {
    title: ['{name} invited you to {event}', '{name} yagutumiye kuri {event}', '{name} vous invite à {event}'],
    body: ['{at}', '{at}', '{at}'],
  },
  eventCancelled: {
    title: ['{event} was cancelled', '{event} cyahagaritswe', '{event} a été annulé'],
  },
  eventSoon: {
    title: ['{event} starts in about an hour', '{event} kiratangira mu isaha imwe', '{event} commence dans environ une heure'],
    body: ['Starts {at}. Tap for the place and your check-in.', 'Gitangira {at}. Kanda urebe aho ari n’uko winjira.', 'Début {at}. Touchez pour le lieu et l’enregistrement.'],
  },
  blockSoon: {
    title: ['Time for {task}', 'Igihe cya {task} kirageze', 'C’est l’heure de {task}'],
    body: ['You blocked {at} for this. Mark it done when you finish.', 'Wafashe {at} kubera ibi. Bishyire nk’ibyarangiye nurangiza.', 'Vous avez réservé {at} pour ça. Cochez-la une fois finie.'],
  },
  orderRequest: {
    title: ['{name} wants {n} × {item}', '{name} arashaka {n} × {item}', '{name} veut {n} × {item}'],
  },
  orderAccepted: {
    title: ['{name} accepted your order for {item}', '{name} yemeye itumiza ryawe rya {item}', '{name} a accepté votre commande de {item}'],
  },
  orderDeclined: {
    title: ['{name} declined your order for {item}', '{name} yanze itumiza ryawe rya {item}', '{name} a refusé votre commande de {item}'],
  },
  orderPaid: {
    title: ['{name} paid {amount} for {item}', '{name} yishyuye {amount} kuri {item}', '{name} a payé {amount} pour {item}'],
  },
  orderRefunded: {
    title: ['Order {code} was refunded', 'Itumiza {code} ryasubijwe amafaranga', 'La commande {code} a été remboursée'],
  },
  message: {
    title: ['{name} sent you a message', '{name} yakoherereje ubutumwa', '{name} vous a envoyé un message'],
  },
  follow: {
    title: ['{name} started following you', '{name} yatangiye kugukurikira', '{name} a commencé à vous suivre'],
  },
  friendRequest: {
    title: ['{name} sent you a friend request', '{name} yagusabye ubucuti', '{name} vous a envoyé une demande d’ami'],
  },
  friendAccepted: {
    title: ['{name} accepted your friend request', '{name} yemeye ubusabe bwawe bw’ubucuti', '{name} a accepté votre demande d’ami'],
  },
  goalAchieved: {
    title: ['Goal achieved: {goal}', 'Intego yagezweho: {goal}', 'Objectif atteint : {goal}'],
    body: ['Every milestone is done. That one is finished.', 'Intambwe zose zarangiye. Iyi yarangiye.', 'Toutes les étapes sont faites. Celui-ci est terminé.'],
  },
  reacted: {
    title: ['{name} reacted to your post', '{name} yagize icyo avuga ku nyandiko yawe', '{name} a réagi à votre publication'],
  },
  commented: {
    title: ['{name} commented on your post', '{name} yatanze igitekerezo ku nyandiko yawe', '{name} a commenté votre publication'],
  },
  moneyReceived: {
    title: ['{name} sent you {amount}', '{name} yakoherereje {amount}', '{name} vous a envoyé {amount}'],
  },
  contentRemoved: {
    title: ['Something you posted was removed', 'Ikintu washyizeho cyakuweho', 'Un contenu que vous avez publié a été retiré'],
    fallback: ['Reported as: {reason}', 'Cyamenyeshejwe nka: {reason}', 'Signalé pour : {reason}'],
  },
  warning: {
    title: ['A warning about your activity', 'Umuburo ku bikorwa byawe', 'Un avertissement concernant votre activité'],
    fallback: ['Reported as: {reason}', 'Cyamenyeshejwe nka: {reason}', 'Signalé pour : {reason}'],
  },
  suspended: {
    title: ['Your account is suspended for {n} days', 'Konti yawe yahagaritswe iminsi {n}', 'Votre compte est suspendu pour {n} jours'],
    titleOne: ['Your account is suspended for 1 day', 'Konti yawe yahagaritswe umunsi 1', 'Votre compte est suspendu pour 1 jour'],
    fallback: ['Reported as: {reason}', 'Cyamenyeshejwe nka: {reason}', 'Signalé pour : {reason}'],
  },
} as const;
