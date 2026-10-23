/*
 * Le personnage en pixel art (16×32). Pour l'instant, seuls ses yeux sont
 * utilisés (dialogues de l'intro, js/fond-pixel.js) ; le personnage complet
 * et son comportement (creer) sont gardés de côté pour la page « whoami ».
 * Brune, cheveux longs et frange lourde. Même tenue que son modèle 3D
 * (models/fatima.glb) : mage-peintre en long manteau bordeaux brodé d'or,
 * corset de cuir, épaulière dorée sur l'épaule gauche, gants, ceinture à
 * fioles, pantalon sombre et hautes bottes noires ; son pinceau a la pointe
 * dorée qui luit. Proportions à la Stardew Valley, palette PC-98.
 *
 * Chaque sprite est une grille de lettres (une lettre = un pixel, "." = vide) ;
 * la légende des couleurs est dans COULEURS. Le haut du corps (lignes 0 à 25)
 * est commun ; les jambes (lignes 26 à 31) changent pour la marche.
 */
window.PERSONNAGE_PIXEL = (() => {
  "use strict";

  // Grands yeux sombres au reflet unique, cheveux presque noirs, peau mate
  // comme sur son modèle 3D ; le bordeaux et l'or reprennent sa tenue
  // (js/fond-pixel.js l'assombrit en plus selon la lumière de la torche)
  const COULEURS = {
    K: "#0e0c16", // contour
    H: "#2a1e26", // cheveux
    h: "#4a3644", // reflet des cheveux
    S: "#b4876c", // peau
    s: "#7c5a50", // peau dans l'ombre
    E: "#0a0810", // yeux
    e: "#dcd6ea", // reflet dans les yeux
    D: "#6e2232", // manteau bordeaux
    d: "#43141f", // manteau dans l'ombre
    L: "#903646", // reflet du manteau
    O: "#c9a04e", // broderies, épaulière et boucle dorées
    o: "#7e5f2a", // or dans l'ombre
    C: "#3c2c28", // corset de cuir
    c: "#251b19", // cuir dans l'ombre (ceinture)
    V: "#e2683a", // fioles de peinture qui luisent
    M: "#4e3428", // gants
    N: "#1e1a24", // pantalon
    B: "#171420", // bottes
    b: "#34304a", // reflet des bottes (revers)
    G: "#f4f0ff", // yeux qui brillent dans le noir
    g: "#5c5a90", // halo autour des yeux
    P: "#6b4a2c", // manche du pinceau
    T: "#f2c25a", // pointe du pinceau, dorée et lumineuse
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
    "KHHHKDOssODKHHHK",
    "KHHKDLCCCCDdOOoK",
    "KHKDLCCOOCCdDoOK",
    "KHKDLCcCCcCdDKHK",
    "KHKDLcOcVcVdDKHK",
    ".KKMDLNNNNDdMKK.",
    "...KDLNNNNNDdK..",
    "..KDLONNNNNODdK.",
    "..KDLONNKNNODdK.",
    ".KDDLONNKNNOdDdK",
    ".KOOOONNKNNOOOK.",
    "..KKKNNNKNNNKK..",
  ];
  // Hautes bottes à revers
  const FACE_JAMBES = [
    ".....KbbKbbK....",
    ".....KBBKBBK....",
    ".....KBbKBbK....",
    "....KBBBKBBBK...",
    "...KBBBBKBBBBK..",
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
    "KHHHHHHKDDODK...",
    "KHHHHHKOOoDCK...",
    "KHHHHHKOoDDCK...",
    "KHHHHHKDDDCcK...",
    ".KHHHHKDDDVcK...",
    "..KHHHKDDMDcK...",
    "....KDDLDNNNK...",
    "...KDDLDDONNNK..",
    "...KDLDDDDONNK..",
    "..KDDDDDDDDONNK.",
    "..KOOOOOOOOONNK.",
    "...KKKKKNNNKKK..",
  ];
  const PROFIL_CLIGNE = PROFIL_HAUT.map((l, y) => (y === 8 ? l.replace("eE", "SS") : l));
  const PAS = [
    // jambes serrées
    [
      "......KbbK......",
      "......KBBK......",
      ".....KBBbBK.....",
      ".....KBBBBBK....",
      ".....KBBBBBK....",
      ".....KKKKKKK....",
    ],
    // jambes écartées
    [
      ".....KbKKbK.....",
      "....KBK..KBK....",
      "...KBbK...KBbK..",
      "...KBBBK..KBBBK.",
      "...KBBBK..KBBBK.",
      "...KKKKK..KKKKK.",
    ],
  ];

  /* ---------- De dos (page whoami : elle peint, puis se retourne) ----------
   * Même silhouette que de face (la figurine 3D en a besoin), les cheveux
   * longs couvrent la tête et le haut du dos. */
  const DOS_HAUT = [
    "....KKKKKKKK....",
    "...KHHHHHHHHK...",
    "..KHHhhHHHHHHK..",
    ".KHHhHHHHHHHHHK.",
    ".KHHHHHHHhHHHHK.",
    "KHHHHHHHhHHHHHHK",
    "KHHHHHHhHHHHHHHK",
    "KHHHHHHhHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHhHHHHHK",
    "KHHHHHHHhHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KHHHHHHHHHHHHHHK",
    "KoOOdHHHHHHDKHHK",
    "KOoDdHHHHHHLDKHK",
    "KHKDdHHHHHHLDKHK",
    "KHKDdVHHHHcLDKHK",
    ".KKMdDDHHDLDMKK.",
    "..KdDDHHDDLDK...",
    ".KdDODDdDDOLDK..",
    ".KdDODdOdDOLDK..",
    "KdDdODdOdDOLDDK.",
    ".KOOOOOdOOOOOOK.",
    "..KKNNNKNNNKKK..",
  ];
  // Bas du manteau, bottes : silhouette de face vue en miroir
  const miroir = (l) => [...l].reverse().join("");
  const DOS_JAMBES = FACE_JAMBES.map(miroir);
  // En train de peindre : le bras droit (à droite de l'image, de dos) est
  // levé vers la toile ; il est retiré du corps et redessiné par BRAS_PEINT
  const DOS_PEINT = DOS_HAUT.map((l, y) => (y >= 16 && y <= 19 ? l.slice(0, 12) + "d" + l.slice(13) : l));
  // Bras + pinceau, en [colonne, ligne, couleur] depuis le coin du sprite.
  // Trois positions : le pinceau monte et descend sur la toile.
  const BRAS_PEINT = [
    [[13, 16, "D"], [14, 15, "D"], [15, 14, "D"], [16, 13, "M"], [17, 12, "P"], [18, 11, "P"], [19, 10, "T"]],
    [[13, 16, "D"], [14, 15, "D"], [15, 15, "D"], [16, 14, "M"], [17, 13, "P"], [18, 12, "P"], [19, 11, "T"]],
    [[13, 16, "D"], [14, 16, "D"], [15, 15, "D"], [16, 15, "M"], [17, 14, "P"], [18, 13, "P"], [19, 13, "T"]],
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
    profilCligne: [...PROFIL_CLIGNE, ...PAS[0]],
    dos: [...DOS_HAUT, ...DOS_JAMBES],
    dosPeint: [...DOS_PEINT, ...DOS_JAMBES],
  };

  return { LARGEUR, HAUTEUR, COULEURS, SPRITES, BRAS_PEINT, creer, dessinerYeux };
})();
