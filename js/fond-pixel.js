/*
 * Fond « donjon » façon PC-98, généré au chargement : un mur de briques
 * percé d'une porte en arche par destination (config "portes"), éclairé
 * par une torche qui vacille. Dessiné en basse résolution avec une palette
 * réduite et un tramage ordonné (matrice de Bayer), puis agrandi sans
 * lissage (pixels nets).
 *
 * Le canevas prend les proportions de l'écran (redessiné au redimensionnement),
 * pour que toutes les portes restent visibles, même sur un téléphone.
 * La position des portes et le zoom de départ (caméra sur la porte du milieu)
 * sont passés au CSS par des variables posées sur #decor, en % de l'écran.
 * Ignoré si une image de fond est fournie (clé "fond" de js/dialogues.js).
 */
(() => {
  "use strict";

  const CONFIG = window.INTRO_CONFIG;
  const reglages = CONFIG.fondGenere;
  const canvas = document.getElementById("fond-pixel");
  const decor = document.getElementById("decor");
  if (!canvas || !decor) return;
  if (CONFIG.fond || !reglages || !reglages.actif) {
    canvas.hidden = true;
    return;
  }

  const ctx = canvas.getContext("2d");
  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");
  const nbPortes = Math.max(1, (CONFIG.portes && CONFIG.portes.liste.length) || 1);

  // Palette du plus sombre au plus clair, convertie en [r, g, b]
  const palette = reglages.palette.map((hex) => {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });

  // Matrice de Bayer 4×4 : seuils répartis pour un tramage régulier
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const BRIQUE_L = 16, BRIQUE_H = 8;

  // Bruit déterministe (même mur à chaque visite)
  function hasard(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // État de la scène, recalculé à chaque mise en page.
  // fixe : couleur imposée (index de palette, -1 = aucune) pour les stèles,
  // qui ne sont ni éclairées ni tramées : le nom gravé reste lisible.
  // couloir : texture du couloir derrière les portes, révélée par la lampe
  // dans la salle sombre (-1 = pas dans une ouverture)
  let L, H, texture, couloir, fixe, image, lumiere, portes;

  /* ---------- Deux salles ----------
   * "entree" : une seule grande porte, le nom gravé au-dessus (dialogues) ;
   * "trois"  : la salle aux trois portes, derrière la première.
   * Chacune a ses portes, sa texture et son éclairage ; activerSalle()
   * les recopie dans les variables ci-dessus, utilisées par le dessin. */
  const salles = {};
  function activerSalle(nom) {
    ({ portes, texture, couloir, fixe, lumiere } = salles[nom]);
  }
  function memoriserSalle(nom) {
    salles[nom] = { portes, texture, couloir, fixe, lumiere };
  }

  /* ---------- Stèles : le nom de chaque porte gravé au-dessus ----------
   * Gravé en pixels dans le décor avec js/police-pixel.js ; le libellé HTML
   * (js/intro.js) reste posé dessus, invisible, pour le clic et l'accessibilité. */
  const libelles = ((CONFIG.portes && CONFIG.portes.liste) || []).map((p) => p.libelle);
  const MARGE_X = 3, MARGE_Y = 2; // pierre autour du texte (biseaux compris)
  const INTERLIGNE = 2;
  const ECART_ARCHE = 5;          // espace entre le bas de la stèle et l'arche
  // Gros pixels (grand écran) : petite police, sinon les stèles sont énormes ;
  // petits pixels (téléphone) : grande police, pour rester lisible
  const SEUIL_PETITE_POLICE = 3;  // px écran par pixel du décor
  let POLICE;

  // Découpe les noms et calcule une taille de stèle commune à toutes les portes
  function preparerSteles(largeurMax) {
    const textes = libelles.map((t) => POLICE.decouper(t, largeurMax));
    const r = libelles.map((t) => POLICE.reserves(t));
    const dessus = r.some((x) => x.dessus) ? POLICE.ACCENT : 0;
    const dessous = r.some((x) => x.dessous) ? POLICE.ACCENT : 0;
    const bloc = dessus + POLICE.HAUTEUR + dessous; // hauteur d'une ligne
    const nbLignes = Math.max(1, ...textes.map((t) => t.length));
    const largeurTexte = Math.max(0, ...textes.flat().map((t) => POLICE.largeur(t)));
    return {
      textes, dessus, bloc,
      l: largeurTexte + MARGE_X * 2,
      h: nbLignes * bloc + (nbLignes - 1) * INTERLIGNE + MARGE_Y * 2,
    };
  }

  /* ---------- Enseigne au-dessus de la porte d'entrée ----------
   * Le nom (police "titre") et un sous-titre en lettres dorées, au-dessus
   * de la porte d'entrée, visibles pendant les dialogues. Lettres doublées
   * (2×2 pixels) si le nom tient ainsi sur deux lignes au plus.
   * Deux styles (clé "style" de l'inscription) :
   *   "lustre"  : un lustre qui se balance au vent au-dessus du nom et
   *               deux torches murales de part et d'autre de la porte ;
   *               leurs flammes vacillent et éclairent les lettres et le mur ;
   *   "neon"    : chaque lettre est une ampoule d'enseigne de magasin qui
   *               fonctionne mal (lettres défaillantes, coupures), avec un
   *               bourdonnement (js/son-neon.js) ; les lettres allumées
   *               éclairent le mur. */
  const INSCRIPTION = CONFIG.inscription;
  const STYLE = (INSCRIPTION && INSCRIPTION.style) || "lustre";
  const NB_DEFAILLANTES = 4; // lettres du nom qui grésillent et tombent en panne
  // { lettres: [{ x0, y0, x1, y1, ligne, allumee, defaillante, panne, gresille }],
  //   pixels: Map(index → [type, n° de lettre]) }
  let inscription = null;

  function preparerInscription(p) {
    if (!INSCRIPTION || !window.POLICE_PIXEL) return null;
    const titre = window.POLICE_PIXEL.police("titre");
    const largeurVue = Math.floor(L * 0.88);
    const enGrand = titre.decouper(INSCRIPTION.titre, largeurVue / 2);
    const e = enGrand.length <= 2 ? 2 : 1; // taille des pixels des lettres
    const sous = window.POLICE_PIXEL.police(e === 2 ? "grande" : "petite");

    // Lignes : le titre (découpé si besoin), puis le sous-titre aux lettres espacées
    const lignes = [];
    let y = 0;
    for (const t of e === 2 ? enGrand : titre.decouper(INSCRIPTION.titre, largeurVue)) {
      lignes.push({ t, police: titre, y, e });
      y += titre.HAUTEUR * e + 3;
    }
    if (INSCRIPTION.sousTitre) {
      const espace = Array.from(INSCRIPTION.sousTitre).join(" ");
      y += 1 + e;
      lignes.push({ t: espace, police: sous, y, e: 1 });
      y += sous.HAUTEUR;
    } else {
      y -= 3;
    }

    // Au-dessus des pierres de l'arche, avec un peu d'espace.
    // Chaque lettre est gravée à part, pour pouvoir s'allumer seule.
    const haut = p.bas - p.hauteur - 5 - 8 - y;
    const proprietaire = new Map(); // pixel → n° de lettre
    const lettres = [];
    let nbTitre = 0;
    lignes.forEach((l, numLigne) => {
      const x0 = Math.round(p.cx - (l.police.largeur(l.t) * l.e) / 2);
      const cars = Array.from(l.t);
      cars.forEach((car, k) => {
        if (car.trim() === "") return;
        const decalage = k ? l.police.largeur(cars.slice(0, k).join("")) + 1 : 0;
        const n = lettres.length;
        const lettre = { x0: L, y0: H, x1: 0, y1: 0, ligne: numLigne, allumee: true, defaillante: false, panne: 0, gresille: 0 };
        l.police.graver(car, (gx, gy) => {
          for (let j = 0; j < l.e; j++) {
            for (let i = 0; i < l.e; i++) {
              const x = x0 + (decalage + gx) * l.e + i, yy = haut + l.y + gy * l.e + j;
              proprietaire.set(yy * L + x, n);
              lettre.x0 = Math.min(lettre.x0, x); lettre.x1 = Math.max(lettre.x1, x);
              lettre.y0 = Math.min(lettre.y0, yy); lettre.y1 = Math.max(lettre.y1, yy);
            }
          }
        });
        lettres.push(lettre);
        if (l.police === titre) nbTitre++;
      });
    });

    // Lettres du nom défaillantes, toujours les mêmes (choix déterministe),
    // jamais côte à côte pour que les pannes restent lisibles.
    // Les deux premières sont celles d'origine (le M et le dernier I du nom)
    const voulues = Math.min(NB_DEFAILLANTES, Math.floor(nbTitre / 2));
    const a = Math.floor(hasard(nbTitre, 3) * nbTitre);
    const candidates = [a, (a + 2 + Math.floor(hasard(nbTitre, 7) * (nbTitre - 3))) % nbTitre];
    for (let essai = 0; essai < 50; essai++) candidates.push(Math.floor(hasard(nbTitre + essai, 3) * nbTitre));
    let choisies = 0;
    for (const k of candidates) {
      if (choisies >= voulues) break;
      if (!lettres[k] || [k - 1, k, k + 1].some((v) => v >= 0 && v < nbTitre && lettres[v].defaillante)) continue;
      lettres[k].defaillante = true;
      choisies++;
    }

    // Haut du trait éclairé, bas plus foncé (effet de métal), ombre portée en bas à droite
    const pixels = new Map();
    for (const [i, n] of proprietaire) {
      const type = !proprietaire.has(i - L) ? "arete" : !proprietaire.has(i + L) ? "bas" : "lettre";
      pixels.set(i, [type, n]);
    }
    for (const [i, n] of proprietaire) {
      for (const v of [i + L, i + L + 1]) {
        if (v < L * H && !pixels.has(v)) pixels.set(v, ["ombre", n]);
      }
    }
    return { lettres, pixels };
  }

  /* ---------- Torches murales ----------
   * De chaque côté de la porte d'entrée, un peu en hauteur et à distance
   * de l'arche : un support en fer, un manche en bois et un grand feu
   * animé, qui éclairent l'arche et le mur. Style "lustre" seulement. */
  const RAYON_TORCHE = 60;
  let torches = [];

  function placerTorches(p) {
    if (STYLE !== "lustre") return [];
    const y = p.bas - p.hauteur + 12; // haut de la coupelle, sous le sommet de l'arche
    return [-1, 1].map((cote) => ({
      x: p.cx + cote * (p.demiLargeur + 26), y, image: 0, intensite: 1,
    }));
  }

  const COULEURS_FEU = {
    coeur: [255, 250, 220], milieu: [255, 200, 90], bord: [230, 120, 40],
    fer: [58, 50, 72], ferClair: [96, 88, 116], bois: [96, 62, 36], cire: [232, 220, 192],
  };
  const couleurFeu = (c) => (c === "c" ? COULEURS_FEU.coeur : c === "m" ? COULEURS_FEU.milieu : COULEURS_FEU.bord);

  // Feu (du haut vers la coupelle) : b = bord, m = milieu, c = cœur ; trois images
  const FEU = [
    ["..b..", ".bmb.", ".bmb.", "bmcmb", "bmcmb", ".mcm.", "..c.."],
    [".b...", "..bb.", ".bmb.", "bmcmb", "bmccb", ".mcm.", "..c.."],
    ["...b.", ".bb..", ".bmb.", "bmcmb", "bccmb", ".mcm.", "..c.."],
  ];
  // Torche sous le feu : coupelle en fer, bague, manche en bois
  const TORCHE = ["fffff", ".fff.", "..w..", ".fwf.", "..w..", "..w..", "..w..", ".fff."];

  function animerTorches() {
    for (const t of torches) {
      t.intensite += (0.85 + Math.random() * 0.3 - t.intensite) * 0.5;
      if (Math.random() < 0.5) t.image = Math.floor(Math.random() * FEU.length);
    }
  }

  function dessinerTorches(poser) {
    for (const t of torches) {
      const gauche = t.x - 2;
      TORCHE.forEach((ligne, j) => {
        for (let i = 0; i < 5; i++) {
          if (ligne[i] !== ".") poser(gauche + i, t.y + j, ligne[i] === "w" ? COULEURS_FEU.bois : COULEURS_FEU.fer);
        }
      });
      FEU[t.image].forEach((ligne, j) => {
        for (let i = 0; i < 5; i++) if (ligne[i] !== ".") poser(gauche + i, t.y - FEU[0].length + j, couleurFeu(ligne[i]));
      });
    }
  }

  /* ---------- Lustre ----------
   * Suspendu au plafond par une chaîne, juste au-dessus du nom : quatre
   * bougies sur des bras en fer. Il se balance doucement (le vent souffle
   * par rafales) et sa lumière, qui bouge avec lui, éclaire la pièce. */
  const LUSTRE = [
    "..........f..........",
    "..b...b...f...b...b..",
    "..m...m..fff..m...m..",
    "..c...c...f...c...c..",
    "..w...w...f...w...w..",
    ".fFf.fFf.fFf.fFf.fFf.",
    "..f...f...f...f...f..",
    "...f...f..f..f...f...",
    "....fFFFFFFFFFFFf....",
    "........fffff........",
    ".........fFf.........",
    "..........f..........",
  ];
  const DECALAGE_MAX = 4; // balancement max, en pixels du décor à hauteur du lustre
  let lustre = null;

  function placerLustre(p) {
    if (STYLE !== "lustre" || !inscription) return null;
    const hautNom = Math.min(...inscription.lettres.map((l) => l.y0));
    const chaine = Math.max(3, hautNom - 3 - LUSTRE.length); // le bas du lustre s'arrête au-dessus du nom
    return {
      x: p.cx, chaine, phase: 0, amplitude: 0.5, cible: 0.5, angle: 0, intensite: 1,
      rayon: Math.round(Math.min(L, H) * 0.42), flammes: [true, true, true, true],
    };
  }

  function animerLustre() {
    // Balancement de pendule (une oscillation ≈ 3 s) ; l'amplitude suit le vent
    lustre.phase += (2 * Math.PI) / 40;
    if (Math.random() < 0.02) lustre.cible = 0.2 + Math.random() * 0.8; // rafale ou accalmie
    lustre.amplitude += (lustre.cible - lustre.amplitude) * 0.03;
    lustre.angle = Math.sin(lustre.phase) * lustre.amplitude * (DECALAGE_MAX / lustre.chaine);
    lustre.intensite += (0.88 + Math.random() * 0.24 - lustre.intensite) * 0.5;
    lustre.flammes = lustre.flammes.map(() => Math.random() < 0.8); // pointes des flammes
  }

  // Position du crochet du lustre (bas de la chaîne)
  function crochetLustre() {
    return {
      x: lustre.x + Math.sin(lustre.angle) * lustre.chaine,
      y: Math.cos(lustre.angle) * lustre.chaine,
    };
  }

  function dessinerLustre(poser) {
    const c = crochetLustre();
    // Chaîne : maillons clairs et foncés en alternance
    for (let t = 0; t < lustre.chaine; t++) {
      const x = Math.round(lustre.x + Math.sin(lustre.angle) * t);
      poser(x, t, Math.floor(t / 2) % 2 ? COULEURS_FEU.ferClair : COULEURS_FEU.fer);
    }
    const gauche = Math.round(c.x) - 10, haut = Math.round(c.y);
    LUSTRE.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const t = ligne[i];
        if (t === ".") continue;
        if (t === "b" && !lustre.flammes[Math.floor(i / 5)]) continue; // la pointe vacille
        const couleur = t === "f" ? COULEURS_FEU.fer : t === "F" ? COULEURS_FEU.ferClair : t === "w" ? COULEURS_FEU.cire : couleurFeu(t);
        poser(gauche + i, haut + j, couleur);
      }
    });
  }

  // Une image d'enseigne : coupures de courant générales et lettres défaillantes
  const courant = { gresille: 0, coupe: false };

  function animerEnseigne() {
    if (courant.gresille > 0) {
      courant.gresille--;
      courant.coupe = courant.gresille > 0 && Math.random() < 0.5;
    } else {
      courant.coupe = false;
      if (Math.random() < 0.008) courant.gresille = 3 + Math.floor(Math.random() * 5);
    }
    let changements = 0;
    for (const l of inscription.lettres) {
      const avant = l.allumee;
      if (l.defaillante) {
        if (l.panne > 0) {
          l.panne--;                              // en panne : éteinte un moment
          l.allumee = false;
        } else if (l.gresille > 0) {
          l.gresille--;                           // grésille : allumée une image sur deux environ
          l.allumee = Math.random() < 0.5;
        } else {
          l.allumee = true;
          const r = Math.random();
          if (r < 0.006) l.panne = 15 + Math.floor(Math.random() * 35);
          else if (r < 0.04) l.gresille = 3 + Math.floor(Math.random() * 8);
        }
      } else {
        l.allumee = true;
      }
      if (courant.coupe) l.allumee = false;
      if (l.allumee !== avant) changements++;
    }
    // Son (js/son-neon.js) : bourdonnement selon les lettres allumées,
    // crépitement quand des lettres changent d'état
    if (window.SON_NEON) {
      const allumees = inscription.lettres.filter((l) => l.allumee).length;
      window.SON_NEON.regler(allumees / inscription.lettres.length);
      if (changements) window.SON_NEON.crepiter(Math.min(1, changements / 4));
    }
  }

  const COULEURS_ENSEIGNE = {
    allumee: { lettre: [255, 204, 92], arete: [255, 242, 190], bas: [222, 156, 52], ombre: [14, 12, 22] },
    eteinte: { lettre: [96, 76, 44], arete: [124, 100, 60], bas: [72, 56, 32], ombre: [14, 12, 22] },
  };

  // Lueur des lettres allumées sur le mur : forte contre la lettre,
  // nulle à RAYON_LUEUR pixels ; recalculée à chaque image
  const RAYON_LUEUR = 16;
  let lueur = null;

  function calculerLueur() {
    if (!inscription) return false;
    if (!lueur || lueur.length !== L * H) lueur = new Float32Array(L * H);
    lueur.fill(0);
    if (STYLE === "lustre") return calculerLueurFeux();
    let uneAllumee = false;
    for (const l of inscription.lettres) {
      if (!l.allumee) continue;
      uneAllumee = true;
      const ax = Math.max(0, l.x0 - RAYON_LUEUR), bx = Math.min(L - 1, l.x1 + RAYON_LUEUR);
      const ay = Math.max(0, l.y0 - RAYON_LUEUR), by = Math.min(H - 1, l.y1 + RAYON_LUEUR);
      for (let y = ay; y <= by; y++) {
        const dy = Math.max(0, l.y0 - y, y - l.y1);
        for (let x = ax; x <= bx; x++) {
          const dx = Math.max(0, l.x0 - x, x - l.x1);
          const f = 1 - Math.hypot(dx, dy) / RAYON_LUEUR;
          if (f <= 0) continue;
          const i = y * L + x;
          lueur[i] = 1 - (1 - lueur[i]) * (1 - f * f * 0.45);
        }
      }
    }
    return uneAllumee;
  }

  /* ---------- Souris ----------
   * Une petite souris grise qui trottine sur le sol de la salle d'entrée :
   * elle file vers un point au hasard, s'arrête pour renifler, repart ;
   * parfois elle se faufile dans la porte, disparaît un moment et ressort.
   * Plus claire près des feux, plus sombre loin d'eux. */
  // De profil vers la droite (retournée pour aller à gauche) :
  // g = pelage, G = ventre, o = oreille, k = œil, n = museau, t = queue, f = pattes
  const SOURIS = {
    course: [
      ["......oo..", "...ggggg..", "..gggggkgn", "tggGGGGgg.", "t..f..f..."],
      ["......oo..", "...ggggg..", "..gggggkgn", "tggGGGGgg.", ".tf....f.."],
    ],
    arret: [
      ["......oo..", "...ggggg..", "..gggggkgn", "tggGGGGgg.", "t..f..f..."],
      ["......oo..", "...ggggg..", "..gggggkg.", "tggGGGGgg.", "t..f..f..."], // le museau frémit
    ],
  };
  const COULEURS_SOURIS = {
    g: [128, 120, 138], G: [170, 160, 178], o: [200, 156, 170], k: [10, 8, 16],
    n: [220, 168, 180], t: [100, 92, 110], f: [176, 140, 152],
  };
  let souris = null;

  function placerSouris(p) {
    return {
      x: Math.round(L * 0.25), sol: p.bas + 4, sens: 1, cible: null, attente: 20, image: 0,
      cachee: 0, porteX: p.cx, porteL: p.demiLargeur,
    };
  }

  function animerSouris() {
    const s = souris;
    s.image++;
    if (s.cachee > 0) { // dans le noir de la porte
      if (--s.cachee === 0) s.cible = 12 + Math.random() * (L - 24);
      return;
    }
    if (s.cible === null) {
      if (--s.attente > 0) return;
      // Nouvelle destination : un coin de la salle, ou la porte (une fois sur quatre)
      s.cible = Math.random() < 0.25 ? s.porteX : 12 + Math.random() * (L - 24);
      return;
    }
    const ecart = s.cible - s.x;
    if (Math.abs(ecart) <= 1.6) {
      s.x = s.cible;
      s.cible = null;
      s.attente = 10 + Math.floor(Math.random() * 40);
      // Arrivée devant la porte : elle s'y faufile
      if (Math.abs(s.x - s.porteX) < s.porteL) s.cachee = 40 + Math.floor(Math.random() * 60);
      return;
    }
    s.sens = Math.sign(ecart);
    s.x += s.sens * 1.6;
  }

  function dessinerSouris(poser) {
    const s = souris;
    if (s.cachee > 0) return;
    const images = s.cible === null ? SOURIS.arret : SOURIS.course;
    const lignes = images[Math.floor(s.image / (s.cible === null ? 6 : 2)) % 2];
    const gauche = Math.round(s.x) - 5, haut = s.sol - lignes.length + 1;
    // Éclairée par les feux autour d'elle
    const i = Math.min(H - 1, s.sol) * L + Math.max(0, Math.min(L - 1, Math.round(s.x)));
    const f = 0.75 + 0.25 * Math.min(1, (lueur ? lueur[i] : 0) * 1.5);
    lignes.forEach((ligne, j) => {
      for (let k = 0; k < ligne.length; k++) {
        const c = ligne[s.sens < 0 ? ligne.length - 1 - k : k];
        if (c !== ".") poser(gauche + k, haut + j, COULEURS_SOURIS[c].map((v) => v * f));
      }
    });
  }

  // Torches et lustre : lumière ronde autour de chaque feu, qui vacille avec lui
  function calculerLueurFeux() {
    const sources = torches.map((t) => ({ x: t.x, y: t.y - 3, rayon: RAYON_TORCHE, force: 0.8 * t.intensite }));
    if (lustre) {
      const c = crochetLustre();
      sources.push({ x: Math.round(c.x), y: Math.round(c.y) + 3, rayon: lustre.rayon, force: 0.7 * lustre.intensite });
    }
    for (const s of sources) {
      const ax = Math.max(0, s.x - s.rayon), bx = Math.min(L - 1, s.x + s.rayon);
      const ay = Math.max(0, s.y - s.rayon), by = Math.min(H - 1, s.y + s.rayon);
      for (let y = ay; y <= by; y++) {
        for (let x = ax; x <= bx; x++) {
          const f = 1 - Math.hypot(x - s.x, y - s.y) / s.rayon;
          if (f <= 0) continue;
          const i = y * L + x;
          lueur[i] = 1 - (1 - lueur[i]) * (1 - Math.min(1, f ** 1.5 * s.force));
        }
      }
    }
    return sources.length > 0;
  }

  /* ---------- Mise en page : taille du canevas + position des portes ---------- */
  function miseEnPage() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // Hauteur de référence (pixels « logiques ») ; on garde une largeur
    // minimale pour que les portes tiennent sur un écran en portrait
    H = reglages.hauteur || 200;
    L = Math.round(H * vw / vh);
    const largeurMin = reglages.largeurMin || 200;
    if (L < largeurMin) {
      L = largeurMin;
      H = Math.round(L * vh / vw);
    }
    canvas.width = L;
    canvas.height = H;
    image = ctx.createImageData(L, H);

    // Portes côte à côte, centrées, de même taille
    // Valeurs entières : le dessin et les boutons HTML tombent pile sur les mêmes pixels
    const espacement = Math.round(Math.min(90, L / (nbPortes + 0.1)));
    const premiere = Math.round(L / 2 - ((nbPortes - 1) / 2) * espacement); // centre de la 1re porte
    const demiLargeur = Math.round(Math.min(26, espacement * 0.36));
    const hauteur = Math.round(demiLargeur * 2.85);
    const bas = Math.round(H * 0.78);
    const pixel = vw / L;
    POLICE = window.POLICE_PIXEL.police(pixel >= SEUIL_PETITE_POLICE ? "petite" : "grande");
    // Stèle : les noms trop longs passent sur deux lignes pour ne pas
    // toucher la stèle voisine ; posée au-dessus de l'arche, avec un écart
    const steles = preparerSteles(espacement - 6 - MARGE_X * 2);
    const hautArche = bas - hauteur;
    const plaqueY = hautArche - 5 - ECART_ARCHE - steles.h; // 5 = pierres de l'arche

    portes = [];
    for (let k = 0; k < nbPortes; k++) {
      const cx = premiere + k * espacement;
      const plaque = {
        x: cx - Math.floor(steles.l / 2), y: plaqueY, l: steles.l, h: steles.h,
        lignes: steles.textes[k] || [], dessus: steles.dessus, bloc: steles.bloc,
      };
      portes.push({ cx, bas, demiLargeur, hauteur, centreArc: bas - hauteur + demiLargeur, plaque });
    }

    lumiere = { x: L / 2, y: bas - hauteur * 0.7, rayon: Math.max(H * 0.62, L * 0.55) };
    calculerTexture();
    memoriserSalle("trois");

    // Salle d'entrée : une seule porte, plus grande, au centre
    const dl = Math.round(Math.min(26, L * 0.13));
    const hEntree = Math.round(dl * 2.85);
    const p = { cx: Math.round(L / 2), bas, demiLargeur: dl, hauteur: hEntree, centreArc: bas - hEntree + dl, plaque: null };
    portes = [p];
    lumiere = { x: L / 2, y: bas - hEntree * 0.7, rayon: Math.max(H * 0.62, L * 0.55) };
    calculerTexture();
    memoriserSalle("entree");
    inscription = preparerInscription(p);
    torches = placerTorches(p);
    lustre = placerLustre(p);
    souris = placerSouris(p);

    // Variables CSS (en % de l'écran) lues par css/style.css
    const pct = (v, total) => `${(v / total) * 100}%`;
    const def = (nom, valeur) => decor.style.setProperty(nom, valeur);
    def("--porte-largeur", pct(demiLargeur * 2, L));
    def("--porte-hauteur", pct(hauteur, H));
    def("--porte-haut", pct(bas - hauteur + 1, H));
    def("--porte-espacement", pct(espacement, L));
    def("--porte-centre", pct(premiere + ((nbPortes - 1) / 2) * espacement, L));
    // Pas de zoom dans la salle d'entrée ; on entre dans sa porte (centre de l'ouverture)
    def("--zoom", "1");
    def("--zoom-x", pct(p.cx, L));
    def("--zoom-y", pct(bas - hEntree / 2, H));
    def("--pixel", `${pixel}px`);
    // Stèle, contour compris, en % du bouton de la porte (qui commence en
    // cx - demiLargeur, bas - hauteur + 1) : le libellé HTML invisible, et
    // donc les flèches ▷ ◁, sont posés exactement sur la pierre dessinée
    const p0 = salles.trois.portes[0];
    def("--plaque-gauche", pct(p0.plaque.x - 1 - (p0.cx - demiLargeur), demiLargeur * 2));
    def("--plaque-haut", pct(plaqueY - 1 - (hautArche + 1), hauteur));
    def("--plaque-hauteur", pct(steles.h + 2, hauteur));
    def("--plaque-largeur", pct(steles.l + 2, demiLargeur * 2));
    decor.classList.add("avec-linteaux");

    activerSalle(scene === "portes" ? "trois" : "entree");
  }

  // < 0 : dans une ouverture ; proche de 0 : sur un contour
  function distancePorte(x, y) {
    let min = Infinity;
    for (const p of portes) {
      if (y > p.bas) continue;
      const dx = Math.abs(x - p.cx);
      const d = y >= p.centreArc ? dx - p.demiLargeur : Math.hypot(dx, y - p.centreArc) - p.demiLargeur;
      if (d < min) min = d;
    }
    return min;
  }

  /* ---------- Texture du mur ----------
   * Valeur de 0 (noir) à 1 (clair) pour chaque pixel, avant éclairage. */
  function calculerTexture() {
    texture = new Float32Array(L * H);
    couloir = new Float32Array(L * H).fill(-1);
    const bas = portes[0].bas;
    for (let y = 0; y < H; y++) {
      const rangee = Math.floor(y / BRIQUE_H);
      const decalage = (rangee % 2) * (BRIQUE_L / 2);
      for (let x = 0; x < L; x++) {
        const i = y * L + x;

        // Sol sombre sous le mur
        if (y > bas) {
          texture[i] = y === bas + 1 ? 0.3 : 0.18 + hasard(x, y) * 0.08;
          continue;
        }

        const d = distancePorte(x, y);
        if (d < 0) {
          // Ouverture : quasi noir, avec un léger dégradé vers le bas
          const p = portes[0];
          texture[i] = 0.04 + 0.06 * Math.max(0, (y - p.centreArc) / p.hauteur);
          // Derrière : un couloir de petites briques, plus sombre vers le fond
          // (en haut au centre), qu'on ne voit qu'avec la lampe
          const joint = y % 5 === 4 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 7;
          const fond = Math.max(0, 1 - (p.bas - y) / p.hauteur);
          couloir[i] = joint ? 0.06 : (0.16 + hasard(x * 3, y) * 0.08) * (0.45 + 0.55 * fond);
          continue;
        }
        if (d < 5) {
          // Pierres de l'encadrement, plus claires que le mur
          const bloc = Math.floor(x / 6) + Math.floor(y / 6) * 31;
          texture[i] = d < 1 ? 0.25 : 0.78 + hasard(bloc, 7) * 0.12 + hasard(x, y) * 0.06;
          continue;
        }

        const bx = Math.floor((x + decalage) / BRIQUE_L);
        const joint = y % BRIQUE_H === BRIQUE_H - 1 || (x + decalage) % BRIQUE_L === BRIQUE_L - 1;
        if (joint) {
          texture[i] = 0.12;
          continue;
        }
        let v = 0.5 + hasard(bx, rangee) * 0.22 + hasard(x, y) * 0.1;
        if (y % BRIQUE_H === 0) v += 0.14;           // arête éclairée en haut
        if (y % BRIQUE_H === BRIQUE_H - 2) v -= 0.1; // ombre sous la brique
        texture[i] = v;
      }
    }

    fixe = new Int8Array(L * H).fill(-1);
    for (const { plaque } of portes) if (plaque) graverStele(plaque);
  }

  /* Stèle façon pierre tombale pixel art : pierre grise mouchetée,
     arête éclairée en haut / à gauche, côté droit tramé dans l'ombre,
     contour noir aux coins arrondis. Les lettres sont creusées en noir,
     avec une lèvre claire juste en dessous (la lumière vient du haut). */
  function graverStele(p) {
    const n = palette.length - 1;
    const FACE = n - 2, ARETE = n - 1, OMBRE = n - 4, MOUCHETURE = n - 3, LEVRE = n - 1;
    const poser = (x, y, c) => {
      if (x >= 0 && y >= 0 && x < L && y < H) fixe[y * L + x] = c;
    };

    for (let y = p.y - 1; y <= p.y + p.h; y++) {
      for (let x = p.x - 1; x <= p.x + p.l; x++) {
        const dx = x < p.x ? -1 : x >= p.x + p.l ? 1 : 0;
        const dy = y < p.y ? -1 : y >= p.y + p.h ? 1 : 0;
        if (dx && dy) continue;                                  // coins arrondis : on garde le mur
        let c = FACE;
        if (dx || dy) c = 0;                                     // contour
        else if (y === p.y || x === p.x) c = ARETE;              // arête éclairée
        else if (y === p.y + p.h - 1) c = OMBRE;                 // dessous dans l'ombre
        else if (x >= p.x + p.l - 2) c = (x + y) % 2 ? FACE : OMBRE; // ombre tramée à droite
        else if (hasard(x, y) > 0.94) c = MOUCHETURE;            // mouchetures de la pierre
        poser(x, y, c);
      }
    }
    // Les coins intérieurs du contour, pour un bord bien fermé
    poser(p.x, p.y, 0);
    poser(p.x + p.l - 1, p.y, 0);
    poser(p.x, p.y + p.h - 1, 0);
    poser(p.x + p.l - 1, p.y + p.h - 1, 0);

    // Lettres : chaque ligne est centrée ; le bloc de texte aussi, verticalement
    const nb = p.lignes.length;
    const hauteurTexte = nb * p.bloc + (nb - 1) * INTERLIGNE;
    let y0 = p.y + Math.floor((p.h - hauteurTexte) / 2) + p.dessus;
    for (const ligne of p.lignes) {
      const x0 = p.x + Math.floor((p.l - POLICE.largeur(ligne)) / 2);
      const creux = [];
      POLICE.graver(ligne, (x, y) => creux.push([x0 + x, y0 + y]));
      const estCreux = new Set(creux.map(([x, y]) => y * L + x));
      for (const [x, y] of creux) {
        // Pas de moucheture collée à une lettre : elle brouillerait la lecture
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const k = (y + j) * L + (x + i);
            if (fixe[k] === MOUCHETURE) fixe[k] = FACE;
          }
        }
        poser(x, y, 0);
        // Lèvre éclairée sous le trait (sauf si c'est encore du creux)
        if (!estCreux.has((y + 1) * L + x)) poser(x, y + 1, LEVRE);
      }
      y0 += p.bloc + INTERLIGNE;
    }
  }

  /* ---------- Fumée qui sort de la porte survolée ----------
   * Des volutes montent dans l'arche et débordent par le haut, une nappe
   * rampe au ras du sol vers les côtés. Chaque bouffée est un disque flou
   * (densité 0 → 1) mélangé au mur, puis tramé comme le reste du décor.
   * js/intro.js envoie l'événement "fumee" sur #decor : { porte } (-1 = aucune). */
  const fumee = { porte: -1, bouffees: [] };
  let densite = null;

  function emettre(p) {
    const rasDuSol = Math.random() < 0.3;
    const cote = Math.random() < 0.5 ? -1 : 1;
    fumee.bouffees.push(rasDuSol
      ? {
        x: p.cx + cote * Math.random() * p.demiLargeur * 0.8,
        y: p.bas - Math.random() * 4,
        vx: cote * (0.2 + Math.random() * 0.3),
        vy: -(0.02 + Math.random() * 0.06),
        r: 3 + Math.random() * 3, age: 0, vie: 50 + Math.random() * 30,
        graine: Math.random() * 10,
      }
      : {
        x: p.cx + (Math.random() * 2 - 1) * p.demiLargeur * 0.7,
        y: p.bas - p.hauteur * (0.15 + Math.random() * 0.45),
        vx: (Math.random() * 2 - 1) * 0.12,
        vy: -(0.18 + Math.random() * 0.25),
        r: 3 + Math.random() * 3, age: 0, vie: 60 + Math.random() * 40,
        graine: Math.random() * 10,
      });
  }

  // Une étape de simulation : émission (si une porte est survolée) + mouvement
  function avancerFumee() {
    if (fumee.porte >= 0 && portes[fumee.porte]) {
      for (let k = 0; k < 3; k++) emettre(portes[fumee.porte]);
    }
    for (const b of fumee.bouffees) {
      b.age++;
      b.vx += Math.sin(b.age * 0.18 + b.graine) * 0.025; // tourbillons
      b.x += b.vx;
      b.y += b.vy;
      b.r += 0.12; // la bouffée s'étale en se dissipant
    }
    fumee.bouffees = fumee.bouffees.filter((b) => b.age < b.vie);
  }

  // Densité de fumée par pixel : 1 - Π(1 - opacité de chaque bouffée)
  function calculerDensite() {
    if (!fumee.bouffees.length) return false;
    if (!densite || densite.length !== L * H) densite = new Float32Array(L * H);
    densite.fill(0);
    for (const b of fumee.bouffees) {
      // Apparaît vite (~5 images), puis s'efface lentement jusqu'à la fin de sa vie
      const a = Math.min(1, b.age / 5) * (1 - b.age / b.vie) * 0.55;
      const r2 = b.r * b.r;
      const x0 = Math.max(0, Math.floor(b.x - b.r)), x1 = Math.min(L - 1, Math.ceil(b.x + b.r));
      const y0 = Math.max(0, Math.floor(b.y - b.r)), y1 = Math.min(H - 1, Math.ceil(b.y + b.r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          let f = 1 - ((x - b.x) ** 2 + (y - b.y) ** 2) / r2;
          if (f <= 0) continue;
          f *= f; // bords doux : les bouffées se fondent les unes dans les autres
          const i = y * L + x;
          densite[i] = 1 - (1 - densite[i]) * (1 - a * f);
        }
      }
    }
    return true;
  }

  /* ---------- Scènes ----------
   * "yeux"   : pendant les dialogues, seuls des yeux brillent dans l'arche
   *            du milieu (js/personnage-pixel.js) ;
   * "aucune" : rien (pendant l'entrée dans la porte) ;
   * "portes" : la salle aux trois portes, plongée dans le noir, que le
   *            visiteur éclaire avec une lampe à pétrole.
   * js/intro.js envoie l'événement "scene" sur #decor : { etat }. */
  const PERSO = window.PERSONNAGE_PIXEL;
  let scene = "yeux";
  const yeux = { ouverts: true, attente: 30 };

  /* ---------- Lampe à pétrole (salle aux trois portes) ----------
   * Vue à la première personne : une main tient la lampe par l'anse, au
   * premier plan en bas à droite (au-dessus de la bulle si elle la cache).
   * La lumière se porte là où pointe la souris (ou, au clavier / au doigt,
   * sur la porte choisie) et révèle le couloir derrière les portes ; la
   * lampe elle-même éclaire aussi autour d'elle. Elle se penche un peu vers
   * l'endroit visé, balance, « respire », et sa flamme vacille. La torche du
   * fond ne donne plus qu'une faible lueur. */
  const TORCHE_DANS_LE_NOIR = 0.5; // part de la torche gardée dans la salle sombre
  const E_LAMPE = 2;               // la lampe est dessinée en pixels doubles (premier plan)
  const ANSE = 5 * E_LAMPE;        // de la main au chapeau de la lampe
  const lampe = {
    spotX: 0, spotY: 0, cibleX: 0, cibleY: 0, // tache de lumière et sa cible (pointeur)
    baseX: 0, baseY: 0, x: 0, y: 0,          // main : position de repos et position actuelle
    angle: 0, vitesse: 0, souffle: 0,        // balancement et respiration
    fx: 0, fy: 0,                            // flamme
    rayon: 50, rayonPropre: 30, intensite: 1, image: 0,
  };

  function placerLampe() {
    lampe.rayon = Math.round(Math.min(L, H) * 0.3);
    lampe.rayonPropre = Math.round(Math.min(L, H) * 0.2);
    // Main au repos : en bas à droite ; plus haut si la bulle de texte passe dessous
    lampe.baseX = Math.round(L * 0.82);
    let bas = H - 2;
    const bulle = document.getElementById("bulle");
    const r = canvas.getBoundingClientRect();
    if (bulle && r.width) {
      const b = bulle.getBoundingClientRect();
      const gaucheLampe = ((lampe.baseX - 12) / L) * r.width + r.left;
      if (b.right > gaucheLampe) bas = Math.min(bas, Math.floor(((b.top - r.top) / r.height) * H) - 2);
    }
    lampe.baseY = bas - LAMPE.length * E_LAMPE - ANSE;
    viserPorte(Math.floor((salles.trois.portes.length - 1) / 2));
    lampe.spotX = lampe.cibleX;
    lampe.spotY = lampe.cibleY;
    lampe.angle = lampe.vitesse = 0;
    placerMain();
  }

  // La lumière se porte sur le milieu de l'ouverture d'une porte
  function viserPorte(k) {
    const p = salles.trois.portes[k];
    if (!p) return;
    lampe.cibleX = p.cx;
    lampe.cibleY = p.bas - p.hauteur / 2;
    bougerLampe();
  }

  // La main se penche vers l'endroit éclairé et respire un peu
  function placerMain() {
    lampe.x = lampe.baseX + ((lampe.spotX - L / 2) / L) * 16;
    lampe.y = lampe.baseY + ((lampe.spotY - H / 2) / H) * 6 + Math.sin(lampe.souffle) * 1.5;
    lampe.fx = lampe.x + Math.sin(lampe.angle) * (ANSE + 4 * E_LAMPE);
    lampe.fy = lampe.y + ANSE + 4 * E_LAMPE;
  }

  // Une étape : la lumière rejoint sa cible, la lampe balance selon l'élan de la main
  function etapeLampe() {
    const ancienX = lampe.x;
    const suivi = mouvementReduit.matches ? 1 : 0.3;
    lampe.spotX += (lampe.cibleX - lampe.spotX) * suivi;
    lampe.spotY += (lampe.cibleY - lampe.spotY) * suivi;
    placerMain();
    if (mouvementReduit.matches) {
      lampe.angle = lampe.vitesse = 0;
    } else {
      const elan = lampe.x - ancienX;
      lampe.vitesse = (lampe.vitesse - lampe.angle * 0.2 - elan * 0.08) * 0.88;
      lampe.angle = Math.max(-0.5, Math.min(0.5, lampe.angle + lampe.vitesse));
    }
    placerMain();
    return Math.abs(lampe.cibleX - lampe.spotX) + Math.abs(lampe.cibleY - lampe.spotY) > 0.2 ||
      Math.abs(lampe.angle) > 0.01 || Math.abs(lampe.vitesse) > 0.005;
  }

  // Animation fluide (à la fréquence de l'écran) tant que la lampe bouge
  let lampeEnMouvement = false;
  function bougerLampe() {
    if (lampeEnMouvement || scene !== "portes") return;
    lampeEnMouvement = true;
    const image = () => {
      const encore = etapeLampe();
      dessiner(rayon);
      if (encore && scene === "portes") requestAnimationFrame(image);
      else lampeEnMouvement = false;
    };
    requestAnimationFrame(image);
  }

  // Lumière en (x, y) : tache au point visé + lueur autour de la lampe, qui vacillent
  function lumiereLampe(x, y) {
    const tache = Math.max(0, 1 - Math.hypot(x - lampe.spotX, y - lampe.spotY) / (lampe.rayon * lampe.intensite));
    const autour = Math.max(0, 1 - Math.hypot(x - lampe.fx, y - lampe.fy) / (lampe.rayonPropre * lampe.intensite));
    return Math.min(1.25, Math.max(tache ** 0.8 * 1.25, autour ** 1.2 * 0.9));
  }

  /* ---------- Éclairage + tramage ---------- */
  function dessiner(rayon) {
    const px = image.data;
    const n = palette.length - 1;
    const avecFumee = calculerDensite();
    const sombre = scene === "portes";
    const avecLueur = !sombre && calculerLueur();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        // Les stèles n'existent que dans la salle aux trois portes : avant
        // d'entrer, la porte du milieu est une simple arche dans le mur
        let c = sombre ? fixe[i] : -1;
        if (c < 0) {
          // Lumière de la torche : forte au centre, nulle au-delà du rayon
          const d = Math.hypot(x - lumiere.x, (y - lumiere.y) * 1.2);
          let eclairage = Math.max(0, 1 - d / rayon) ** 1.3;
          // Salle sombre : faible lueur de la torche, la lampe fait le reste
          const ll = sombre ? lumiereLampe(x, y) : 0;
          if (sombre) eclairage = Math.max(eclairage * TORCHE_DANS_LE_NOIR, ll);
          // Dans une ouverture, la lampe révèle le couloir qui est derrière
          const tex = sombre && couloir[i] >= 0 ? Math.max(texture[i], couloir[i] * 3 * ll) : texture[i];
          let v = Math.min(1, tex * eclairage + 0.015);

          // Fumée par-dessus le mur (pas sur les stèles : les noms restent lisibles),
          // éclairée elle aussi pour rester visible dans l'ombre
          if (avecFumee && densite[i] > 0) {
            const a = densite[i];
            v = v * (1 - a) + (0.6 + 0.3 * eclairage) * a;
          }

          // Lueur de l'enseigne : le mur s'éclaire près des lettres allumées
          const lu = avecLueur ? lueur[i] : 0;
          if (lu > 0) v = Math.min(1, v + texture[i] * lu * 0.5);

          // Entre deux couleurs de la palette, le seuil de Bayer décide
          const f = v * n;
          c = Math.floor(f);
          if (f - c > BAYER[(y % 4) * 4 + (x % 4)]) c++;
          const [r, g, b] = palette[Math.min(c, n)];
          const j = i * 4;
          // ... et prend la couleur chaude des feux (ou de la lampe à pétrole)
          const chaud = sombre ? Math.min(1, ll) * 0.55 : lu;
          px[j] = Math.min(255, r + chaud * 120); px[j + 1] = Math.min(255, g + chaud * 60);
          px[j + 2] = b * (1 - chaud * 0.5); px[j + 3] = 255;
          continue;
        }
        const [r, g, b] = palette[Math.min(c, n)];
        const j = i * 4;
        px[j] = r; px[j + 1] = g; px[j + 2] = b; px[j + 3] = 255;
      }
    }
    dessinerPremierPlan(px);
    ctx.putImageData(image, 0, 0);
  }

  // Enseigne, yeux, souris (salle d'entrée) ou lampe à pétrole (salle aux trois portes)
  function dessinerPremierPlan(px) {
    const poser = (x, y, [r, g, b]) => {
      if (x < 0 || y < 0 || x >= L || y >= H) return;
      const j = (y * L + x) * 4;
      px[j] = r; px[j + 1] = g; px[j + 2] = b;
    };
    // Enseigne du nom, dans la salle d'entrée seulement
    if (inscription && scene !== "portes") {
      const A = COULEURS_ENSEIGNE.allumee, E = COULEURS_ENSEIGNE.eteinte;
      for (const [i, [type, n]] of inscription.pixels) {
        const x = i % L;
        let couleur;
        if (STYLE === "lustre") {
          // L'or brille près des feux et reste sombre loin d'eux
          const t = Math.min(1, (lueur ? lueur[i] : 0) * 2.2 + 0.08);
          couleur = E[type].map((c, k) => c + (A[type][k] - c) * t);
        } else {
          couleur = inscription.lettres[n].allumee ? A[type] : E[type];
        }
        poser(x, (i - x) / L, couleur);
      }
      if (STYLE === "lustre") {
        dessinerTorches(poser);
        if (lustre) dessinerLustre(poser);
      }
    }
    if (scene === "yeux" && PERSO) {
      // Les yeux brillent, à mi-hauteur de l'arche du milieu
      const p = portes[Math.floor((portes.length - 1) / 2)];
      PERSO.dessinerYeux(p.cx, Math.round(p.bas - p.hauteur * 0.45) + PERSO.HAUTEUR - 9, yeux.ouverts, poser);
    }
    if (scene !== "portes" && souris) {
      dessinerSouris(poser);
    } else if (scene === "portes") {
      dessinerLampe(poser);
    }
  }

  // Lampe-tempête : chapeau et brûleur en fer, verre, flamme, réservoir en laiton.
  // Les lignes 3 à 6 (flamme dans le verre) changent à chaque image.
  const LAMPE = [
    "...fff...",
    "..fFFFf..",
    "..v...v..",
    null, null, null, null,
    "..vfffv..",
    ".ooooooo.",
    "oOOOOOOOo",
    "ooooooooo",
    ".ooooooo.",
    "..fffff..",
  ];
  const FLAMMES_LAMPE = [
    [".v..b..v.", ".v.bmb.v.", ".v.mcm.v.", ".v..c..v."],
    [".v.b...v.", ".v..bm.v.", ".v.mcm.v.", ".v..c..v."],
    [".v...b.v.", ".v.mb..v.", ".v.mcm.v.", ".v..c..v."],
  ];
  // Poing qui serre l'anse, vu de côté : pouce en haut, doigts repliés
  // en bandes (k = contour, S = peau, s = pli entre deux doigts)
  const MAIN = [
    ".kkk...",
    "kSSSkk.",
    "kSSSSSk",
    "ksssssk",
    "kSSSSSk",
    "ksssssk",
    ".kSSSSk",
    "..kkkk.",
  ];
  const COULEURS_LAMPE = {
    f: [52, 46, 64], F: [96, 88, 116], v: [150, 156, 190], o: [150, 110, 50], O: [204, 164, 84],
    k: [96, 64, 62], S: [204, 166, 146], s: [158, 118, 108], manche: [46, 36, 58], mancheClair: [72, 58, 88],
  };

  function dessinerLampe(poser) {
    const e = E_LAMPE;
    // Un pixel du sprite = un carré e×e du décor
    const poserGros = (x, y, c) => {
      for (let j = 0; j < e; j++) for (let i = 0; i < e; i++) poser(x + i, y + j, c);
    };
    const C = COULEURS_LAMPE;
    const flamme = FLAMMES_LAMPE[lampe.image];
    const lignes = LAMPE.map((l, j) => l || flamme[j - 3]);
    const gauche = Math.round(lampe.fx) - 4 * e, haut = Math.round(lampe.y) + ANSE;
    const mx = Math.round(lampe.x), my = Math.round(lampe.y);

    // Bras : un manche qui sort du bord droit de l'écran jusqu'à la main
    const finX = L + 8, finY = my + 26;
    const pas = Math.max(Math.abs(finX - mx), Math.abs(finY - my));
    for (let t = 0; t <= pas; t++) {
      const x = Math.round(mx + 3 + ((finX - mx) * t) / pas), y = Math.round(my + 2 + ((finY - my) * t) / pas);
      for (let w = -5; w <= 5; w++) poser(x, y + w, w <= -4 ? C.mancheClair : C.manche);
    }
    // Anse : deux fils de la main aux bords du chapeau
    for (const bord of [gauche + 3 * e, gauche + 6 * e - 1]) {
      for (let t = 0; t <= ANSE; t++) poser(Math.round(mx + ((bord - mx) * t) / ANSE), my + t, C.f);
    }
    // Lampe
    lignes.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c !== ".") poserGros(gauche + i * e, haut + j * e, C[c] || couleurFeu(c));
      }
    });
    // Main, par-dessus le haut de l'anse (même échelle que la lampe)
    MAIN.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c !== ".") poserGros(mx - 3 * e + i * e, my - 4 * e + j * e, C[c]);
      }
    });
  }

  function redessinerTout() {
    miseEnPage();
    fumee.bouffees = []; // positions calculées pour l'ancienne mise en page
    placerLampe();
    rayon = lumiere.rayon;
    dessiner(rayon);
  }

  let rayon = 0;
  redessinerTout();

  // Redimensionnement : nouvelle mise en page (une fois le geste terminé)
  let attente = null;
  window.addEventListener("resize", () => {
    clearTimeout(attente);
    attente = setTimeout(redessinerTout, 150);
  });


  // La lumière de la lampe suit la souris ou le doigt
  function viserPointeur(e) {
    if (scene !== "portes") return;
    const r = canvas.getBoundingClientRect();
    lampe.cibleX = ((e.clientX - r.left) / r.width) * L;
    lampe.cibleY = ((e.clientY - r.top) / r.height) * H;
    bougerLampe();
  }
  window.addEventListener("pointermove", viserPointeur, { passive: true });
  window.addEventListener("pointerdown", viserPointeur, { passive: true });

  decor.addEventListener("fumee", (e) => {
    const nouvelle = e.detail.porte >= 0 && e.detail.porte !== fumee.porte;
    fumee.porte = e.detail.porte;
    // Au clavier, la lumière se porte sur la porte choisie
    if (e.detail.viser && portes[fumee.porte]) viserPorte(fumee.porte);
    // Bouffée de départ : la fumée se voit dès le survol, sans attendre le flux
    if (nouvelle && portes[fumee.porte]) {
      for (let k = 0; k < 10; k++) emettre(portes[fumee.porte]);
    }
    if (!mouvementReduit.matches) return dessiner(rayon);
    // Mouvement réduit : une fumée immobile, déjà installée, dessinée une fois
    fumee.bouffees = [];
    if (fumee.porte >= 0) for (let k = 0; k < 45; k++) avancerFumee();
    dessiner(rayon);
  });

  decor.addEventListener("scene", (e) => {
    scene = e.detail.etat;
    activerSalle(scene === "portes" ? "trois" : "entree");
    // Le néon ne bourdonne que dans la salle d'entrée, sous l'enseigne
    if (window.SON_NEON) window.SON_NEON.regler(scene === "yeux" && inscription && STYLE === "neon" ? 1 : 0);
    if (scene === "portes") placerLampe(); // la lampe commence devant la porte du milieu
    yeux.ouverts = true;
    dessiner(rayon);
  });

  // Animation à ~12 images/s, saccadée comme sur PC-98 : la fumée et les
  // yeux à chaque image, la torche qui vacille une image sur deux
  let numeroImage = 0;
  setInterval(() => {
    // Inutile de redessiner si l'intro est cachée, l'onglet en arrière-plan
    // ou si l'utilisateur préfère moins d'animations
    if (document.hidden || mouvementReduit.matches) return;
    if (!document.documentElement.classList.contains("intro-active")) return;
    numeroImage++;
    let changement = false;
    if (fumee.porte >= 0 || fumee.bouffees.length) {
      avancerFumee();
      changement = true;
    }
    if (scene === "yeux" && souris) {
      animerSouris();
      changement = true;
    }
    if (scene === "portes") {
      // Flamme de la lampe à pétrole : forme et lumière qui vacillent ;
      // la main respire (petit mouvement de haut en bas)
      lampe.intensite += (0.9 + Math.random() * 0.2 - lampe.intensite) * 0.5;
      if (Math.random() < 0.5) lampe.image = Math.floor(Math.random() * FLAMMES_LAMPE.length);
      lampe.souffle += 0.12;
      placerMain();
      changement = true;
    }
    if (inscription && scene === "yeux") {
      if (STYLE === "lustre") {
        animerTorches();
        if (lustre) animerLustre();
      }
      else animerEnseigne();
      changement = true;
    }
    if (scene === "yeux" && --yeux.attente <= 0) {
      // Les yeux clignent : fermés 2 images, puis ouverts quelques secondes
      yeux.ouverts = !yeux.ouverts;
      yeux.attente = yeux.ouverts ? 25 + Math.floor(Math.random() * 35) : 2;
      changement = true;
    }
    if (reglages.scintillement && numeroImage % 2 === 0) {
      const cible = lumiere.rayon * (0.95 + Math.random() * 0.08);
      rayon += (cible - rayon) * 0.5;
      changement = true;
    }
    if (changement) dessiner(rayon);
  }, 80);
})();
