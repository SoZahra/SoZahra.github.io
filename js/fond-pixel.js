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
  let souris = null;      // salle d'entrée
  let sourisTrois = null; // salle aux trois portes : elle fuit la lumière de la lampe

  function placerSouris(liste) {
    return {
      x: Math.round(L * 0.25), sol: liste[0].bas + 4, sens: 1, cible: null, attente: 20, image: 0,
      cachee: 0, vitesse: 1.6, portes: liste.map((p) => ({ x: p.cx, l: p.demiLargeur })),
    };
  }

  const porteAuHasard = (s) => s.portes[Math.floor(Math.random() * s.portes.length)].x;

  // Salle sombre : la lampe se pose près d'elle → elle détale vers la porte
  // la plus proche du côté opposé à la lumière (ou vers le bord de la salle)
  function fuirLampe(s) {
    if (s.cachee > 0 || s.vitesse > 2) return;
    if (Math.hypot(s.x - lampe.spotX, s.sol - lampe.spotY) > lampe.rayon * 0.45) return;
    const sens = s.x >= lampe.spotX ? 1 : -1;
    const devant = s.portes.filter((p) => (p.x - s.x) * sens > 0).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x));
    s.cible = devant.length ? devant[0].x : sens > 0 ? L - 6 : 6;
    s.vitesse = 3.2;
  }

  function animerSouris(s) {
    s.image++;
    if (s.cachee > 0) { // dans le noir de la porte
      if (--s.cachee === 0) {
        s.cible = 12 + Math.random() * (L - 24);
        s.vitesse = 1.6;
      }
      return;
    }
    if (s.cible === null) {
      if (--s.attente > 0) return;
      // Nouvelle destination : un coin de la salle, ou la porte (une fois sur quatre)
      s.cible = Math.random() < 0.25 ? porteAuHasard(s) : 12 + Math.random() * (L - 24);
      return;
    }
    const ecart = s.cible - s.x;
    if (Math.abs(ecart) <= s.vitesse) {
      s.x = s.cible;
      s.cible = null;
      s.attente = 10 + Math.floor(Math.random() * 40);
      // Arrivée devant une porte : elle s'y faufile
      if (s.portes.some((p) => Math.abs(s.x - p.x) < p.l)) s.cachee = 40 + Math.floor(Math.random() * 60);
      s.vitesse = 1.6;
      return;
    }
    s.sens = Math.sign(ecart);
    s.x += s.sens * s.vitesse;
  }

  // f : éclairage (0 = noir), calculé par la salle où elle se trouve
  function dessinerSouris(poser, s, f) {
    if (s.cachee > 0) return;
    const images = s.cible === null ? SOURIS.arret : SOURIS.course;
    const lignes = images[Math.floor(s.image / (s.cible === null ? 6 : 2)) % 2];
    const gauche = Math.round(s.x) - 5, haut = s.sol - lignes.length + 1;
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
    ajouterDetails();
    champis = placerChampis();
    memoriserSalle("trois");
    sourisTrois = placerSouris(portes);

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
    souris = placerSouris([p]);

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

  /* ---------- Détails de la salle aux trois portes ----------
   * Un vieux mur : briques cassées ou ébréchées (gravats au pied du mur),
   * fissures, traînées d'humidité, toiles d'araignée dans les coins hauts,
   * un renfoncement où brûle une bougie, et le nom gravé en haut du mur,
   * qu'on ne lit qu'en y portant la lampe. Tout est déterministe (même
   * mur à chaque visite) et ne touche ni les portes, ni les stèles. */
  let gravure = null; // par pixel : 0 = mur, 1 = creux d'une lettre, 2 = lèvre sous le creux, 3 = joint comblé
  let niche = null;   // { cx, haut, bas, demi } : intérieur du renfoncement
  let bougie = null;  // { x, y (flamme), intensite, image }
  const RAYON_BOUGIE = 30;

  // Dans le renfoncement (marge > 0 : son encadrement compris)
  function dansNiche(x, y, marge = 0) {
    if (!niche || y > niche.bas + marge || y < niche.haut - marge) return false;
    const dx = Math.abs(x - niche.cx), r = niche.demi + marge;
    const centre = niche.haut + niche.demi;
    return y >= centre ? dx <= r : Math.hypot(dx, y - centre) <= r;
  }

  function ajouterDetails() {
    const p0 = portes[0], bas = p0.bas;
    const reserve = []; // zones à laisser intactes : { x0, y0, x1, y1 }
    for (const { plaque } of portes) {
      if (plaque) reserve.push({ x0: plaque.x - 3, y0: plaque.y - 3, x1: plaque.x + plaque.l + 3, y1: plaque.y + plaque.h + 3 });
    }
    const libre = (x, y, marge = 3) =>
      x >= 0 && y >= 0 && x < L && y <= bas &&
      distancePorte(x, y) >= 5 + marge && !dansNiche(x, y, 2 + marge) &&
      !reserve.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);

    // 1. Renfoncement : entre les deux premières portes s'il y a la place,
    //    sinon au-dessus de la stèle du milieu (écran en portrait)
    const NL = 6, NH = 18; // demi-largeur et hauteur intérieures
    niche = null;
    const ecart = portes.length > 1 ? portes[1].cx - p0.cx - 2 * p0.demiLargeur - 10 : 0;
    if (ecart >= 2 * NL + 8) {
      const b = bas - Math.round(p0.hauteur * 0.32);
      niche = { cx: Math.round((p0.cx + portes[1].cx) / 2), haut: b - NH, bas: b, demi: NL };
    } else {
      const m = portes[Math.floor((portes.length - 1) / 2)];
      const b = (m.plaque ? m.plaque.y : m.bas - m.hauteur) - 10;
      if (b - NH > 40) niche = { cx: m.cx, haut: b - NH, bas: b, demi: NL };
    }
    if (niche) reserve.push({ x0: niche.cx - NL - 4, y0: niche.haut - 4, x1: niche.cx + NL + 4, y1: niche.bas + 4 });

    // 2. Nom gravé, centré dans la bande libre en haut du mur
    gravure = new Int8Array(L * H);
    const limite = Math.min(...reserve.map((z) => z.y0), bas - p0.hauteur - 5) - 6;
    if (INSCRIPTION && window.POLICE_PIXEL && limite > 16) {
      const titre = window.POLICE_PIXEL.police("titre");
      const e = titre.largeur(INSCRIPTION.titre) * 2 <= L * 0.8 && limite > 40 ? 2 : 1;
      const sous = window.POLICE_PIXEL.police(e === 2 ? "grande" : "petite");
      const lignes = titre.decouper(INSCRIPTION.titre, Math.floor((L * 0.85) / e)).map((t) => ({ t, police: titre, e }));
      if (INSCRIPTION.sousTitre) lignes.push({ t: Array.from(INSCRIPTION.sousTitre).join(" "), police: sous, e: 1 });
      const hauteurTexte = lignes.reduce((h, l) => h + l.police.HAUTEUR * l.e + 4, -4);
      let y = Math.max(4, Math.round((limite - hauteurTexte) / 2));
      const demiTexte = Math.max(...lignes.map((l) => l.police.largeur(l.t) * l.e)) / 2;
      reserve.push({ x0: L / 2 - demiTexte - 4, y0: y - 3, x1: L / 2 + demiTexte + 4, y1: y + hauteurTexte + 3 });
      for (const l of lignes) {
        const x0 = Math.round(L / 2 - (l.police.largeur(l.t) * l.e) / 2);
        l.police.graver(l.t, (gx, gy) => {
          for (let j = 0; j < l.e; j++) {
            for (let i = 0; i < l.e; i++) gravure[(y + gy * l.e + j) * L + x0 + gx * l.e + i] = 1;
          }
        });
        y += l.police.HAUTEUR * l.e + 4;
      }
      for (let i = 0; i < L * (H - 1); i++) if (gravure[i] === 1 && gravure[i + L] === 0) gravure[i + L] = 2;
      // Autour des lettres, les joints des briques sont comblés (pierre lissée
      // par le graveur) : ils ne coupent plus les traits
      for (let i = L; i < L * (H - 1); i++) {
        if (gravure[i] || texture[i] > 0.2) continue;
        if (gravure[i - 1] || gravure[i + 1] || gravure[i - L] || gravure[i + L]) gravure[i] = 3;
      }
    }

    // 3. Briques cassées (trou sombre, rebord éclairé) ou ébréchées,
    //    avec quelques gravats au pied du mur
    const gravats = [];
    let cassees = 0;
    for (let rangee = 0; rangee * BRIQUE_H < bas - BRIQUE_H && cassees < 7; rangee++) {
      const decalage = (rangee % 2) * (BRIQUE_L / 2);
      for (let bx = 0; bx * BRIQUE_L < L + BRIQUE_L && cassees < 7; bx++) {
        if (hasard(bx * 7.3, rangee * 13.1) < 0.94) continue;
        const x0 = bx * BRIQUE_L - decalage, y0 = rangee * BRIQUE_H;
        const x1 = x0 + BRIQUE_L - 2, y1 = y0 + BRIQUE_H - 2;
        if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every(([x, y]) => libre(x, y))) continue;
        const entiere = hasard(bx, rangee * 3.7) < 0.45;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            // Ébréchée : seul un coin manque, au bord irrégulier
            if (!entiere && (x1 - x) + (y - y0) * 1.6 + hasard(x, y) * 3 > 9) continue;
            const i = y * L + x;
            texture[i] = y === y0 || x === x0 ? 0.03            // ombre en haut / à gauche du trou
              : y === y1 ? 0.3                                   // rebord du bas, éclairé
              : 0.07 + hasard(x * 5, y) * 0.05;                  // fond du trou
          }
        }
        gravats.push(entiere ? x0 + 4 : x1 - 3);
        cassees++;
      }
    }
    for (const gx of gravats) {
      for (let k = 0; k < 5; k++) {
        const x = Math.round(gx + (hasard(gx, k) - 0.5) * 12), y = bas + 1 + Math.floor(hasard(k, gx) * 3);
        if (x < 0 || x >= L) continue;
        texture[y * L + x] = 0.5;
        if (hasard(x, k) > 0.5 && x + 1 < L) texture[y * L + x + 1] = 0.38;
      }
    }

    // 4. Fissures : elles descendent en zigzag, bord droit un peu éclairé
    for (let k = 0; k < 5; k++) {
      let x = Math.floor(hasard(k * 3.1, 9.7) * L), y = Math.floor(hasard(5.3, k * 2.3) * (bas - 30)) + 4;
      const longueur = 12 + Math.floor(hasard(k, 4.4) * 18);
      for (let t = 0; t < longueur; t++) {
        if (libre(x, y, 1) && libre(x + 1, y, 1)) {
          texture[y * L + x] = 0.04;
          texture[y * L + x + 1] = Math.min(1, texture[y * L + x + 1] + 0.12);
        }
        y++;
        const r = hasard(x * 1.7, y * 2.9);
        if (r < 0.3) x--; else if (r > 0.7) x++;
      }
    }

    // 5. Traînées d'humidité qui coulent depuis un joint
    for (let k = 0; k < 6; k++) {
      const x0 = Math.floor(hasard(k * 11.3, 1.9) * L);
      const y0 = Math.floor(hasard(2.1, k * 7.7) * (bas * 0.6) / BRIQUE_H) * BRIQUE_H + BRIQUE_H - 1;
      const longueur = 14 + Math.floor(hasard(k, 8.1) * 26);
      for (let t = 0; t < longueur; t++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = x0 + dx, y = y0 + t;
          if (!libre(x, y, 0) || (dx === 2 && hasard(x, y) > 0.5)) continue;
          texture[y * L + x] *= 0.62 + 0.38 * (t / longueur);
        }
      }
    }

    // 6. Toiles d'araignée dans les deux coins hauts : fils rayonnants
    //    et fils tendus entre eux, qui pendent un peu
    const R = Math.min(22, Math.round(L * 0.08));
    for (const [ox, sx] of [[0, 1], [L - 1, -1]]) {
      for (let y = 0; y <= R; y++) {
        for (let d = 0; d <= R; d++) {
          const x = ox + sx * d, r = Math.hypot(d, y);
          if (r > R || r < 1 || !libre(x, y, 0)) continue;
          const a = Math.atan2(y, d) / (Math.PI / 2) * 4; // 5 fils rayonnants : a = 0..4
          const surFil = Math.abs(a - Math.round(a)) * r * (Math.PI / 8) < 0.5;
          const creux = Math.sin((a - Math.floor(a)) * Math.PI) * 0.18; // le fil pend entre deux rayons
          const surArc = [6, 11, 16, 21].some((rk) => rk <= R && Math.abs(r - rk * (1 + creux)) < 0.45);
          if (surFil || surArc) texture[y * L + x] = 0.95;
        }
      }
    }

    // 7. Le renfoncement : encadrement de pierres claires, fond sombre,
    //    tablette en bas où repose la bougie
    if (niche) {
      for (let y = niche.haut - 3; y <= niche.bas + 3; y++) {
        for (let x = niche.cx - NL - 3; x <= niche.cx + NL + 3; x++) {
          if (x < 0 || x >= L) continue;
          const i = y * L + x;
          if (dansNiche(x, y)) {
            const profondeur = (y - niche.haut) / NH;
            texture[i] = y >= niche.bas - 1 ? 0.62                                   // tablette
              : x === niche.cx - NL || y === niche.haut ? 0.08                       // ombre du rebord
              : 0.2 + 0.12 * profondeur + hasard(x * 3, y) * 0.04;                   // fond
          } else if (dansNiche(x, y, 3)) {
            const bloc = Math.floor(x / 4) + Math.floor(y / 4) * 17;
            texture[i] = dansNiche(x, y, 1) || !dansNiche(x, y, 2) ? 0.2 : 0.72 + hasard(bloc, 3) * 0.12;
          }
        }
      }
      bougie = { x: niche.cx, y: niche.bas - 9, intensite: 1, image: 0 };
    } else {
      bougie = null;
    }
  }

  /* ---------- Champignons phosphorescents ----------
   * Une touffe au pied du mur, entre la 2e et la 3e porte, qui pousse dans
   * une tache d'humidité. Dans le noir, elle luit d'un bleu-vert froid qui
   * « respire » et lâche des spores lumineuses ; sous la lampe, la lueur
   * s'efface et on ne voit plus que des champignons pâles. */
  let champis = null; // { x, y (bas de la touffe), phase, eclat, spores }
  const RAYON_CHAMPIS = 42;
  // C = chapeau, c = bord du chapeau, o = taches, s = pied
  const CHAMPIS = [
    ".......cccc.........",
    ".....ccCoCCcc.......",
    "....cCCCCCoCCc......",
    "...cCoCCCCCCCCc.....",
    "....cccccccccc...ccc.",
    ".......ss.......cCoCc",
    ".......ss......cCCCCCc",
    ".cc....ss......ccccccc",
    "cCoc...ss.........s...",
    "cccc..ss.....cc...s...",
    ".s....ss....cCoc..ss..",
    ".s....ss....cccc...s..",
    ".ss..sss.....s....ss..",
    "..s.ssss....sss.sss...",
  ];
  // Petits champignons qui poussent dans les joints du mur, au-dessus
  const CHAMPI_MUR = [".cc.", "cCoc", ".s..", ".s.."];
  const POUSSES_MUR = [[8, -17], [-9, -12], [4, -27]]; // décalages depuis le pied de la touffe
  const COULEURS_CHAMPIS = {
    // lueur dans le noir / teinte sous la lampe
    lueur: { C: [130, 246, 222], c: [70, 178, 176], o: [214, 255, 244], s: [90, 170, 162] },
    lampe: { C: [196, 178, 160], c: [150, 130, 118], o: [226, 214, 196], s: [214, 204, 186] },
  };

  function placerChampis() {
    if (portes.length < 3) return null;
    const a = portes[1], b = portes[2], bas = a.bas;
    const x = Math.round((a.cx + b.cx) / 2);
    // Tache d'humidité sur le mur, au-dessus de la touffe
    for (let y = bas - 34; y <= bas; y++) {
      for (let dx = -13; dx <= 13; dx++) {
        const i = y * L + x + dx;
        const f = Math.hypot(dx / 13, (y - bas) / 34);
        if (f < 1 && distancePorte(x + dx, y) >= 5) texture[i] *= 0.7 + 0.3 * f + hasard(x + dx, y) * 0.05;
      }
    }
    return { x, y: bas + 2, phase: 0, eclat: 0, spores: [] };
  }

  // Lueur visible de la touffe : elle respire, et s'efface sous la lampe
  function preparerChampis() {
    if (!champis) return;
    const respire = 0.8 + 0.2 * Math.sin(champis.phase);
    champis.lampe = Math.min(1, lumiereLampe(champis.x, champis.y - 8) * 1.3);
    champis.eclat = respire * (1 - champis.lampe);
  }

  function lumiereChampis(x, y) {
    if (!champis || champis.eclat <= 0) return 0;
    const dx = x - champis.x, dy = y - (champis.y - 8);
    if (dx > RAYON_CHAMPIS || dx < -RAYON_CHAMPIS || dy > RAYON_CHAMPIS || dy < -RAYON_CHAMPIS) return 0;
    const f = 1 - Math.hypot(dx, dy * 1.2) / RAYON_CHAMPIS;
    return f > 0 ? f ** 1.4 * champis.eclat : 0;
  }

  function animerChampis() {
    champis.phase += 0.09;
    // Une spore s'échappe de temps en temps et monte en zigzag
    if (champis.spores.length < 7 && Math.random() < 0.12) {
      champis.spores.push({ x: champis.x + (Math.random() - 0.5) * 18, y: champis.y - 12, vie: 0 });
    }
    for (const s of champis.spores) {
      s.vie++;
      s.y -= 0.35;
      s.x += Math.sin(s.vie * 0.3 + s.y) * 0.3;
    }
    champis.spores = champis.spores.filter((s) => s.vie < 60);
  }

  function dessinerChampis(poser) {
    const t = champis.eclat;
    const clair = 0.25 + 0.75 * champis.lampe; // sous la lampe, éclairés comme le reste
    const sprite = (lignes, gauche, haut) => lignes.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c === ".") continue;
        const a = COULEURS_CHAMPIS.lueur[c], b = COULEURS_CHAMPIS.lampe[c];
        poser(gauche + i, haut + j, a.map((v, k) => b[k] * clair * (1 - t) + v * t));
      }
    });
    sprite(CHAMPIS, champis.x - 10, champis.y - CHAMPIS.length + 1);
    for (const [dx, dy] of POUSSES_MUR) sprite(CHAMPI_MUR, champis.x + dx, champis.y + dy);
    // Spores : points lumineux qui s'éteignent en montant
    for (const s of champis.spores) {
      const f = (1 - s.vie / 60) * Math.max(0.3, t);
      poser(Math.round(s.x), Math.round(s.y), [150 * f + 20, 255 * f + 10, 230 * f + 20]);
    }
  }

  // Lumière de la bougie en (x, y)
  function lumiereBougie(x, y) {
    if (!bougie) return 0;
    const dx = x - bougie.x, dy = y - bougie.y;
    if (dx > RAYON_BOUGIE || dx < -RAYON_BOUGIE || dy > RAYON_BOUGIE || dy < -RAYON_BOUGIE) return 0;
    const f = 1 - Math.hypot(dx, dy) / (RAYON_BOUGIE * bougie.intensite);
    return f > 0 ? f ** 1.4 * 0.95 : 0;
  }

  // Bougie : cire, mèche, coulure sur la tablette ; flamme qui change de forme
  const BOUGIE = ["..k..", ".WWW.", ".WwW.", ".WwW.", ".wWw.", "wwWww"];
  const FLAMMES_BOUGIE = [
    ["..b..", ".bmb.", "..c.."],
    ["...b.", ".bm..", "..c.."],
    [".b...", "..mb.", "..c.."],
  ];
  const COULEURS_BOUGIE = { W: [226, 214, 196], w: [184, 166, 150], k: [40, 30, 34] };

  function dessinerBougie(poser) {
    const flamme = FLAMMES_BOUGIE[bougie.image];
    const gauche = bougie.x - 2, haut = bougie.y - 1;
    flamme.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) if (ligne[i] !== ".") poser(gauche + i, haut + j, couleurFeu(ligne[i]));
    });
    BOUGIE.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c !== ".") poser(gauche + i, haut + 3 + j, COULEURS_BOUGIE[c]);
      }
    });
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
  const E_LAMPE = 3;               // la lampe est dessinée en pixels triples (premier plan)
  const E_MAIN = 2;                // la main et la manche, en pixels doubles
  const ANSE = 5 * E_MAIN;         // de la main au chapeau de la lampe
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
    placerRepos();
    viserPorte(Math.floor((salles.trois.portes.length - 1) / 2));
    lampe.spotX = lampe.cibleX;
    lampe.spotY = lampe.cibleY;
    lampe.angle = lampe.vitesse = 0;
    placerMain();
  }

  // Main au repos : en bas à droite ; plus haut si la bulle de texte passe dessous
  function placerRepos() {
    lampe.baseX = Math.round(L * 0.82);
    let bas = H - 2;
    const bulle = document.getElementById("bulle");
    const r = canvas.getBoundingClientRect();
    if (bulle && r.width) {
      const b = bulle.getBoundingClientRect();
      // Haut de la bulle mesuré depuis son bas : son animation d'apparition
      // (qui la grandit depuis le bas) ne fausse pas la mesure
      const haut = b.bottom - bulle.offsetHeight;
      // la lampe peut se décaler vers la gauche quand on vise à gauche
      const gaucheLampe = ((lampe.baseX - 4 * E_LAMPE - 10) / L) * r.width + r.left;
      if (b.right > gaucheLampe) bas = Math.min(bas, Math.floor(((haut - r.top) / r.height) * H) - 2);
    }
    // (marge pour la respiration et le penchement de la main, qui la font descendre)
    lampe.baseY = bas - LAMPE.length * E_LAMPE - ANSE - 4;
  }

  // La bulle change de taille (nouvelle consigne, écran tourné…) : la lampe se replace
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (scene !== "portes") return;
      placerRepos();
      placerMain();
      dessiner(rayon);
    }).observe(document.getElementById("bulle"));
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

  /* Faisceau : un cône de lumière part de la flamme et s'élargit jusqu'à la
   * tache visée, pour qu'on voie bien que la lumière vient de la lampe.
   * Ses paramètres sont calculés une fois par image (preparerFaisceau). */
  const faisceau = { dx: 0, dy: 0, long2: 1, long: 1, depart: 3, arrivee: 30 };

  function preparerFaisceau() {
    faisceau.dx = lampe.spotX - lampe.fx;
    faisceau.dy = lampe.spotY - lampe.fy;
    faisceau.long2 = Math.max(1, faisceau.dx * faisceau.dx + faisceau.dy * faisceau.dy);
    faisceau.long = Math.sqrt(faisceau.long2);
    faisceau.depart = 2 * E_LAMPE;                         // largeur à la sortie du verre
    faisceau.arrivee = lampe.rayon * 0.9 * lampe.intensite;  // rejoint le bord de la tache
  }

  // Force du faisceau en (x, y) : forte sur son axe, s'estompe vers ses bords
  function lumiereFaisceau(x, y) {
    const px = x - lampe.fx, py = y - lampe.fy;
    // t = avancée le long du faisceau (0 à la lampe, 1 à la tache)
    const t = (px * faisceau.dx + py * faisceau.dy) / faisceau.long2;
    if (t <= 0 || t >= 1.05) return 0;
    const ecart = Math.abs(px * faisceau.dy - py * faisceau.dx) / faisceau.long;
    const demiLargeur = faisceau.depart + (faisceau.arrivee - faisceau.depart) * t;
    const bord = Math.max(0, 1 - ecart / demiLargeur);
    // Le faisceau faiblit un peu en s'éloignant, avant de retrouver la tache
    return bord ** 0.5 * (0.95 - 0.15 * t);
  }

  // Lumière en (x, y) : tache au point visé, faisceau depuis la lampe
  // et lueur autour d'elle, qui vacillent ensemble
  function lumiereLampe(x, y) {
    const tache = Math.max(0, 1 - Math.hypot(x - lampe.spotX, y - lampe.spotY) / (lampe.rayon * lampe.intensite));
    const autour = Math.max(0, 1 - Math.hypot(x - lampe.fx, y - lampe.fy) / (lampe.rayonPropre * lampe.intensite));
    return Math.min(1.25, Math.max(tache ** 0.8 * 1.25, autour ** 1.2 * 0.9, lumiereFaisceau(x, y)));
  }

  /* ---------- Éclairage + tramage ---------- */
  function dessiner(rayon) {
    const px = image.data;
    const n = palette.length - 1;
    const avecFumee = calculerDensite();
    const sombre = scene === "portes";
    if (sombre) {
      preparerFaisceau();
      preparerChampis();
    }
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
          // La bougie du renfoncement éclaire un peu autour d'elle
          const lb = sombre ? lumiereBougie(x, y) : 0;
          // ... et les champignons, d'une lueur froide
          const lc = sombre ? lumiereChampis(x, y) : 0;
          if (sombre) eclairage = Math.max(eclairage * TORCHE_DANS_LE_NOIR, ll, lb, lc * 0.9);
          // Dans une ouverture, la lampe révèle le couloir qui est derrière
          let tex = sombre && couloir[i] >= 0 ? Math.max(texture[i], couloir[i] * 3 * ll) : texture[i];
          // Nom gravé : le creux et sa lèvre ne ressortent que sous la lampe
          if (sombre && gravure[i]) {
            const vu = Math.min(1, ll * 1.6);
            tex = gravure[i] === 1 ? tex * (1 - vu) + 0.02 * vu       // creux : noir sous la lampe
              : gravure[i] === 2 ? tex * (1 - vu) + 0.8 * vu                // lèvre éclairée
              : Math.max(tex, 0.5 * vu);                                // pierre lissée autour
          }
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
          // ... et prend la couleur chaude des feux (ou de la lampe à pétrole),
          // ou bleu-vert près des champignons
          const chaud = sombre ? Math.max(Math.min(1, ll) * 0.55, lb * 0.75) : lu;
          const froid = Math.min(1, lc * 1.5);
          px[j] = Math.min(255, r + chaud * 120) * (1 - froid * 0.5);
          px[j + 1] = Math.min(255, g + chaud * 60 + froid * 80);
          px[j + 2] = Math.min(255, b * (1 - chaud * 0.5) + froid * 60); px[j + 3] = 255;
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
      // Éclairée par les feux autour d'elle
      const i = Math.min(H - 1, souris.sol) * L + Math.max(0, Math.min(L - 1, Math.round(souris.x)));
      dessinerSouris(poser, souris, 0.75 + 0.25 * Math.min(1, (lueur ? lueur[i] : 0) * 1.5));
    } else if (scene === "portes") {
      if (bougie) dessinerBougie(poser);
      if (champis) dessinerChampis(poser);
      // Dans le noir, on la devine à peine ; la lampe ou la bougie la révèlent
      const s = sourisTrois;
      const f = 0.12 + 0.88 * Math.min(1, lumiereLampe(s.x, s.sol - 2) + lumiereBougie(s.x, s.sol - 2));
      dessinerSouris(poser, s, f);
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
  // Poing qui serre l'anse, vu de profil (tourné vers la gauche), dessiné en
  // pixels doubles comme la lampe : le pouce avec son ongle (n) passe en
  // travers, les doigts repliés sont empilés dessous, séparés par leurs
  // plis (d) et éclairés par la flamme sur leur face du bas (L) ; le dos de la
  // main et le poignet, dans l'ombre (s), descendent vers la droite.
  // k = contour, S = peau, H = reflet sur le haut du poing.
  const MAIN = [
    "...kkkkkk.....",
    ".kkSHSSSSkk...",
    "kSHSkkkkkkSk..",
    "kSSknnSSSSkSk.",
    "ksSkkLLLsskSk.",
    ".kddkkkkkkkSsk",
    "kSSSSSSSsSSssk",
    "kLLLLLSsSSsssk",
    ".kdddddkSssssk",
    ".kLLLSSksssk..",
    "..kkkkkksssk..",
    "........kssk..",
  ];
  const ATTACHE_MAIN = { x: 10, y: 8 }; // milieu du poignet : la manche part de là, sous la main
  const PRISE_MAIN = { x: 5, y: 10 };   // pixel du sprite où l'anse sort du poing
  const COULEURS_LAMPE = {
    f: [52, 46, 64], F: [96, 88, 116], v: [150, 156, 190], o: [150, 110, 50], O: [204, 164, 84],
    k: [54, 36, 46], S: [196, 170, 162], H: [214, 192, 184], L: [232, 186, 142], s: [150, 120, 122],
    d: [120, 84, 84], n: [238, 206, 196],
    // Manche en tissu prune : contour, ombre, tissu, pli éclairé, poignet
    mancheBord: [24, 16, 30], mancheOmbre: [40, 26, 46], manche: [62, 40, 68],
    mancheLumiere: [104, 66, 82], poignet: [118, 92, 112],
  };

  function dessinerLampe(poser) {
    const e = E_LAMPE, m = E_MAIN;
    // Un pixel du sprite = un carré t×t du décor
    const poserGros = (x, y, c, t) => {
      for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) poser(x + i, y + j, c);
    };
    const C = COULEURS_LAMPE;
    const flamme = FLAMMES_LAMPE[lampe.image];
    const lignes = LAMPE.map((l, j) => l || flamme[j - 3]);
    const gauche = Math.round(lampe.fx) - 4 * e, haut = Math.round(lampe.y) + ANSE;
    const mx = Math.round(lampe.x), my = Math.round(lampe.y);

    // Main : coin haut gauche du sprite, placé pour que l'anse sorte du poing
    const mainX = mx - PRISE_MAIN.x * m, mainY = my - PRISE_MAIN.y * m;

    // Bras : une manche qui part du poignet et sort par le bas droit de
    // l'écran, de plus en plus large (elle se rapproche de nous)
    const ax = mainX + ATTACHE_MAIN.x * m, ay = mainY + ATTACHE_MAIN.y * m;
    const vx = L + 14 - ax, vy = my + 44 - ay;
    const longueur = Math.hypot(vx, vy);
    const ux = vx / longueur, uy = vy / longueur; // le long du bras
    const nx = -uy, ny = ux;                      // en travers (n > 0 : dessous)
    const OURLET = 7 * m;                         // le début de la manche reste caché sous la main
    for (let t = 0; t <= longueur; t += 0.5) {
      const demi = 4.5 + t * 0.1;
      for (let s = -demi; s <= demi; s += 0.5) {
        const x = Math.round(ax + ux * t + nx * s), y = Math.round(ay + uy * t + ny * s);
        let c;
        if (demi - Math.abs(s) < 1) c = C.mancheBord;    // contour
        else if (t >= OURLET && t < OURLET + 2) c = C.poignet; // ourlet, juste à la sortie de la main
        else if (s > demi - 3) c = C.mancheLumiere;      // dessous, éclairé par la flamme
        else if (s < -demi + 3) c = C.mancheOmbre;       // dessus, dans l'ombre
        else c = C.manche;
        poser(x, y, c);
      }
    }
    // Anse : deux fils de la main aux bords du chapeau
    for (const bord of [gauche + 3 * e, gauche + 6 * e - 1]) {
      for (let t = 0; t <= ANSE; t++) poser(Math.round(mx + ((bord - mx) * t) / ANSE), my + t, C.f);
    }
    // Lampe
    lignes.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c !== ".") poserGros(gauche + i * e, haut + j * e, C[c] || couleurFeu(c), e);
      }
    });
    // Main, par-dessus le haut de l'anse (pixels doubles, plus petits que la lampe)
    MAIN.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c !== ".") poserGros(mainX + i * m, mainY + j * m, C[c], m);
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
      animerSouris(souris);
      changement = true;
    }
    if (scene === "portes") {
      // Flamme de la lampe à pétrole : forme et lumière qui vacillent ;
      // la main respire (petit mouvement de haut en bas)
      lampe.intensite += (0.9 + Math.random() * 0.2 - lampe.intensite) * 0.5;
      if (Math.random() < 0.5) lampe.image = Math.floor(Math.random() * FLAMMES_LAMPE.length);
      lampe.souffle += 0.12;
      placerMain();
      // Bougie : petite flamme qui danse ; souris qui fuit la lampe
      if (bougie) {
        bougie.intensite += (0.88 + Math.random() * 0.24 - bougie.intensite) * 0.6;
        if (Math.random() < 0.6) bougie.image = Math.floor(Math.random() * FLAMMES_BOUGIE.length);
      }
      if (champis) animerChampis();
      fuirLampe(sourisTrois);
      animerSouris(sourisTrois);
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
