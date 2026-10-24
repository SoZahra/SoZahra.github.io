/*
 * Pièce « whoami » : l'atelier, dans le style PC-98 de l'intro (basse
 * résolution, palettes réduites, tramage de Bayer, pixels nets).
 * Mur de pierre, œil-de-bœuf au clair de lune, bibliothèque, tableau de
 * liège couvert de croquis, bureau avec un vieil ordinateur PC-98 qui fait
 * défiler du code, plante suspendue, chat endormi sous le bureau.
 *
 * Au centre, elle peint à son chevalet (une maquette de site sur la toile),
 * de dos. Elle nous entend entrer, sursaute (« ! »), se retourne et dit une
 * seule réplique. Survol = contour doré ; clic = elle apparaît en grand en
 * 3D (js/figurine-3d.js, chargé à la demande, en buste), fait un tour
 * complet, puis sa fiche se déploie autour d'elle comme un écran
 * d'équipement de jeu : onglets en haut, identité à gauche, compétences à
 * droite, attributs en bas. Elle cligne des yeux de temps en temps.
 * Textes et données : js/whoami.js.
 *
 * Ouverte par js/intro.js (porte « whoami ») via window.PIECES.whoami :
 *   ouvrir({ retour })  — retour() ramène à la salle aux trois portes
 *   fermer()
 */
