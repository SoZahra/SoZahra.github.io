/*
 * Pièce « Projets » : un vieux bureau. En cliquant sur le bureau, on s'en
 * approche et chaque projet apparaît comme un objet d'inventaire (façon jeu) :
 * un document (parchemin, lettre scellée, carnet…), sa catégorie (comme la
 * rareté d'un objet), sa description, ses outils et ses « effets ».
 * Dessin et interactions : js/piece-projets.js.
 *
 * Champs d'un projet :
 *   titre       : nom de l'objet
 *   document    : icône dessinée en pixels — "parchemin", "lettre", "carnet",
 *                 "carte", "plan" ou "grimoire"
 *   categorie   : clé de "categories" ci-dessous (couleur + libellé)
 *   annee       : texte libre ("2025", "2023 – 2024"…)
 *   resume      : une phrase, affichée sous le titre (comme le texte d'ambiance d'un objet)
 *   description : un ou deux paragraphes (tableau de chaînes)
 *   role        : ton rôle sur le projet
 *   outils      : liste de mots-clés
 *   effets     : ce que le projet a apporté, présenté comme les bonus d'un objet
 *   liens       : [{ libelle, url }] (vide = pas de bouton)
 *
 * ⚠ Les projets ci-dessous sont des EXEMPLES à remplacer par les tiens.
 */
window.PROJETS = {
  titre: "Projets",
  consigne: "Clique sur le bureau pour fouiller les documents.",
  consigneTactile: "Touche le bureau pour fouiller les documents.",

  // Catégories = « rareté » de l'objet
  categories: {
    phare:  { libelle: "Projet phare",    couleur: "#e2b045" },
    client: { libelle: "Mission client",  couleur: "#7fa8e0" },
    perso:  { libelle: "Projet perso",    couleur: "#7cc48f" },
    ecole:  { libelle: "Projet d'école",  couleur: "#b9b3cc" },
  },

  liste: [
    {
      titre: "Exemple — Application de réservation",
      document: "parchemin",
      categorie: "phare",
      annee: "2025",
      resume: "Un parchemin couvert de parcours utilisateurs, annoté à l'encre rouge.",
      description: [
        "Exemple à remplacer : conception et développement d'une application de réservation, de la recherche utilisateur jusqu'à la mise en ligne.",
      ],
      role: "Designer UI/UX & développeuse front-end",
      outils: ["Figma", "React", "TypeScript"],
      effets: ["+ Recherche utilisateur", "+ Design system", "+ Tests d'utilisabilité"],
      liens: [],
    },
    {
      titre: "Exemple — Refonte d'un site vitrine",
      document: "lettre",
      categorie: "client",
      annee: "2024",
      resume: "Une lettre scellée de cire rouge, adressée par un client pressé.",
      description: ["Exemple à remplacer : refonte complète d'un site vitrine, plus lisible et accessible."],
      role: "Designer UI & intégratrice",
      outils: ["Figma", "HTML", "CSS"],
      effets: ["+ Accessibilité", "+ Performance"],
      liens: [],
    },
    {
      titre: "Exemple — Carnet de recherche",
      document: "carnet",
      categorie: "perso",
      annee: "2024",
      resume: "Un carnet de cuir rempli de croquis et de notes d'entretiens.",
      description: ["Exemple à remplacer : étude UX personnelle, entretiens et prototypes papier."],
      role: "Designer UX",
      outils: ["Entretiens", "Prototypage papier", "Figma"],
      effets: ["+ Empathie", "+ Synthèse"],
      liens: [],
    },
    {
      titre: "Exemple — Carte d'un tableau de bord",
      document: "carte",
      categorie: "client",
      annee: "2023",
      resume: "Une carte où chaque chemin mène à une donnée importante.",
      description: ["Exemple à remplacer : conception d'un tableau de bord de suivi d'activité."],
      role: "Designer UI/UX",
      outils: ["Figma", "Data visualisation"],
      effets: ["+ Hiérarchie de l'information"],
      liens: [],
    },
    {
      titre: "Exemple — Plans d'un design system",
      document: "plan",
      categorie: "perso",
      annee: "2023",
      resume: "Des plans bleus tracés au compas : boutons, grilles et couleurs.",
      description: ["Exemple à remplacer : bibliothèque de composants documentée, du design au code."],
      role: "Designer & développeuse",
      outils: ["Figma", "Storybook", "CSS"],
      effets: ["+ Cohérence", "+ Réutilisation"],
      liens: [],
    },
    {
      titre: "Exemple — Grimoire de fin d'études",
      document: "grimoire",
      categorie: "ecole",
      annee: "2022",
      resume: "Un épais grimoire, fermé par un fermoir de laiton.",
      description: ["Exemple à remplacer : projet de fin d'études."],
      role: "Cheffe de projet & designer",
      outils: ["Gestion de projet", "Figma", "Vue.js"],
      effets: ["+ Travail d'équipe"],
      liens: [],
    },
  ],
};
