/*
 * Pièce « Contact » : le salon de la demeure. Elle somnole sur le canapé
 * près du feu, une tasse à la main ; elle se réveille quand on entre et
 * dit une réplique. Dessin et interactions : js/piece-contact.js.
 *
 * Objets du salon :
 *   - le secrétaire : on y écrit une lettre (formulaire), cachetée à la cire
 *     puis envoyée par Formspree ;
 *   - le café sur le guéridon : copie l'adresse e-mail ;
 *   - les cadres au-dessus de la cheminée : les liens (LinkedIn, GitHub, CV) ;
 *   - elle : un clic lui fait dire la réplique suivante.
 *
 * Champs :
 *   replique    : ce qu'elle dit en se réveillant (1re visite)
 *   repliques   : ce qu'elle dit ensuite quand on clique sur elle (à tour de rôle)
 *   consigne    : affichée en haut de l'écran une fois réveillée
 *   etiquette   : son nom, au survol
 *   email       : l'adresse copiée par la tasse (et repli de la lettre)
 *   formspree   : identifiant du formulaire Formspree (la fin de l'adresse
 *                 https://formspree.io/f/XXXXXXXX) ; vide = la lettre ouvre
 *                 la messagerie du visiteur, déjà remplie
 *   lettre      : textes de la lettre
 *   cadres      : liens [{ libelle, url, icone, telecharger? }]
 *                 icone : "linkedin", "github" ou "cv"
 *
 * ⚠ L'adresse, l'identifiant Formspree, LinkedIn et le CV sont des EXEMPLES
 *   à remplacer par les tiens.
 */
window.CONTACT = {
  replique: "Hm ? Oh, de la visite ! Viens te réchauffer près du feu. Tu veux m'écrire ? Le secrétaire est juste là.",
  repliques: [
    "Il y a du café sur le guéridon. Sers-toi, mon adresse est collée sur la tasse.",
    "Les cadres au-dessus de la cheminée mènent à mes autres demeures : LinkedIn, GitHub… et mon CV.",
    "Une mission, un projet, ou juste envie de parler design ? Écris-moi, je lis tout.",
    "Ce feu ne s'éteint jamais. Comme ma liste d'idées.",
  ],
  merci: "Merci pour ta lettre ! Je te réponds dès que possible.",
  consigne: "Écris une lettre, prends un café, ou regarde les cadres.",
  consigneTactile: "Touche le secrétaire, le café ou les cadres.",
  etiquette: "Fatima",

  email: "exemple@exemple.com",   // Exemple
  formspree: "",                  // Exemple : "xyzabcde"

  lettre: {
    titre: "Une lettre pour Fatima",
    salutation: "Chère Fatima,",
    placeholderMessage: "Raconte-moi ton projet, ta question, ou juste bonjour…",
    reponse: "Tu peux me répondre à :",
    signature: "Signé :",
    envoyer: "Cacheter et envoyer",
    envoyee: "Ta lettre est partie !",
    envoyeeTexte: "Elle est scellée et en route. Je te réponds dès que possible.",
    messagerie: "Ta messagerie s'ouvre avec la lettre déjà écrite : il ne reste qu'à l'envoyer.",
    erreur: "La lettre n'a pas pu partir. Réessaie, ou écris-moi directement à",
  },

  cadres: [
    { libelle: "LinkedIn", url: "https://www.linkedin.com/in/exemple", icone: "linkedin" }, // Exemple
    { libelle: "GitHub", url: "https://github.com/SoZahra", icone: "github" },
    { libelle: "CV", url: "documents/cv.pdf", icone: "cv", telecharger: true },          // Exemple
  ],
};
