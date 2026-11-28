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
 *   texte       : à la place de description, des paragraphes titrés
 *                 [{ titre, texte }] (le problème, la réponse…)
 *   infos       : à la place de role/outils/effets, des lignes libres
 *                 [[nom, valeur]] (cadre, équipe, durée…)
 *   parcours    : le parcours principal, écrans dans l'ordre, chacun avec
 *                 titre et legende ; ecrans devient alors « Les autres écrans »
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
        "On parle livres et films autour d'une tasse de thé. Affiche typographique « Take a sip and let's talk », inscription, puis un profil relié à Letterboxd et Apple Music pour rapprocher les gens par leurs goûts.",
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
        "Une plateforme de jeux en ligne. Tableau de bord en blocs (profil, parties jouées, taux de victoire, amis), puis des statistiques détaillées par jeu.",
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
      titre: "Spotflow",
      fond: "#c0d9ff", encre: "#111111",
      type: "Application mobile",
      annee: "2026",
      resume: "Rejoindre la file d'attente de son café avant d'y arriver.",
      texte: [
        { titre: "Le problème", texte: "Les coffee shops à la mode ont des files qui débordent sur le trottoir. On y va sans savoir combien de temps on va attendre, et on repart parfois sans rien. C'est parti de ce que je vivais avec mes amis." },
        { titre: "La réponse", texte: "Spotflow affiche combien de personnes attendent dans les cafés, bars et restaurants autour de soi. On rejoint la file à distance, on suit son tour en direct, et on peut demander plus de temps si on est en retard." },
        { titre: "Pensée pour les commerçants aussi", texte: "Chaque établissement personnalise l'app à son image, couleurs et langue comprises. Ces maquettes en montrent une version « coffee shop pop » en pastel, avec des écrans en anglais et en français." },
      ],
      infos: [
        ["Cadre", "Projet personnel"],
        ["Équipe", "Seule"],
        ["Durée", "3 semaines"],
        ["Rôle", "Recherche, wireframes, design UI/UX"],
        ["Outils", "Figma, papier"],
        ["Statut", "Prototype en cours"],
      ],
      liens: [],
      // le parcours principal, dans l'ordre, chaque écran avec sa légende
      // (manquent « rejoindre » et « en attente » : exports de Fatima à venir)
      parcours: [
        { src: "images/projets/spotflow-accueil.webp", titre: "Autour de moi", legende: "Mes files en cours en haut, puis les adresses proches. Le gros chiffre : le nombre de personnes devant moi.", alt: "Accueil de Spotflow : files en cours (1 personne avant vous au Cafe Soul, 6 à Off coffee), puis cafés, bars et restaurants proches avec le nombre de personnes qui attendent.", l: 880, h: 1912 },
        { src: "images/projets/spotflow-cafe.webp", titre: "Le café", legende: "Sa fiche : offres du moment, heures calmes, réserver ou rejoindre la file.", alt: "Fiche du café Ponciano Ponzano sur fond bleu : photo de la devanture, note, horaires calmes, offres (10 %, boisson offerte), réservation et bouton pour rejoindre la file.", l: 880, h: 1912 },
      ],
      // les autres écrans, en vignettes
      ecrans: [
        { src: "images/projets/spotflow-menu.webp", alt: "Carte du café : catégories à gauche (Froid, Signature, Chaud, Cookie…), boissons glacées avec prix et bouton d'ajout.", taille: "telephone", l: 440, h: 956 },
        { src: "images/projets/spotflow-favoris.webp", alt: "Favoris : onglets Lieux, Boissons, Collections ; en tête, l'adresse où la file est la plus courte en ce moment.", taille: "telephone", l: 880, h: 1912 },
      ],
    },
  ],
};
