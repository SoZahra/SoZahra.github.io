/*
 * Pièce « Contact » : le salon de la demeure, dans le style PC-98 de l'intro
 * (basse résolution, palettes réduites, tramage de Bayer, pixels nets).
 * Tenture verte damassée, lambris, grande cheminée de pierre où brûle un
 * feu (qui éclaire toute la pièce), canapé de velours bordeaux, guéridon
 * avec une cafetière de cuivre, secrétaire ancien, lustre, bibliothèque et
 * fenêtre sous la pluie quand l'écran est assez large, chat endormi sur le
 * tapis.
 *
 * Elle somnole sur le canapé, une tasse à la main (« z z »), se réveille
 * quand on entre (« ! ») et dit une réplique. Objets (contour doré au
 * survol, comme dans un jeu) :
 *   - le secrétaire : la caméra s'en approche et une lettre s'ouvre ; à
 *     l'envoi elle se plie, un cachet de cire la scelle, elle s'envole
 *     (Formspree, ou la messagerie du visiteur si aucun identifiant) ;
 *   - le café : copie l'adresse e-mail ;
 *   - les trois cadres sur la cheminée : les liens ;
 *   - elle : la réplique suivante.
 * Avec le son activé (bouton de l'intro), le feu crépite.
 * Textes et liens : js/contact.js.
 *
 * Ouverte par js/intro.js (porte « Contact ») via window.PIECES.contact :
 *   ouvrir({ retour })  — retour() ramène à la salle aux trois portes
 *   fermer()
 */
