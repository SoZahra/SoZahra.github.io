/*
 * Pièce « whoami » : l'atelier. Elle peint à son chevalet, nous entend
 * entrer, se retourne et dit une seule réplique. En cliquant sur elle, elle
 * apparaît en grand en 3D (tour complet), puis sa fiche de personnage se
 * déplie à côté, façon jeu (niveau, attributs, compétences, histoire…).
 * Dessin et interactions : js/piece-whoami.js et js/figurine-3d.js.
 *
 * Champs :
 *   replique    : ce qu'elle dit en se retournant (une seule fois par visite)
 *   consigne    : affichée ensuite en haut de l'écran
 *   nom, classe : en-tête de la fiche
 *   rang, etoiles : « rareté » du personnage, comme dans un jeu gacha
 *   niveau, exp : niveau et barre d'expérience [actuelle, suivante]
 *   devise      : petite phrase sous le nom
 *   attributs   : [{ libelle, valeur }] (valeur sur 100 → barre)
 *   competences : mots-clés (outils, langages…)
 *   histoire    : paragraphes (tableau de chaînes)
 *   quetes      : parcours [{ annee, titre, lieu }]
 *   liens       : [{ libelle, url }]
 *   tenues      : skins du modèle 3D, la 1re est celle par défaut
 *                 [{ nom, modele, vignette, yeuxFermes?, buste? }]
 *                 yeuxFermes : texture aux paupières fermées (clignement)
 *                 buste      : true si le modèle s'arrête au buste (cadrage)
 *   fond        : (facultatif) image de fond de la fiche, ex. "images/fond.jpg" ;
 *                 sans elle, c'est l'atelier, flouté, qu'on voit derrière
 *
 * ⚠ Seuls le nom, la classe, la devise et le lien GitHub sont vrais : le
 *   reste (marqué « Exemple ») est à remplacer par tes informations.
 */
window.WHOAMI = {
  replique: "Ah, vous voilà ! J'ai bien cru entendre quelqu'un entrer dans la demeure.",
  consigne: "Clique sur elle.",
  consigneTactile: "Touche-la.",
  etiquette: "Fatima",

  nom: "Fatima Zayani",
  classe: "Designer UI/UX · Développeuse",
  rang: "SSR",
  etoiles: 5,
  niveau: 27,
  exp: [4200, 5000],
  devise: "Je dessine des interfaces… et je les code aussi.",

  attributs: [
    { libelle: "Design d'interface", valeur: 92 },
    { libelle: "Expérience utilisateur", valeur: 88 },
    { libelle: "Front-end", valeur: 85 },
    { libelle: "Back-end", valeur: 64 },
    { libelle: "Café", valeur: 42 },
  ],

  competences: ["Figma", "HTML", "CSS", "JavaScript", "React", "Accessibilité", "Prototypage", "Pixel art"],

  histoire: [
    "Exemple — Raconte ici ton histoire en quelques lignes : d'où tu viens, ce qui t'a menée au design et au code, ce que tu aimes construire.",
    "Exemple — Un deuxième paragraphe pour ce qui te rend unique : ta façon de travailler, tes sujets de prédilection.",
  ],

  quetes: [
    { annee: "2025", titre: "Exemple — Poste ou mission", lieu: "Entreprise" },
    { annee: "2023", titre: "Exemple — Diplôme", lieu: "École" },
    { annee: "2021", titre: "Exemple — Premier projet", lieu: "Ville" },
  ],

  liens: [
    { libelle: "GitHub", url: "https://github.com/SoZahra" },
  ],

  tenues: [
    {
      nom: "Mage-peintre",
      modele: "models/fatima.glb",
      yeuxFermes: "models/fatima-yeux-fermes.jpg",
      vignette: "images/tenues/peintre.jpg",
      buste: true,
    },
    {
      nom: "Armure",
      modele: "models/fatima-armure.glb",
      vignette: "images/tenues/armure.jpg",
    },
  ],
};
