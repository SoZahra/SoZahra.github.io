/*
 * Le personnage en pixel art (16×32). Pour l'instant, seuls ses yeux sont
 * utilisés (dialogues de l'intro, js/fond-pixel.js) ; le personnage complet
 * et son comportement (creer) sont gardés de côté pour la page « whoami ».
 * Brune, cheveux longs et frange lourde, robe sombre à col claudine, bottes
 * noires à couture jaune façon Dr. Martens. Proportions à la Stardew Valley,
 * ambiance « cozy horror » à la Welcome to Elderfield, palette PC-98.
 *
 * Chaque sprite est une grille de lettres (une lettre = un pixel, "." = vide) ;
 * la légende des couleurs est dans COULEURS. Le haut du corps (lignes 0 à 25)
 * est commun ; les jambes (lignes 26 à 31) changent pour la marche.
 */
window.PERSONNAGE_PIXEL = (() => {
  "use strict";

  // Esprit « cozy horror » (à la Welcome to Elderfield) : peau pâle et
  // grisée, grands yeux sombres au reflet unique, cheveux et robe presque
  // noirs, col pâle. Couleurs froides, tirées vers les violets du décor
  // (js/fond-pixel.js l'assombrit en plus selon la lumière de la torche)
  const COULEURS = {
    K: "#0e0c16", // contour
    H: "#2e2230", // cheveux
    h: "#4a3646", // reflet des cheveux
    S: "#b9adb8", // peau
    s: "#857a8c", // peau dans l'ombre
    E: "#0a0810", // yeux
    e: "#dcd6ea", // reflet dans les yeux
    D: "#4a2c4c", // robe
    d: "#2e1c34", // robe dans l'ombre
    L: "#644466", // reflet de la robe
    w: "#8e88a2", // col claudine
    B: "#171420", // bottes
    b: "#34304a", // reflet des bottes
    Y: "#8a7a54", // couture jaune des bottes (ternie)
    G: "#f4f0ff", // yeux qui brillent dans le noir
    g: "#5c5a90", // halo autour des yeux
  };

  /* ---------- De face ---------- */
  const FACE_HAUT = [
    "....KKKKKKKK....",
    "...KHHHHHHHHK...",
    "..KHHhhHHHHHHK..",
    ".KHHhHHHHHHHHHK.",
    ".KHHHHHHHHHHHHK.",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHSSeESSeESSHHK",
    "KHHSSEESSEESSHHK",
    "KHHHSSSSSSSSHHHK",
    "KHHHsSSSSSSsHHHK",
    "KHHHHsSSSSsHHHHK",
    "KHHHHKKssKKHHHHK",
    "KHHHKwwwwwwKHHHK",
    "KHHKDDLDDDDdKHHK",
    "KHKSDLDDDDDdSKHK",
    "KHKSDDDDDDDdSKHK",
    "KHKSDDDDDDDdSKHK",
    ".KKsDDDDDDDdsKK.",
    "...KDDDDDDDDdK..",
    "..KDDLDDDDDDDdK.",
    "..KDLDDDDDDDDdK.",
    ".KDDDDDDDDDDDDdK",
    ".KddddddddddddK.",
    "..KKKKKKKKKKKK..",
  ];
  const FACE_JAMBES = [
    ".....KSK.KSK....",
    ".....KSK.KSK....",
    "....KBbBKBbBK...",
    "....KBBBKBBBK...",
    "...KYYYYKYYYYK..",
    "...KKKKKKKKKKK..",
  ];
  // Clignement : l'œil devient une simple ligne
  const FACE_CLIGNE = FACE_HAUT.map((l, y) => (y === 8 ? l.replace(/eE/g, "SS") : l));

  /* ---------- De profil (vers la droite ; retourné pour aller à gauche) ---------- */
  const PROFIL_HAUT = [
    "....KKKKKKK.....",
    "...KHHHHHHHK....",
    "..KHHhhHHHHHK...",
    ".KHHhHHHHHHHHK..",
    ".KHHHHHHHHHHHK..",
    "KHHHHHHHHHHHHHK.",
    "KHHHHHHHHHHHHHK.",
    "KHHHHHHHHHHHHHK.",
    "KHHHHHHSSSeESSK.",
    "KHHHHHHSSSEESSK.",
    "KHHHHHHHSSSSSSK.",
    "KHHHHHHHSSSSsK..",
    "KHHHHHHHKSSsK...",
    "KHHHHHHHHKsK....",
    "KHHHHHHKwwwwK...",
    "KHHHHHKDDLDDK...",
    "KHHHHHKDLDDDK...",
    "KHHHHHKDDDDdK...",
    ".KHHHHKDDDDdK...",
    "..KHHHKDDSDdK...",
    "....KDDDDDDdK...",
    "...KDDLDDDDDdK..",
    "...KDLDDDDDDdK..",
    "..KDDDDDDDDDDdK.",
    "..KdddddddddddK.",
    "...KKKKKKKKKKK..",
  ];
  const PROFIL_CLIGNE = PROFIL_HAUT.map((l, y) => (y === 8 ? l.replace("eE", "SS") : l));
  const PAS = [
    // jambes serrées
    [
      "......KSSK......",
      "......KSSK......",
      ".....KBBbBK.....",
      ".....KBBBBBK....",
      ".....KYYYYYK....",
      ".....KKKKKKK....",
    ],
    // jambes écartées
    [
      ".....KSKKSK.....",
      "....KSK..KSK....",
      "...KBbK...KBbK..",
      "...KBBBK..KBBBK.",
      "...KYYYK..KYYYK.",
      "...KKKKK..KKKKK.",
    ],
  ];

  const LARGEUR = 16, HAUTEUR = 32;
  const rvb = Object.fromEntries(Object.entries(COULEURS).map(([k, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return [k, [(n >> 16) & 255, (n >> 8) & 255, n & 255]];
  }));

  // Pose un sprite : (x, sol) = milieu des pieds ; miroir = regarde à gauche
  function poserSprite(lignes, x, sol, miroir, poser) {
    const gauche = Math.round(x) - LARGEUR / 2;
    const haut = sol - HAUTEUR + 1;
    lignes.forEach((ligne, j) => {
      for (let i = 0; i < LARGEUR; i++) {
        const c = ligne[miroir ? LARGEUR - 1 - i : i];
        if (c !== ".") poser(gauche + i, haut + j, rvb[c]);
      }
    });
  }

  /* ---------- Les yeux seuls, qui brillent dans le noir ----------
   * Même place que sur le sprite de face : on « devine » le personnage. */
  function dessinerYeux(x, sol, ouverts, poser) {
    const gauche = Math.round(x) - LARGEUR / 2;
    const haut = sol - HAUTEUR + 1;
    for (const ox of [5, 10]) {
      const ex = gauche + ox, ey = haut + 8;
      if (!ouverts) {
        poser(ex, ey + 1, rvb.g); // paupière fermée : un trait sombre
        continue;
      }
      // Halo, puis l'œil (2 pixels de haut)
      for (const [dx, dy] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, -1], [0, 2]]) poser(ex + dx, ey + dy, rvb.g);
      poser(ex, ey, rvb.G);
      poser(ex, ey + 1, rvb.G);
    }
  }

  /* ---------- Comportement : se balade devant les portes ----------
   * Marche vers un point au hasard, s'arrête (de face, clignant des yeux),
   * repart. viser(x) l'envoie vers une porte précise (porte survolée). */
  function creer({ xMin, xMax, sol, x }) {
    const p = {
      x: x ?? (xMin + xMax) / 2,
      sol,
      cible: null,
      sens: 1,           // 1 = vers la droite
      attente: 15,       // images avant de repartir
      image: 0,
      cligne: 0,         // images restantes de clignement
      prochainClin: 30,
      visee: false,      // cible imposée (porte survolée)
    };

    const VITESSE = 1.1;   // pixels du décor par image
    const IMAGES_PAR_PAS = 2;

    p.viser = (xCible) => {
      p.cible = Math.max(xMin, Math.min(xMax, xCible));
      p.visee = true;
    };

    p.mettreAJour = () => {
      p.image++;
      // Clignement des yeux de temps en temps
      if (p.cligne > 0) p.cligne--;
      else if (--p.prochainClin <= 0) {
        p.cligne = 2;
        p.prochainClin = 30 + Math.floor(Math.random() * 40);
      }

      if (p.cible === null) {
        if (--p.attente <= 0) {
          p.cible = xMin + Math.random() * (xMax - xMin);
          p.visee = false;
        }
        return;
      }
      const ecart = p.cible - p.x;
      if (Math.abs(ecart) <= VITESSE) {
        // Arrivée : pause, plus longue devant une porte survolée
        p.x = p.cible;
        p.cible = null;
        p.attente = p.visee ? 60 : 20 + Math.floor(Math.random() * 40);
        return;
      }
      p.sens = Math.sign(ecart);
      p.x += p.sens * VITESSE;
    };

    p.dessiner = (poser) => {
      const yeuxFermes = p.cligne > 0;
      if (p.cible === null) {
        poserSprite([...(yeuxFermes ? FACE_CLIGNE : FACE_HAUT), ...FACE_JAMBES], p.x, p.sol, false, poser);
      } else {
        const pas = PAS[Math.floor(p.image / IMAGES_PAR_PAS) % 2];
        poserSprite([...(yeuxFermes ? PROFIL_CLIGNE : PROFIL_HAUT), ...pas], p.x, p.sol, p.sens < 0, poser);
      }
    };

    return p;
  }

  // Pour l'aperçu et les tests : sprites complets
  const SPRITES = {
    face: [...FACE_HAUT, ...FACE_JAMBES],
    faceCligne: [...FACE_CLIGNE, ...FACE_JAMBES],
    profil1: [...PROFIL_HAUT, ...PAS[0]],
    profil2: [...PROFIL_HAUT, ...PAS[1]],
  };

  return { LARGEUR, HAUTEUR, COULEURS, SPRITES, creer, dessinerYeux };
})();