(() => {
  "use strict";

  const DONNEES = window.CONTACT;
  const PERSO = window.PERSONNAGE_PIXEL;
  const $ = (id) => document.getElementById(id);
  const el = {
    piece: $("piece-contact"),
    canvas: $("contact-fond"),
    scene: document.querySelector("#piece-contact .piece-scene"),
    consigne: $("contact-consigne"),
    bulle: $("contact-bulle"),
    replique: $("contact-replique"),
    repliqueLue: $("contact-replique-lue"),
    retour: $("contact-retour"),
    lettre: $("lettre"),
    formulaire: $("lettre-formulaire"),
    erreur: $("lettre-erreur"),
    cachet: $("lettre-cachet"),
    fin: $("lettre-fin"),
    finTitre: $("lettre-fin-titre"),
    finTexte: $("lettre-fin-texte"),
    encore: $("lettre-encore"),
    fermer: $("lettre-fermer"),
    btnSon: $("btn-son"),
  };
  if (!DONNEES || !PERSO || !el.piece || !el.canvas) return;

  const ctx = el.canvas.getContext("2d");
  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");
  const sansSouris = matchMedia("(hover: none), (pointer: coarse)");
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const duree = (ms) => (mouvementReduit.matches ? 0 : ms);

  // Bruit déterministe : la pièce est la même à chaque visite
  function hasard(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* ---------- Matières (comme js/piece-projets.js) ----------
   * Rampe de 6 couleurs par matière ; un pixel = une matière + une valeur
   * (0 à 1), multipliée par la lumière puis tramée. */
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const RAMPES = {
    vide:      ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
    pierre:    ["#0a0910", "#16141e", "#24212f", "#363145", "#4b455e", "#666079"],
    marbre:    ["#16141a", "#2e2b33", "#4d4954", "#736e7b", "#9c96a3", "#c8c2cc"],
    brique:    ["#100605", "#24100c", "#3a1a13", "#55271c", "#733626", "#8f4a35"],
    bois:      ["#0e0806", "#20120b", "#351d10", "#4e2c17", "#6b3e20", "#8c552c"],
    boisClair: ["#170d07", "#2e1a0e", "#4a2a15", "#6c3f1f", "#915829", "#b67338"],
    tenture:   ["#060a08", "#0e1712", "#16241c", "#213428", "#2e4636", "#3e5a47"],
    velours:   ["#12040a", "#2c0a14", "#48101f", "#661a2c", "#86283b", "#a63a4c"],
    tapis:     ["#0f040a", "#240914", "#3b1020", "#561a2e", "#73273c", "#91374b"],
    livreR:    ["#11050a", "#2a0b12", "#46131c", "#651f29", "#872d35", "#a84141"],
    livreV:    ["#060d09", "#0f1d16", "#183124", "#244535", "#325c46", "#437556"],
    livreB:    ["#070913", "#121a2c", "#1c2a45", "#293c5e", "#385178", "#4c6a93"],
    livreO:    ["#120c05", "#2b1e0b", "#483214", "#68491d", "#8a632a", "#ac7f3a"],
    parchemin: ["#1c150d", "#3a2d1b", "#5e4b2f", "#8b7350", "#b9a074", "#e6d3a5"],
    laiton:    ["#130d04", "#33240a", "#5a4113", "#83611f", "#ae8631", "#dcb04d"],
    cuivre:    ["#160805", "#341509", "#5a2610", "#83391a", "#b05428", "#d8773c"],
    fer:       ["#040406", "#0d0d13", "#191923", "#292937", "#3c3c4f", "#55556d"],
    cire:      ["#2a231e", "#4d4239", "#7a6c5d", "#a89883", "#d3c4a9", "#f2e8d2"],
    vitre:     ["#05080f", "#0a1222", "#131f38", "#1f3152", "#2f4a72", "#4a6a96"],
    braise:    ["#1a0502", "#4a0f04", "#8a2208", "#c8460e", "#f07a1e", "#ffc04a"],
  };
  const NOMS = Object.keys(RAMPES);
  const IDX = Object.fromEntries(NOMS.map((n, i) => [n, i]));
  const COULEURS = NOMS.map((n) => RAMPES[n].map(hex));
  const EMISSIF = new Set([IDX.vitre, IDX.braise]); // la nuit derrière la vitre et les braises luisent d'elles-mêmes

  // Flammes des bougies (b = bord, m = milieu, c = cœur)
  const COULEURS_FEU = { b: [196, 74, 30], m: [244, 150, 44], c: [255, 232, 150] };
  const FLAMMES = [
    [".b.", "bmb", "bcb", ".c."],
    ["..b", ".mb", "bcb", ".c."],
    ["b..", "bm.", "bcb", ".c."],
    [".b.", ".m.", "bcb", ".c."],
  ];
  // Le feu de cheminée : de la braise sombre au cœur presque blanc
  const PALETTE_FEU = [null, [58, 12, 8], [122, 26, 12], [196, 64, 26], [240, 138, 44], [248, 200, 88], [255, 240, 176]];

  // Elle, assise : la tête de son sprite de face (js/personnage-pixel.js),
  // le corps dans la tenue « jupe » (veste courte bordeaux brodée d'or,
  // débardeur noir, collier à fleur noire, ceinture à fioles ambrées, longue
  // jupe noire à ourlet doré, bottines), une tasse entre les mains
  const ASSISE_CORPS = [
    "KHHHKDNSSNDKHHHK",
    "KHHKDONKKNODKHHK",
    "KHKDLONNKNOdDKHK",
    "KHKDLSWWWWSdDKHK",
    "KKDLDSwWWwSDdDKK",
    ".KDLDDNNNNDDdDK.",
    ".KOOcVcccVcOOoK.",
    "KNNNNNNNNNNNNNNK",
    "KNNNNNNNNNNNNNNK",
    "KNNNNNNKNNNNNNNK",
    ".KNNNNNKNNNNNNK.",
    ".KNNNNNKNNNNNNK.",
    ".KNNNNNKNNNNNNK.",
    ".KOOOOOOOOOOOOK.",
    "..KKBBK..KBBKK..",
    "..KBBBK..KBBBK..",
    "..KKKKK..KKKKK..",
  ];
  const TETE = PERSO.SPRITES.face.slice(0, 13);
  const ASSISE = [...TETE, ...ASSISE_CORPS];
  const ASSISE_CLIGNE = ASSISE.map((l, y) => (y === 8 ? l.replace(/eE/g, "SS") : l));
  const ASSISE_DORT = ASSISE.map((l, y) => (y === 8 ? l.replace(/eE/g, "ss") : y === 9 ? l.replace(/EE/g, "SS") : l));
  const RVB_PERSO = Object.fromEntries(
    Object.entries({ ...PERSO.COULEURS, W: "#e8e0d0", w: "#a89c8c" }).map(([k, h]) => [k, hex(h)])
  );

  let L, H, mat, val, couche, objet, froid, image;
  let bougies = [];
  let braises = [];     // pixels de braise qui palpitent sous le feu
  let gouttes = [];     // pluie derrière la fenêtre
  let etincelles = [];  // étincelles qui montent du feu
  let vapeurs = [];     // vapeur des deux tasses
  let zzz = [];         // « z » quand elle somnole
  let chaleur = null;   // grille du feu de cheminée
  let survol = 0;       // objet survolé (0 = aucun)
  let sansElle = false; // aperçu pour la salle aux portes : la pièce sans elle
  let ouverte = false;
  let options = {};
  let geo = {};

  const MUR = 1, SOL = 2;
  let coucheActive = 0;
  let objetActif = 0;   // objet cliquable en cours de dessin (pour son contour)

  const dans = (x, y) => x >= 0 && y >= 0 && x < L && y < H;
  function poser(x, y, m, v) {
    x = Math.round(x); y = Math.round(y);
    if (!dans(x, y)) return;
    const i = y * L + x;
    mat[i] = IDX[m];
    val[i] = v;
    couche[i] = coucheActive;
    objet[i] = objetActif;
  }
  function ligne(x0, y0, x1, y1, m, v) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) poser(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, m, v);
  }
  function rect(x0, y0, x1, y1, m, v) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) {
      for (let x = Math.round(x0); x <= Math.round(x1); x++) {
        poser(x, y, m, typeof v === "function" ? v(x, y) : v);
      }
    }
  }
  function sprite(lignes, x0, y0, legende) {
    lignes.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) {
        const c = legende[l[i]];
        if (c) poser(x0 + i, y0 + j, c[0], c[1]);
      }
    });
  }

  /* ============================================================
     Les objets cliquables (boutons HTML posés sur le dessin)
     ============================================================ */
  const ELLE = 1, SECRETAIRE = 2, CAFE = 3, CADRE = 4; // cadres : 4, 5, 6…
  const objets = [];

  function creerObjet(id, etiquette, libelle, action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "piece-objet";
    b.setAttribute("aria-label", libelle);
    const e = document.createElement("span");
    e.className = "piece-etiquette";
    e.setAttribute("aria-hidden", "true");
    e.textContent = etiquette;
    b.append(e);
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      action(b);
    });
    const allumer = (oui) => {
      if (lettreOuverte) return;
      if (oui) survol = id;
      else if (survol === id) survol = 0;
      dessiner();
    };
    b.addEventListener("pointerenter", () => allumer(true));
    b.addEventListener("pointerleave", () => allumer(false));
    b.addEventListener("focus", () => allumer(true));
    b.addEventListener("blur", () => allumer(false));
    el.scene.append(b);
    const o = { id, b };
    objets.push(o);
    return o;
  }

  // Boîte englobante d'un objet (en pixels du décor), d'après le masque
  function boite(id) {
    let ax = L, ay = H, bx = -1, by = -1;
    for (let i = 0; i < L * H; i++) {
      if (objet[i] !== id) continue;
      const x = i % L, y = (i - x) / L;
      if (x < ax) ax = x;
      if (x > bx) bx = x;
      if (y < ay) ay = y;
      if (y > by) by = y;
    }
    return bx < 0 ? null : { ax, ay, bx, by };
  }

  // Pose chaque bouton sur son objet (en %, avec une marge pour le doigt)
  function placerObjets() {
    const pct = (v, t) => `${(v / t) * 100}%`;
    for (const o of objets) {
      const z = o.id === ELLE ? geo.boiteElle : boite(o.id);
      o.boite = z;
      o.b.hidden = !z;
      if (!z) continue;
      const m = o.id >= CADRE || o.id === CAFE ? 2 : 0;
      const s = o.b.style;
      s.setProperty("--objet-gauche", pct(z.ax - m, L));
      s.setProperty("--objet-haut", pct(z.ay - m, H));
      s.setProperty("--objet-largeur", pct(z.bx - z.ax + 1 + 2 * m, L));
      s.setProperty("--objet-hauteur", pct(z.by - z.ay + 1 + 2 * m, H));
    }
  }

  // Zoom de la caméra vers un objet (variables lues par .zoom-objet)
  function viser(id) {
    const o = objets.find((x) => x.id === id);
    if (!o || !o.boite) return;
    const { ax, ay, bx, by } = o.boite;
    const s = el.piece.style;
    s.setProperty("--objet-x", `${((ax + bx) / 2 / L) * 100}%`);
    s.setProperty("--objet-y", `${((ay + by) / 2 / H) * 100}%`);
    s.setProperty("--objet-zoom", String(Math.min(2.6, (L * 0.6) / (bx - ax), (H * 0.6) / (by - ay)).toFixed(2)));
  }

  /* ============================================================
     Construction du salon
     ============================================================ */

  function construire() {
    const vw = window.innerWidth, vh = window.innerHeight;
    H = 160;
    L = Math.round((H * vw) / vh);
    if (L < 200) {
      L = 200;
      // Écran très vertical : la pièce est plus large que l'écran et
      // recadrée sur la cheminée (cadrerScene)
      H = Math.min(Math.round((L * vh) / vw), Math.round(L * 1.65));
    }
    el.canvas.width = L;
    el.canvas.height = H;
    image = ctx.createImageData(L, H);
    mat = new Uint8Array(L * H);
    val = new Float32Array(L * H);
    couche = new Uint8Array(L * H);
    objet = new Uint8Array(L * H);
    froid = new Float32Array(L * H);
    bougies = [];
    braises = [];
    gouttes = [];
    etincelles = [];

    const sol = Math.round(H * 0.6);
    const cx = Math.round(L / 2);
    geo = { sol, cx };

    dessinerMur(sol);
    dessinerPlancher(sol);
    dessinerFenetre(sol);
    dessinerBibliotheque(sol);
    dessinerCorniche();
    dessinerCheminee(sol);
    dessinerCadres(sol);
    dessinerTapis(sol);
    dessinerCanape(sol);
    dessinerSecretaire(sol);
    dessinerGueridon(sol);
    dessinerLustre(sol);
    eclairerFenetre();

    // Elle, assise au bout du canapé, côté feu
    const gauche = cx - 56, haut = sol - 14;
    geo.elle = { gauche, haut };
    geo.boiteElle = { ax: gauche, ay: haut, bx: gauche + 15, by: haut + ASSISE.length - 1 };
    geo.tasseElle = { x: gauche + 7.5, y: haut + 15 };
    geo.chat = { x: cx + 12, y: sol + 21 };

    chaleur = new Uint8Array(geo.feu.l * geo.feu.h);
    vapeurs = [];
    for (let k = 0; k < 8; k++) vapeurs.push(nouvelleVapeur(k % 2, true));
    zzz = [];
    placerObjets();
    cadrerScene(vw, vh);
  }

  // Tenture verte damassée, lambris de bois en bas
  function dessinerMur(sol) {
    coucheActive = MUR;
    const lambris = sol - 20;
    for (let y = 0; y < lambris; y++) {
      for (let x = 0; x < L; x++) {
        // Motif damassé : une fleur en losange, une rangée sur deux décalée
        const rangee = Math.floor(y / 16);
        const mx = ((x + (rangee % 2) * 8) % 16) - 8, my = (y % 16) - 8;
        const d = Math.abs(mx) + Math.abs(my) * 0.8;
        const fleur = (d > 3.5 && d < 5) || (Math.abs(mx) < 1 && Math.abs(my) < 6) || (Math.abs(my) < 1 && Math.abs(mx) < 2);
        let v = 0.5 + hasard(x, y) * 0.05;
        if (fleur) v = 0.72;
        // Rayures verticales très légères, comme un papier peint ancien
        if (x % 32 === 0) v -= 0.08;
        poser(x, y, "tenture", v);
      }
    }
    // Lambris : panneaux moulurés, cimaise en haut
    for (let y = lambris; y < sol; y++) {
      for (let x = 0; x < L; x++) {
        const px = x % 24, py = y - lambris;
        let v = 0.4 + hasard(Math.floor(x / 24), 7) * 0.08 + hasard(x, y * 3) * 0.04;
        if (py <= 1) v = py === 0 ? 0.8 : 0.55;
        else if (py === 2) v = 0.18;
        else if (py >= 5 && py <= 16 && (px === 3 || px === 20)) v = px === 3 ? 0.62 : 0.2;
        else if ((py === 5 || py === 16) && px > 3 && px < 20) v = py === 5 ? 0.62 : 0.2;
        poser(x, y, "bois", v);
      }
    }
    coucheActive = 0;
  }

  // Plancher : lattes horizontales aux joints décalés
  function dessinerPlancher(sol) {
    coucheActive = SOL;
    for (let y = sol; y < H; y++) {
      const latte = Math.floor((y - sol) / 6);
      for (let x = 0; x < L; x++) {
        const decal = Math.floor(hasard(latte, 2) * 40);
        const bout = (x + decal) % 46 === 45;
        let v = 0.36 + hasard(Math.floor((x + decal) / 46), latte) * 0.12 + hasard(x * 2, y) * 0.06;
        if ((y - sol) % 6 === 5 || bout) v = 0.14;
        else if ((y - sol) % 6 === 0) v += 0.1;
        poser(x, y, "bois", y === sol ? 0.1 : v);
      }
    }
    coucheActive = 0;
  }

  // Corniche moulurée au plafond
  function dessinerCorniche() {
    rect(0, 0, L - 1, 5, "bois", (x, y) => [0.3, 0.45, 0.7, 0.4, 0.22, 0.12][y]);
  }

  // Fenêtre à petits carreaux, rideaux de velours, pluie (si la place le permet)
  function dessinerFenetre(sol) {
    const { cx } = geo;
    const x0 = cx + 84, x1 = cx + 106;
    if (x1 + 8 > L) return;
    const haut = sol - 76, bas = sol - 26;
    geo.fenetre = { x0, x1, haut, bas };
    coucheActive = MUR;
    rect(x0 - 3, haut - 3, x1 + 3, bas + 2, "bois", (x, y) => (x === x0 - 3 || y === haut - 3 ? 0.7 : 0.45));
    coucheActive = 0;
    for (let y = haut; y <= bas; y++) {
      for (let x = x0; x <= x1; x++) {
        const meneau = x === Math.round((x0 + x1) / 2) || (y - haut) % 12 === 11;
        if (meneau) poser(x, y, "bois", 0.5);
        else poser(x, y, "vitre", 0.42 + (1 - (y - haut) / (bas - haut)) * 0.25 + hasard(x, y) * 0.05);
      }
    }
    // Rebord
    rect(x0 - 5, bas + 2, x1 + 5, bas + 4, "bois", (x, y) => (y === bas + 2 ? 0.8 : 0.4));
    // Rideaux de velours, retenus par une embrasse dorée
    for (const [a, sens] of [[x0 - 8, 1], [x1 + 8, -1]]) {
      for (let y = haut - 6; y <= sol - 2; y++) {
        const t = (y - (haut - 6)) / (sol - haut);
        const serre = y > bas - 18 && y < bas - 12 ? 2 : 0; // pincé à l'embrasse
        const larg = Math.round(6 - serre + (y > bas - 12 ? (y - bas + 12) * 0.15 : 0));
        for (let k = 0; k < larg; k++) {
          poser(a + sens * k, y, "velours", 0.45 + 0.15 * Math.sin(k * 1.6 + t) + hasard(k, y) * 0.04);
        }
        if (y === bas - 15) rect(a + sens * 0, y, a + sens * (larg - 1), y, "laiton", 0.75);
      }
    }
    rect(x0 - 11, haut - 8, x1 + 11, haut - 7, "laiton", 0.6); // tringle
    // Gouttes : chacune glisse en biais sur la vitre
    for (let k = 0; k < 14; k++) gouttes.push(nouvelleGoutte(true));
  }

  function nouvelleGoutte(partout) {
    const f = geo.fenetre;
    return {
      x: f.x0 + Math.random() * (f.x1 - f.x0),
      y: partout ? f.haut + Math.random() * (f.bas - f.haut) : f.haut - Math.random() * 6,
      v: 1.5 + Math.random() * 1.5,
    };
  }

  // Un peu de bleu froid sur le mur autour de la fenêtre
  function eclairerFenetre() {
    const f = geo.fenetre;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        let l = 0.04;
        if (f) {
          const d = Math.hypot((x - (f.x0 + f.x1) / 2) / 40, (y - (f.haut + f.bas) / 2) / 50);
          l += 0.22 * Math.max(0, 1 - d) ** 1.5;
        }
        froid[i] = l;
      }
    }
  }

  // Bibliothèque basse contre le mur de gauche (si la place le permet)
  function dessinerBibliotheque(sol) {
    const x1 = geo.cx - 100;
    if (x1 < 28) return;
    const x0 = Math.max(4, x1 - 44);
    const haut = sol - 66, bas = sol + 4;
    rect(x0, haut, x1, bas, "bois", (x, y) => 0.16 + hasard(x, y * 2) * 0.04);
    rect(x0 - 2, haut - 4, x1 + 2, haut, "bois", (x, y) => (y === haut - 4 ? 0.8 : y === haut ? 0.25 : 0.5));
    rect(x0, haut, x0 + 2, bas, "bois", 0.6);
    rect(x1 - 2, haut, x1, bas, "bois", 0.4);
    const couleurs = ["livreR", "livreV", "livreB", "livreO"];
    for (let planche = haut + 22; planche <= bas - 2; planche += 22) {
      rect(x0 + 3, planche, x1 - 3, planche + 1, "bois", (x, y) => (y === planche ? 0.75 : 0.3));
      let x = x0 + 3;
      while (x < x1 - 5) {
        const w = 2 + Math.floor(hasard(x, planche) * 3);
        const h = 13 + Math.floor(hasard(planche, x * 0.7) * 6);
        if (hasard(x * 3, planche) < 0.1) { x += 4; continue; }
        const c = couleurs[Math.floor(hasard(x * 0.9, planche * 2.1) * 4)];
        rect(x, planche - h, Math.min(x + w - 1, x1 - 4), planche - 1, c, (xx, yy) =>
          yy === planche - h + 2 ? 0.7 : xx === x ? 0.65 : 0.45 + hasard(xx, yy) * 0.05);
        x += w;
      }
    }
    // Sur le dessus : un vase et un chandelier éteint
    rect(x0 + 6, haut - 10, x0 + 9, haut - 5, "cuivre", (x) => (x === x0 + 6 ? 0.7 : 0.5));
    rect(x0 + 7, haut - 12, x0 + 8, haut - 11, "cuivre", 0.6);
  }

  // La cheminée : manteau de marbre, foyer de briques, bûches, chenets
  function dessinerCheminee(sol) {
    const { cx } = geo;
    // Conduit en pierre jusqu'au plafond
    coucheActive = MUR;
    rect(cx - 30, 6, cx + 30, sol - 50, "pierre", (x, y) => {
      const r = Math.floor(y / 8), dec = (r % 2) * 7;
      const joint = y % 8 === 7 || (x + dec) % 14 === 13;
      return joint ? 0.2 : 0.55 + hasard(Math.floor((x + dec) / 14), r) * 0.15 + hasard(x, y) * 0.05;
    });
    rect(cx - 31, 6, cx - 31, sol - 50, "pierre", 0.25);
    rect(cx + 31, 6, cx + 31, sol - 50, "pierre", 0.2);
    coucheActive = 0;
    // Tablette
    rect(cx - 38, sol - 50, cx + 38, sol - 46, "marbre", (x, y) => (y === sol - 50 ? 0.75 : y === sol - 46 ? 0.2 : 0.48));
    // Montants et linteau de marbre, foyer ouvert en arc
    const ox = 19, oHaut = sol - 32;
    geo.foyer = { x0: cx - ox, x1: cx + ox, haut: oHaut };
    const ouvert = (x, y) => {
      if (Math.abs(x - cx) > ox || y > sol) return false;
      const arc = oHaut + 6 - Math.sqrt(Math.max(0, 1 - ((x - cx) / ox) ** 2)) * 6;
      return y >= arc;
    };
    for (let y = sol - 45; y <= sol + 1; y++) {
      for (let x = cx - 34; x <= cx + 34; x++) {
        if (ouvert(x, y)) {
          // Fond du foyer : briques noircies de suie
          const r = Math.floor(y / 4), dec = (r % 2) * 3;
          const joint = y % 4 === 3 || (x + dec) % 6 === 5;
          const fond = 0.22 + (y - oHaut) / 70;
          poser(x, y, "brique", joint ? fond * 0.4 : fond + hasard(x, y) * 0.05);
          continue;
        }
        let v = 0.4 + hasard(x, y) * 0.05;
        if (x === cx - 34) v = 0.62;
        else if (x === cx + 34) v = 0.2;
        else if (y === sol - 45) v = 0.25;
        // Moulure autour de l'ouverture et motif sculpté au centre du linteau
        if (ouvert(x, y + 2) || ouvert(x - 2, y) || ouvert(x + 2, y)) v = 0.58;
        if (Math.abs(x - cx) <= 4 && y >= sol - 42 && y <= sol - 37 && (Math.abs(x - cx) + Math.abs(y - (sol - 39.5))) < 4) v = 0.62;
        poser(x, y, "marbre", v);
      }
    }
    // Âtre
    rect(cx - 40, sol + 2, cx + 40, sol + 5, "marbre", (x, y) => (y === sol + 2 ? 0.55 : 0.32));
    // Bûches croisées et braises
    for (let x = cx - 13; x <= cx + 13; x++) {
      for (let y = sol - 5; y <= sol - 1; y++) {
        const bas = y >= sol - 3;
        const dans1 = bas || Math.abs(x - (cx - 4)) < 7 && y >= sol - 5;
        if (!dans1) continue;
        const bout = Math.abs(x - cx) === 13 || x === cx + 2;
        poser(x, y, bout ? "boisClair" : "bois", bout ? 0.7 : 0.35 + hasard(x, y) * 0.1);
        if (!bout && hasard(x * 2, y) < 0.3) {
          poser(x, y, "braise", 0.5);
          braises.push({ i: y * L + x, phase: Math.random() * 6 });
        }
      }
    }
    // Chenets de fer
    for (const x of [cx - 15, cx + 15]) {
      rect(x, sol - 7, x, sol, "fer", 0.6);
      rect(x - 1, sol - 8, x + 1, sol - 8, "laiton", 0.85);
    }
    // Le feu : zone où il brûle, et sa lumière (la grande source de la pièce)
    geo.feu = { x0: cx - 15, y0: sol - 30, l: 31, h: 27, ouvert };
    bougies.push({ x: cx, y: sol - 12, rayon: Math.max(130, L * 0.5), force: 1.15, intensite: 1, image: 0, invisible: true, feu: true });

    // Sur la tablette : une pendule et deux bougeoirs
    const p = sol - 51;
    rect(cx - 5, p - 9, cx + 5, p, "bois", (x, y) => (y === p - 9 ? 0.75 : x === cx - 5 ? 0.6 : 0.4));
    for (let y = p - 8; y <= p - 2; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, y - (p - 5)) <= 3.2) poser(x, y, "parchemin", 0.85);
    }
    ligne(cx, p - 5, cx, p - 7, "fer", 0.3);
    ligne(cx, p - 5, cx + 2, p - 5, "fer", 0.3);
    rect(cx - 6, p, cx + 6, p, "laiton", 0.7);
    for (const x of [cx - 32, cx + 32]) {
      rect(x - 2, p, x + 2, p, "laiton", 0.7);
      rect(x, p - 3, x, p - 1, "laiton", 0.6);
      bougie(x, p - 4, 5, 55);
    }
  }

  // Trois cadres dorés au-dessus de la cheminée : les liens
  const ICONES_CADRE = {
    linkedin: {
      fond: ["livreB", 0.55],
      dessin: [
        "..........",
        "..........",
        "..x.......",
        "..........",
        "..x.x.xx..",
        "..x.xx..x.",
        "..x.x...x.",
        "..x.x...x.",
        "..x.x...x.",
        "..x.x...x.",
        "..........",
        "..........",
        "..........",
      ],
      trait: ["parchemin", 1],
    },
    github: {
      fond: ["fer", 0.35],
      dessin: [
        "..........",
        "..........",
        "..x....x..",
        "..xx..xx..",
        "..xxxxxx..",
        ".xxxxxxxx.",
        ".xx.xx.xx.",
        ".xxxxxxxx.",
        "..xxxxxx..",
        "...xxxx...",
        "...x..x...",
        "..xx..x...",
        "..........",
      ],
      trait: ["parchemin", 0.95],
    },
    cv: {
      fond: ["livreR", 0.5],
      dessin: [
        "..........",
        ".pppppppp.",
        ".pkkkkkkp.",
        ".pppppppp.",
        ".pkkkkpkp.",
        ".pppppppp.",
        ".pkkkkkkp.",
        ".pppppppp.",
        ".pkkkpkkp.",
        ".pppppppp.",
        ".pkkkkp.p.",
        ".pppppppp.",
        "..........",
      ],
    },
  };
  function dessinerCadres(sol) {
    const { cx } = geo;
    const cadres = DONNEES.cadres || [];
    const n = cadres.length;
    if (!n) return;
    const W = 14, Hc = 17, ecart = 3;
    const total = n * W + (n - 1) * ecart;
    const y0 = Math.max(10, sol - 84);
    cadres.forEach((c, k) => {
      const x0 = Math.round(cx - total / 2 + k * (W + ecart));
      objetActif = CADRE + k;
      // Cadre doré, plus clair en haut à gauche
      rect(x0, y0, x0 + W - 1, y0 + Hc - 1, "laiton", (x, y) =>
        (x === x0 || y === y0 ? 0.9 : x === x0 + W - 1 || y === y0 + Hc - 1 ? 0.4 : 0.65));
      const ic = ICONES_CADRE[c.icone] || ICONES_CADRE.cv;
      rect(x0 + 2, y0 + 2, x0 + W - 3, y0 + Hc - 3, ic.fond[0], (x, y) => ic.fond[1] + hasard(x, y) * 0.04);
      sprite(ic.dessin, x0 + 2, y0 + 2, { x: ic.trait, p: ["parchemin", 0.85], k: ["fer", 0.4] });
      objetActif = 0;
      // Clou et cordelette
      ligne(x0 + 3, y0 - 1, x0 + W / 2, y0 - 4, "fer", 0.4);
      ligne(x0 + W - 4, y0 - 1, x0 + W / 2, y0 - 4, "fer", 0.4);
    });
  }

  // Tapis ovale devant la cheminée
  function dessinerTapis(sol) {
    const { cx } = geo;
    const cy = sol + 22, rx = Math.min(70, L * 0.3), ry = Math.min(14, (H - sol) / 3);
    coucheActive = SOL;
    for (let y = Math.round(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.round(cx - rx); x <= cx + rx; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d > 1) continue;
        let v = 0.45 + hasard(x, y) * 0.06, m = "tapis";
        if (d > 0.9) { m = "laiton"; v = 0.55; }
        else if (d > 0.84) v = 0.25;
        else if (Math.abs(d - 0.5) < 0.05 || d < 0.12) { m = "laiton"; v = 0.6; }
        poser(x, y, m, v);
      }
    }
    coucheActive = 0;
  }

  // Petit canapé de velours capitonné, dossier chantourné
  function dessinerCanape(sol) {
    const { cx } = geo;
    const x0 = cx - 92, x1 = cx - 34;
    const dos = sol - 16, assise = sol + 4, bas = sol + 13;
    for (let x = x0 + 3; x <= x1 - 3; x++) {
      // Dossier arrondi, plus haut au milieu
      const t = (x - x0) / (x1 - x0);
      const haut = Math.round(dos + 3 - Math.sin(Math.PI * t) * 3);
      for (let y = haut; y < assise; y++) {
        let v = 0.42 + hasard(x, y) * 0.04;
        if (y === haut) v = 0.2;
        else if (y === haut + 1) v = 0.65;
        // Capitons
        else if ((x - x0) % 7 === 3 && (y - dos) % 6 === 2) v = 0.18;
        poser(x, y, "velours", v);
      }
      ligne(x, haut - 1, x, haut - 1, "boisClair", 0.6); // liseré de bois sculpté
    }
    // Assise et devant
    rect(x0 + 4, assise, x1 - 4, assise + 4, "velours", (x, y) => (y === assise ? 0.75 : 0.55));
    rect(x0 + 2, assise + 5, x1 - 2, bas - 2, "velours", (x, y) => (y === bas - 2 ? 0.2 : 0.38 + ((x - x0) % 12 < 1 ? -0.1 : 0)));
    rect(x0 + 2, bas - 1, x1 - 2, bas - 1, "laiton", 0.55); // galon doré
    // Accoudoirs roulés
    for (const [a, b] of [[x0, x0 + 5], [x1 - 5, x1]]) {
      rect(a, sol - 4, b, bas - 2, "velours", (x, y) => (y <= sol - 3 ? 0.78 : x === a ? 0.6 : 0.45));
      rect(a + 1, sol - 2, b - 1, sol - 1, "velours", 0.3);
    }
    // Pieds tournés
    for (const x of [x0 + 2, x0 + 14, x1 - 14, x1 - 2]) rect(x, bas, x + 1, bas + 2, "boisClair", 0.6);
    // Un coussin brodé d'or dans le coin gauche
    rect(x0 + 6, sol - 6, x0 + 14, assise - 1, "livreO", (x, y) => (y === sol - 6 ? 0.8 : 0.55));
    poser(x0 + 10, sol - 2, "laiton", 0.9);
  }

  // Secrétaire ancien, abattant ouvert, casiers à lettres
  function dessinerSecretaire(sol) {
    const { cx } = geo;
    const x0 = cx + 40, x1 = cx + 70;
    const plateau = sol - 12, bas = sol + 10, haut = sol - 40;
    objetActif = SECRETAIRE;
    // Corniche
    rect(x0 - 1, haut - 3, x1 + 1, haut, "bois", (x, y) => (y === haut - 3 ? 0.85 : y === haut ? 0.25 : 0.55));
    // Gradin : fond sombre et casiers
    rect(x0 + 1, haut + 1, x1 - 1, plateau - 1, "bois", (x, y) => 0.18 + hasard(x, y) * 0.04);
    rect(x0, haut, x0 + 1, plateau, "bois", 0.6);
    rect(x1 - 1, haut, x1, plateau, "bois", 0.35);
    const colonnes = 3, lignes = 2;
    const lc = (x1 - x0 - 2) / colonnes, hc = (plateau - haut - 2) / lignes;
    for (let r = 1; r < lignes; r++) rect(x0 + 1, Math.round(haut + 1 + r * hc), x1 - 1, Math.round(haut + 1 + r * hc), "bois", 0.6);
    for (let c = 1; c < colonnes; c++) rect(Math.round(x0 + 1 + c * lc), haut + 1, Math.round(x0 + 1 + c * lc), plateau - 1, "bois", 0.5);
    // Lettres et petits livres dans les casiers
    for (let r = 0; r < lignes; r++) {
      for (let c = 0; c < colonnes; c++) {
        const ax = Math.round(x0 + 2 + c * lc), by = Math.round(haut + (r + 1) * hc);
        if ((r + c) % 2 === 0) {
          for (let k = 0; k < 3; k++) rect(ax + 1 + k * 2, by - 7 + k, ax + 2 + k * 2, by, "parchemin", 0.6 + k * 0.1);
          poser(ax + 3, by - 4, "livreR", 0.8); // cachet de cire
        } else {
          rect(ax + 1, by - 8, ax + 2, by, "livreV", 0.55);
          rect(ax + 3, by - 7, ax + 4, by, "livreO", 0.6);
          rect(ax + 5, by - 3, ax + lc - 3, by, "livreB", 0.55);
        }
      }
    }
    // Abattant ouvert : plateau gainé de cuir vert
    rect(x0 - 2, plateau, x1 + 2, plateau + 2, "bois", (x, y) => (y === plateau ? 0.8 : 0.4));
    rect(x0 + 1, plateau, x1 - 1, plateau, "livreV", 0.6);
    // Corps : trois tiroirs à boutons de laiton
    rect(x0, plateau + 3, x1, bas, "bois", (x, y) => (x === x0 ? 0.6 : x === x1 ? 0.25 : 0.42 + hasard(x, y) * 0.04));
    for (let k = 0; k < 3; k++) {
      const y = plateau + 4 + k * 6;
      rect(x0 + 2, y, x1 - 2, y, "bois", 0.65);
      rect(x0 + 2, y + 5, x1 - 2, y + 5, "bois", 0.2);
      poser(Math.round((x0 + x1) / 2), y + 2, "laiton", 0.9);
    }
    rect(x0 + 1, bas + 1, x0 + 2, bas + 2, "bois", 0.5);
    rect(x1 - 2, bas + 1, x1 - 1, bas + 2, "bois", 0.4);
    // Sur le plateau : une feuille, l'encrier et sa plume
    rect(x0 + 4, plateau - 1, x0 + 15, plateau - 1, "parchemin", 0.9);
    rect(x0 + 18, plateau - 3, x0 + 20, plateau - 1, "fer", 0.5);
    ligne(x0 + 19, plateau - 4, x0 + 23, plateau - 11, "cire", 0.85);
    ligne(x0 + 20, plateau - 4, x0 + 24, plateau - 10, "cire", 0.6);
    bougie(x1 - 3, plateau - 1, 5, 50);
    objetActif = 0;
  }

  // Guéridon devant le canapé : la cafetière de cuivre et une tasse pour toi
  function dessinerGueridon(sol) {
    const { cx } = geo;
    const x0 = cx - 88, x1 = cx - 60, dessus = sol + 17;
    rect(x0, dessus, x1, dessus + 1, "boisClair", (x, y) => (y === dessus ? 0.9 : 0.5));
    rect(x0 + 1, dessus + 2, x1 - 1, dessus + 2, "boisClair", 0.25);
    for (const x of [x0 + 2, x1 - 2]) ligne(x, dessus + 3, x + (x < cx - 74 ? -1 : 1), dessus + 10, "boisClair", 0.6);
    objetActif = CAFE;
    // Cafetière (un peu ventrue, bec et anse)
    const c = x0 + 8;
    rect(c - 4, dessus - 9, c + 4, dessus - 1, "cuivre", (x, y) => (x === c - 3 ? 1 : x === c - 2 ? 0.85 : x === c + 4 ? 0.4 : 0.68));
    rect(c - 3, dessus - 11, c + 3, dessus - 10, "cuivre", (x) => (x === c - 3 ? 0.9 : 0.6));
    rect(c - 1, dessus - 13, c + 1, dessus - 12, "cuivre", 0.85);
    ligne(c + 5, dessus - 6, c + 8, dessus - 10, "cuivre", 0.75);
    ligne(c - 5, dessus - 9, c - 6, dessus - 3, "bois", 0.55);
    // Tasse et soucoupe
    const t = x0 + 20;
    rect(t - 4, dessus - 1, t + 4, dessus - 1, "cire", 0.75);
    rect(t - 3, dessus - 5, t + 2, dessus - 2, "cire", (x) => (x === t - 3 ? 1 : 0.85));
    poser(t + 3, dessus - 4, "cire", 0.7);
    poser(t + 3, dessus - 3, "cire", 0.7);
    rect(t - 2, dessus - 5, t + 1, dessus - 5, "bois", 0.5); // le café
    objetActif = 0;
    geo.tasseCafe = { x: t - 0.5, y: dessus - 6 };
  }

  // Petit lustre de laiton suspendu au-dessus du canapé
  function dessinerLustre(sol) {
    const x = geo.cx - 62;
    const bas = Math.max(22, sol - 54);
    ligne(x, 6, x, bas - 4, "fer", 0.4);
    rect(x - 7, bas - 1, x + 7, bas, "laiton", (xx, y) => (y === bas - 1 ? 0.8 : 0.45));
    ligne(x - 7, bas - 1, x, bas - 4, "laiton", 0.6);
    ligne(x + 7, bas - 1, x, bas - 4, "laiton", 0.6);
    poser(x, bas + 1, "laiton", 0.7);
    for (const dx of [-6, 0, 6]) bougie(x + dx, bas - 2, 3, dx === 0 ? 100 : 0);
  }

  // Bougie : cire de hauteur h posée en (x, base), flamme au-dessus
  // (rayon 0 = flamme sans lumière propre, pour ne pas trop en calculer)
  function bougie(x, base, h, rayon, force = 1) {
    rect(x - 1, base - h + 1, x + 1, base, "cire", (xx) => (xx === x - 1 ? 0.85 : xx === x + 1 ? 0.5 : 0.7));
    poser(x, base - h, "fer", 0.3);
    bougies.push({ x, y: base - h - 2, rayon, force, intensite: 1, image: Math.floor(Math.random() * 4) });
  }

  // Si la pièce est plus large que l'écran, on la recadre sur la cheminée
  function cadrerScene(vw, vh) {
    const s = el.scene.style;
    const largeur = (vh * L) / H;
    if (largeur <= vw + 1) { s.width = ""; s.left = ""; return; }
    // Centre un peu à gauche du feu, pour la garder à l'écran
    const centre = ((geo.cx - 8) / L) * largeur;
    s.width = `${largeur}px`;
    s.left = `${Math.max(vw - largeur, Math.min(0, vw / 2 - centre))}px`;
  }

  /* ============================================================
     Rendu : éclairage + tramage (comme js/piece-projets.js)
     ============================================================ */
  function lumiereEn(x, y) {
    let l = 0.1;
    for (const b of bougies) {
      if (!b.rayon) continue;
      const dx = x - b.x, dy = y - b.y;
      const r = b.rayon * b.intensite;
      if (dx > r || dx < -r || dy > r || dy < -r) continue;
      const f = 1 - Math.hypot(dx, dy) / r;
      if (f > 0) l += f ** 1.4 * 0.95 * b.force;
    }
    return Math.min(1.35, l);
  }

  // Teinte : orangé du feu, bleu froid de la fenêtre
  function teinter(r, g, b, chaud, bleu) {
    const l = chaud + bleu;
    if (chaud > 0.2) {
      const k = Math.min(1, (chaud - 0.1) / l) * 0.65;
      r = Math.min(255, r * (1 + 0.4 * k) + 12 * k); g *= 1 + 0.06 * k; b *= 1 - 0.4 * k;
    }
    if (bleu > 0.01) {
      const k = (bleu / l) * Math.min(1, bleu * 2.5);
      r *= 1 - 0.45 * k; g *= 1 - 0.1 * k; b = b * (1 + 0.35 * k) + 22 * k;
    }
    return [r, g, b];
  }

  function dessiner() {
    if (!image) return;
    const px = image.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x, m = mat[i];
        const emissif = EMISSIF.has(m);
        const chaud = emissif ? 1 : lumiereEn(x, y);
        const bleu = emissif ? 0 : froid[i];
        const v = Math.max(0, Math.min(1, val[i] * (chaud + bleu)));
        const f = v * 5;
        let c = Math.floor(f);
        if (f - c > BAYER[(y % 4) * 4 + (x % 4)]) c++;
        let [r, g, b] = COULEURS[m][Math.min(c, 5)];
        if (!emissif) [r, g, b] = teinter(r, g, b, chaud, bleu);
        const j = i * 4;
        px[j] = r; px[j + 1] = g; px[j + 2] = b; px[j + 3] = 255;
      }
    }
    dessinerFeu(px);
    dessinerPluie(px);
    dessinerChat(px);
    if (!sansElle) dessinerElle(px);
    // Vapeur des tasses
    for (const p of vapeurs) {
      if (sansElle && p.laSienne) continue;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (!dans(x, y)) continue;
      const k = (y * L + x) * 4, a = 0.45 * (1 - p.age / p.vie);
      px[k] += (215 - px[k]) * a; px[k + 1] += (205 - px[k + 1]) * a; px[k + 2] += (200 - px[k + 2]) * a;
    }
    // Flammes des bougies
    for (const b of bougies) {
      if (b.invisible) continue;
      FLAMMES[b.image].forEach((l, j) => {
        for (let i = 0; i < l.length; i++) {
          const c = COULEURS_FEU[l[i]];
          if (!c) continue;
          const x = b.x - 1 + i, y = b.y - 1 + j;
          if (!dans(x, y)) continue;
          const k = (y * L + x) * 4;
          px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
        }
      });
    }
    // Contour doré de l'objet survolé (comme un objet interactif dans un jeu)
    if (survol) contour(px, survol === ELLE ? masqueElle : objet, survol === ELLE ? 1 : survol);
    ctx.putImageData(image, 0, 0);
  }

  function contour(px, masque, id) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < L - 1; x++) {
        const i = y * L + x;
        if (masque[i] === id) continue;
        if (masque[i - 1] === id || masque[i + 1] === id || masque[i - L] === id || masque[i + L] === id) {
          const j = i * 4;
          px[j] = 242; px[j + 1] = 202; px[j + 2] = 112;
        }
      }
    }
  }

  // Un pixel coloré « dans la pièce » : assombri et teinté par la lumière
  function poserEclaire(px, x, y, rgb) {
    if (!dans(x, y)) return;
    const i = y * L + x;
    const chaud = lumiereEn(x, y), bleu = froid[i] + 0.06;
    const f = Math.min(1.15, 0.3 + (chaud + bleu) * 0.75);
    const [r, g, b] = teinter(rgb[0] * f, rgb[1] * f, rgb[2] * f, chaud, bleu);
    const j = i * 4;
    px[j] = Math.min(255, r); px[j + 1] = Math.min(255, g); px[j + 2] = Math.min(255, b);
  }

  /* ---------- Le feu de cheminée ----------
   * Une petite grille de chaleur : le bas brûle, chaque case reprend la
   * chaleur de celle du dessous en perdant un peu et en dérivant de côté
   * (le vieil effet « feu » des démos), puis la chaleur devient couleur. */
  function attiserFeu() {
    const { l, h } = geo.feu;
    for (let x = 0; x < l; x++) {
      const bord = Math.min(x, l - 1 - x);
      chaleur[(h - 1) * l + x] = bord < 3 ? 0 : 12 + Math.floor(Math.random() * 4) - (bord < 6 ? 4 : 0);
    }
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < l; x++) {
        const r = Math.random();
        const sous = chaleur[(y + 1) * l + x];
        const perte = r < 0.45 ? 1 : r < 0.8 ? 0 : 2;
        const dx = Math.min(l - 1, Math.max(0, x + (r < 0.3 ? -1 : r > 0.75 ? 1 : 0)));
        chaleur[y * l + dx] = Math.max(0, sous - perte);
      }
    }
  }

  function dessinerFeu(px) {
    const f = geo.feu;
    if (!chaleur) return;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.l; x++) {
        const c = chaleur[y * f.l + x];
        if (c < 2) continue;
        const X = f.x0 + x, Y = f.y0 + y;
        if (!f.ouvert(X, Y) || !dans(X, Y)) continue;
        const coul = PALETTE_FEU[Math.min(6, Math.floor(c / 2))];
        if (!coul) continue;
        const k = (Y * L + X) * 4;
        px[k] = coul[0]; px[k + 1] = coul[1]; px[k + 2] = coul[2];
      }
    }
    for (const e of etincelles) {
      const x = Math.round(e.x), y = Math.round(e.y);
      if (!dans(x, y) || !f.ouvert(x, y)) continue;
      const k = (y * L + x) * 4;
      px[k] = 255; px[k + 1] = 190; px[k + 2] = 90;
    }
  }

  function nouvelleEtincelle() {
    const { cx, sol } = geo;
    return { x: cx - 8 + Math.random() * 16, y: sol - 8, vx: (Math.random() - 0.5) * 0.6, vy: -1 - Math.random(), vie: 10 + Math.random() * 10 };
  }

  function dessinerPluie(px) {
    const f = geo.fenetre;
    if (!f) return;
    for (const g of gouttes) {
      for (let k = 0; k < 3; k++) {
        const x = Math.round(g.x - k * 0.4), y = Math.round(g.y - k * 1.5);
        if (x < f.x0 || x > f.x1 || y < f.haut || y > f.bas || mat[y * L + x] !== IDX.vitre) continue;
        const j = (y * L + x) * 4, a = 0.5 - k * 0.14;
        px[j] += (150 - px[j]) * a; px[j + 1] += (180 - px[j + 1]) * a; px[j + 2] += (225 - px[j + 2]) * a;
      }
    }
  }

  /* ---------- Le chat endormi sur le tapis (sa queue bouge) ---------- */
  const CHAT = [
    "..k.k.......",
    "..kkkk......",
    ".kkekkkkkk..",
    "kkkkkkkkkkk.",
    ".kkkkkkkkkkk",
  ];
  const QUEUES = [[[12, 4], [12, 3], [11, 2]], [[12, 4], [13, 4], [13, 3]]];
  const RVB_CHAT = { k: [34, 30, 44], e: [70, 62, 84] };
  let queue = 0;
  function dessinerChat(px) {
    const { x, y } = geo.chat;
    CHAT.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) if (RVB_CHAT[l[i]]) poserEclaire(px, x + i, y + j, RVB_CHAT[l[i]]);
    });
    for (const [i, j] of QUEUES[queue]) poserEclaire(px, x + i, y + j, RVB_CHAT.k);
  }

  /* ============================================================
     Elle : somnole (« z »), se réveille (« ! »), parle
     ============================================================ */
  let pose = "dort";   // "dort" | "alerte" | "eveillee"
  let cligne = 0, prochainClin = 40;
  let saut = 0;
  let masqueElle = null;

  function dessinerElle(px) {
    const { gauche } = geo.elle;
    const haut = geo.elle.haut - saut;
    if (!masqueElle || masqueElle.length !== L * H) masqueElle = new Uint8Array(L * H);
    masqueElle.fill(0);
    const lignes = pose === "dort" ? ASSISE_DORT : cligne > 0 ? ASSISE_CLIGNE : ASSISE;
    lignes.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === ".") continue;
        poserEclaire(px, gauche + i, haut + j, RVB_PERSO[c]);
        if (dans(gauche + i, haut + j)) masqueElle[(haut + j) * L + gauche + i] = 1;
      }
    });
    // « z » qui montent quand elle somnole
    for (const z of zzz) {
      const a = Math.max(0, 1 - z.age / 26);
      for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) {
        const x = Math.round(z.x + dx), y = Math.round(z.y + dy);
        if (!dans(x, y)) continue;
        const k = (y * L + x) * 4;
        px[k] += (210 - px[k]) * a; px[k + 1] += (215 - px[k + 1]) * a; px[k + 2] += (240 - px[k + 2]) * a;
      }
    }
    // « ! » au-dessus de sa tête quand elle nous entend
    if (pose === "alerte") {
      const ex = gauche + 8, ey = haut - 10;
      for (let y = ey - 1; y <= ey + 7; y++) for (let x = ex - 2; x <= ex + 2; x++) {
        if (!dans(x, y)) continue;
        const k = (y * L + x) * 4;
        const dedans = x >= ex - 1 && x <= ex + 1 && y >= ey && y <= ey + 6;
        const trait = x === ex && (y <= ey + 3 || y === ey + 5);
        const c = trait ? [178, 40, 50] : dedans ? [244, 238, 220] : [14, 12, 22];
        px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
      }
    }
  }

  function nouvelleVapeur(laSienne, partout) {
    const t = laSienne ? geo.tasseElle : geo.tasseCafe;
    const vie = 12 + Math.floor(Math.random() * 10);
    return { laSienne, x: t.x + Math.random() * 2 - 1, y: t.y, age: partout ? Math.floor(Math.random() * vie) : 0, vie };
  }

  // Animation (~12 images/s, saccadé comme sur PC-98)
  let tic = 0;
  setInterval(() => {
    if (!ouverte || document.hidden || mouvementReduit.matches || lettreOuverte) return;
    tic++;
    for (const b of bougies) {
      if (b.feu) {
        // Le feu vacille plus fort que les bougies
        b.intensite += (0.86 + Math.random() * 0.24 - b.intensite) * 0.6;
        continue;
      }
      b.intensite += (0.9 + Math.random() * 0.2 - b.intensite) * 0.5;
      if (Math.random() < 0.5) b.image = Math.floor(Math.random() * FLAMMES.length);
    }
    attiserFeu();
    for (const b of braises) val[b.i] = 0.45 + 0.35 * Math.sin(tic * 0.5 + b.phase) * Math.random();
    etincelles = etincelles.filter((e) => {
      e.x += e.vx; e.y += e.vy;
      return --e.vie > 0;
    });
    if (Math.random() < 0.25 && etincelles.length < 6) etincelles.push(nouvelleEtincelle());
    for (const g of gouttes) {
      g.y += g.v; g.x += 0.3;
      if (g.y > geo.fenetre.bas + 3) Object.assign(g, nouvelleGoutte(false));
    }
    vapeurs.forEach((p, k) => {
      p.age++;
      p.y -= 0.5;
      p.x += Math.sin((p.age + k * 3) * 0.5) * 0.3;
      if (p.age >= p.vie) vapeurs[k] = nouvelleVapeur(p.laSienne, false);
    });
    if (pose === "dort" && tic % 9 === 0) zzz.push({ x: geo.elle.gauche + 13, y: geo.elle.haut - 2, age: 0 });
    zzz = zzz.filter((z) => {
      z.age++;
      z.y -= 0.35;
      z.x += 0.25;
      return z.age < 26;
    });
    if (tic % 22 === 0) queue = 1 - queue;
    else if (tic % 22 === 3) queue = 1 - queue;
    if (saut > 0 && tic % 2 === 0) saut--;
    if (cligne > 0) cligne--;
    else if (--prochainClin <= 0) { cligne = 2; prochainClin = 30 + Math.floor(Math.random() * 40); }
    dessiner();
  }, 80);

  // Le son du feu : un souffle grave et des crépitements (Web Audio, aucun
  // fichier), seulement si le son de l'intro est activé
  const sonFeu = (() => {
    let audio = null, general = null, minuterie = null;
    function bruit(secondes) {
      const n = Math.floor(audio.sampleRate * secondes);
      const buf = audio.createBuffer(1, n, audio.sampleRate);
      const d = buf.getChannelData(0);
      let dernier = 0;
      for (let i = 0; i < n; i++) {
        dernier = (dernier + 0.02 * (Math.random() * 2 - 1)) / 1.02; // bruit brun
        d[i] = dernier * 3.5;
      }
      return buf;
    }
    function craquer() {
      const t = audio.currentTime;
      const src = audio.createBufferSource();
      const n = Math.floor(audio.sampleRate * 0.03);
      const buf = audio.createBuffer(1, n, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
      src.buffer = buf;
      const filtre = audio.createBiquadFilter();
      filtre.type = "highpass";
      filtre.frequency.value = 1200 + Math.random() * 2500;
      const g = audio.createGain();
      g.gain.value = 0.1 + Math.random() * 0.3;
      src.connect(filtre).connect(g).connect(general);
      src.start(t);
      minuterie = setTimeout(craquer, 40 + Math.random() * (Math.random() < 0.2 ? 60 : 380));
    }
    return {
      activer() {
        if (minuterie) return;
        try {
          audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }
        if (!general) {
          general = audio.createGain();
          general.connect(audio.destination);
          const souffle = audio.createBufferSource();
          souffle.buffer = bruit(4);
          souffle.loop = true;
          const filtre = audio.createBiquadFilter();
          filtre.type = "lowpass";
          filtre.frequency.value = 380;
          const g = audio.createGain();
          g.gain.value = 0.5;
          souffle.connect(filtre).connect(g).connect(general);
          souffle.start();
        }
        audio.resume();
        general.gain.setTargetAtTime(0.18, audio.currentTime, 0.4);
        craquer();
      },
      couper() {
        clearTimeout(minuterie);
        minuterie = null;
        if (general) general.gain.setTargetAtTime(0, audio.currentTime, 0.2);
      },
    };
  })();
  const sonActif = () => el.btnSon && el.btnSon.getAttribute("aria-pressed") === "true";
  const reglerSon = () => (ouverte && sonActif() ? sonFeu.activer() : sonFeu.couper());
  if (el.btnSon) new MutationObserver(reglerSon).observe(el.btnSon, { attributes: true, attributeFilter: ["aria-pressed"] });

  /* ============================================================
     La scène : elle somnole, nous entend, se réveille, parle
     ============================================================ */
  let minuteries = [];
  let premiereVisite = true;
  let prochaineReplique = 0;
  const plus_tard = (fn, ms) => minuteries.push(setTimeout(fn, duree(ms)));
  const annulerMinuteries = () => { minuteries.forEach(clearTimeout); minuteries = []; };

  function jouerScene() {
    annulerMinuteries();
    pose = "dort";
    if (mouvementReduit.matches) { seReveiller(true); return; }
    plus_tard(() => {
      pose = "alerte";
      saut = 2;
      zzz = [];
      dessiner();
      plus_tard(() => seReveiller(false), premiereVisite ? 800 : 400);
    }, premiereVisite ? 1800 : 900);
  }

  function seReveiller(direct) {
    annulerMinuteries();
    pose = "eveillee";
    saut = 0;
    zzz = [];
    dessiner();
    if (premiereVisite) {
      premiereVisite = false;
      parler(DONNEES.replique, direct);
    } else montrerConsigne();
  }

  // Une réplique, tapée lettre par lettre (ou d'un coup)
  let ecriture = null;
  let texteEnCours = "";
  function parler(texte, direct) {
    clearTimeout(ecriture);
    texteEnCours = texte;
    el.bulle.hidden = false;
    el.repliqueLue.textContent = texte;
    el.bulle.classList.remove("est-visible");
    requestAnimationFrame(() => el.bulle.classList.add("est-visible"));
    if (direct || mouvementReduit.matches) { finirReplique(); return; }
    let n = 0;
    el.replique.textContent = "";
    const suivante = () => {
      n++;
      el.replique.textContent = texte.slice(0, n);
      if (n >= texte.length) { finirReplique(); return; }
      const pause = /[.!?…,]/.test(texte[n - 1]) ? 220 : 0;
      ecriture = setTimeout(suivante, 32 + pause);
    };
    ecriture = setTimeout(suivante, 200);
  }
  function finirReplique() {
    clearTimeout(ecriture);
    ecriture = null;
    el.replique.textContent = texteEnCours;
    plus_tard(montrerConsigne, 600);
  }
  function cacherBulle() {
    clearTimeout(ecriture);
    ecriture = null;
    el.bulle.classList.remove("est-visible");
    el.bulle.hidden = true;
  }
  function montrerConsigne() {
    el.consigne.textContent = sansSouris.matches ? DONNEES.consigneTactile || DONNEES.consigne : DONNEES.consigne;
    el.consigne.hidden = false;
  }

  /* ---------- Les objets ---------- */
  function cliquerElle() {
    if (pose !== "eveillee") { seReveiller(true); return; }
    if (ecriture) { finirReplique(); return; }
    const liste = DONNEES.repliques || [];
    if (!liste.length) return;
    parler(liste[prochaineReplique % liste.length]);
    prochaineReplique++;
  }

  async function prendreCafe() {
    if (pose !== "eveillee") seReveiller(true);
    const adresse = DONNEES.email;
    try {
      await navigator.clipboard.writeText(adresse);
      parler(`Mon adresse est copiée : ${adresse}. À toi de jouer !`, true);
    } catch (e) {
      parler(`Mon adresse : ${adresse}`, true);
    }
  }

  function ouvrirCadre(c) {
    const a = document.createElement("a");
    a.href = c.url;
    if (c.telecharger) a.download = "";
    if (/^https?:/.test(c.url)) { a.target = "_blank"; a.rel = "noopener"; }
    a.click();
  }

  /* ============================================================
     La lettre : formulaire, cachet de cire, envoi
     ============================================================ */
  let lettreOuverte = false;
  let envoiEnCours = false;
  const T = DONNEES.lettre || {};

  // Cachet de cire 16 × 16 : bordeaux, « F » en relief doré
  const CACHET = [
    ".....kkkkkk.....",
    "...kkRRRRRRkk...",
    "..kRRrrrrrrRRk..",
    ".kRrrRRRRRRrrRk.",
    ".kRrRGGGGGGRrRk.",
    "kRrRRGGrrrrRRrRk",
    "kRrRRGGrrrrRRrRk",
    "kRrRRGGGGGRRRrRk",
    "kRrRRGGrrrRRRrRk",
    "kRrRRGGrrrRRRrRk",
    "kRrRRGGrrrRRRrRk",
    ".kRrRRRRRRRRrRk.",
    ".kRrrRRRRRRrrRk.",
    "..kRRrrrrrrRRk..",
    "...kkRRRRRRkk...",
    ".....kkkkkk.....",
  ];
  const COULEURS_CACHET = { k: "#2a0810", R: "#8a1e2c", r: "#5e1220", G: "#e2b045" };
  function dessinerCachet(canvas) {
    canvas.width = canvas.height = 16;
    const g = canvas.getContext("2d");
    CACHET.forEach((l, y) => {
      for (let x = 0; x < l.length; x++) {
        const c = COULEURS_CACHET[l[x]];
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(x, y, 1, 1);
      }
    });
  }

  function remplirLettre() {
    const f = el.formulaire;
    $("lettre-titre").textContent = T.titre || "";
    $("lettre-salutation").textContent = T.salutation || "";
    f.elements.message.placeholder = T.placeholderMessage || "";
    $("lettre-libelle-email").textContent = T.reponse || "";
    $("lettre-libelle-nom").textContent = T.signature || "";
    $("lettre-envoyer-libelle").textContent = T.envoyer || "Envoyer";
    for (const c of el.lettre.querySelectorAll(".lettre-cachet canvas, .lettre-enveloppe canvas")) dessinerCachet(c);
  }

  function ouvrirLettre() {
    if (lettreOuverte) return;
    if (pose !== "eveillee") seReveiller(true);
    lettreOuverte = true;
    survol = 0;
    cacherBulle();
    dessiner();
    viser(SECRETAIRE);
    el.piece.classList.add("zoom-objet");
    plus_tard(() => {
      el.lettre.hidden = false;
      el.piece.classList.add("inventaire-visible");
      remettreLettre();
      el.formulaire.elements.message.focus({ preventScroll: true });
    }, 650);
  }

  // Lettre vierge (ou celle en cours si l'envoi a échoué)
  function remettreLettre() {
    el.lettre.classList.remove("est-pliee", "est-scellee", "est-envoyee");
    el.fin.hidden = true;
    el.formulaire.hidden = false;
    el.erreur.textContent = "";
  }

  function fermerLettre() {
    if (!lettreOuverte || envoiEnCours) return;
    lettreOuverte = false;
    el.lettre.hidden = true;
    el.piece.classList.remove("inventaire-visible", "zoom-objet");
    const merci = !el.fin.hidden;
    remettreLettre();
    const o = objets.find((x) => x.id === SECRETAIRE);
    if (o) o.b.focus({ preventScroll: true });
    if (merci && DONNEES.merci) plus_tard(() => parler(DONNEES.merci), 500);
  }

  // Vérification des champs : un message clair sous la lettre
  function verifier() {
    const f = el.formulaire.elements;
    const nom = f.nom.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    for (const c of [f.nom, f.email, f.message]) c.removeAttribute("aria-invalid");
    let champ = null, texte = "";
    if (!message) { champ = f.message; texte = "Ta lettre est vide : écris-moi quelques mots."; }
    else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { champ = f.email; texte = "Il me faut une adresse e-mail valide pour te répondre."; }
    else if (!nom) { champ = f.nom; texte = "N'oublie pas de signer la lettre."; }
    if (!champ) return { nom, email, message };
    champ.setAttribute("aria-invalid", "true");
    el.erreur.textContent = texte;
    champ.focus();
    return null;
  }

  async function poster(donnees) {
    const id = (DONNEES.formspree || "").trim();
    if (!id) {
      // Pas de Formspree : la messagerie du visiteur, lettre déjà écrite
      const sujet = encodeURIComponent(`Une lettre de ${donnees.nom}`);
      const corps = encodeURIComponent(`${donnees.message}\n\n— ${donnees.nom} (${donnees.email})`);
      window.location.href = `mailto:${DONNEES.email}?subject=${sujet}&body=${corps}`;
      return "messagerie";
    }
    const controle = new AbortController();
    const delai = setTimeout(() => controle.abort(), 15000);
    try {
      const r = await fetch(`https://formspree.io/f/${encodeURIComponent(id)}`, {
        method: "POST",
        body: new FormData(el.formulaire),
        headers: { Accept: "application/json" },
        signal: controle.signal,
      });
      if (!r.ok) throw new Error(`Formspree : ${r.status}`);
      return "envoyee";
    } finally {
      clearTimeout(delai);
    }
  }

  const attendre = (ms) => new Promise((ok) => setTimeout(ok, duree(ms)));

  async function envoyer(e) {
    e.preventDefault();
    if (envoiEnCours) return;
    el.erreur.textContent = "";
    const donnees = verifier();
    if (!donnees) return;
    envoiEnCours = true;
    el.lettre.setAttribute("aria-busy", "true");
    const envoi = poster(donnees).then((r) => ({ r }), (erreur) => ({ erreur }));
    // Pendant ce temps : la lettre se plie, le cachet tombe dessus
    el.lettre.classList.add("est-pliee");
    await attendre(450);
    el.lettre.classList.add("est-scellee");
    await attendre(550);
    const { r, erreur } = await envoi;
    if (erreur) {
      envoiEnCours = false;
      el.lettre.removeAttribute("aria-busy");
      el.lettre.classList.remove("est-pliee", "est-scellee");
      el.erreur.textContent = `${T.erreur} ${DONNEES.email}.`;
      return;
    }
    // Elle s'envole, puis revient sous forme d'accusé d'envoi
    el.lettre.classList.add("est-envoyee");
    await attendre(650);
    el.formulaire.hidden = true;
    el.formulaire.reset();
    el.finTitre.textContent = T.envoyee || "";
    el.finTexte.textContent = r === "messagerie" ? T.messagerie || "" : T.envoyeeTexte || "";
    el.fin.hidden = false;
    el.lettre.classList.remove("est-pliee", "est-scellee", "est-envoyee");
    envoiEnCours = false;
    el.lettre.removeAttribute("aria-busy");
    el.encore.focus({ preventScroll: true });
  }

  /* ============================================================
     Ouverture / fermeture de la pièce
     ============================================================ */
  function ouvrir(opts = {}) {
    options = opts;
    ouverte = true;
    construire();
    survol = 0;
    pose = "dort";
    el.consigne.hidden = true;
    cacherBulle();
    attiserFeu();
    dessiner();
    el.piece.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.piece.classList.add("est-ouverte")));
    el.piece.focus({ preventScroll: true });
    reglerSon();
    plus_tard(jouerScene, 500);
  }

  function fermer() {
    if (!ouverte) return;
    envoiEnCours = false;
    fermerLettre();
    annulerMinuteries();
    cacherBulle();
    ouverte = false;
    reglerSon();
    el.piece.classList.remove("est-ouverte");
    el.piece.hidden = true;
  }

  function surTouche(e) {
    if (!ouverte || e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (lettreOuverte) fermerLettre();
    else if (options.retour) options.retour();
  }

  // Les objets, dans l'ordre du clavier
  const nom = DONNEES.etiquette || "Elle";
  creerObjet(ELLE, nom, `${nom} : lui parler`, cliquerElle);
  (DONNEES.cadres || []).forEach((c, k) => {
    const libelle = c.telecharger ? `${c.libelle} : télécharger` : `${c.libelle} : ouvrir le lien`;
    creerObjet(CADRE + k, c.libelle, libelle, () => ouvrirCadre(c));
  });
  creerObjet(CAFE, "Un café ? (mon adresse)", "Le café : copier mon adresse e-mail", prendreCafe);
  creerObjet(SECRETAIRE, "Écrire une lettre", "Le secrétaire : m'écrire une lettre", ouvrirLettre);

  remplirLettre();
  el.formulaire.addEventListener("submit", envoyer);
  el.encore.addEventListener("click", (e) => {
    e.stopPropagation();
    remettreLettre();
    el.formulaire.elements.message.focus();
  });
  el.fermer.addEventListener("click", (e) => {
    e.stopPropagation();
    fermerLettre();
  });
  el.lettre.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === el.lettre) fermerLettre(); // clic à côté de la lettre
  });
  el.retour.addEventListener("click", (e) => {
    e.stopPropagation();
    if (options.retour) options.retour();
  });
  el.piece.addEventListener("click", (e) => {
    e.stopPropagation(); // pas de clic « avancer » de l'intro
    if (lettreOuverte) return;
    if (pose !== "eveillee") seReveiller(true);
    else if (ecriture) finirReplique();
  });
  document.addEventListener("keydown", surTouche, true);

  let attente = null;
  window.addEventListener("resize", () => {
    if (!ouverte) return;
    clearTimeout(attente);
    attente = setTimeout(() => {
      construire();
      dessiner();
    }, 150);
  });

  // Aperçu pour la salle aux trois portes (js/fond-pixel.js) : la pièce,
  // dessinée hors de l'écran, qu'on devine par l'arche de sa porte ;
  // x / bas = point du décor posé au milieu du seuil
  // (la cheminée, son feu déjà bien pris ; elle n'y est pas : on ne la voit
  // que dans la pièce où on entre)
  function apercu() {
    if (ouverte) return null;
    construire();
    survol = 0;
    for (let k = 0; k < 30; k++) attiserFeu();
    sansElle = true;
    dessiner();
    sansElle = false;
    return { image: ctx.getImageData(0, 0, L, H), x: geo.cx, bas: geo.sol + 10 };
  }

  window.PIECES = window.PIECES || {};
  window.PIECES.contact = { ouvrir, fermer, apercu };
})();
