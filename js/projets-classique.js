/*
 * Projets de la version classique (index.html) : ses vrais projets, avec
 * leurs écrans exportés de Figma (images/projets/). La version jeu garde
 * js/projets.js et son inventaire.
 *
 * Champs d'un projet :
 *   titre       : nom du projet
 *   type        : ce que c'est, en court (affiché aussi dans la colonne)
 *   annee       : texte libre
 *   resume      : une phrase, sous le titre de sa planche
 *   description : un ou deux paragraphes, dans la fiche (tableau de chaînes)
 *   role, outils, effets, liens : comme dans js/projets.js
 *   ecrans      : [{ src, alt, taille, l, h }] — taille "grand", "moyen" ou
 *                 "telephone" ; l × h = taille de l'image en pixels (réserve
 *                 sa place avant le chargement). Ils servent aussi au collage
 *                 que reflètent les iris de l'accueil.
 *   fond, encre : couleurs de sa vue plein écran (texte, colonne et menu
 *                 prennent l'encre) ; sombre : true si le fond est foncé
 *   serif       : true pour un titre en serif (comme sa maquette)
 *   porteCle    : son porte-clé sur le trousseau de l'accueil
 *                 (js/express-trousseau.js) : { src, ratio, hauteur, chaine,
 *                 anneau }. Sans porte-clé, le projet n'est que dans le
 *                 sommaire, sous le trousseau.
 *
 * ⚠ Années, rôles et descriptions sont PROVISOIRES : à confirmer par Fatima.
 */
window.PROJETS_CLASSIQUE = {
  liste: [
    {
      titre: "Matcha",
      fond: "#d12222", encre: "#f3f1ed",
      type: "Site de rencontre",
      annee: "2025",
      resume: "Le premier site de rencontre où le terrain d'entente, c'est la culture.",
      description: [
        "Texte provisoire : on parle livres et films autour d'une tasse de thé. Affiche typographique « Take a sip and let's talk », inscription, puis un profil relié à Letterboxd et Apple Music pour rapprocher les gens par leurs goûts.",
      ],
      role: "Design UI/UX",
      outils: ["Figma"],
      effets: ["Identité visuelle", "Parcours d'inscription", "Profil"],
      liens: [],
      porteCle: { src: "images/porte-cles/matcha.webp", ratio: 444 / 900, hauteur: 30, chaine: 4, anneau: [0.462, 0.135], penche: 0.55 },
      ecrans: [
        { src: "images/projets/matcha-affiche.webp", alt: "Accueil de Matcha : « Take a sip and let's talk » en grandes lettres rouges autour d'un verre de matcha glacé.", taille: "grand", l: 1440, h: 1024 },
        { src: "images/projets/matcha-piece.webp", alt: "Écran Matcha : le nom en rouge sur une pièce ancienne baignée de lumière, une tasse de thé sur la table.", taille: "moyen", l: 1440, h: 1024 },
      ],
    },
    {
      titre: "ft_transcendence",
      fond: "#f2f2f2", encre: "#111111",
      type: "Jeux en ligne",
      annee: "2025",
      resume: "Pong et Snake en ligne, avec profils, amis, classement et statistiques.",
      description: [
        "Texte provisoire : une plateforme de jeux en ligne. Tableau de bord en blocs (profil, parties jouées, taux de victoire, amis), puis des statistiques détaillées par jeu.",
      ],
      role: "Design UI/UX",
      outils: ["Figma"],
      effets: ["Tableau de bord", "Visualisation de données"],
      liens: [],
      ecrans: [
        { src: "images/projets/transcendence-tableau.webp", alt: "Tableau de bord de ft_transcendence : profil, parties jouées, taux de victoire, Pong et amis, en blocs blancs sur fond gris.", taille: "grand", l: 1440, h: 1024 },
        { src: "images/projets/transcendence-stats.webp", alt: "Statistiques de Snake : dernières parties, courbe du temps de jeu, classement général et anneaux de progression.", taille: "moyen", l: 1440, h: 1024 },
      ],
    },
    {
      titre: "Michael Jackson",
      fond: "#0e0e0e", encre: "#f4f4f2", sombre: true, serif: true,
      type: "Application mobile",
      annee: "2025",
      resume: "Un compte à rebours jusqu'au 24 avril, et ses albums à faire défiler.",
      description: [
        "Texte provisoire : écran d'accueil d'une application mobile, « His Story Begins ». Un compte à rebours en heures, minutes et secondes, puis un carrousel d'albums.",
      ],
      role: "Design UI",
      outils: ["Figma"],
      effets: ["Mobile", "Carrousel"],
      liens: [],
      ecrans: [
        { src: "images/projets/mj-accueil.webp", alt: "Écran mobile « Michael Jackson, His Story Begins » : compte à rebours et carrousel de pochettes d'albums.", taille: "telephone", l: 780, h: 1688 },
      ],
    },
  ],
};