(() => {
  "use strict";

  const DONNEES = window.WHOAMI;
  const PERSO = window.PERSONNAGE_PIXEL;
  const $ = (id) => document.getElementById(id);
  const el = {
    piece: $("piece-whoami"),
    canvas: $("whoami-fond"),
    scene: document.querySelector("#piece-whoami .piece-scene"),
    perso: $("whoami-perso"),
    etiquette: $("whoami-etiquette"),
    consigne: $("whoami-consigne"),
    bulle: $("whoami-bulle"),
    replique: $("whoami-replique"),
    repliqueLue: $("whoami-replique-lue"),
    retour: $("whoami-retour"),
    fiche: $("fiche"),
    canvas3d: $("fiche-3d"),
    repli: $("fiche-repli"),
    panneau: $("fiche-panneau"),
    fermer: $("fiche-fermer"),
  };
  if (!DONNEES || !PERSO || !el.piece || !el.canvas) return;

  // Module 3D, chargé seulement quand on entre dans l'atelier
  const URL_FIGURINE = new URL("figurine-3d.js", document.currentScript.src).href;
  // Tenues (skins) du modèle 3D : chemins relatifs à la page
  const adresse = (chemin) => (chemin ? new URL(chemin, document.baseURI).href : null);
  const TENUES = (DONNEES.tenues || []).map((t) => ({ ...t, modele: adresse(t.modele), yeuxFermes: adresse(t.yeuxFermes) }));
  let tenue = TENUES[0] || { modele: adresse("models/fatima.glb"), buste: true };

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
    bois:      ["#0e0806", "#20120b", "#351d10", "#4e2c17", "#6b3e20", "#8c552c"],
    boisClair: ["#170d07", "#2e1a0e", "#4a2a15", "#6c3f1f", "#915829", "#b67338"],
    livreR:    ["#11050a", "#2a0b12", "#46131c", "#651f29", "#872d35", "#a84141"],
    livreV:    ["#060d09", "#0f1d16", "#183124", "#244535", "#325c46", "#437556"],
    livreB:    ["#070913", "#121a2c", "#1c2a45", "#293c5e", "#385178", "#4c6a93"],
    livreO:    ["#120c05", "#2b1e0b", "#483214", "#68491d", "#8a632a", "#ac7f3a"],
    parchemin: ["#1c150d", "#3a2d1b", "#5e4b2f", "#8b7350", "#b9a074", "#e6d3a5"],
    laiton:    ["#130d04", "#33240a", "#5a4113", "#83611f", "#ae8631", "#dcb04d"],
    fer:       ["#040406", "#0d0d13", "#191923", "#292937", "#3c3c4f", "#55556d"],
    tapis:     ["#0f040a", "#240914", "#3b1020", "#561a2e", "#73273c", "#91374b"],
    cire:      ["#2a231e", "#4d4239", "#7a6c5d", "#a89883", "#d3c4a9", "#f2e8d2"],
    vitre:     ["#070b18", "#101b33", "#1c2f52", "#2c4772", "#456694", "#6f90bd"],
    toile:     ["#1d1a16", "#3d3730", "#6a6153", "#9a8f7c", "#cbbfa6", "#efe6d0"],
    beige:     ["#191612", "#36302a", "#5a5146", "#837867", "#ada08a", "#d6cbb2"],
    ecran:     ["#020a06", "#06180e", "#0c3018", "#185a2c", "#2f9a4c", "#7cf09a"],
    liege:     ["#140c06", "#2e1d0e", "#4c3218", "#6e4a25", "#916534", "#b58248"],
    feuille:   ["#050c06", "#0b1d0e", "#133018", "#1e4724", "#2d6332", "#428243"],
    terre:     ["#120806", "#29130c", "#452114", "#64301d", "#864228", "#a85636"],
    postitJ:   ["#1a1606", "#3a320e", "#62561a", "#8e7e2a", "#bca73c", "#e8d25a"],
    postitR:   ["#1a0a10", "#3a1622", "#622638", "#8e3a52", "#bc506c", "#e86e8c"],
  };
  const NOMS = Object.keys(RAMPES);
  const IDX = Object.fromEntries(NOMS.map((n, i) => [n, i]));
  const COULEURS = NOMS.map((n) => RAMPES[n].map(hex));
  const EMISSIF = new Set([IDX.vitre, IDX.ecran]); // la lune et l'écran luisent d'eux-mêmes

  // Flammes (b = bord, m = milieu, c = cœur)
  const COULEURS_FEU = { b: [196, 74, 30], m: [244, 150, 44], c: [255, 232, 150] };
  const FLAMMES = [
    [".b.", "bmb", "bcb", ".c."],
    ["..b", ".mb", "bcb", ".c."],
    ["b..", "bm.", "bcb", ".c."],
    [".b.", ".m.", "bcb", ".c."],
  ];

  // Couleurs du personnage (js/personnage-pixel.js)
  const RVB_PERSO = Object.fromEntries(Object.entries(PERSO.COULEURS).map(([k, h]) => [k, hex(h)]));

  let L, H, mat, val, couche, lune, faisceau, image, masquePerso;
  let bougies = [];
  let poussiere = [];   // grains de poussière dans le rayon de lune
  let lueurs = [];      // lueur verte de l'écran
  let vapeur = [];      // vapeur du thé
  let survol = false;
  let sansElle = false; // aperçu pour la salle aux portes : la pièce sans elle
  let ouverte = false;
  let options = {};
  let geo = {};

  const MUR = 1, SOL = 2;
  let coucheActive = 0;

  const dans = (x, y) => x >= 0 && y >= 0 && x < L && y < H;
  function poser(x, y, m, v) {
    x = Math.round(x); y = Math.round(y);
    if (!dans(x, y)) return;
    const i = y * L + x;
    mat[i] = IDX[m];
    val[i] = v;
    couche[i] = coucheActive;
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
     Construction de l'atelier
     ============================================================ */

  function construire() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // Un peu moins de lignes que le bureau des projets : elle est plus grande à l'écran
    H = 160;
    L = Math.round((H * vw) / vh);
    if (L < 200) {
      L = 200;
      // Écran très vertical : on ne monte pas plus haut que ça, la pièce
      // est alors plus large que l'écran et recadrée sur elle (cadrerScene)
      H = Math.min(Math.round((L * vh) / vw), Math.round(L * 1.65));
    }
    el.canvas.width = L;
    el.canvas.height = H;
    image = ctx.createImageData(L, H);
    mat = new Uint8Array(L * H);
    val = new Float32Array(L * H);
    couche = new Uint8Array(L * H);
    lune = new Float32Array(L * H);
    faisceau = new Float32Array(L * H);
    masquePerso = new Uint8Array(L * H);
    bougies = [];
    lueurs = [];

    const sol = Math.round(H * 0.62);
    const pieds = sol + Math.round((H - sol) * 0.45);
    const px = Math.round(L * 0.42);
    geo = { sol, pieds, px };

    dessinerMur(sol);
    dessinerPlancher(sol);
    dessinerOculus(sol);
    dessinerPoutre();
    dessinerBibliotheque(sol);
    dessinerBureau(sol);
    dessinerLiege(sol);
    dessinerPlante();
    dessinerLustre();
    dessinerTapis();
    dessinerChevalet();
    dessinerTabouret();
    dessinerChandelier();
    eclairerLune(sol);
    poussiere = [];
    for (let k = 0; k < 14; k++) poussiere.push(nouveauGrain(true));
    placerZonePerso();
    cadrerScene(vw, vh);
    vapeur = [];
    for (let k = 0; k < 5; k++) vapeur.push(nouvelleVapeur(true));
  }

  // Mur de grosses pierres, lambris de bois en bas (comme le bureau des projets)
  function dessinerMur(sol) {
    coucheActive = MUR;
    const PL = 20, PH = 10;
    for (let y = 0; y < sol; y++) {
      const rangee = Math.floor(y / PH);
      const decalage = (rangee % 2) * (PL / 2);
      for (let x = 0; x < L; x++) {
        const bx = Math.floor((x + decalage) / PL);
        const joint = y % PH === PH - 1 || (x + decalage) % PL === PL - 1;
        let v = joint ? 0.18 : 0.5 + hasard(bx, rangee + 40) * 0.2 + hasard(x, y) * 0.08;
        if (!joint && y % PH === 0) v += 0.12;
        if (!joint && y % PH === PH - 2) v -= 0.1;
        poser(x, y, "pierre", v);
      }
    }
    const haut = sol - 14;
    for (let y = haut; y < sol; y++) {
      for (let x = 0; x < L; x++) {
        let v = 0.42 + hasard(Math.floor(x / 9), 5) * 0.1 + hasard(x, y * 3) * 0.05;
        if (x % 9 === 8) v = 0.18;
        if (y === haut) v = 0.75;
        else if (y === haut + 1) v = 0.5;
        else if (y === haut + 2) v = 0.2;
        poser(x, y, "bois", v);
      }
    }
    coucheActive = 0;
  }

  function dessinerPlancher(sol) {
    coucheActive = SOL;
    for (let y = sol; y < H; y++) {
      const latte = Math.floor((y - sol) / 6);
      for (let x = 0; x < L; x++) {
        const decal = Math.floor(hasard(latte, 3) * 40);
        const bout = (x + decal) % 46 === 45;
        let v = 0.38 + hasard(Math.floor((x + decal) / 46), latte + 9) * 0.12 + hasard(x * 2, y) * 0.06;
        if ((y - sol) % 6 === 5 || bout) v = 0.14;
        else if ((y - sol) % 6 === 0) v += 0.1;
        poser(x, y, "bois", y === sol ? 0.1 : v);
      }
    }
    coucheActive = 0;
  }

  // Œil-de-bœuf : vitrail rond en rosace, croissant de lune
  function dessinerOculus(sol) {
    const cx = Math.round(L * 0.27), r = 13;
    const cy = Math.max(r + 8, sol - 64);
    geo.oculus = { cx, cy, r };
    const lx = cx + 3, ly = cy - 3;
    for (let y = cy - r - 4; y <= cy + r + 4; y++) {
      for (let x = cx - r - 4; x <= cx + r + 4; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) {
          const a = Math.atan2(y - cy, x - cx);
          // Plombs : anneau intérieur et huit rayons
          const rayon = Math.abs(Math.sin(a * 4)) < 0.12 && d > 3.5;
          const anneau = Math.abs(d - 4) < 0.6 || Math.abs(d - (r - 0.5)) < 0.6;
          const dl = Math.hypot(x - lx, y - ly), dl2 = Math.hypot(x - lx - 2, y - ly + 1);
          if (dl <= 3.6 && dl2 > 3) poser(x, y, "vitre", 1.15);
          else if (rayon || anneau) poser(x, y, "fer", 0.35);
          else poser(x, y, "vitre", 0.45 + 0.3 * (1 - (y - cy + r) / (2 * r)) + Math.max(0, 0.35 - dl / 30) + hasard(x, y) * 0.06);
        } else if (d <= r + 3.5) {
          // Encadrement de pierres claires
          coucheActive = MUR;
          const bloc = Math.floor((Math.atan2(y - cy, x - cx) + Math.PI) * 2.5);
          poser(x, y, "pierre", d <= r + 1 ? 0.3 : 0.78 + hasard(bloc, 3) * 0.12);
          coucheActive = 0;
        }
      }
    }
  }

  // Clair de lune : grand halo bleuté sur le mur autour de l'œil-de-bœuf,
  // un rayon qui traverse la pièce en biais jusqu'à elle, et une tache
  // ronde (avec ses plombs) posée au sol au bout du rayon
  function eclairerLune(sol) {
    const o = geo.oculus;
    const tx = Math.round(o.cx + (geo.px - o.cx) * 0.55), ty = sol + Math.round((H - sol) * 0.32);
    const RX = 24, RY = 8;
    geo.rayon = { x0: o.cx, y0: o.cy, x1: tx, y1: ty, r0: o.r - 2, r1: RX - 2 };
    // Rayon : segment de l'œil-de-bœuf à la tache, de plus en plus large
    const dx = tx - o.cx, dy = ty - o.cy, long2 = dx * dx + dy * dy;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        let l = 0.08;
        if (couche[i] === MUR) {
          const d = Math.hypot((x - o.cx) / (o.r * 7), (y - o.cy) / (o.r * 6));
          l += 0.7 * Math.max(0, 1 - d) ** 1.3;
        } else if (couche[i] === SOL) {
          const u = (x - tx) / RX, v = (y - ty) / RY;
          const d = Math.hypot(u, v);
          if (d <= 1) {
            const a = Math.atan2(v, u);
            const plomb = Math.abs(Math.sin(a * 4)) < 0.14 && d > 0.3;
            l += plomb ? 0.35 : 1.15;
          } else l += 0.3 * Math.max(0, 1 - (d - 1) * 1.2);
        }
        const t = ((x - o.cx) * dx + (y - o.cy) * dy) / long2;
        if (t > 0.05 && t < 1) {
          const ecart = Math.abs((x - o.cx) * dy - (y - o.cy) * dx) / Math.sqrt(long2);
          const demi = geo.rayon.r0 + (geo.rayon.r1 - geo.rayon.r0) * t;
          const bord = Math.max(0, Math.min(1, (demi - ecart) / 4));
          // Plus dense près de la fenêtre, se dissipe vers le sol
          faisceau[i] = bord * (0.75 - 0.4 * t);
          l += faisceau[i];
        }
        lune[i] = l;
      }
    }
  }

  // Grain de poussière qui flotte dans le rayon de lune
  function nouveauGrain(partout) {
    const r = geo.rayon;
    if (!r) return { x: -1, y: -1, age: 0, vie: 1 };
    const t = 0.1 + Math.random() * 0.85;
    const demi = r.r0 + (r.r1 - r.r0) * t;
    const vie = 40 + Math.floor(Math.random() * 60);
    return {
      x: r.x0 + (r.x1 - r.x0) * t + (Math.random() * 2 - 1) * demi * 0.8,
      y: r.y0 + (r.y1 - r.y0) * t + (Math.random() * 2 - 1) * demi * 0.3,
      age: partout ? Math.floor(Math.random() * vie) : 0, vie,
    };
  }

  // Lustre en fer forgé et laiton, suspendu à la poutre au-dessus d'elle
  function dessinerLustre() {
    const x = geo.px + 14;
    const y = Math.max(22, geo.sol - 62);   // hauteur de la couronne
    geo.lustre = { x, y };
    // Chaîne : maillons alternés
    for (let yy = 5; yy < y - 6; yy++) poser(x, yy, "fer", yy % 3 === 0 ? 0.25 : 0.6);
    // Bulbe central et pointe en dessous
    rect(x - 1, y - 6, x + 1, y - 4, "laiton", (xx) => (xx === x - 1 ? 0.85 : 0.55));
    rect(x - 2, y - 3, x + 2, y + 1, "laiton", (xx, yy) => (xx === x - 2 || yy === y - 3 ? 0.9 : xx === x + 2 ? 0.4 : 0.62));
    rect(x - 1, y + 2, x + 1, y + 3, "laiton", 0.5);
    poser(x, y + 4, "laiton", 0.75);
    poser(x, y + 6, "laiton", 0.6);
    // Couronne : deux bras de chaque côté qui remontent vers les coupelles
    for (const sens of [-1, 1]) {
      for (const [ecart, haut] of [[8, 2], [16, 4]]) {
        const bx = x + sens * ecart, by = y - haut;
        ligne(x + sens * 2, y, bx - sens * 2, y + 1, "fer", 0.55);
        ligne(bx - sens * 2, y + 1, bx, by + 1, "fer", 0.55);
        rect(bx - 2, by, bx + 2, by, "laiton", (xx) => (xx === bx - 2 ? 0.9 : 0.6));
        poser(bx, by + 1, "laiton", 0.45);
        bougie(bx, by - 1, 4, 100, 0.5);
      }
    }
    bougie(x, y - 7, 4, 100, 0.5);
  }

  // Poutre au plafond
  function dessinerPoutre() {
    rect(0, 0, L - 1, 4, "bois", (x, y) => (y === 4 ? 0.15 : y === 3 ? 0.6 : 0.4 + hasard(Math.floor(x / 30), 2) * 0.08));
  }

  // Petite bibliothèque contre le mur de gauche
  function dessinerBibliotheque(sol) {
    const x0 = Math.max(3, Math.round(L * 0.03));
    const x1 = x0 + Math.min(38, Math.max(26, Math.round(L * 0.12)));
    if (x1 > geo.oculus.cx - geo.oculus.r - 6) return;
    const haut = Math.max(24, sol - 70), bas = sol + 3;
    rect(x0, haut, x1, bas, "bois", (x, y) => 0.16 + hasard(x, y * 2) * 0.04);
    rect(x0 - 2, haut - 5, x1 + 2, haut, "bois", (x, y) => (y === haut - 5 ? 0.8 : y === haut ? 0.25 : 0.48));
    rect(x0, haut, x0 + 2, bas, "bois", (x) => (x === x0 ? 0.7 : 0.5));
    rect(x1 - 2, haut, x1, bas, "bois", 0.42);
    const couleurs = ["livreR", "livreV", "livreB", "livreO"];
    for (let planche = haut + 22; planche <= bas - 4; planche += 22) {
      rect(x0 + 3, planche, x1 - 3, planche + 1, "bois", (x, y) => (y === planche ? 0.75 : 0.3));
      let x = x0 + 3;
      while (x < x1 - 4) {
        const w = 2 + Math.floor(hasard(x, planche) * 3);
        const h = 13 + Math.floor(hasard(planche, x) * 6);
        if (hasard(x * 2, planche) < 0.12) { x += 3; continue; }
        const c = couleurs[Math.floor(hasard(x * 0.7, planche * 1.9) * 4)];
        rect(x, planche - h, Math.min(x + w - 1, x1 - 3), planche - 1, c, (xx, yy) => (yy === planche - h + 2 ? 0.7 : xx === x ? 0.68 : 0.48));
        x += w;
      }
    }
    // Une bougie sur le haut du meuble
    bougie(x0 + 8, haut - 6, 6, 44);
  }

  // Bureau à droite : un ordinateur PC-98 (unité centrale beige, deux
  // lecteurs de disquettes, écran cathodique au phosphore vert), un clavier,
  // une tasse de thé fumante, une bougie
  function dessinerBureau(sol) {
    const x0 = Math.max(geo.px + 52, Math.round(L * 0.66));
    const x1 = Math.min(L - 4, x0 + 74);
    if (x1 - x0 < 44) return;
    const yt = sol + 6, yb = sol + 26;
    geo.bureau = { x0, x1, yt, yb };
    // Plateau, chant, pieds, traverse
    rect(x0, yt, x1, yt + 3, "boisClair", (x, y) => (y === yt + 3 ? 0.85 : 0.45 + 0.07 * Math.sin(x * 0.4 + y) + hasard(x, y) * 0.05));
    for (const p of [x0 + 2, x1 - 5]) rect(p, yt + 4, p + 3, yb, "bois", (x) => (x === p ? 0.55 : 0.32));
    rect(x0 + 5, yt + 14, x1 - 6, yt + 15, "bois", 0.28);
    // Coussin et chat endormi sous le bureau (le chat est dessiné à part)
    const cx = Math.round((x0 + x1) / 2);
    rect(cx - 8, yb - 3, cx + 8, yb, "tapis", (x, y) => (y === yb - 3 ? 0.7 : y === yb ? 0.25 : 0.5));
    geo.chat = { x: cx - 6, y: yb - 8 };

    // Unité centrale + écran
    const ux = x0 + 4;
    rect(ux, yt - 8, ux + 30, yt - 1, "beige", (x, y) => (y === yt - 8 ? 0.85 : x === ux + 30 ? 0.4 : 0.62));
    for (const [a, b] of [[ux + 15, ux + 21], [ux + 23, ux + 29]]) {
      rect(a, yt - 5, b, yt - 4, "fer", 0.2); // fentes des lecteurs de disquettes
      poser(b, yt - 3, "livreV", 0.9);        // petit voyant
    }
    poser(ux + 3, yt - 4, "livreR", 0.9);      // bouton marche
    const ex = ux + 2, ey = yt - 30;
    rect(ex, ey, ex + 26, yt - 9, "beige", (x, y) => (y === ey ? 0.85 : x === ex ? 0.75 : x === ex + 26 ? 0.4 : 0.62));
    const ecran = { x0: ex + 3, y0: ey + 3, x1: ex + 23, y1: yt - 13 };
    rect(ecran.x0 - 1, ecran.y0 - 1, ecran.x1 + 1, ecran.y1 + 1, "fer", 0.25);
    geo.ecran = ecran;
    dessinerEcran();
    lueurs.push({ x: (ecran.x0 + ecran.x1) / 2, y: (ecran.y0 + ecran.y1) / 2, rayon: 46, intensite: 1 });
    // Clavier
    rect(ux + 2, yt + 1, ux + 28, yt + 2, "beige", (x, y) => (y === yt + 1 ? ((x % 2) ? 0.75 : 0.5) : 0.4));
    // Tasse de thé et sa vapeur
    const tx = x1 - 22;
    rect(tx, yt - 5, tx + 4, yt, "cire", (x, y) => (y === yt - 5 ? 0.3 : x === tx ? 0.8 : 0.6));
    poser(tx + 5, yt - 4, "cire", 0.6); poser(tx + 6, yt - 3, "cire", 0.5); poser(tx + 5, yt - 2, "cire", 0.6);
    geo.tasse = { x: tx + 2, y: yt - 6 };
    // Pile de feuilles (des croquis) et bougie
    rect(x1 - 14, yt - 2, x1 - 5, yt, "parchemin", (x, y) => (y === yt - 2 ? 0.85 : 0.6));
    bougie(x1 - 9, yt - 3, 7, 56);
  }

  // Code qui défile sur l'écran : lignes indentées de longueurs variées
  let defilement = 0;
  function dessinerEcran() {
    const e = geo.ecran;
    if (!e) return;
    rect(e.x0, e.y0, e.x1, e.y1, "ecran", 0.25);
    for (let y = e.y0 + 1; y < e.y1; y += 2) {
      const n = Math.floor((y - e.y0) / 2) + defilement;
      const retrait = [0, 2, 4, 2, 4, 6, 2, 0][n % 8];
      const long = 3 + Math.floor(hasard(n, 7) * (e.x1 - e.x0 - retrait - 5));
      for (let x = e.x0 + 1 + retrait; x < e.x0 + 1 + retrait + long && x < e.x1; x++) {
        if (hasard(x, n) < 0.18) continue; // espaces entre les mots
        poser(x, y, "ecran", n % 5 === 0 ? 1 : 0.75);
      }
    }
    // Curseur qui clignote sur la dernière ligne
    if (defilement % 2 === 0) poser(e.x0 + 2, e.y1 - 1, "ecran", 1.1);
  }

  // Tableau de liège au-dessus du bureau : croquis d'écrans et pense-bêtes
  function dessinerLiege(sol) {
    const b = geo.bureau;
    if (!b) return;
    const x0 = b.x0 + 4, x1 = Math.min(b.x1 - 2, x0 + 50), y0 = Math.max(12, sol - 62), y1 = y0 + 30;
    rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2, "bois", (x, y) => (y === y0 - 2 || x === x0 - 2 ? 0.7 : 0.4));
    rect(x0, y0, x1, y1, "liege", (x, y) => 0.45 + hasard(x * 3, y * 5) * 0.15);
    // Croquis : petits écrans en fil de fer
    const croquis = (cx, cy, w, h) => {
      rect(cx, cy, cx + w, cy + h, "toile", (x, y) => (x === cx || y === cy || x === cx + w || y === cy + h ? 0.45 : 0.8));
      rect(cx + 2, cy + 2, cx + w - 2, cy + 3, "fer", 0.55);                 // barre de titre
      rect(cx + 2, cy + 5, cx + Math.round(w / 2), cy + h - 2, "fer", 0.7);  // une image
      for (let y = cy + 5; y < cy + h - 1; y += 2) rect(cx + Math.round(w / 2) + 2, y, cx + w - 2, y, "fer", 0.6);
      poser(cx + Math.round(w / 2), cy, "livreR", 0.9); // punaise
    };
    croquis(x0 + 2, y0 + 3, 14, 11);
    if (x1 - x0 > 36) croquis(x0 + 20, y0 + 6, 13, 10);
    // Pense-bêtes
    rect(x0 + 4, y0 + 18, x0 + 11, y0 + 25, "postitJ", (x, y) => (y === y0 + 18 ? 0.6 : 0.8));
    rect(x0 + 13, y0 + 20, x0 + 20, y0 + 27, "postitR", (x, y) => (y === y0 + 20 ? 0.6 : 0.8));
    if (x1 - x0 > 42) rect(x1 - 10, y0 + 18, x1 - 3, y0 + 25, "livreB", (x, y) => (y === y0 + 18 ? 0.7 : 0.85));
    for (let x = x0 + 5; x < x0 + 10; x++) if (x % 2) poser(x, y0 + 21, "fer", 0.4);
    // Fil rouge entre deux croquis
    if (x1 - x0 > 36) ligne(x0 + 9, y0 + 3, x0 + 26, y0 + 6, "livreR", 0.7);
  }

  // Plante suspendue à la poutre, ses tiges retombent
  function dessinerPlante() {
    const x = Math.round(L * 0.58);
    if (geo.bureau && x + 10 > geo.bureau.x0 + 2) return;
    const yPot = 18;
    for (const dx of [-4, 4]) ligne(x, 5, x + dx, yPot, "fer", 0.4);
    rect(x - 5, yPot, x + 5, yPot + 5, "terre", (xx, y) => (y === yPot ? 0.8 : xx === x - 5 ? 0.65 : 0.45));
    // Feuillage + tiges qui pendent
    for (let k = 0; k < 14; k++) {
      const fx = x - 6 + Math.floor(hasard(k, 1) * 13), fy = yPot - 2 + Math.floor(hasard(k, 2) * 3);
      poser(fx, fy, "feuille", 0.5 + hasard(k, 3) * 0.4);
    }
    for (const [dx, long] of [[-5, 22], [-2, 12], [3, 28], [6, 16]]) {
      for (let k = 0; k < long; k++) {
        const fx = x + dx + Math.round(Math.sin(k * 0.35 + dx) * 1.2), fy = yPot + 4 + k;
        poser(fx, fy, "feuille", 0.35);
        if (k % 3 === 0) poser(fx + (k % 2 ? 1 : -1), fy, "feuille", 0.65); // feuilles
      }
    }
  }

  // Tapis sous le chevalet
  function dessinerTapis() {
    const { pieds, px } = geo;
    const x0 = px - 34, x1 = px + 52, y0 = pieds - 6, y1 = Math.min(H - 2, pieds + 8);
    coucheActive = SOL;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const b = Math.min(x - x0, x1 - x, (y - y0) * 2, (y1 - y) * 2);
        let v = 0.42 + hasard(x, y) * 0.06;
        if (b < 1) v = 0.22;
        else if (b < 2) v = 0.75;
        else if ((x + y * 2) % 8 === 0) v = 0.6;
        poser(x, y, b >= 1 && b < 2 ? "laiton" : "livreB", v);
      }
    }
    coucheActive = 0;
  }

  /* ---------- Le chevalet et la toile ----------
   * La toile est une maquette de site (barre de navigation, image, texte,
   * bouton, trois cartes), peinte pixel par pixel tant qu'elle travaille. */
  let peinture = [];  // pixels de la maquette, dans l'ordre où elle les peint
  let peints = -1;    // combien sont déjà peints (gardé d'une visite à l'autre)

  function dessinerChevalet() {
    const { pieds, px } = geo;
    const x0 = px + 9, x1 = x0 + 30, y0 = pieds - 41, y1 = pieds - 15;
    geo.toile = { x0, x1, y0, y1 };
    // Pieds : deux devant écartés, un derrière
    ligne(x0 + 14, y0 - 5, x0 + 14, pieds - 4, "bois", 0.25);
    ligne(x0 + 5, y0 - 4, x0 - 1, pieds + 1, "bois", 0.6);
    ligne(x1 - 5, y0 - 4, x1 + 1, pieds + 1, "bois", 0.45);
    ligne(x0 + 6, y0 - 4, x0, pieds + 1, "bois", 0.4);
    ligne(x1 - 4, y0 - 4, x1 + 2, pieds + 1, "bois", 0.3);
    rect(x0 + 10, y0 - 6, x0 + 19, y0 - 4, "bois", (x, y) => (y === y0 - 6 ? 0.7 : 0.45)); // pince du haut
    // Toile (avec son épaisseur) et rebord qui la tient
    rect(x0, y0, x1, y1, "toile", 0.72);
    rect(x1 + 1, y0 + 1, x1 + 1, y1, "toile", 0.35);
    rect(x0 - 2, y1 + 1, x1 + 2, y1 + 2, "bois", (x, y) => (y === y1 + 1 ? 0.72 : 0.35));
    // Ce qui est déjà peint
    preparerPeinture();
    for (let k = 0; k < peints; k++) poserPeinture(peinture[k]);
  }

  function preparerPeinture() {
    const t = geo.toile;
    const ox = t.x0 + 2, oy = t.y0 + 2, w = t.x1 - t.x0 - 4;
    const liste = [];
    const bloc = (a, b, c, d, m, v) => {
      for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) liste.push([ox + x, oy + y, m, typeof v === "function" ? v(x, y) : v]);
    };
    // Barre de navigation, logo, liens
    bloc(0, 0, w, 2, "fer", 0.35);
    bloc(1, 1, 3, 1, "laiton", 0.85);
    for (const lx of [w - 12, w - 8, w - 4]) bloc(lx, 1, lx + 2, 1, "toile", 0.85);
    // Titre et texte
    bloc(1, 5, 12, 6, "fer", 0.3);
    bloc(1, 8, 10, 8, "fer", 0.55);
    bloc(1, 10, 8, 10, "fer", 0.55);
    // Bouton doré
    bloc(1, 12, 7, 13, "laiton", 0.8);
    // Image : un ciel prune et une lune
    bloc(15, 4, w - 1, 13, "tapis", (x, y) => (Math.hypot(x - (w - 6), y - 7) < 2.2 ? -1 : 0.55 + (13 - y) * 0.02));
    // Trois cartes
    const lc = Math.floor((w - 2) / 3);
    ["livreR", "livreV", "livreO"].forEach((c, k) => {
      const a = k * (lc + 1), b = a + lc - 1;
      bloc(a, 16, b, 21, "fer", (x, y) => (x === a || x === b || y === 16 || y === 21 ? 0.5 : -2));
      bloc(a + 2, 18, a + 4, 19, c, 0.75);
      bloc(a + 6, 18, b - 2, 18, "fer", 0.55);
    });
    // -1 = lune (claire), -2 = fond de carte (on ne peint rien)
    peinture = liste.filter((p) => p[3] !== -2).map((p) => (p[3] === -1 ? [p[0], p[1], "toile", 1] : p));
    if (peints < 0) peints = Math.round(peinture.length * 0.6);
    peints = Math.min(peints, peinture.length);
  }
  function poserPeinture(p) {
    poser(p[0], p[1], p[2], p[3]);
  }

  // Tabouret à côté d'elle : pots de peinture et palette
  function dessinerTabouret() {
    const { pieds, px } = geo;
    const x = px - 26, top = pieds - 11;
    rect(x - 7, top, x + 7, top + 1, "bois", (xx, y) => (y === top ? 0.7 : 0.35));
    for (const [a, b] of [[x - 6, x - 7], [x + 6, x + 7], [x - 1, x - 1]]) ligne(a, top + 2, b, pieds, "bois", a === x - 1 ? 0.25 : 0.45);
    // Pots
    [["livreR", x - 5], ["livreB", x - 1], ["laiton", x + 3]].forEach(([c, a]) => {
      rect(a, top - 4, a + 2, top - 1, "fer", (xx) => (xx === a ? 0.6 : 0.4));
      rect(a, top - 4, a + 2, top - 4, c, 0.85);
    });
    // Pinceaux dans un pot
    ligne(x + 4, top - 5, x + 6, top - 10, "bois", 0.55);
    ligne(x + 3, top - 5, x + 2, top - 9, "bois", 0.45);
  }

  // Grand chandelier de fer posé au sol, derrière elle : il l'éclaire
  function dessinerChandelier() {
    const { pieds, px } = geo;
    const x = px - 40;
    if (x < 6) return;
    const y = pieds - 34;
    rect(x - 3, pieds - 1, x + 3, pieds, "fer", (xx, yy) => (yy === pieds - 1 ? 0.6 : 0.35));
    rect(x, y + 2, x, pieds - 2, "fer", 0.55);
    rect(x - 2, y + 1, x + 2, y + 1, "fer", 0.6);
    bougie(x, y, 6, 70);
  }

  // Bougie : cire de hauteur h posée en (x, base), flamme au-dessus
  function bougie(x, base, h, rayon, force = 1) {
    rect(x - 1, base - h + 1, x + 1, base, "cire", (xx) => (xx === x - 1 ? 0.85 : xx === x + 1 ? 0.5 : 0.7));
    poser(x + 2, base - h + 3, "cire", 0.7);
    poser(x, base - h, "fer", 0.3);
    bougies.push({ x, y: base - h - 2, rayon, force, intensite: 1, image: 0 });
  }

  /* ============================================================
     Elle : de dos (elle peint), « ! », de profil, de face
     ============================================================ */
  let pose = "peint";   // "peint" | "alerte" | "profil" | "face"
  let brasImage = 0;
  let cligne = 0, prochainClin = 40;
  let saut = 0;         // petit sursaut quand elle nous entend

  function spritePerso() {
    const S = PERSO.SPRITES;
    if (pose === "peint") return S.dosPeint;
    if (pose === "alerte") return S.dos;
    if (pose === "profil") return S.profil1;
    return cligne > 0 ? S.faceCligne : S.face;
  }

  // Bouton HTML posé sur elle (en %), et zoom de caméra vers elle
  function placerZonePerso() {
    const { pieds, px } = geo;
    const ax = px - 10, bx = px + 9, ay = pieds - 34, by = pieds + 1;
    const pct = (v, t) => `${(v / t) * 100}%`;
    const s = el.piece.style;
    s.setProperty("--objet-gauche", pct(ax, L));
    s.setProperty("--objet-haut", pct(ay, H));
    s.setProperty("--objet-largeur", pct(bx - ax + 1, L));
    s.setProperty("--objet-hauteur", pct(by - ay + 1, H));
    s.setProperty("--objet-x", pct(px, L));
    s.setProperty("--objet-y", pct(pieds - 16, H));
    s.setProperty("--objet-zoom", String(Math.min(3.2, (H * 0.5) / 32).toFixed(2)));
  }

  // Si la pièce est plus large que l'écran, on la recadre autour d'elle
  function cadrerScene(vw, vh) {
    const s = el.scene.style;
    const largeur = (vh * L) / H;
    if (largeur <= vw + 1) { s.width = ""; s.left = ""; return; }
    const centre = (geo.px / L) * largeur;
    s.width = `${largeur}px`;
    s.left = `${Math.max(vw - largeur, Math.min(0, vw / 2 - centre))}px`;
  }

  /* ============================================================
     Rendu : éclairage + tramage (comme js/piece-projets.js)
     ============================================================ */
  let vertIci = 0;
  function lumiereEn(x, y) {
    let l = 0.2;
    for (const b of bougies) {
      const dx = x - b.x, dy = y - b.y;
      const r = b.rayon * b.intensite;
      if (dx > r || dx < -r || dy > r || dy < -r) continue;
      const f = 1 - Math.hypot(dx, dy) / r;
      if (f > 0) l += f ** 1.4 * 0.95 * b.force;
    }
    vertIci = 0;
    for (const g of lueurs) {
      const dx = x - g.x, dy = y - g.y;
      const r = g.rayon;
      if (dx > r || dx < -r || dy > r || dy < -r) continue;
      const f = 1 - Math.hypot(dx, dy) / r;
      if (f > 0) vertIci += f ** 1.6 * 0.5 * g.intensite;
    }
    return Math.min(1.3, l);
  }

  // Teinte selon d'où vient la lumière : orangé du feu, bleu de lune, vert de l'écran
  function teinter(r, g, b, chaud, vert, bleu) {
    const l = chaud + vert + bleu;
    if (chaud > 0.2) {
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
    return [r, g, b];
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
        const v = Math.max(0, Math.min(1, val[i] * (chaud + vert + bleu)));
        const f = v * 5;
        let c = Math.floor(f);
        if (f - c > BAYER[(y % 4) * 4 + (x % 4)]) c++;
        let [r, g, b] = COULEURS[m][Math.min(c, 5)];
        if (!emissif) [r, g, b] = teinter(r, g, b, chaud, vert, bleu);
        const j = i * 4;
        px[j] = r; px[j + 1] = g; px[j + 2] = b; px[j + 3] = 255;
      }
    }
    if (!sansElle) dessinerPerso(px);
    dessinerChat(px);
    // Vapeur du thé
    for (const p of vapeur) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (!dans(x, y)) continue;
      const k = (y * L + x) * 4, a = 0.5 * (1 - p.age / p.vie);
      px[k] += (200 - px[k]) * a; px[k + 1] += (195 - px[k + 1]) * a; px[k + 2] += (210 - px[k + 2]) * a;
    }
    // Poussière qui scintille dans le rayon de lune
    for (const p of poussiere) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (!dans(x, y)) continue;
      const k = (y * L + x) * 4, a = 0.7 * Math.sin((Math.PI * p.age) / p.vie);
      px[k] += (205 - px[k]) * a; px[k + 1] += (222 - px[k + 1]) * a; px[k + 2] += (255 - px[k + 2]) * a;
    }
    // Flammes
    for (const b of bougies) {
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
    ctx.putImageData(image, 0, 0);
  }

  // Un pixel coloré « dans la pièce » : assombri et teinté par la lumière
  function poserEclaire(px, x, y, rgb) {
    if (!dans(x, y)) return;
    const i = y * L + x;
    // Pas la tache de lune du sol : juste un peu de bleu sur les personnages
    const chaud = lumiereEn(x, y), vert = vertIci, bleu = 0.1 + faisceau[i] * 1.2;
    const f = Math.min(1.15, 0.3 + (chaud + vert + bleu) * 0.75);
    const [r, g, b] = teinter(rgb[0] * f, rgb[1] * f, rgb[2] * f, chaud, vert, bleu);
    const j = i * 4;
    px[j] = Math.min(255, r); px[j + 1] = Math.min(255, g); px[j + 2] = Math.min(255, b);
  }

  function dessinerPerso(px) {
    const { pieds } = geo;
    const gauche = geo.px - 8, haut = pieds - 31 - saut;
    masquePerso.fill(0);
    const lignes = spritePerso();
    lignes.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === ".") continue;
        poserEclaire(px, gauche + i, haut + j, RVB_PERSO[c]);
        if (dans(gauche + i, haut + j)) masquePerso[(haut + j) * L + gauche + i] = 1;
      }
    });
    if (pose === "peint") {
      for (const [i, j, c] of PERSO.BRAS_PEINT[brasImage]) {
        poserEclaire(px, gauche + i, haut + j, RVB_PERSO[c]);
        if (dans(gauche + i, haut + j)) masquePerso[(haut + j) * L + gauche + i] = 1;
      }
    }
    // « ! » au-dessus de sa tête quand elle nous entend
    if (pose === "alerte") {
      const ex = geo.px, ey = haut - 10;
      for (let y = ey - 1; y <= ey + 7; y++) for (let x = ex - 2; x <= ex + 2; x++) {
        if (!dans(x, y)) continue;
        const k = (y * L + x) * 4;
        const dedans = x >= ex - 1 && x <= ex + 1 && y >= ey && y <= ey + 6;
        const trait = x === ex && (y <= ey + 3 || y === ey + 5);
        const c = trait ? [178, 40, 50] : dedans ? [244, 238, 220] : [14, 12, 22];
        px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
      }
    }
    // Contour doré quand on la survole (comme un objet interactif)
    if (survol) {
      for (let y = Math.max(1, haut - 2); y < Math.min(H - 1, pieds + 2); y++) {
        for (let x = Math.max(1, gauche - 2); x < Math.min(L - 1, gauche + 22); x++) {
          const i = y * L + x;
          if (masquePerso[i]) continue;
          if (masquePerso[i - 1] || masquePerso[i + 1] || masquePerso[i - L] || masquePerso[i + L]) {
            const j = i * 4;
            px[j] = 242; px[j + 1] = 202; px[j + 2] = 112;
          }
        }
      }
    }
  }

  /* ---------- Le chat endormi sous le bureau (sa queue bouge) ---------- */
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
    if (!geo.chat) return;
    const { x, y } = geo.chat;
    CHAT.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) if (RVB_CHAT[l[i]]) poserEclaire(px, x + i, y + j, RVB_CHAT[l[i]]);
    });
    for (const [i, j] of QUEUES[queue]) poserEclaire(px, x + i, y + j, RVB_CHAT.k);
  }

  function nouvelleVapeur(partout) {
    const t = geo.tasse;
    if (!t) return { x: -1, y: -1, age: 0, vie: 1 };
    const vie = 14 + Math.floor(Math.random() * 10);
    return { x: t.x + Math.random() * 2 - 1, y: t.y, age: partout ? Math.floor(Math.random() * vie) : 0, vie };
  }

  // Animation (~12 images/s, saccadé comme sur PC-98)
  let tic = 0;
  setInterval(() => {
    if (!ouverte || document.hidden || mouvementReduit.matches || ficheOuverte) return;
    tic++;
    for (const b of bougies) {
      b.intensite += (0.9 + Math.random() * 0.2 - b.intensite) * 0.5;
      if (Math.random() < 0.5) b.image = Math.floor(Math.random() * FLAMMES.length);
    }
    for (const g of lueurs) g.intensite = 0.85 + 0.15 * Math.sin(tic * 0.4) + (Math.random() < 0.05 ? -0.2 : 0);
    if (tic % 4 === 0) { defilement++; dessinerEcran(); }
    if (tic % 22 === 0) queue = 1 - queue;
    else if (tic % 22 === 3) queue = 1 - queue;
    vapeur.forEach((p, k) => {
      p.age++;
      p.y -= 0.5;
      p.x += Math.sin((p.age + k * 3) * 0.5) * 0.3;
      if (p.age >= p.vie) vapeur[k] = nouvelleVapeur(false);
    });
    poussiere.forEach((p, k) => {
      p.age++;
      p.y += 0.08;
      p.x += Math.sin((p.age + k * 7) * 0.08) * 0.12;
      if (p.age >= p.vie) poussiere[k] = nouveauGrain(false);
    });
    // Elle peint : le bras va et vient, un pixel de plus sur la toile
    if (pose === "peint") {
      if (tic % 2 === 0) brasImage = (brasImage + 1) % PERSO.BRAS_PEINT.length;
      if (peints < peinture.length && tic % 2 === 1) poserPeinture(peinture[peints++]);
    }
    if (saut > 0 && tic % 2 === 0) saut--;
    // Clignement des yeux, de face
    if (cligne > 0) cligne--;
    else if (--prochainClin <= 0) { cligne = 2; prochainClin = 30 + Math.floor(Math.random() * 40); }
    dessiner();
  }, 80);

  /* ============================================================
     La scène : elle peint, nous entend, se retourne, parle
     ============================================================ */
  let minuteries = [];
  let premiereVisite = true;
  const plus_tard = (fn, ms) => minuteries.push(setTimeout(fn, duree(ms)));
  const annulerMinuteries = () => { minuteries.forEach(clearTimeout); minuteries = []; };

  function jouerScene() {
    annulerMinuteries();
    pose = "peint";
    el.perso.setAttribute("aria-disabled", "true");
    if (mouvementReduit.matches) { seRetourner(true); return; }
    plus_tard(() => {
      pose = "alerte";
      saut = premiereVisite ? 2 : 0;
      dessiner();
      plus_tard(() => {
        pose = "profil";
        dessiner();
        plus_tard(() => seRetourner(false), 200);
      }, premiereVisite ? 750 : 250);
    }, premiereVisite ? 1700 : 900);
  }

  function seRetourner(direct) {
    annulerMinuteries();
    pose = "face";
    saut = 0;
    el.perso.removeAttribute("aria-disabled");
    dessiner();
    if (premiereVisite) {
      premiereVisite = false;
      parler(direct);
    } else montrerConsigne();
  }

  // Sa réplique, tapée lettre par lettre, une seule fois
  let ecriture = null;
  function parler(direct) {
    const texte = DONNEES.replique;
    el.bulle.hidden = false;
    el.repliqueLue.textContent = texte;
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
    ecriture = setTimeout(suivante, 250);
  }
  function finirReplique() {
    clearTimeout(ecriture);
    ecriture = null;
    el.replique.textContent = DONNEES.replique;
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

  /* ============================================================
     La fiche : figurine 3D + panneau de personnage
     ============================================================ */
  let ficheOuverte = false;
  let figurine = null;
  let chargement = null;

  function prechargerFigurine() {
    if (!chargement) {
      chargement = import(URL_FIGURINE)
        .then((module) => { module.prechargerModele(tenue.modele).catch(() => {}); return module; })
        .catch(() => null);
    }
    return chargement;
  }
  async function obtenirFigurine() {
    if (figurine) return figurine;
    const module = await prechargerFigurine();
    if (!module) return null;
    try {
      figurine = module.creerFigurine(el.canvas3d, {
        face: PERSO.SPRITES.face,
        dos: PERSO.SPRITES.dos,
        couleurs: PERSO.COULEURS,
        reduit: mouvementReduit.matches,
        modele: tenue.modele,
        clignement: tenue.yeuxFermes,
      });
    } catch (e) {
      figurine = null; // pas de WebGL : on passera par la carte qui tourne
      return null;
    }
    // On attend le modèle (au plus quelques secondes, sinon les voxels)
    await Promise.race([figurine.pret, new Promise((r) => setTimeout(r, 6000))]);
    return figurine;
  }

  // Où se place la figurine une fois la fiche dépliée : au centre, de trois
  // quarts. Un buste est plus grand et son bas passe sous le fondu au noir.
  const ecranEtroit = matchMedia("(max-width: 720px), (orientation: portrait)");
  function cadrage(deploye) {
    if (!deploye) return { x: 0.5, y: 0.5, zoom: 1, regard: 0 };
    if (tenue.buste) {
      return ecranEtroit.matches ? { x: 0.5, y: 0.36, zoom: 0.8, regard: 0.3 } : { x: 0.5, y: 0.6, zoom: 1.3, regard: 0.35 };
    }
    return ecranEtroit.matches ? { x: 0.5, y: 0.3, zoom: 0.55, regard: 0.3 } : { x: 0.5, y: 0.5, zoom: 1.05, regard: 0.35 };
  }

  // Changer de tenue : le nouveau modèle surgit du cercle, comme à l'ouverture
  let changement = null;
  async function changerTenue(t) {
    if (t === tenue || changement) return;
    tenue = t;
    majTenues();
    const fig = figurine;
    if (!fig || !ficheOuverte) return;
    changement = fig.changerModele(t.modele, t.yeuxFermes).catch(() => {});
    await changement;
    changement = null;
    if (!ficheOuverte || tenue !== t) return;
    fig.apparaitre(() => fig.placer(cadrage(true)));
  }
  // Les boutons des tenues (construits avec la fiche)
  let boutonsTenues = [];
  function majTenues() {
    boutonsTenues.forEach(({ b, t }) => b.setAttribute("aria-pressed", String(t === tenue)));
    const nom = el.panneau.querySelector(".fiche-tenue-nom");
    if (nom) nom.textContent = tenue.nom || "";
  }

  function ouvrirFiche() {
    if (ficheOuverte) return;
    ficheOuverte = true;
    survol = false;
    dessiner();
    cacherBulle();
    el.consigne.hidden = true;
    el.piece.classList.add("zoom-objet", "fiche-eclair");
    plus_tard(async () => {
      el.fiche.hidden = false;
      el.fiche.classList.remove("fiche-deployee", "sans-3d");
      requestAnimationFrame(() => el.fiche.classList.add("est-ouverte"));
      el.fermer.focus({ preventScroll: true });
      const fig = await obtenirFigurine();
      if (!ficheOuverte) return;
      if (fig) {
        fig.placer(cadrage(false));
        fig.apparaitre(deployer);
      } else {
        el.fiche.classList.add("sans-3d");
        plus_tard(deployer, 1700);
      }
    }, 550);
  }

  function deployer() {
    if (!ficheOuverte) return;
    el.fiche.classList.add("fiche-deployee");
    if (figurine) figurine.placer(cadrage(true));
    compterNombres();
  }

  function fermerFiche() {
    if (!ficheOuverte) return;
    ficheOuverte = false;
    annulerMinuteries();
    el.fiche.classList.remove("est-ouverte", "fiche-deployee");
    el.fiche.hidden = true;
    if (figurine) figurine.pause();
    el.piece.classList.remove("zoom-objet", "fiche-eclair");
    montrerConsigne();
    el.perso.focus({ preventScroll: true });
  }

  // Les nombres des attributs défilent jusqu'à leur valeur
  function compterNombres() {
    const nombres = el.panneau.querySelectorAll("[data-valeur]");
    if (mouvementReduit.matches) return; // les valeurs finales sont déjà écrites
    const debut = performance.now() + 500;
    const etape = (t) => {
      const e = Math.max(0, Math.min(1, (t - debut) / 900));
      nombres.forEach((n) => { n.textContent = String(Math.round(Number(n.dataset.valeur) * (1 - (1 - e) ** 3))); });
      if (e < 1 && ficheOuverte) requestAnimationFrame(etape);
    };
    requestAnimationFrame(etape);
  }

  /* ---------- Contenu du panneau (depuis js/whoami.js) ---------- */
  const creer = (balise, classe, texte) => {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    if (texte !== undefined) n.textContent = texte;
    return n;
  };

  // Petit portrait (la tête du sprite) pour l'en-tête
  function portrait() {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    c.className = "fiche-portrait";
    c.setAttribute("aria-hidden", "true");
    const g = c.getContext("2d");
    PERSO.SPRITES.face.slice(0, 16).forEach((l, y) => {
      for (let x = 0; x < l.length; x++) {
        const col = PERSO.COULEURS[l[x]];
        if (!col || l[x] === ".") continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  // Étoile en pixels (7×7)
  const ETOILE = '<svg viewBox="0 0 7 7" aria-hidden="true" focusable="false"><path d="M3 0h1v2h3v1h-1v1h-1v1h1v2h-1v-1h-1v-1h-1v1h-1v1h-1v-2h1v-1h-1v-1h-1v-1h3z" fill="currentColor"/></svg>';

  // Écran de personnage façon jeu : barre du haut (onglets, niveau,
  // rareté), identité et onglet choisi à gauche, elle au centre, équipement
  // à droite (tenues, compétences, fiche de l'objet survolé), attributs en
  // bas, rappel des touches tout en bas
  function construireFiche() {
    const d = DONNEES;
    const blocs = [];
    const bloc = (balise, classe) => {
      const s = creer(balise, `fiche-bloc ${classe}`);
      blocs.push(s);
      return s;
    };
    const touche = (texte) => creer("kbd", "fiche-touche", texte);
    const losange = () => {
      const l = creer("span", "fiche-losange");
      l.setAttribute("aria-hidden", "true");
      return l;
    };

    /* ----- Haut : onglets au centre, niveau et rareté à droite ----- */
    const haut = bloc("div", "fiche-haut");
    const navigation = creer("div", "fiche-navigation");
    const onglets = creer("div", "fiche-onglets");
    onglets.setAttribute("role", "tablist");
    onglets.setAttribute("aria-label", "Fiche");
    const toucheQ = touche("Q"), toucheE = touche("E");
    toucheQ.setAttribute("aria-hidden", "true");
    toucheE.setAttribute("aria-hidden", "true");
    navigation.append(toucheQ, onglets, toucheE);

    const etat = creer("div", "fiche-etat");
    const niveau = creer("div", "fiche-niveau");
    const insigne = creer("span", "fiche-insigne");
    insigne.append(creer("span", "", String(d.niveau)));
    insigne.setAttribute("aria-label", `Niveau ${d.niveau}`);
    const exp = creer("div", "fiche-exp");
    const barreExp = creer("div", "fiche-barre fiche-barre-exp");
    barreExp.setAttribute("role", "img");
    barreExp.setAttribute("aria-label", `Expérience : ${d.exp[0]} sur ${d.exp[1]}`);
    const remplissage = creer("i");
    remplissage.style.setProperty("--v", `${(d.exp[0] / d.exp[1]) * 100}%`);
    barreExp.append(remplissage);
    exp.append(creer("span", "fiche-libelle", "EXP"), barreExp, creer("span", "fiche-exp-valeur", `${d.exp[0]} / ${d.exp[1]}`));
    niveau.append(insigne, exp);
    etat.append(niveau);
    if (d.rang) etat.append(creer("span", "fiche-rang", d.rang));
    haut.append(navigation, etat);

    /* ----- Gauche : identité, puis le contenu de l'onglet ----- */
    const gauche = bloc("div", "fiche-gauche");
    const entete = creer("header", "fiche-entete");
    const titres = creer("div", "fiche-titres");
    const classe = creer("p", "fiche-classe");
    classe.append(losange(), d.classe);
    titres.append(classe);
    const nom = creer("h2", "fiche-nom", d.nom);
    nom.id = "fiche-nom";
    titres.append(nom);
    const etoiles = creer("p", "fiche-etoiles");
    etoiles.setAttribute("aria-label", `Rareté : ${d.etoiles} étoiles`);
    etoiles.innerHTML = ETOILE.repeat(d.etoiles);
    titres.append(etoiles);
    entete.append(portrait(), titres);
    gauche.append(entete);
    if (d.devise) gauche.append(creer("p", "fiche-devise", `« ${d.devise} »`));

    const pages = [];
    const page = (titre) => {
      const p = creer("section", "fiche-page");
      pages.push({ titre, p });
      return p;
    };

    // Onglet « Personnage » : le profil en bref
    const profil = page("Personnage");
    const dl = creer("dl", "fiche-profil");
    const ligneProfil = (cle, valeur) => dl.append(creer("dt", "", cle), creer("dd", "", valeur));
    ligneProfil("Classe", d.classe);
    ligneProfil("Niveau", String(d.niveau));
    if (d.rang) ligneProfil("Rang", `${d.rang} · ${"★".repeat(d.etoiles)}`);
    ligneProfil("Expérience", `${d.exp[0]} / ${d.exp[1]}`);
    if (d.competences) ligneProfil("Compétences", String(d.competences.length));
    profil.append(dl);

    // Onglet « Histoire »
    if (d.histoire && d.histoire.length) {
      const h = page("Histoire");
      for (const p of d.histoire) h.append(creer("p", "", p));
    }

    // Onglet « Quêtes » : une frise, de la plus récente à la plus ancienne
    if (d.quetes && d.quetes.length) {
      const q = page("Quêtes");
      const ol = creer("ol", "fiche-quetes");
      for (const e of d.quetes) {
        const li = creer("li");
        li.append(creer("span", "fiche-annee", e.annee), creer("span", "fiche-quete", e.titre));
        if (e.lieu) li.append(creer("span", "fiche-lieu", e.lieu));
        ol.append(li);
      }
      q.append(ol);
    }

    const boutons = pages.map(({ titre, p }, k) => {
      const b = creer("button", "fiche-onglet", titre);
      b.type = "button";
      b.id = `fiche-onglet-${k}`;
      p.id = `fiche-page-${k}`;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", p.id);
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", b.id);
      b.addEventListener("click", (e) => { e.stopPropagation(); choisir(k); });
      onglets.append(b);
      gauche.append(p);
      return b;
    });
    let ongletActif = 0;
    function choisir(k, focus = false) {
      ongletActif = k;
      boutons.forEach((b, i) => {
        b.setAttribute("aria-selected", String(i === k));
        b.tabIndex = i === k ? 0 : -1;
        pages[i].p.hidden = i !== k;
      });
      if (focus) boutons[k].focus();
    }
    const voisin = (sens) => (ongletActif + sens + boutons.length) % boutons.length;
    // Flèches dans les onglets, Q / E partout dans la fiche (comme L1 / R1)
    onglets.addEventListener("keydown", (e) => {
      const sens = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!sens) return;
      e.preventDefault();
      choisir(voisin(sens), true);
    });
    el.fiche.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !el.fiche.classList.contains("fiche-deployee")) return;
      const sens = { q: -1, e: 1 }[e.key.toLowerCase()];
      if (!sens) return;
      e.preventDefault();
      choisir(voisin(sens));
    });
    choisir(0);

    /* ----- Droite : l'équipement ----- */
    const droite = bloc("div", "fiche-droite");
    droite.append(creer("h3", "fiche-sous-titre", "Équipement"));

    // Tenues : petites cases, le nom de celle portée à côté
    if (TENUES.length > 1) {
      const ligne = creer("div", "fiche-tenues");
      const libelle = creer("p", "fiche-tenues-libelle");
      libelle.append(creer("span", "fiche-libelle", "Tenue"), creer("span", "fiche-tenue-nom"));
      const liste = creer("div", "fiche-tenues-liste");
      boutonsTenues = TENUES.map((t) => {
        const b = creer("button", "fiche-case fiche-tenue");
        b.type = "button";
        b.setAttribute("aria-label", `Tenue : ${t.nom}`);
        b.title = t.nom;
        const img = creer("img");
        img.src = t.vignette;
        img.alt = "";
        img.loading = "lazy";
        b.append(img);
        b.addEventListener("click", (e) => { e.stopPropagation(); changerTenue(t); });
        // On commence à télécharger le modèle dès le survol
        const precharger = () => prechargerFigurine().then((m) => m && m.prechargerModele(t.modele).catch(() => {}));
        b.addEventListener("pointerenter", precharger, { once: true });
        b.addEventListener("focus", precharger, { once: true });
        liste.append(b);
        return { b, t };
      });
      ligne.append(libelle, liste);
      droite.append(ligne);
    }

    // Compétences : des cases d'inventaire ; survol ou focus = sa fiche
    const competences = (d.competences || []).map((c) => (typeof c === "string" ? { nom: c } : c));
    if (competences.length) {
      const grille = creer("ul", "fiche-competences");
      grille.setAttribute("aria-label", "Compétences");
      const detail = creer("div", "fiche-detail");
      detail.setAttribute("aria-live", "polite");
      const montrer = (c, b) => {
        grille.querySelectorAll(".est-choisie").forEach((x) => x.classList.remove("est-choisie"));
        b.classList.add("est-choisie");
        const titre = creer("p", "fiche-detail-nom", c.nom);
        const type = creer("p", "fiche-detail-type");
        type.append(losange(), c.niveau ? `Compétence · Niv. ${c.niveau}` : "Compétence");
        detail.replaceChildren(titre, type);
        if (c.texte) detail.append(creer("p", "fiche-detail-texte", c.texte));
      };
      competences.forEach((c, k) => {
        const li = creer("li");
        const b = creer("button", "fiche-case fiche-objet");
        b.type = "button";
        if (c.niveau) b.append(creer("span", "fiche-objet-niveau", String(c.niveau)));
        b.append(creer("span", "fiche-objet-nom", c.nom));
        const voir = () => montrer(c, b);
        b.addEventListener("pointerenter", voir);
        b.addEventListener("focus", voir);
        b.addEventListener("click", (e) => { e.stopPropagation(); voir(); });
        li.append(b);
        grille.append(li);
        if (k === 0) montrer(c, b);
      });
      droite.append(grille, detail);
    }

    if (d.liens && d.liens.length) {
      const nav = creer("nav", "fiche-liens");
      nav.setAttribute("aria-label", "Liens");
      for (const l of d.liens) {
        const a = creer("a", "btn-cadre", `${l.libelle} ▷`);
        a.href = l.url;
        if (/^https?:/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
        nav.append(a);
      }
      droite.append(nav);
    }

    /* ----- Bas : les attributs en gros chiffres ----- */
    const bas = bloc("section", "fiche-bas");
    bas.setAttribute("aria-label", "Attributs");
    const ul = creer("ul", "fiche-attributs");
    for (const a of d.attributs || []) {
      const li = creer("li");
      const barre = creer("span", "fiche-barre");
      const r = creer("i");
      r.style.setProperty("--v", `${a.valeur}%`);
      barre.append(r);
      barre.setAttribute("aria-hidden", "true");
      const n = creer("span", "fiche-nombre", String(a.valeur));
      n.dataset.valeur = a.valeur;
      li.append(losange(), creer("span", "fiche-attribut", a.libelle), n, barre);
      ul.append(li);
    }
    bas.append(ul);

    /* ----- Tout en bas : les touches ----- */
    const aide = bloc("div", "fiche-touches");
    aide.setAttribute("aria-hidden", "true");
    const rappel = (touches, texte) => {
      const s = creer("span", "fiche-rappel");
      s.append(...touches.map(touche), creer("span", "", texte));
      aide.append(s);
    };
    rappel(["Glisser"], "Tourner");
    rappel(["Q", "E"], "Onglets");
    if (TENUES.length > 1) rappel(["Clic"], "Changer de tenue");
    rappel(["Échap"], "Retour");

    // Image de fond facultative (sinon l'atelier, flouté, derrière)
    if (d.fond) el.fiche.style.setProperty("--fiche-image", `url("${new URL(d.fond, document.baseURI).href}")`);

    // Chaque bloc arrive à son tour quand la fiche se déplie
    blocs.forEach((b, k) => b.style.setProperty("--i", k));
    el.panneau.replaceChildren(...blocs);
    majTenues();

    // Carte de secours (sans WebGL) : le sprite de face et de dos
    if (el.repli) {
      const carte = creer("div", "fiche-carte");
      for (const [nomSprite, cote] of [["face", "devant"], ["dos", "derriere"]]) {
        const c = document.createElement("canvas");
        c.width = 16;
        c.height = 32;
        c.className = `fiche-carte-${cote}`;
        const g = c.getContext("2d");
        PERSO.SPRITES[nomSprite].forEach((l, y) => {
          for (let x = 0; x < l.length; x++) {
            if (l[x] === ".") continue;
            g.fillStyle = PERSO.COULEURS[l[x]];
            g.fillRect(x, y, 1, 1);
          }
        });
        carte.append(c);
      }
      el.repli.replaceChildren(carte);
    }
  }

  /* ============================================================
     Ouverture / fermeture de la pièce
     ============================================================ */
  function ouvrir(opts = {}) {
    options = opts;
    ouverte = true;
    construire();
    survol = false;
    el.consigne.hidden = true;
    cacherBulle();
    dessiner();
    el.piece.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.piece.classList.add("est-ouverte")));
    el.piece.focus({ preventScroll: true });
    prechargerFigurine();
    // La scène commence quand le fondu d'entrée est fini
    plus_tard(jouerScene, 500);
  }

  function fermer() {
    if (!ouverte) return;
    fermerFiche();
    annulerMinuteries();
    cacherBulle();
    ouverte = false;
    el.piece.classList.remove("est-ouverte");
    el.piece.hidden = true;
  }

  function surTouche(e) {
    if (!ouverte || e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (ficheOuverte) fermerFiche();
    else if (options.retour) options.retour();
  }

  construireFiche();
  el.etiquette.textContent = DONNEES.etiquette || "";
  el.perso.setAttribute("aria-label", `${DONNEES.etiquette || "Elle"} : voir sa fiche de personnage`);
  el.perso.addEventListener("click", (e) => {
    e.stopPropagation();
    // Tant qu'elle ne s'est pas retournée, un clic fait avancer la scène
    if (pose !== "face") { seRetourner(true); return; }
    ouvrirFiche();
  });
  const allumer = (oui) => {
    if (ficheOuverte || pose !== "face" || survol === oui) return;
    survol = oui;
    dessiner();
  };
  el.perso.addEventListener("pointerenter", () => allumer(true));
  el.perso.addEventListener("pointerleave", () => allumer(false));
  el.perso.addEventListener("focus", () => allumer(true));
  el.perso.addEventListener("blur", () => allumer(false));
  el.retour.addEventListener("click", (e) => {
    e.stopPropagation();
    if (options.retour) options.retour();
  });
  el.fermer.addEventListener("click", (e) => {
    e.stopPropagation();
    fermerFiche();
  });
  el.piece.addEventListener("click", (e) => {
    e.stopPropagation(); // pas de clic « avancer » de l'intro
    // Un clic dans la pièce pendant qu'elle se retourne ou parle : on avance
    if (ficheOuverte) return;
    if (pose !== "face") seRetourner(true);
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
      if (figurine && ficheOuverte) {
        figurine.redimensionner();
        figurine.placer(cadrage(el.fiche.classList.contains("fiche-deployee")));
      }
    }, 150);
  });

  // Aperçu pour la salle aux trois portes (js/fond-pixel.js) : la pièce,
  // dessinée hors de l'écran, qu'on devine par l'arche de sa porte ;
  // x / bas = point du décor posé au milieu du seuil
  // (le chevalet ; elle n'y est pas : on ne la voit que dans la pièce où on entre)
  function apercu() {
    if (ouverte) return null;
    construire();
    survol = false;
    sansElle = true;
    dessiner();
    sansElle = false;
    return { image: ctx.getImageData(0, 0, L, H), x: geo.px + 18, bas: geo.pieds + 6 };
  }

  window.PIECES = window.PIECES || {};
  window.PIECES.whoami = { ouvrir, fermer, apercu };
})();
