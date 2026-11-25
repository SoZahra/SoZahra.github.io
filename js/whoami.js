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

  // ⚠ Brouillon (novembre 2026), écrit d'après son CV : à corriger par elle
  histoire: [
    "J'ai commencé par l'image : un BTS Design Graphique, un Master en direction artistique, puis TF1, où je créais des vidéos et du motion design pour les réseaux sociaux.",
    "En 2024, je suis entrée à l'École 42 pour passer de l'autre côté de l'écran. Aujourd'hui, je dessine dans Figma et je développe ce que j'ai dessiné, en faisant attention à ce que la personne ressent en l'utilisant.",
    "Ce qui me plaît : les interfaces qui ont du caractère, les petites animations qui donnent vie à une page (comme ce trousseau), et les projets où le design et le code se parlent.",
  ],

  // version classique (volet À propos) : ce qu'elle fait, et ce qu'elle cherche
  faire: [
    { titre: "Design", texte: "Interfaces, identité visuelle, prototypes dans Figma." },
    { titre: "Code", texte: "Sites et applications web, du front au back." },
    { titre: "Motion", texte: "Animation, vidéo, interactions qui donnent vie à une page." },
  ],
  enCeMoment: "Je cherche un CDI, un stage ou une alternance qui mène à un CDI, dès que possible.",

  // version classique : ses objets, qui tombent dans le volet À propos
  // (js/express-objets.js). taille = hauteur en % de l'écran. Une image
  // absente est simplement ignorée.
  objets: [
    { src: "images/objets/cafe.webp", nom: "Café", texte: "toujours un verre à côté du clavier", taille: 17 },
    { src: "images/objets/camera.webp", nom: "Caméra", texte: "la vidéo et le motion, depuis TF1", taille: 14 },
    { src: "images/objets/console.webp", nom: "Console", texte: "je joue (beaucoup)", taille: 11 },
    { src: "images/objets/dessin.webp", nom: "Dessin", texte: "tout commence par un croquis", taille: 13 },
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
    {
      nom: "Veste brodée",
      modele: "models/fatima-buste.glb",
      vignette: "images/tenues/veste.jpg",
      buste: true,
    },
    {
      nom: "Veste simple",
      modele: "models/fatima-simple.glb",
      vignette: "images/tenues/simple.jpg",
      buste: true,
    },
  ],
};
