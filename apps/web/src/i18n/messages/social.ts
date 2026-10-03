export const time = {
  justNow: ['just now', 'ubu nyine', 'à l’instant'],
  minutes: ['{n}m', 'iminota {n}', '{n} min'],
  hours: ['{n}h', 'amasaha {n}', '{n} h'],
  days: ['{n}d', 'iminsi {n}', '{n} j'],
} as const;

export const social = {
  scopes: {
    'for-you': ['For you', 'Ibyawe', 'Pour vous'],
    following: ['Following', 'Abo ukurikira', 'Abonnements'],
    friends: ['Friends', 'Inshuti', 'Amis'],
    mine: ['Yours', 'Ibyawe bwite', 'Les vôtres'],
    saved: ['Saved', 'Byabitswe', 'Enregistrés'],
  },
  visibility: {
    PUBLIC: ['Public', 'Rusange', 'Public'],
    FRIENDS: ['Friends', 'Inshuti', 'Amis'],
    PRIVATE: ['Only me', 'Njye gusa', 'Moi seul'],
  },
  composer: {
    placeholder: ['What is happening in your world?', 'Ni iki kiri kubera mu isi yawe?', 'Que se passe-t-il dans votre monde ?'],
    addPhoto: ['Add a photo', 'Ongeraho ifoto', 'Ajouter une photo'],
    option: ['Option {n}', 'Ihitamo {n}', 'Option {n}'],
    addOption: ['Add option', 'Ongeraho ihitamo', 'Ajouter une option'],
    poll: ['Poll', 'Itora', 'Sondage'],
    photo: ['Photo', 'Ifoto', 'Photo'],
    confirmEmail: [
      'Confirm your email address to post publicly. Friends and private posts work now.',
      'Emeza imeyili yawe kugira ngo ushyireho ku mugaragaro. Inyandiko z’inshuti n’izibwite zirakora ubu.',
      'Confirmez votre e-mail pour publier en public. Les publications entre amis et privées fonctionnent déjà.',
    ],
  },
  empty: {
    saved: ['Nothing saved yet', 'Nta kirabikwa', 'Rien d’enregistré'],
    default: ['Nothing here yet', 'Nta kintu kirahari', 'Rien pour l’instant'],
    friends: [
      'Posts from people you are friends with will appear here.',
      'Inyandiko z’inshuti zawe zizagaragara hano.',
      'Les publications de vos amis apparaîtront ici.',
    ],
    following: [
      'Follow a few people and their posts land here.',
      'Kurikira abantu bake, inyandiko zabo zize hano.',
      'Suivez quelques personnes et leurs publications arriveront ici.',
    ],
    first: ['Be the first to post something.', 'Ba uwa mbere ushyiraho ikintu.', 'Soyez le premier à publier.'],
  },
  reactions: {
    LIKE: ['Like', 'Birakunzwe', 'J’aime'],
    CELEBRATE: ['Celebrate', 'Twishimire', 'Bravo'],
    SUPPORT: ['Support', 'Shyigikira', 'Soutien'],
  },
  post: {
    delete: ['Delete post', 'Siba inyandiko', 'Supprimer la publication'],
    report: ['Report post', 'Tanga raporo', 'Signaler la publication'],
    reported: ['Reported. Thanks for flagging it.', 'Byatanzweho raporo. Murakoze kubimenyesha.', 'Signalé. Merci de nous avoir prévenus.'],
    vote: ['{n} vote', 'Ijwi {n}', '{n} vote'],
    votes: ['{n} votes', 'Amajwi {n}', '{n} votes'],
    comment: ['Comment', 'Tanga igitekerezo', 'Commenter'],
    save: ['Save', 'Bika', 'Enregistrer'],
    saved: ['Saved', 'Byabitswe', 'Enregistré'],
    noComments: ['No comments yet.', 'Nta bitekerezo biratangwa.', 'Pas encore de commentaires.'],
    writeComment: ['Write a comment', 'Andika igitekerezo', 'Écrire un commentaire'],
  },
  picker: {
    addCover: ['Add a cover photo', 'Ongeraho ifoto yo hejuru', 'Ajouter une photo de couverture'],
    hint: [
      'JPEG, PNG or WebP. Big photos are resized for you.',
      'JPEG, PNG cyangwa WebP. Amafoto manini aragabanywa.',
      'JPEG, PNG ou WebP. Les grandes photos sont redimensionnées.',
    ],
    uploading: ['Uploading…', 'Birimo koherezwa…', 'Envoi…'],
    replace: ['Replace', 'Hindura', 'Remplacer'],
    remove: ['Remove photo', 'Kuraho ifoto', 'Retirer la photo'],
    changeCover: ['Change cover', 'Hindura ifoto yo hejuru', 'Changer la couverture'],
    eventPoster: ['Add an event poster or photo', 'Ongeraho ifishi cyangwa ifoto y’ikirori', 'Ajouter une affiche ou une photo'],
    placePhoto: ['Add a photo of the place', 'Ongeraho ifoto y’aho hantu', 'Ajouter une photo du lieu'],
    listingPhoto: ['Add a photo of what you are selling', 'Ongeraho ifoto y’icyo ucuruza', 'Ajouter une photo de ce que vous vendez'],
  },
} as const;
