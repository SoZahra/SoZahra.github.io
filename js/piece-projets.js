/*
 * Pièce « Projets » : un vieux bureau de mage, dans le style PC-98 de l'intro
 * (basse résolution, palettes réduites, tramage de Bayer, pixels nets).
 * Mur de pierre, fenêtre gothique au clair de lune, bibliothèque, tapisserie,
 * coffre, tapis, et au centre un grand bureau couvert de livres, de papiers
 * et de bougies qui vacillent.
 *
 * Survoler le bureau le détoure en doré ; cliquer dessus rapproche la caméra
 * et ouvre l'inventaire : chaque projet (js/projets.js) est un document,
 * présenté comme un objet de jeu (icône, catégorie façon rareté, effets).
 *
 * Ouverte par js/intro.js (porte « Projets ») via window.PIECES.projets :
 *   ouvrir({ retour })  — retour() ramène à la salle aux trois portes
 *   fermer()
 */
(() => {
  "use strict";

  const DONNEES = window.PROJETS;
  const $ = (id) => document.getElementById(id);
  const el = {
    piece: $("piece-projets"),
    scene: $("piece-scene"),
    canvas: $("piece-fond"),
    bureau: $("piece-bureau"),
    consigne: $("piece-consigne"),
    retour: $("piece-retour"),
    inventaire: $("inventaire"),
    titre: $("inventaire-titre"),
    grille: $("inventaire-grille"),
    detail: $("inventaire-detail"),
    fermer: $("inventaire-fermer"),
    toile: $("inventaire-toile"),
    onglets: $("inventaire-onglets"),
    compteurs: $("inventaire-compteurs"),
    rayon: $("inventaire-rayon"),
    total: $("inventaire-total"),
    vitrine: $("inventaire-vitrine"),
  };
  if (!DONNEES || !el.piece || !el.canvas) return;

  const ctx = el.canvas.getContext("2d");
  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");
  const sansSouris = matchMedia("(hover: none), (pointer: coarse)");
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // Bruit déterministe : la pièce est la même à chaque visite
  function hasard(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* ---------- Matières ----------
   * Chaque matière a sa rampe de 6 couleurs, du plus sombre au plus clair.
   * Un pixel = une matière + une valeur (0 à 1) ; la lumière multiplie la
   * valeur, puis le tramage de Bayer choisit entre deux couleurs de la rampe. */
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const RAMPES = {
    vide:      ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
    pierre:    ["#0a0910", "#16141e", "#24212f", "#363145", "#4b455e", "#666079"],
    bois:      ["#0e0806", "#20120b", "#351d10", "#4e2c17", "#6b3e20", "#8c552c"],
    boisClair: ["#170d07", "#2e1a0e", "#4a2a15", "#6c3f1f", "#915829", "#b67338"],
    livreR:    ["#11050a", "#2a0b12", "#46131c", "#651f29", "#872d35", "#a84141"],
    livreV:    ["#060d09", "#0f1d16", "#183124", "#244535", "#325c46", "#437556"],
    livreB:    ["#070913", "#121a2c", "#1c2a45", "#293c5e", "#385178", "#4c6a93"],
    livreO:    ["#120c05", "#2b1e0b", "#483214", "#68491d", "#8a632a", "#ac7f3a"],
    parchemin: ["#1c150d", "#3a2d1b", "#5e4b2f", "#8b7350", "#b9a074", "#e6d3a5"],
    laiton:    ["#130d04", "#33240a", "#5a4113", "#83611f", "#ae8631", "#dcb04d"],
    fer:       ["#040406", "#0d0d13", "#191923", "#292937", "#3c3c4f", "#55556d"],
    tissuV:    ["#050e09", "#0c1d14", "#142f20", "#1f442e", "#2c5c3e", "#3c7751"],
    tapis:     ["#0f040a", "#240914", "#3b1020", "#561a2e", "#73273c", "#91374b"],
    cire:      ["#2a231e", "#4d4239", "#7a6c5d", "#a89883", "#d3c4a9", "#f2e8d2"],
    os:        ["#1f1b17", "#3d3730", "#655c50", "#91867a", "#bdb3a4", "#e2dacb"],
    vitre:     ["#070b18", "#101b33", "#1c2f52", "#2c4772", "#456694", "#6f90bd"],
    verre:     ["#06090c", "#111a1f", "#1f2f36", "#34494f", "#55706f", "#8fb0a6"],
    potion:    ["#06140c", "#0d2e1b", "#16502e", "#237a45", "#3fae63", "#8ef0a2"],
  };
  const NOMS = Object.keys(RAMPES);
  const IDX = Object.fromEntries(NOMS.map((n, i) => [n, i]));
  const COULEURS = NOMS.map((n) => RAMPES[n].map(hex));
  const EMISSIF = new Set([IDX.vitre, IDX.potion]); // la vitre (la lune) et les potions luisent d'elles-mêmes

  // Flammes des bougies (b = bord, m = milieu, c = cœur)
  const COULEURS_FEU = { b: [196, 74, 30], m: [244, 150, 44], c: [255, 232, 150] };
  // Flammes des flambeaux, plus hautes et plus larges
  const GRANDES_FLAMMES = [
    ["..b..", ".bm..", ".bmb.", "bmcmb", "bmcmb", ".mcm.", "..c.."],
    ["...b.", "..bm.", ".bmb.", "bmcmb", "bmcmb", ".mcm.", "..c.."],
    [".b...", ".mb..", ".bmb.", "bmcb.", "bmcmb", ".mcm.", "..c.."],
    ["..b..", "..mb.", ".bmb.", ".bcmb", "bmcmb", ".mcm.", "..c.."],
  ];
  const FLAMMES = [
    [".b.", "bmb", "bcb", ".c."],
    ["..b", ".mb", "bcb", ".c."],
    ["b..", "bm.", "bcb", ".c."],
    [".b.", ".m.", "bcb", ".c."],
  ];

  let L, H, mat, val, masque, couche, lune, brume, image;
  let bougies = [];
  let lueurs = [];      // lueurs vertes des potions
  let poussieres = [];  // poussière qui danse dans le rayon de lune
  let bulles = [];      // bulles du ballon de l'alambic
  let survol = false;
  let ouverte = false;
  let options = {};

  // Couches, pour savoir où la lune se pose : mur (halo) ou sol (tache)
  const MUR = 1, SOL = 2;
  let coucheActive = 0;

  const dans = (x, y) => x >= 0 && y >= 0 && x < L && y < H;
  function poser(x, y, m, v, surBureau = false) {
    x = Math.round(x); y = Math.round(y);
    if (!dans(x, y)) return;
    const i = y * L + x;
    mat[i] = IDX[m];
    val[i] = v;
    masque[i] = surBureau ? 1 : 0;
    couche[i] = coucheActive;
  }
  // Trait d'un pixel d'épaisseur
  function ligne(x0, y0, x1, y1, m, v, surBureau) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) poser(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, m, v, surBureau);
  }
  // Rectangle plein ; v = nombre ou fonction (x, y) → valeur
  function rect(x0, y0, x1, y1, m, v, surBureau) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) {
      for (let x = Math.round(x0); x <= Math.round(x1); x++) {
        poser(x, y, m, typeof v === "function" ? v(x, y) : v, surBureau);
      }
    }
  }
  // Petit dessin en caractères ; legende : caractère → [matière, valeur]
  function sprite(lignes, x0, y0, legende, surBureau) {
    lignes.forEach((ligne, j) => {
      for (let i = 0; i < ligne.length; i++) {
        const c = legende[ligne[i]];
        if (c) poser(x0 + i, y0 + j, c[0], c[1], surBureau);
      }
    });
  }

  /* ---------- Construction de la pièce ---------- */
  let geo = {}; // positions utiles (bureau, fenêtre…)

  function construire() {
    const vw = window.innerWidth, vh = window.innerHeight;
    H = 200;
    L = Math.round((H * vw) / vh);
    if (L < 200) {
      L = 200;
      H = Math.round((L * vh) / vw);
    }
    el.canvas.width = L;
    el.canvas.height = H;
    image = ctx.createImageData(L, H);
    mat = new Uint8Array(L * H);
    val = new Float32Array(L * H);
    masque = new Uint8Array(L * H);
    couche = new Uint8Array(L * H);
    lune = new Float32Array(L * H);
    brume = new Float32Array(L * H);
    bougies = [];
    lueurs = [];
    bulles = [];

    const sol = Math.round(H * 0.7);
    geo = { sol };
    dessinerMur(sol);
    dessinerPlancher(sol);
    dessinerFenetre(sol);
    dessinerTapisserie(sol);
    dessinerBibliotheque(sol);
    dessinerPoutre();
    dessinerFlambeaux();
    dessinerEtagere(sol);
    dessinerPaillasse(sol);
    dessinerCoffre(sol);
    dessinerTapis(sol);
    dessinerFauteuil(sol);
    dessinerBureau(sol);
    dessinerGlobe(sol);
    dessinerPileAuSol(sol);
    eclairerLune(sol);
    placerZoneBureau();
  }

  // Mur de grosses pierres, lambris de bois en bas
  function dessinerMur(sol) {
    coucheActive = MUR;
    const PL = 20, PH = 10;
    for (let y = 0; y < sol; y++) {
      const rangee = Math.floor(y / PH);
      const decalage = (rangee % 2) * (PL / 2);
      for (let x = 0; x < L; x++) {
        const bx = Math.floor((x + decalage) / PL);
        const joint = y % PH === PH - 1 || (x + decalage) % PL === PL - 1;
        let v = joint ? 0.18 : 0.5 + hasard(bx, rangee) * 0.2 + hasard(x, y) * 0.08;
        if (!joint && y % PH === 0) v += 0.12;
        if (!joint && y % PH === PH - 2) v -= 0.1;
        poser(x, y, "pierre", v);
      }
    }
    // Lambris : planches verticales, moulure en haut
    const haut = sol - 16;
    for (let y = haut; y < sol; y++) {
      for (let x = 0; x < L; x++) {
        let v = 0.42 + hasard(Math.floor(x / 9), 4) * 0.1 + hasard(x, y * 3) * 0.05;
        if (x % 9 === 8) v = 0.18;
        if (y === haut) v = 0.75;
        else if (y === haut + 1) v = 0.5;
        else if (y === haut + 2) v = 0.2;
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
        let v = 0.38 + hasard(Math.floor((x + decal) / 46), latte) * 0.12 + hasard(x * 2, y) * 0.06;
        if ((y - sol) % 6 === 5 || bout) v = 0.14;
        else if ((y - sol) % 6 === 0) v += 0.1;
        poser(x, y, "bois", y === sol ? 0.1 : v);
      }
    }
    coucheActive = 0;
  }

  // Fenêtre gothique (arc brisé), vitrail en losanges, croissant de lune
  function dansOgive(x, y, cx, demi, haut, bas) {
    if (y > bas || y < haut) return false;
    const dx = Math.abs(x - cx);
    const hArc = Math.sqrt(3) * demi; // arc brisé : deux cercles de rayon 2 × demi
    if (y >= haut + hArc) return dx <= demi;
    return Math.hypot(dx + demi, y - (haut + hArc)) <= 2 * demi;
  }

  function dessinerFenetre(sol) {
    const cx = Math.round(L * 0.5);
    const demi = Math.min(24, Math.round(L * 0.075));
    const bas = sol - 34;
    const haut = Math.max(12, bas - Math.min(120, Math.round(H * 0.5)));
    const hArc = Math.sqrt(3) * demi;
    // pied : centre et demi-largeur de la tache de lune au bas de l'écran
    geo.fenetre = { cx, demi, haut, bas, hArc, piedX: cx + 110, piedDemi: demi * 1.8 };
    const luneX = cx - Math.round(demi * 0.35), luneY = Math.round(haut + hArc * 0.9);
    for (let y = haut - 4; y <= bas + 4; y++) {
      for (let x = cx - demi - 4; x <= cx + demi + 4; x++) {
        if (dansOgive(x, y, cx, demi, haut, bas)) {
          const dx = x - cx;
          // Plomb : meneau central, traverses, losanges
          const plomb = Math.abs(dx) <= 0 || (y > haut + hArc && (y - Math.round(haut + hArc)) % 16 === 0) ||
            ((dx + y) % 7 === 0 || (dx - y) % 7 === 0);
          // Lune : croissant (un disque moins un disque décalé)
          const dl = Math.hypot(x - luneX, y - luneY), dl2 = Math.hypot(x - luneX - 2, y - luneY + 1);
          if (dl <= 4.2 && dl2 > 3.6) {
            poser(x, y, "vitre", 1.15);
          } else if (plomb) {
            poser(x, y, "fer", 0.35);
          } else {
            const ciel = 0.42 + 0.35 * (1 - (y - haut) / (bas - haut)) + Math.max(0, 0.4 - dl / 36);
            poser(x, y, "vitre", ciel + hasard(x, y) * 0.06);
          }
        } else if (dansOgive(x, y, cx, demi + 3, haut - 3, bas)) {
          // Encadrement de pierres claires
          coucheActive = MUR;
          const bloc = Math.floor(x / 5) + Math.floor(y / 5) * 13;
          poser(x, y, "pierre", dansOgive(x, y, cx, demi + 1, haut - 1, bas) ? 0.3 : 0.78 + hasard(bloc, 2) * 0.12);
          coucheActive = 0;
        }
      }
    }
    // Rebord
    coucheActive = MUR;
    rect(cx - demi - 6, bas + 1, cx + demi + 6, bas + 3, "pierre", (x, y) => (y === bas + 1 ? 0.9 : y === bas + 3 ? 0.3 : 0.7));
    coucheActive = 0;
  }

  /* ---------- Clair de lune ----------
   * Trois effets, calculés une fois la pièce dessinée :
   *  - un halo bleuté sur le mur autour de la fenêtre ;
   *  - la fenêtre projetée sur le sol, plombs compris, étirée en biais ;
   *  - un rayon de lumière poussiéreuse (brume) entre les deux, qui éclaire
   *    aussi les objets qu'il traverse (fauteuil, bureau). */
  const modulo = (a, n) => ((a % n) + n) % n;

  function faisceauEn(x, y) {
    const f = geo.fenetre;
    const debut = f.haut + f.hArc * 0.6;
    if (y < debut) return 0;
    const s = (y - f.haut) / (H - f.haut);
    const g = f.cx - f.demi + s * (f.piedX - f.piedDemi - (f.cx - f.demi));
    const d = f.cx + f.demi + s * (f.piedX + f.piedDemi - (f.cx + f.demi));
    const u = (x - g) / (d - g);
    if (u <= 0 || u >= 1) return 0;
    const bord = Math.sin(Math.PI * u) ** 0.8;
    const raies = 0.72 + 0.28 * Math.sin(u * 19 + 1.3) * Math.sin(u * 7.1); // des raies, comme entre les plombs
    const entree = Math.min(1, (y - debut) / 20);
    return 0.34 * bord * raies * entree * (1 - s * 0.7);
  }

  function eclairerLune(sol) {
    const f = geo.fenetre;
    const milieu = (f.haut + f.bas) / 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        let l = 0.05; // un peu de lune partout : la pièce baigne dans le bleu
        if (couche[i] === MUR) {
          const d = Math.hypot((x - f.cx) / (f.demi * 3.4), (y - milieu) / ((f.bas - f.haut) * 0.95));
          l += 0.42 * Math.max(0, 1 - d) ** 1.4;
        } else if (couche[i] === SOL) {
          // Quel point de la fenêtre éclaire ce point du sol ?
          const t = (y - sol) / (H - sol);
          const centre = f.cx + 62 + t * (f.piedX - f.cx - 62), ech = 0.9 + t * 0.9;
          const wx = f.cx + (x - centre) / ech, wy = f.bas - t * (f.bas - f.haut);
          if (dansOgive(wx, wy, f.cx, f.demi, f.haut, f.bas)) {
            const dx = wx - f.cx;
            const plomb = Math.abs(dx) < 0.7 ||
              (wy > f.haut + f.hArc && modulo(wy - f.haut - f.hArc, 16) < 1.3) ||
              modulo(dx + wy, 7) < 1.1 || modulo(dx - wy, 7) < 1.1;
            l += (plomb ? 0.2 : 1) * (1 - t * 0.3);
          } else {
            // pénombre douce autour de la tache
            l += 0.14 * Math.max(0, 1 - Math.abs(x - centre) / (f.demi * ech * 2.4));
          }
        }
        const b = faisceauEn(x, y);
        brume[i] = b;
        if (couche[i] === 0) l += b * 1.6;
        lune[i] = l;
      }
    }
    // Grains de poussière dans le rayon
    poussieres = [];
    for (let k = 0; k < 22; k++) poussieres.push(nouvellePoussiere(true));
  }

  function nouvellePoussiere(partout) {
    const f = geo.fenetre;
    const y = partout ? f.bas - 30 + Math.random() * (H - f.bas + 30) : f.bas - 30 + Math.random() * 10;
    const s = (y - f.haut) / (H - f.haut);
    const g = f.cx - f.demi + s * (f.piedX - f.piedDemi - (f.cx - f.demi));
    const d = f.cx + f.demi + s * (f.piedX + f.piedDemi - (f.cx + f.demi));
    return { x: g + Math.random() * (d - g), y, vx: (Math.random() - 0.3) * 0.12, vy: 0.05 + Math.random() * 0.12 };
  }

  // Tapisserie verte bordée d'or, croissant brodé, suspendue à une tringle
  function dessinerTapisserie(sol) {
    const cx = Math.round(L * 0.84);
    const demi = Math.min(18, Math.round(L * 0.06));
    const haut = Math.max(10, sol - Math.round(H * 0.58)), bas = sol - 30;
    geo.tapisserie = { cx, demi };
    for (let y = haut; y <= bas + 4; y++) {
      for (let x = cx - demi; x <= cx + demi; x++) {
        const dx = Math.abs(x - cx);
        // Bas en pointes
        if (y > bas && y - bas > 4 - (dx % 6) * 0.8) continue;
        const pli = 0.45 + 0.12 * Math.sin((x - cx) * 0.9) + hasard(x, y) * 0.05;
        const bord = dx >= demi - 2 || y <= haut + 2 || y >= bas + 1;
        poser(x, y, bord ? "laiton" : "tissuV", bord ? 0.55 + (dx === demi ? -0.2 : 0) : pli);
      }
    }
    // Croissant et étoiles brodés
    const ey = Math.round((haut + bas) / 2) - 4;
    for (let y = ey - 7; y <= ey + 7; y++) {
      for (let x = cx - 7; x <= cx + 7; x++) {
        if (Math.hypot(x - cx, y - ey) <= 6 && Math.hypot(x - cx - 3, y - ey + 1) > 5) poser(x, y, "laiton", 0.85);
      }
    }
    for (const [dx, dy] of [[-6, -9], [7, -6], [-8, 7], [5, 9]]) poser(cx + dx, ey + dy, "laiton", 0.9);
    // Tringle et embouts
    rect(cx - demi - 4, haut - 2, cx + demi + 4, haut - 1, "fer", 0.55);
    rect(cx - demi - 6, haut - 3, cx - demi - 4, haut, "fer", 0.7);
    rect(cx + demi + 4, haut - 3, cx + demi + 6, haut, "fer", 0.7);
  }

  // Grande bibliothèque : corniche, étagères chargées de livres et de bibelots
  function dessinerBibliotheque(sol) {
    const x0 = Math.max(4, Math.round(L * 0.04));
    const largeur = Math.min(72, Math.max(46, Math.round(L * 0.21)));
    const x1 = x0 + largeur;
    geo.biblio = { x0, x1 };
    const haut = Math.max(30, sol - Math.min(150, Math.round(H * 0.66))); // place pour la bougie au-dessus
    const bas = sol + 3;
    // Fond, montants, corniche, socle
    rect(x0, haut, x1, bas, "bois", (x, y) => 0.16 + hasard(x, y * 2) * 0.04);
    rect(x0 - 2, haut - 6, x1 + 2, haut, "bois", (x, y) => (y === haut - 6 ? 0.8 : y === haut - 5 ? 0.6 : y === haut ? 0.25 : 0.48));
    rect(x0, bas - 6, x1, bas, "bois", (x, y) => (y === bas - 6 ? 0.7 : 0.4));
    rect(x0, haut, x0 + 3, bas, "bois", (x) => (x === x0 ? 0.7 : 0.5));
    rect(x1 - 3, haut, x1, bas, "bois", (x) => (x === x1 ? 0.25 : 0.42));

    // Étagères tous les ~24 px, livres dessus
    const ECART = 24;
    const couleurs = ["livreR", "livreV", "livreB", "livreO"];
    let n = 0, cranes = 0;
    for (let planche = haut + ECART; planche <= bas - 8; planche += ECART) {
      rect(x0 + 4, planche, x1 - 4, planche + 2, "bois", (x, y) => (y === planche ? 0.75 : y === planche + 1 ? 0.55 : 0.22));
      let x = x0 + 5;
      while (x < x1 - 6) {
        const r = hasard(x * 3.1, planche);
        n++;
        if (r < 0.07) { x += 4; continue; } // un trou
        if (r < 0.13 && x + 7 < x1 - 5) {
          // Un seul petit crâne entre les livres ; ailleurs, des fioles
          if (cranes++ === 0) {
            sprite(CRANE, x, planche - CRANE.length, LEGENDE_CRANE);
            x += 9;
          } else {
            const fiole = ["livreV", "livreR", "livreB"][cranes % 3];
            sprite(FIOLE, x, planche - FIOLE.length, { b: ["bois", 0.6], v: ["vitre", 0.55], l: [fiole, 0.75] });
            x += 7;
          }
          continue;
        }
        if (r < 0.2 && x + 14 < x1 - 5) {
          // Pile de livres couchés
          for (let k = 0; k < 3; k++) {
            const c = couleurs[(n + k) % 4], w = 12 - k * 2;
            rect(x + k, planche - 3 * (k + 1), x + k + w, planche - 3 * k - 1, c, (xx, yy) => (yy === planche - 3 * (k + 1) ? 0.75 : 0.5));
          }
          x += 15;
          continue;
        }
        // Livre debout
        const w = 3 + Math.floor(hasard(x, planche * 1.3) * 4);
        const h = ECART - 4 - Math.floor(hasard(planche, x * 0.7) * 8);
        const c = couleurs[Math.floor(hasard(x * 0.9, planche * 2.1) * 4)];
        const top = planche - h;
        for (let yy = top; yy < planche; yy++) {
          for (let xx = x; xx < x + w && xx < x1 - 4; xx++) {
            let v = 0.5 + hasard(xx, yy) * 0.06;
            if (xx === x) v = 0.7;
            if (xx === x + w - 1) v = 0.28;
            if (yy === top + 2 || yy === planche - 3) { poser(xx, yy, "laiton", 0.65); continue; }
            poser(xx, yy, c, v);
          }
        }
        x += w + (hasard(x, 9) < 0.3 ? 1 : 0);
      }
    }
    // Sur la corniche : une bougie et deux livres
    const bx = x1 - 12;
    bougie(bx, haut - 7, 9, 52);
    rect(x0 + 4, haut - 10, x0 + 18, haut - 7, "livreR", (x, y) => (y === haut - 10 ? 0.75 : 0.5));
    rect(x0 + 6, haut - 13, x0 + 16, haut - 11, "livreB", (x, y) => (y === haut - 13 ? 0.75 : 0.5));
  }

  // Coffre bardé de fer, au pied du mur de droite
  function dessinerCoffre(sol) {
    const x0 = Math.round(L * 0.8), x1 = x0 + 28, bas = sol + 8, haut = bas - 16;
    geo.coffre = { x0, x1 };
    rect(x0, haut, x1, bas, "bois", (x, y) => {
      if (y === haut) return 0.75;
      if (y < haut + 5) return 0.55 - (y - haut) * 0.04;
      if (y === haut + 5) return 0.15;
      return 0.42 + hasard(x, y) * 0.05 - (x === x1 ? 0.2 : 0);
    });
    for (const bx of [x0 + 3, x1 - 4]) rect(bx, haut, bx + 1, bas, "fer", 0.55);
    rect(x0 + 12, haut + 4, x1 - 12, haut + 8, "laiton", (x, y) => (y === haut + 6 && x === x0 + 14 ? 0.1 : 0.7));
    rect(x0, bas + 1, x1, bas + 1, "bois", 0.08); // ombre au sol
  }

  // Tapis rouge à motifs, sous le bureau
  function dessinerTapis(sol) {
    const cx = Math.round(L * 0.5), demi = Math.min(100, Math.round(L * 0.36));
    const haut = sol + 12, bas = H - 4;
    coucheActive = SOL;
    for (let y = haut; y <= bas; y++) {
      const d = demi - (bas - y) * 0.25; // un peu de perspective
      for (let x = Math.round(cx - d); x <= cx + d; x++) {
        const bx = Math.min(x - (cx - d), cx + d - x), by = Math.min(y - haut, bas - y);
        const b = Math.min(bx, by * 2);
        let v = 0.45 + hasard(x, y) * 0.06;
        if (b < 1) v = 0.25;
        else if (b < 3) v = 0.75;
        else if (b < 4) v = 0.2;
        else if ((Math.abs(x - cx) + Math.abs(y - (haut + bas) / 2) * 2) % 10 < 1.2) v = 0.72; // losanges
        poser(x, y, b >= 1 && b < 3 ? "laiton" : "tapis", v);
      }
    }
    coucheActive = 0;
  }

  /* ---------- Le coin labo ---------- */
  // Bocal : couvercle de liège, potion qui luit, un spécimen dedans
  const BOCAL = [".ccccc.", "vvvvvvv", "v.....v", "vppsppv", "vpssspv", "vppsppv", "vpppppv", ".vvvvv."];
  const LEGENDE_BOCAL = { c: ["bois", 0.6], v: ["verre", 0.6], p: ["potion", 0.62], s: ["potion", 0.25] };
  const SABLIER = ["bbbbb", ".vpv.", "..p..", "..v..", ".v.v.", ".ppp.", "bbbbb"];
  const LEGENDE_SABLIER = { b: ["bois", 0.6], v: ["verre", 0.6], p: ["parchemin", 0.8] };
  const MORTIER = ["....b.", "...b..", "oooooo", ".oooo."];
  const LEGENDE_MORTIER = { b: ["bois", 0.65], o: ["pierre", 0.75] };
  const HERBES = ["..f..", ".fhf.", ".hHh.", "hhHhh", "hHhHh", "h.H.h", "h.h.h", "..h.."];

  // Flambeaux de chaque côté de la fenêtre : support de fer scellé au mur,
  // manche de bois, tête enveloppée de chiffon, grande flamme
  const FLAMBEAU = [".rrr.", "rRrRr", ".rrr.", "fffff", ".fhf.", "..h..", "..h..", "..h..", ".fff.", "..f..", ".fff."];
  const LEGENDE_FLAMBEAU = { r: ["livreO", 0.35], R: ["livreO", 0.55], f: ["fer", 0.6], h: ["bois", 0.55] };
  function dessinerFlambeaux() {
    const f = geo.fenetre;
    const y = Math.round(f.bas - Math.min(46, (f.bas - f.haut) * 0.45));
    for (const x of [f.cx - f.demi - 11, f.cx + f.demi + 11]) {
      sprite(FLAMBEAU, x - 2, y, LEGENDE_FLAMBEAU);
      bougies.push({ x, y: y - 3, rayon: 70, intensite: 1, image: 0, grande: true });
    }
  }

  // Poutre au plafond, avec des bottes d'herbes qui sèchent
  function dessinerPoutre() {
    rect(0, 0, L - 1, 4, "bois", (x, y) => (y === 4 ? 0.15 : y === 3 ? 0.6 : 0.4 + hasard(Math.floor(x / 30), 1) * 0.08));
    const f = geo.fenetre;
    const places = [geo.biblio.x1 + 14, f.cx - f.demi - 18, f.cx + f.demi + 18, f.cx + f.demi + 30];
    places.forEach((x, k) => {
      if (x < 4 || x > L - 6 || Math.abs(x - f.cx) < f.demi + 8) return;
      const long = 3 + (k % 2) * 5;
      rect(x, 5, x, 5 + long, "fer", 0.45); // ficelle
      const herbe = k % 2 ? "livreO" : "tissuV";
      sprite(HERBES, x - 2, 6 + long, { h: [herbe, 0.55], H: [herbe, 0.8], f: ["livreR", 0.5] });
    });
  }

  // Étagère murale entre la bibliothèque et la fenêtre : bocaux, sablier,
  // mortier, et des notes épinglées au-dessus
  function dessinerEtagere(sol) {
    const a = geo.biblio.x1 + 8, b = geo.fenetre.cx - geo.fenetre.demi - 12;
    if (b - a < 28) return;
    // Notes épinglées
    const notes = [[a + 3, sol - 90, 10, 13], [a + 15, sol - 84, 11, 12]];
    for (const [nx, ny, w, h] of notes) {
      if (nx + w > b) continue;
      rect(nx, ny, nx + w, ny + h, "parchemin", (x, y) => {
        if (y === ny) return 0.62;
        if (x === nx + w || y === ny + h) return 0.3;
        // lignes d'écriture
        if (y > ny + 2 && y % 2 === 0 && x > nx + 1 && x < nx + w - 1 && hasard(x, y) > 0.3) return 0.25;
        return 0.5;
      });
      poser(nx + Math.round(w / 2), ny + 1, "livreR", 0.8); // punaise
    }
    // Deux planches sur équerres
    const p1 = sol - 52, p2 = sol - 30;
    for (const y of [p1, p2]) {
      rect(a, y, b, y + 1, "bois", (x, yy) => (yy === y ? 0.75 : 0.35));
      for (const px of [a + 2, b - 4]) {
        for (let k = 0; k < 3; k++) rect(px, y + 2 + k, px + 2 - k, y + 2 + k, "bois", 0.3);
      }
    }
    // Planche du haut : bocal à spécimen, fiole, sablier, mortier
    sprite(BOCAL, a + 2, p1 - BOCAL.length, LEGENDE_BOCAL);
    lueurs.push({ x: a + 5, y: p1 - 4, rayon: 26, intensite: 1, phase: 0 });
    sprite(FIOLE, a + 11, p1 - FIOLE.length, { b: ["bois", 0.6], v: ["verre", 0.65], l: ["livreR", 0.75] });
    if (a + 24 < b) sprite(SABLIER, a + 18, p1 - SABLIER.length, LEGENDE_SABLIER);
    if (a + 31 < b) sprite(MORTIER, a + 25, p1 - MORTIER.length, LEGENDE_MORTIER);
    // Planche du bas : livres couchés, bougie, rouleaux
    rect(a + 2, p2 - 3, a + 14, p2 - 1, "livreV", (x, y) => (y === p2 - 3 ? 0.75 : 0.5));
    rect(a + 3, p2 - 6, a + 12, p2 - 4, "livreO", (x, y) => (y === p2 - 6 ? 0.75 : 0.5));
    bougie(a + 19, p2 - 1, 6, 34);
    if (a + 30 < b) {
      for (const [rx, ry] of [[a + 24, p2 - 3], [a + 26, p2 - 6]]) {
        rect(rx, ry, rx + 8, ry + 2, "parchemin", (x, y) => (y === ry ? 0.85 : y === ry + 2 ? 0.45 : 0.68));
        poser(rx + 8, ry + 1, "parchemin", 0.35);
      }
    }
  }

  // Paillasse d'alchimiste entre la fenêtre et la tapisserie : alambic qui
  // bouillonne sur un brûleur, éprouvettes, bocal ; un cercle de transmutation
  // est épinglé au mur au-dessus
  function dessinerPaillasse(sol) {
    const f = geo.fenetre, t = geo.tapisserie;
    const a = f.cx + f.demi + 12, b = t.cx - t.demi - 8;
    if (b - a < 36) return;
    const top = sol - 12;

    // Planche du cercle de transmutation
    const dc = Math.round((a + b) / 2), dy = sol - 64, r = 10;
    rect(dc - r - 3, dy - r - 3, dc + r + 3, dy + r + 3, "bois", (x, y) => (y === dy - r - 3 || x === dc - r - 3 ? 0.6 : 0.35));
    rect(dc - r - 1, dy - r - 1, dc + r + 1, dy + r + 1, "parchemin", (x, y) => 0.62 + hasard(x, y) * 0.08);
    for (let y = dy - r; y <= dy + r; y++) {
      for (let x = dc - r; x <= dc + r; x++) {
        const d = Math.hypot(x - dc, y - dy);
        if (Math.abs(d - (r - 0.5)) < 0.55 || Math.abs(d - 3.5) < 0.5) poser(x, y, "livreR", 0.5);
      }
    }
    const coin = (ang) => [dc + Math.cos(ang) * (r - 1), dy + Math.sin(ang) * (r - 1)];
    const [A, B, C] = [-90, 30, 150].map((d) => coin((d * Math.PI) / 180));
    ligne(A[0], A[1], B[0], B[1], "livreR", 0.5);
    ligne(B[0], B[1], C[0], C[1], "livreR", 0.5);
    ligne(C[0], C[1], A[0], A[1], "livreR", 0.5);
    poser(dc, dy - r - 2, "laiton", 0.9); // clou

    // Table : plateau, pieds, traverse
    rect(a, top, b, top + 2, "bois", (x, y) => (y === top ? 0.75 : y === top + 1 ? 0.5 : 0.2));
    for (const px of [a + 1, b - 3]) rect(px, top + 3, px + 2, sol + 3, "bois", (x) => (x === px ? 0.55 : 0.3));
    rect(a + 3, sol - 3, b - 3, sol - 2, "bois", 0.3);

    // Alambic : ballon sur un trépied, tube vers une petite fiole
    const fx = a + 8, fy = top - 11, fr = 5;
    for (let y = fy - fr; y <= fy + fr; y++) {
      for (let x = fx - fr; x <= fx + fr; x++) {
        const d = Math.hypot(x - fx, y - fy);
        if (d > fr + 0.3) continue;
        if (d > fr - 0.8) poser(x, y, "verre", x < fx ? 0.75 : 0.45);
        else if (y >= fy - 1) poser(x, y, "potion", y === fy - 1 ? 0.85 : 0.6);
        else poser(x, y, "verre", 0.2);
      }
    }
    poser(fx - 2, fy - 2, "verre", 0.95); // reflet
    rect(fx, fy - fr - 6, fx + 1, fy - fr, "verre", (x) => (x === fx ? 0.7 : 0.45));
    ligne(fx + 1, fy - fr - 6, fx + 15, top - 8, "verre", 0.6);
    sprite(FIOLE, fx + 14, top - FIOLE.length, { b: ["bois", 0.6], v: ["verre", 0.65], l: ["potion", 0.6] });
    geo.ballon = { x: fx, y: fy, r: fr };
    for (let k = 0; k < 4; k++) bulles.push({ x: fx - 2 + (k % 3) * 2, y: fy + fr - 1 - k });
    lueurs.push({ x: fx, y: fy, rayon: 44, intensite: 1, phase: 1.7 });
    // Trépied et brûleur
    rect(fx - 4, fy + fr + 1, fx + 4, fy + fr + 1, "fer", 0.6);
    ligne(fx - 4, fy + fr + 1, fx - 5, top - 1, "fer", 0.45);
    ligne(fx + 4, fy + fr + 1, fx + 5, top - 1, "fer", 0.45);
    rect(fx - 1, top - 2, fx + 1, top - 1, "laiton", (x, y) => (y === top - 2 ? 0.75 : 0.45));
    flamme(fx, top - 4, 30);

    // Porte-éprouvettes
    const px = b - 19;
    if (px > fx + 22) {
      ["livreR", "potion", "livreB", "livreO"].forEach((c, k) => {
        const tx = px + 2 + k * 2;
        rect(tx, top - 9, tx, top - 1, "verre", 0.55);
        rect(tx, top - 5 + (k % 2), tx, top - 2, c, 0.7);
      });
      rect(px, top - 6, px + 10, top - 6, "bois", 0.6);
      rect(px, top - 2, px + 10, top - 1, "bois", (x, y) => (y === top - 2 ? 0.65 : 0.4));
    }
    // Bocal au bout de la table
    sprite(BOCAL, b - 8, top - BOCAL.length, { ...LEGENDE_BOCAL, p: ["livreR", 0.55], s: ["livreR", 0.25] });
  }

  // Fauteuil à haut dossier gothique, derrière le bureau
  function dessinerFauteuil(sol) {
    const cx = Math.round(L * 0.5);
    const demi = 11, haut = sol - 38, bas = sol + 8;
    for (let y = haut; y <= bas; y++) {
      for (let x = cx - demi; x <= cx + demi; x++) {
        if (!dansOgive(x, y, cx, demi - 2, haut + 3, bas)) continue;
        if (!dansOgive(x, y, cx, demi - 4, haut + 6, bas)) {
          // cadre de bois sculpté, éclairé par la gauche
          poser(x, y, "bois", x < cx ? 0.6 : 0.4);
          continue;
        }
        // velours capitonné : losanges et boutons de laiton
        const u = x - cx, w = y - haut;
        const d = modulo(u + w, 6), e = modulo(w - u, 6);
        if (d === 0 && e === 0) poser(x, y, "laiton", 0.75);
        else poser(x, y, "tapis", d === 0 || e === 0 ? 0.3 : 0.55 - Math.abs(u) * 0.015);
      }
    }
    // Montants et pommeaux
    for (const px of [cx - demi, cx + demi - 2]) {
      rect(px, haut + 8, px + 2, bas, "bois", (x) => (x === px ? 0.62 : x === px + 2 ? 0.25 : 0.45));
      sprite([".o.", "ooo", ".o."], px, haut + 4, { o: ["laiton", 0.75] });
      rect(px, haut + 7, px + 2, haut + 7, "bois", 0.7);
    }
  }

  // Globe terrestre sur pied, au sol à gauche du bureau
  function dessinerGlobe(sol) {
    const gx = geo.bureau.x0 - 14, gy = sol + 13, r = 6;
    if (gx - r - 3 < geo.biblio.x0) return;
    rect(gx - 4, gy + 15, gx + 4, gy + 16, "bois", (x, y) => (y === gy + 15 ? 0.6 : 0.3));
    rect(gx, gy + r + 2, gx, gy + 14, "bois", 0.5);
    for (let y = gy - r; y <= gy + r; y++) {
      for (let x = gx - r; x <= gx + r; x++) {
        const dx = x - gx, dy = y - gy;
        if (Math.hypot(dx, dy) > r + 0.2) continue;
        const terre = hasard(Math.floor((x + 40) / 3), Math.floor(y / 3)) < 0.4;
        poser(x, y, terre ? "livreO" : "livreB", 0.5 - (dx + dy) * 0.03);
      }
    }
    // Méridien en laiton
    for (let a = 0; a < 360; a += 6) {
      const rad = (a * Math.PI) / 180;
      if (Math.cos(rad) > 0.2) continue;
      poser(gx + Math.cos(rad) * (r + 1.6), gy + Math.sin(rad) * (r + 1.6), "laiton", 0.7);
    }
    // Feuilles tombées par terre
    rect(gx + 6, gy + 13, gx + 14, gy + 15, "parchemin", (x, y) => (y === gy + 13 ? 0.75 : 0.55));
    rect(gx - 10, gy + 10, gx - 3, gy + 12, "parchemin", (x, y) => (y === gy + 10 ? 0.7 : 0.5));
  }

  // Pile de vieux livres posée par terre devant la bibliothèque, une bougie dessus
  function dessinerPileAuSol(sol) {
    const x = geo.biblio.x0 + 6, base = sol + 30;
    if (x + 18 > geo.bureau.x0 - 22) return;
    [["livreB", 16], ["livreR", 14], ["livreO", 12], ["livreV", 13]].forEach(([c, w], k) => {
      const y1 = base - k * 4, y0 = y1 - 3, a = x + (k % 2);
      rect(a, y0, a + w, y1, c, (xx, yy) => (yy === y0 ? 0.75 : xx === a + w ? 0.25 : 0.5));
      rect(a + w - 1, y0 + 1, a + w - 1, y1 - 1, "parchemin", 0.7);
    });
    bougie(x + 6, base - 16, 5, 40);
  }

  /* ---------- Le bureau et ce qu'il y a dessus ---------- */
  const CRANE = [".ooooo.", "ooooooo", "okkokko", "ooooooo", ".oo.oo.", ".o.o.o."];
  const LEGENDE_CRANE = { o: ["os", 0.7], k: ["vide", 0] };
  // Fiole : bouchon, col, panse de verre remplie de potion
  const FIOLE = ["..b..", "..v..", ".vlv.", "vlllv", "vlllv", ".vvv."];
  const PLUME = [".....w", "....ww", "...ww.", "..ww..", ".ww...", "w....."];

  function dessinerBureau(sol) {
    const cx = Math.round(L * 0.5);
    const largeur = Math.min(150, Math.round(L * 0.56));
    const x0 = cx - Math.round(largeur / 2), x1 = x0 + largeur;
    const yt = sol + 6;          // arrière du plateau
    const yf = yt + 9;           // bord avant du plateau
    const yb = yf + 24;          // bas du caisson
    geo.bureau = { x0, x1, yt, yf, yb, cx };

    // Plateau vu un peu du dessus, veiné ; chant avant clair
    rect(x0, yt, x1, yf, "boisClair", (x, y) => {
      if (y === yf) return 0.9;
      if (y === yf - 1) return 0.7;
      return 0.45 + 0.08 * Math.sin(x * 0.35 + y * 1.7) + hasard(x, y) * 0.05;
    }, true);
    // Caisson : tiroirs de chaque côté, niche au milieu, moulures
    rect(x0 + 2, yf + 1, x1 - 2, yb, "bois", (x, y) => (y === yf + 1 ? 0.2 : 0.42 + hasard(x, y) * 0.04), true);
    const niche0 = cx - Math.round(largeur * 0.18), niche1 = cx + Math.round(largeur * 0.18);
    rect(niche0, yf + 7, niche1, yb, "bois", (x, y) => (y === yf + 7 ? 0.3 : 0.1), true);
    for (const [a, b] of [[x0 + 5, niche0 - 4], [niche1 + 4, x1 - 5]]) {
      for (const [h0, h1] of [[yf + 3, yf + 11], [yf + 13, yb - 3]]) {
        rect(a, h0, b, h1, "bois", (x, y) => (y === h0 || x === a ? 0.62 : y === h1 || x === b ? 0.2 : 0.47), true);
        const m = Math.round((a + b) / 2), hy = Math.round((h0 + h1) / 2);
        rect(m - 2, hy, m + 2, hy, "laiton", 0.75, true);
        poser(m, hy + 1, "laiton", 0.4, true);
      }
    }
    // Pieds tournés
    for (const px of [x0 + 2, x1 - 6]) {
      rect(px, yb + 1, px + 4, yb + 6, "bois", (x) => (x === px ? 0.6 : 0.38), true);
      rect(px + 1, yb + 7, px + 3, yb + 8, "bois", 0.3, true);
    }

    // --- Objets posés sur le plateau (leur base est vers yt + 6) ---
    const base = yt + 6;
    // Pile de livres à gauche
    const piles = [["livreR", 24], ["livreB", 21], ["livreV", 18]];
    piles.forEach(([c, w], k) => {
      const y1 = base - k * 4, y0 = y1 - 3, a = x0 + 4 + k * 2;
      rect(a, y0, a + w, y1, c, (x, y) => (y === y0 ? 0.75 : x === a + w ? 0.25 : 0.5), true);
      rect(a + w - 1, y0 + 1, a + w - 1, y1 - 1, "parchemin", 0.7, true); // tranche des pages
    });
    // Bougie sur la pile
    bougie(x0 + 14, base - 12, 8, 60, true);
    // Grand chandelier en laiton
    const chx = x0 + Math.round(largeur * 0.3);
    rect(chx - 3, base - 1, chx + 3, base, "laiton", (x, y) => (y === base - 1 ? 0.8 : 0.45), true);
    rect(chx, base - 9, chx, base - 2, "laiton", 0.7, true);
    rect(chx - 2, base - 10, chx + 2, base - 10, "laiton", 0.8, true);
    bougie(chx, base - 11, 14, 75, true);

    // Livre ouvert au milieu
    const lx = cx - 20;
    for (let y = base - 7; y <= base; y++) {
      for (let x = lx; x <= lx + 40; x++) {
        const m = x - (lx + 20);
        const courbe = Math.round(Math.abs(m) < 2 ? 1 : 0);
        if (y < base - 7 + courbe) continue;
        if (y === base) { poser(x, y, "livreR", 0.4, true); continue; } // couverture sous les pages
        let v = 0.78 - (Math.abs(m) < 2 ? 0.25 : 0) + hasard(x, y) * 0.04;
        if (y > base - 6 && y < base - 1 && Math.abs(m) > 3 && Math.abs(m) < 18 && (y + (m > 0 ? 1 : 0)) % 2 === 0 && hasard(x, y * 3) > 0.25) v = 0.45; // lignes d'écriture
        poser(x, y, "parchemin", v, true);
      }
    }
    // Feuilles éparses sous le livre
    rect(cx + 18, base - 3, cx + 34, base + 1, "parchemin", (x, y) => (y === base - 3 ? 0.85 : 0.68 - ((x + y) % 4 === 0 ? 0.15 : 0)), true);
    rect(cx - 34, base - 2, cx - 22, base + 2, "parchemin", (x, y) => (y === base - 2 ? 0.8 : 0.62), true);

    // Encrier et plume
    const ex = x1 - Math.round(largeur * 0.3);
    rect(ex - 2, base - 4, ex + 2, base, "fer", (x, y) => (y === base - 4 ? 0.7 : x === ex - 2 ? 0.55 : 0.35), true);
    sprite(PLUME, ex + 1, base - 10, { w: ["cire", 0.85] }, true);

    // Parchemin roulé, noué d'un ruban rouge
    const rx = x1 - Math.round(largeur * 0.22);
    rect(rx, base - 4, rx + 16, base - 1, "parchemin", (x, y) => (y === base - 4 ? 0.85 : y === base - 1 ? 0.45 : 0.68), true);
    rect(rx + 16, base - 4, rx + 17, base - 1, "parchemin", (x, y) => (y === base - 3 ? 0.35 : 0.6), true);
    rect(rx + 7, base - 4, rx + 8, base - 1, "livreR", 0.6, true);
    poser(rx + 9, base, "livreR", 0.5, true);

    // Crâne surmonté d'une bougie, à droite
    const kx = x1 - 12;
    sprite(CRANE, kx - 3, base - 6, LEGENDE_CRANE, true);
    rect(kx - 2, base - 7, kx + 2, base - 7, "cire", 0.75, true); // cire coulée
    bougie(kx, base - 8, 6, 50, true);
  }

  // Bougie : cire de hauteur h posée en (x, base), flamme au-dessus, source de lumière
  function bougie(x, base, h, rayon, surBureau) {
    rect(x - 1, base - h + 1, x + 1, base, "cire", (xx, y) => (xx === x - 1 ? 0.85 : xx === x + 1 ? 0.5 : 0.7), surBureau);
    poser(x + 2, base - h + 3, "cire", 0.7, surBureau); // une coulure
    poser(x, base - h, "fer", 0.3, surBureau);          // mèche
    flamme(x, base - h - 2, rayon);
  }
  // Flamme seule (bougie, brûleur) : dessinée par-dessus, centrée en (x, y)
  function flamme(x, y, rayon) {
    bougies.push({ x, y, rayon, intensite: 1, image: 0 });
  }

  // Bouton HTML posé sur le bureau (en %), et zoom de caméra vers lui
  function placerZoneBureau() {
    let ax = L, ay = H, bx = 0, by = 0;
    for (let i = 0; i < L * H; i++) {
      if (!masque[i]) continue;
      const x = i % L, y = (i - x) / L;
      ax = Math.min(ax, x); ay = Math.min(ay, y); bx = Math.max(bx, x); by = Math.max(by, y);
    }
    const pct = (v, t) => `${(v / t) * 100}%`;
    const s = el.piece.style;
    s.setProperty("--objet-gauche", pct(ax, L));
    s.setProperty("--objet-haut", pct(ay, H));
    s.setProperty("--objet-largeur", pct(bx - ax + 1, L));
    s.setProperty("--objet-hauteur", pct(by - ay + 1, H));
    s.setProperty("--objet-x", pct((ax + bx) / 2, L));
    s.setProperty("--objet-y", pct((ay + by) / 2, H));
    s.setProperty("--objet-zoom", String(Math.min(2.6, (L * 0.8) / (bx - ax), (H * 0.6) / (by - ay)).toFixed(2)));
  }

  /* ---------- Rendu : éclairage des bougies + tramage ---------- */
  let vertIci = 0; // part verte (potions) de la dernière lumière calculée
  function lumiereEn(x, y) {
    let l = 0.12;
    for (const b of bougies) {
      const dx = x - b.x, dy = y - b.y;
      const r = b.rayon * b.intensite;
      if (dx > r || dx < -r || dy > r || dy < -r) continue;
      const f = 1 - Math.hypot(dx, dy) / r;
      if (f > 0) l += f ** 1.4 * 0.95;
    }
    vertIci = 0;
    for (const g of lueurs) {
      const dx = x - g.x, dy = y - g.y;
      const r = g.rayon;
      if (dx > r || dx < -r || dy > r || dy < -r) continue;
      const f = 1 - Math.hypot(dx, dy) / r;
      if (f > 0) vertIci += f ** 1.6 * 0.55 * g.intensite;
    }
    return Math.min(1.3, l);
  }

  function dessiner() {
    const px = image.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x, m = mat[i];
        const emissif = EMISSIF.has(m);
        const chaud = emissif ? 1 : lumiereEn(x, y);
        const vert = emissif ? 0 : vertIci;
        const bleu = emissif ? 0 : lune[i];
        const l = chaud + vert + bleu;
        const v = Math.max(0, Math.min(1, val[i] * l));
        const f = v * 5;
        let c = Math.floor(f);
        if (f - c > BAYER[(y % 4) * 4 + (x % 4)]) c++;
        let [r, g, b] = COULEURS[m][Math.min(c, 5)];
        // Teinte selon d'où vient la lumière : orangé du feu, bleu de lune, vert des potions
        if (chaud > 0.2 && !emissif) {
          const k = Math.min(1, (chaud - 0.12) / l) * 0.6;
          r = Math.min(255, r * (1 + 0.35 * k) + 10 * k); g *= 1 + 0.05 * k; b *= 1 - 0.35 * k;
        }
        if (bleu > 0.01) {
          const k = (bleu / l) * Math.min(1, bleu * 2.5);
          r *= 1 - 0.45 * k; g *= 1 - 0.1 * k; b = b * (1 + 0.35 * k) + 22 * k;
        }
        if (vert > 0.01) {
          const k = vert / l;
          r *= 1 - 0.5 * k; g = g * (1 + 0.3 * k) + 14 * k; b *= 1 - 0.15 * k;
        }
        // Brume du rayon de lune, ajoutée par-dessus
        const h = brume[i];
        const j = i * 4;
        px[j] = Math.min(255, r + h * 70); px[j + 1] = Math.min(255, g + h * 95); px[j + 2] = Math.min(255, b + h * 150);
        px[j + 3] = 255;
      }
    }
    // Contour doré du bureau survolé (comme un objet interactif dans un jeu)
    if (survol) {
      const OR = [242, 202, 112];
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < L - 1; x++) {
          const i = y * L + x;
          if (masque[i]) continue;
          if (masque[i - 1] || masque[i + 1] || masque[i - L] || masque[i + L]) {
            const j = i * 4;
            px[j] = OR[0]; px[j + 1] = OR[1]; px[j + 2] = OR[2];
          }
        }
      }
    }
    // Poussière dans le rayon de lune
    for (const p of poussieres) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (!dans(x, y)) continue;
      const h = brume[y * L + x];
      if (h < 0.04) continue;
      const k = (y * L + x) * 4, a = Math.min(1, h * 4);
      px[k] += (205 - px[k]) * a; px[k + 1] += (220 - px[k + 1]) * a; px[k + 2] += (250 - px[k + 2]) * a;
    }
    // Bulles dans le ballon de l'alambic
    for (const u of bulles) {
      const x = Math.round(u.x), y = Math.round(u.y);
      if (!dans(x, y) || mat[y * L + x] !== IDX.potion) continue;
      const k = (y * L + x) * 4;
      px[k] = 200; px[k + 1] = 255; px[k + 2] = 210;
    }
    // Flammes
    for (const b of bougies) {
      const grande = b.grande ? 2 : 1; // flambeaux : flamme plus large, centrée pareil
      (b.grande ? GRANDES_FLAMMES : FLAMMES)[b.image].forEach((ligne, j) => {
        for (let i = 0; i < ligne.length; i++) {
          const c = COULEURS_FEU[ligne[i]];
          if (!c) continue;
          const x = b.x - grande + i, y = b.y - (b.grande ? 3 : 1) + j;
          if (!dans(x, y)) continue;
          const k = (y * L + x) * 4;
          px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
        }
      });
    }
    ctx.putImageData(image, 0, 0);
  }

  // Les flammes vacillent (~12 images/s, saccadé comme sur PC-98)
  setInterval(() => {
    if (!ouverte || document.hidden || mouvementReduit.matches) return;
    for (const b of bougies) {
      b.intensite += (0.9 + Math.random() * 0.2 - b.intensite) * 0.5;
      if (Math.random() < 0.5) b.image = Math.floor(Math.random() * FLAMMES.length);
    }
    // Les potions pulsent doucement
    const t = performance.now() / 1000;
    for (const g of lueurs) g.intensite = 0.85 + 0.15 * Math.sin(t * 1.6 + g.phase);
    // La poussière descend lentement dans le rayon
    poussieres.forEach((p, k) => {
      p.x += p.vx + Math.sin(t * 0.7 + k) * 0.05;
      p.y += p.vy;
      if (p.y >= H || faisceauEn(p.x, p.y) <= 0) poussieres[k] = nouvellePoussiere(false);
    });
    // Les bulles montent dans le ballon, puis repartent du fond
    const bal = geo.ballon;
    if (bal) {
      for (const u of bulles) {
        u.y -= 1;
        if (Math.random() < 0.3) u.x += Math.random() < 0.5 ? -1 : 1;
        if (u.y < bal.y - 1) { u.y = bal.y + bal.r - 1; u.x = bal.x - 2 + Math.floor(Math.random() * 5); }
      }
    }
    dessiner();
  }, 80);

  /* ---------- Icônes des documents (16 × 16) ---------- */
  const ICONES = {
    parchemin: [
      "................",
      "..kkkkkkkkkkkk..",
      ".kRRRRRRRRRRRRk.",
      ".krrrrrrrrrrrrk.",
      "..kPPPPPPPPPPk..",
      "..kPppppppPPPk..",
      "..kPPPPPPPPPPk..",
      "..kPpppppppPPk..",
      "..kPPPPPPPPPPk..",
      "..kPppppPPPPPk..",
      "..kPPPPPPPPPPk..",
      "..kPPPPPPPSPPk..",
      ".kRRRRRRRSsSRRk.",
      ".krrrrrrrrSrrrk.",
      "..kkkkkkkkkkkk..",
      "................",
    ],
    lettre: [
      "................",
      "................",
      "................",
      ".kkkkkkkkkkkkkk.",
      ".kpkPPPPPPPPkpk.",
      ".kPpkPPPPPPkpPk.",
      ".kPPpkPPPPkpPPk.",
      ".kPPPpkSSkpPPPk.",
      ".kPPPPSssSPPPPk.",
      ".kPPPPSssSPPPPk.",
      ".kPPPPPSSPPPPPk.",
      ".kpPPPPPPPPPPpk.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................",
      "................",
    ],
    carnet: [
      "................",
      "...kkkkkkkkkk...",
      "..kBBBBBBBBBBk..",
      "..kBbbbbbbbbBWk.",
      "..kBbBBBBBBbBWk.",
      "..kBbBGGGGBbBWk.",
      "..kBbBGBBGBbBWk.",
      "..kBbBGGGGBbBWk.",
      "..kBbBBBBBBbBWk.",
      "..kBbbbbbbbbBWk.",
      "..kbbbbbbbbbbGGk",
      "..kBBBBBBBBBBGGk",
      "..kBbbbbbbbbBWk.",
      "..kBBBBBBBBBBWk.",
      "...kkkkkkkkkkk..",
      "................",
    ],
    carte: [
      "................",
      ".kkkkkkkkkkkkkk.",
      ".kMMMMmMMMMmMMk.",
      ".kMvvmmMMMMmMMk.",
      ".kvvvvmMxMxmMMk.",
      ".kMvvMmMMxMmMMk.",
      ".kMMMMmMxMxmMMk.",
      ".kmmmmmmmmmmmmk.",
      ".kMMMMmMoMMmMMk.",
      ".kMoMMmMMoMmvvk.",
      ".kMMoMmMMMomvMk.",
      ".kMMMoooMMMmMMk.",
      ".kmmmmmmmmmmmmk.",
      ".kMMMMmMMMMmMMk.",
      ".kkkkkkkkkkkkkk.",
      "................",
    ],
    plan: [
      "................",
      ".kkkkkkkkkkkkkk.",
      ".kUUUUUUUUUUUUk.",
      ".kUuuuuuuuuUUUk.",
      ".kUuUUUUUUuUuUk.",
      ".kUuUuuuUUuUuUk.",
      ".kUuUuUuUUuUuUk.",
      ".kUuUuuuUUuUuUk.",
      ".kUuUUUUUUuUuUk.",
      ".kUuuuuuuuuUuUk.",
      ".kUUUUUUUUUUuUk.",
      ".kUuuuUUuuuuuUk.",
      ".kUUUUUUUUUUUUk.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................",
    ],
    grimoire: [
      "................",
      "..kkkkkkkkkkk...",
      ".kGBBBBBBBBBGk..",
      ".kBBBBBBBBBBBWk.",
      ".kBBBGGGGGBBBWk.",
      ".kBBGBBEBBGBBWk.",
      ".kBBGBEeEBGBBWk.",
      ".kBBGBBEBBGBBWk.",
      ".kBBBGGGGGBBBWk.",
      ".kBBBBBBBBBBGGGk",
      ".kBBBBBBBBBBBWk.",
      ".kGBBBBBBBBBGWk.",
      "..kkkkkkkkkkkWk.",
      "...kWWWWWWWWWk..",
      "....kkkkkkkkkk..",
      "................",
    ],
  };
  const COULEURS_ICONES = {
    k: "#1a1014", P: "#e6d4a3", p: "#b49a6c", R: "#d9c08a", r: "#8c6b42", S: "#b0303a", s: "#6e1820",
    B: "#6b2e2a", b: "#44191a", G: "#d9a441", W: "#e6d8b8", M: "#ddcc9f", m: "#a89468", v: "#5c8250",
    x: "#be2828", o: "#7a5032", U: "#2f5d8a", u: "#9cc3e6", E: "#4fa9be", e: "#c6f0fa",
  };

  function creerIcone(type) {
    const lignes = ICONES[type] || ICONES.parchemin;
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    c.className = "icone-document";
    c.setAttribute("aria-hidden", "true");
    const g = c.getContext("2d");
    lignes.forEach((ligne, y) => {
      for (let x = 0; x < ligne.length; x++) {
        const couleur = COULEURS_ICONES[ligne[x]];
        if (!couleur) continue;
        g.fillStyle = couleur;
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  /* ---------- Inventaire ----------
   * Plein écran façon menu de jeu : onglets (catégories) en haut, grille de
   * cases à gauche, le document en grand au centre, sa fiche à droite,
   * les touches en bas. */
  const NOMS_DOCUMENTS = {
    parchemin: "Parchemin", lettre: "Lettre scellée", carnet: "Carnet",
    carte: "Carte", plan: "Plans", grimoire: "Grimoire",
  };
  let choisi = 0;      // indice dans DONNEES.liste
  let filtre = "tous"; // "tous" ou une clé de DONNEES.categories
  let visibles = [];   // indices des projets de l'onglet affiché
  let inventaireOuvert = false;
  let minuterie = null;
  const duree = (ms) => (mouvementReduit.matches ? 0 : ms);

  const creer = (balise, classe, texte) => {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    if (texte != null) n.textContent = texte;
    return n;
  };
  const losange = () => creer("span", "fiche-losange");

  // Dernière année citée ("2023 – 2024" → 2024), pour trier
  function anneeDe(p) {
    const m = String(p.annee || "").match(/\d{4}/g);
    return m ? Number(m[m.length - 1]) : 0;
  }
  // Du plus récent au plus ancien (tri stable : l'ordre du fichier départage)
  const ORDRE = DONNEES.liste.map((p, k) => k).sort((a, b) => anneeDe(DONNEES.liste[b]) - anneeDe(DONNEES.liste[a]));

  /* Fond peint : coups de pinceau sombres, une lueur ambrée derrière le
   * document, puis tramage de Bayer, comme le reste de l'intro */
  const PINCEAU = [[46, 36, 24], [24, 32, 36], [58, 44, 26], [10, 10, 14], [34, 26, 34], [30, 34, 28]];
  function peindreToile() {
    const c = el.toile;
    const L2 = Math.ceil(innerWidth / 3);
    const H2 = Math.ceil(innerHeight / 3);
    c.width = L2;
    c.height = H2;
    const buf = new Float32Array(L2 * H2 * 3);
    for (let i = 0; i < L2 * H2; i++) buf.set([14, 13, 18], i * 3);

    const traits = Math.round((L2 * H2) / 500);
    for (let t = 0; t < traits; t++) {
      // Surtout des traits verticaux au centre, horizontaux sur les côtés
      const x0 = Math.random() * L2;
      const y0 = Math.random() * H2;
      const auCentre = Math.abs(x0 / L2 - 0.5) < 0.2;
      const angle = (auCentre || Math.random() < 0.3 ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.5;
      const long = 20 + Math.random() * (auCentre ? H2 * 0.6 : L2 * 0.25);
      const large = 3 + Math.random() * 10;
      const force = 0.15 + Math.random() * 0.35;
      const couleur = PINCEAU[Math.floor(Math.random() * PINCEAU.length)];
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const r = Math.ceil(long / 2 + large);
      for (let y = Math.max(0, Math.floor(y0 - r)); y < Math.min(H2, y0 + r); y++) {
        for (let x = Math.max(0, Math.floor(x0 - r)); x < Math.min(L2, x0 + r); x++) {
          const u = (x - x0) * ca + (y - y0) * sa;   // le long du trait
          const v = -(x - x0) * sa + (y - y0) * ca;  // en travers
          if (Math.abs(u) > long / 2 || Math.abs(v) > large / 2) continue;
          // Poils du pinceau : chaque rangée en travers a sa propre charge
          const poil = 0.4 + 0.6 * hasard(Math.floor(v * 1.5) + t * 7, t);
          const a = force * poil * (1 - Math.pow(Math.abs(u) / (long / 2), 3));
          const i = (y * L2 + x) * 3;
          for (let k = 0; k < 3; k++) buf[i + k] += (couleur[k] - buf[i + k]) * a;
        }
      }
    }

    const img = new ImageData(L2, H2);
    for (let y = 0; y < H2; y++) {
      for (let x = 0; x < L2; x++) {
        const i = y * L2 + x;
        const dx = x / L2 - 0.5, dy = y / H2 - 0.45;
        const lueur = Math.max(0, 1 - Math.hypot(dx * 2.2, dy * 2.6));       // derrière le document
        const vignette = 1 - Math.min(0.7, Math.hypot(dx * 1.4, (y / H2 - 0.5) * 1.6) * 0.8);
        const seuil = BAYER[(y & 3) * 4 + (x & 3)];
        const chaud = [70, 46, 20];
        for (let k = 0; k < 3; k++) {
          const val = (buf[i * 3 + k] + chaud[k] * lueur * lueur) * vignette;
          img.data[i * 4 + k] = Math.min(255, Math.floor(val / 12 + seuil) * 12);
        }
        img.data[i * 4 + 3] = 255;
      }
    }
    c.getContext("2d").putImageData(img, 0, 0);
  }

  function remplirOnglets() {
    el.titre.replaceChildren(creer("span", "inventaire-sceau"), DONNEES.titre || "Projets");
    const cles = ["tous", ...Object.keys(DONNEES.categories).filter((c) => DONNEES.liste.some((p) => p.categorie === c))];
    el.onglets.replaceChildren(...cles.map((cle) => {
      const b = creer("button", "inventaire-onglet", cle === "tous" ? "Tous" : DONNEES.categories[cle].libelle);
      b.type = "button";
      b.dataset.cle = cle;
      b.addEventListener("click", () => filtrer(cle, true));
      return b;
    }));
    const annees = ORDRE.map((k) => anneeDe(DONNEES.liste[k])).filter(Boolean);
    const compteurs = [creer("span", "", `${DONNEES.liste.length} documents`)];
    if (annees.length) {
      const debut = Math.min(...annees), fin = Math.max(...annees);
      compteurs.push(creer("span", "", debut === fin ? String(fin) : `${debut} – ${fin}`));
    }
    compteurs.forEach((s) => s.prepend(losange()));
    el.compteurs.replaceChildren(...compteurs);
  }

  // Onglet : ne garde que les projets de la catégorie
  function filtrer(cle, focaliser) {
    filtre = cle;
    visibles = ORDRE.filter((k) => cle === "tous" || DONNEES.liste[k].categorie === cle);
    for (const b of el.onglets.children) b.setAttribute("aria-pressed", String(b.dataset.cle === cle));
    el.rayon.replaceChildren(losange(), cle === "tous" ? "Tous les documents" : DONNEES.categories[cle].libelle);
    el.total.textContent = `${visibles.length}/${DONNEES.liste.length}`;

    el.grille.replaceChildren(...visibles.map((k) => {
      const p = DONNEES.liste[k];
      const li = document.createElement("li");
      const b = creer("button", "inventaire-case");
      b.type = "button";
      b.dataset.k = k;
      const cat = DONNEES.categories[p.categorie];
      if (cat) b.style.setProperty("--rarete", cat.couleur);
      b.append(creerIcone(p.document), creer("span", "sr-only", p.titre));
      const an = anneeDe(p);
      if (an) b.append(creer("span", "inventaire-case-annee", String(an)));
      b.addEventListener("click", () => choisir(k, true));
      b.addEventListener("focus", () => choisir(k, false));
      li.append(b);
      return li;
    }));
    if (!visibles.includes(choisi)) choisi = visibles[0];
    choisir(choisi, false);
    if (focaliser) caseDe(choisi)?.focus({ preventScroll: true });
  }

  const caseDe = (k) => el.grille.querySelector(`[data-k="${k}"]`);

  function changerOnglet(sens) {
    const cles = Array.from(el.onglets.children, (b) => b.dataset.cle);
    const n = (cles.indexOf(filtre) + sens + cles.length) % cles.length;
    filtrer(cles[n], true);
  }

  function choisir(k, depuisClic) {
    if (k == null) return;
    const change = k !== choisi || !el.vitrine.firstChild;
    choisi = k;
    for (const b of el.grille.querySelectorAll(".inventaire-case")) {
      const oui = Number(b.dataset.k) === k;
      b.setAttribute("aria-pressed", String(oui));
      b.classList.toggle("est-choisi", oui);
    }
    const p = DONNEES.liste[k];
    if (change) {
      // Un nouveau canevas rejoue l'animation d'apparition
      const grand = creerIcone(p.document);
      grand.classList.add("icone-vitrine");
      el.vitrine.replaceChildren(grand);
    }
    afficherDetail(p);
    // Sur téléphone, tout est empilé : on fait venir l'objet choisi
    if (depuisClic && window.matchMedia("(max-width: 720px)").matches) {
      el.vitrine.scrollIntoView({ block: "start", behavior: mouvementReduit.matches ? "auto" : "smooth" });
    }
  }

  function afficherDetail(p) {
    const cat = DONNEES.categories[p.categorie] || { libelle: "", couleur: "#ccc" };
    const fiche = document.createDocumentFragment();

    const bandeau = creer("div", "detail-bandeau");
    bandeau.style.setProperty("--rarete", cat.couleur);
    const petite = creerIcone(p.document);
    petite.classList.add("icone-bandeau");
    bandeau.append(petite, creer("h3", "detail-titre", p.titre));
    fiche.append(bandeau);

    const rarete = creer("p", "detail-rarete");
    rarete.style.setProperty("--rarete", cat.couleur);
    rarete.append(losange(), [cat.libelle, p.annee].filter(Boolean).join(" · "));
    fiche.append(rarete);

    const section = creer("p", "detail-section", "Détails");
    section.prepend(creer("span", "detail-etoile", "✱"));
    fiche.append(section);

    if (p.resume) fiche.append(creer("p", "detail-resume", `« ${p.resume} »`));
    for (const texte of p.description || []) fiche.append(creer("p", "", texte));

    const ligne = (libelle, contenu) => {
      const dl = creer("p", "detail-ligne");
      dl.append(creer("span", "detail-libelle", libelle), " ", contenu);
      fiche.append(dl);
    };
    if (p.role) ligne("Rôle :", p.role);
    ligne("Type :", NOMS_DOCUMENTS[p.document] || "Document");
    const liste = (classe, libelle, elements) => {
      if (!elements || !elements.length) return;
      const ul = creer("ul", classe);
      ul.setAttribute("aria-label", libelle);
      for (const e of elements) ul.append(creer("li", "", e));
      fiche.append(ul);
    };
    liste("detail-outils", "Outils", p.outils);
    liste("detail-effets", "Effets", p.effets);

    if (p.liens && p.liens.length) {
      const nav = creer("div", "detail-liens");
      for (const l of p.liens) {
        const a = creer("a", "btn-cadre", `${l.libelle} ▷`);
        a.href = l.url;
        if (/^https?:/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
        nav.append(a);
      }
      fiche.append(nav);
    }
    el.detail.replaceChildren(fiche);
    el.detail.scrollTop = 0;
  }

  function ouvrirInventaire() {
    if (inventaireOuvert) return;
    inventaireOuvert = true;
    survol = false;
    dessiner();
    el.piece.classList.add("zoom-objet");
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      peindreToile();
      el.inventaire.hidden = false;
      el.piece.classList.add("inventaire-visible");
      filtrer(filtre, true);
    }, duree(650));
  }

  function fermerInventaire() {
    if (!inventaireOuvert) return;
    inventaireOuvert = false;
    clearTimeout(minuterie);
    el.inventaire.hidden = true;
    el.piece.classList.remove("inventaire-visible", "zoom-objet");
    el.bureau.focus({ preventScroll: true });
  }

  // Grille au clavier : flèches (colonnes calculées d'après la mise en page)
  function deplacer(dx, dy) {
    const cases = Array.from(el.grille.querySelectorAll(".inventaire-case"));
    const colonnes = cases.filter((b) => b.offsetTop === cases[0].offsetTop).length || 1;
    let n = visibles.indexOf(choisi) + dx + dy * colonnes;
    n = Math.max(0, Math.min(cases.length - 1, n));
    cases[n].focus();
  }

  function surTouche(e) {
    if (!ouverte) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (inventaireOuvert) fermerInventaire();
      else if (options.retour) options.retour();
      return;
    }
    if (!inventaireOuvert || e.ctrlKey || e.metaKey || e.altKey) return;
    const onglet = { q: -1, e: 1 }[e.key.toLowerCase()];
    if (onglet) {
      e.preventDefault();
      changerOnglet(onglet);
      return;
    }
    if (!e.target.closest(".inventaire-grille")) return;
    const sens = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (sens) {
      e.preventDefault();
      deplacer(...sens);
    }
  }

  /* ---------- Ouverture / fermeture de la pièce ---------- */
  function ouvrir(opts = {}) {
    options = opts;
    ouverte = true;
    construire();
    survol = false;
    dessiner();
    el.consigne.textContent = sansSouris.matches ? DONNEES.consigneTactile || DONNEES.consigne : DONNEES.consigne;
    el.piece.hidden = false;
    // Une image plus tard, pour que le fondu d'apparition se joue
    requestAnimationFrame(() => requestAnimationFrame(() => el.piece.classList.add("est-ouverte")));
    // Focus sur la pièce (pas sur le bureau, qui s'allumerait tout de suite) :
    // Tab mène ensuite au bureau
    el.piece.focus({ preventScroll: true });
  }

  function fermer() {
    if (!ouverte) return;
    fermerInventaire();
    ouverte = false;
    el.piece.classList.remove("est-ouverte");
    el.piece.hidden = true;
  }

  remplirOnglets();
  el.bureau.setAttribute("aria-label", "Le bureau : fouiller les documents des projets");
  el.bureau.addEventListener("click", (e) => {
    e.stopPropagation();
    ouvrirInventaire();
  });
  const allumer = (oui) => {
    if (inventaireOuvert || survol === oui) return;
    survol = oui;
    dessiner();
  };
  el.bureau.addEventListener("pointerenter", () => allumer(true));
  el.bureau.addEventListener("pointerleave", () => allumer(false));
  el.bureau.addEventListener("focus", () => allumer(true));
  el.bureau.addEventListener("blur", () => allumer(false));
  el.fermer.addEventListener("click", (e) => {
    e.stopPropagation();
    fermerInventaire();
  });
  el.retour.addEventListener("click", (e) => {
    e.stopPropagation();
    if (options.retour) options.retour();
  });
  el.piece.addEventListener("click", (e) => e.stopPropagation()); // pas de clic « avancer » de l'intro
  document.addEventListener("keydown", surTouche, true);

  let attente = null;
  window.addEventListener("resize", () => {
    if (!ouverte) return;
    clearTimeout(attente);
    attente = setTimeout(() => {
      construire();
      dessiner();
      if (inventaireOuvert) peindreToile();
    }, 150);
  });

  // Aperçu pour la salle aux trois portes (js/fond-pixel.js) : la pièce,
  // dessinée hors de l'écran, qu'on devine par l'arche de sa porte ;
  // x / bas = point du décor posé au milieu du seuil
  function apercu() {
    if (ouverte) return null;
    construire();
    survol = false;
    dessiner();
    let ax = L, bx = 0, by = 0;
    for (let i = 0; i < L * H; i++) {
      if (!masque[i]) continue;
      const x = i % L;
      ax = Math.min(ax, x); bx = Math.max(bx, x); by = Math.max(by, (i - x) / L);
    }
    return { image: ctx.getImageData(0, 0, L, H), x: Math.round((ax + bx) / 2), bas: by - 4 };
  }

  window.PIECES = window.PIECES || {};
  window.PIECES.projets = { ouvrir, fermer, apercu };
})();
