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

    // Zoom de départ : assez fort pour que seule la porte du milieu soit visible
    const p = portes[Math.floor((nbPortes - 1) / 2)];
    const ecartVoisine = nbPortes > 1 ? espacement - demiLargeur : L / 2;
    const zoom = Math.min(3, Math.max(1.6, (L / 2) / ecartVoisine * 1.08));

    // Variables CSS (en % de l'écran) lues par css/style.css
    const pct = (v, total) => `${(v / total) * 100}%`;
    const def = (nom, valeur) => decor.style.setProperty(nom, valeur);
    def("--porte-largeur", pct(demiLargeur * 2, L));
    def("--porte-hauteur", pct(hauteur, H));
    def("--porte-haut", pct(bas - hauteur + 1, H));
    def("--porte-espacement", pct(espacement, L));
    def("--porte-centre", pct(premiere + ((nbPortes - 1) / 2) * espacement, L));
    def("--zoom", zoom.toFixed(3));
    def("--zoom-x", pct(nbPortes % 2 ? p.cx : L / 2, L));
    def("--zoom-y", pct(bas - hauteur / 2, H));
    def("--pixel", `${pixel}px`);
    // Stèle, contour compris, en % du bouton de la porte (qui commence en
    // cx - demiLargeur, bas - hauteur + 1) : le libellé HTML invisible, et
    // donc les flèches ▷ ◁, sont posés exactement sur la pierre dessinée
    const p0 = portes[0];
    def("--plaque-gauche", pct(p0.plaque.x - 1 - (p0.cx - demiLargeur), demiLargeur * 2));
    def("--plaque-haut", pct(plaqueY - 1 - (hautArche + 1), hauteur));
    def("--plaque-hauteur", pct(steles.h + 2, hauteur));
    def("--plaque-largeur", pct(steles.l + 2, demiLargeur * 2));
    decor.classList.add("avec-linteaux");

    calculerTexture();
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
    for (const { plaque } of portes) graverStele(plaque);
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
   *            visiteur éclaire avec une lampe de poche.
   * js/intro.js envoie l'événement "scene" sur #decor : { etat }. */
  const PERSO = window.PERSONNAGE_PIXEL;
  let scene = "yeux";
  const yeux = { ouverts: true, attente: 30 };

  /* ---------- Lampe de poche (salle aux trois portes) ----------
   * Tenue en bas à droite, en vue subjective : elle vise la souris (ou, au
   * clavier / au doigt, la porte choisie). Un faisceau part de la lampe et
   * un disque de lumière éclaire là où elle vise ; la torche du fond ne
   * donne plus qu'une faible lueur. */
  const TORCHE_DANS_LE_NOIR = 0.5; // part de la torche gardée dans la salle sombre
  const lampe = { x: 0, y: 0, origineX: 0, origineY: 0, rayon: 40 };

  function placerLampe() {
    lampe.origineX = Math.round(L * 0.84);
    lampe.origineY = H + 4; // la main est sous le bord de l'écran
    lampe.rayon = Math.round(Math.min(L, H) * 0.24);
    viserPorte(Math.floor((portes.length - 1) / 2));
  }

  // Vise le milieu de l'ouverture d'une porte
  function viserPorte(k) {
    const p = portes[k];
    if (!p) return;
    lampe.x = p.cx;
    lampe.y = p.bas - p.hauteur / 2;
  }

  // Lumière de la lampe en (x, y) : disque au point visé + faisceau depuis la lampe
  function lumiereLampe(x, y) {
    const disque = Math.max(0, 1 - Math.hypot(x - lampe.x, y - lampe.y) / lampe.rayon);
    let faisceau = 0;
    const dx = lampe.x - lampe.origineX, dy = lampe.y - lampe.origineY;
    const longueur = Math.hypot(dx, dy) || 1;
    const vx = x - lampe.origineX, vy = y - lampe.origineY;
    const t = (vx * dx + vy * dy) / (longueur * longueur); // 0 = lampe, 1 = point visé
    if (t > 0 && t < 1.15) {
      const ecart = Math.abs(vx * dy - vy * dx) / longueur;
      const largeur = 3 + t * lampe.rayon * 0.9;          // le faisceau s'évase
      faisceau = Math.max(0, 1 - ecart / largeur) * 0.45 * (t > 1 ? (1.15 - t) / 0.15 : 1);
    }
    return Math.min(1.25, Math.max(disque ** 0.6 * 1.25, faisceau));
  }

  /* ---------- Éclairage + tramage ---------- */
  function dessiner(rayon) {
    const px = image.data;
    const n = palette.length - 1;
    const avecFumee = calculerDensite();
    const sombre = scene === "portes";
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
          if (sombre) eclairage = Math.max(eclairage * TORCHE_DANS_LE_NOIR, lumiereLampe(x, y));
          // Dans une ouverture, la lampe révèle le couloir qui est derrière
          const tex = sombre && couloir[i] >= 0 ? Math.max(texture[i], couloir[i] * 3 * lumiereLampe(x, y)) : texture[i];
          let v = Math.min(1, tex * eclairage + 0.015);

          // Fumée par-dessus le mur (pas sur les stèles : les noms restent lisibles),
          // éclairée elle aussi pour rester visible dans l'ombre
          if (avecFumee && densite[i] > 0) {
            const a = densite[i];
            v = v * (1 - a) + (0.6 + 0.3 * eclairage) * a;
          }

          // Entre deux couleurs de la palette, le seuil de Bayer décide
          const f = v * n;
          c = Math.floor(f);
          if (f - c > BAYER[(y % 4) * 4 + (x % 4)]) c++;
        }
        const [r, g, b] = palette[Math.min(c, n)];
        const j = i * 4;
        px[j] = r; px[j + 1] = g; px[j + 2] = b; px[j + 3] = 255;
      }
    }
    dessinerPremierPlan(px);
    ctx.putImageData(image, 0, 0);
  }

  // Yeux (scène "yeux") ou lampe de poche (scène "portes"), par-dessus le décor
  function dessinerPremierPlan(px) {
    const poser = (x, y, [r, g, b]) => {
      if (x < 0 || y < 0 || x >= L || y >= H) return;
      const j = (y * L + x) * 4;
      px[j] = r; px[j + 1] = g; px[j + 2] = b;
    };
    if (scene === "yeux" && PERSO) {
      // Les yeux brillent, à mi-hauteur de l'arche du milieu
      const p = portes[Math.floor((portes.length - 1) / 2)];
      PERSO.dessinerYeux(p.cx, Math.round(p.bas - p.hauteur * 0.45) + PERSO.HAUTEUR - 9, yeux.ouverts, poser);
    } else if (scene === "portes") {
      dessinerLampe(poser);
    }
  }

  // Corps de la lampe : un cylindre sombre orienté vers le point visé,
  // tête plus large avec la vitre allumée
  const COULEURS_LAMPE = {
    contour: [14, 12, 22], corps: [52, 48, 74], reflet: [92, 90, 120],
    tete: [72, 68, 96], vitre: [244, 240, 255],
  };
  function dessinerLampe(poser) {
    const dx = lampe.x - lampe.origineX, dy = lampe.y - lampe.origineY;
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l;     // direction du faisceau
    const nx = -uy, ny = ux;            // perpendiculaire
    const LONGUEUR = 34, TETE = 8;
    for (let t = 0; t <= LONGUEUR; t += 0.5) {
      const estTete = t > LONGUEUR - TETE;
      const demi = estTete ? 6 : 4;
      for (let w = -demi; w <= demi; w += 0.5) {
        let couleur = COULEURS_LAMPE.corps;
        if (Math.abs(w) > demi - 1) couleur = COULEURS_LAMPE.contour;
        else if (t >= LONGUEUR - 1) couleur = COULEURS_LAMPE.vitre;
        else if (estTete) couleur = COULEURS_LAMPE.tete;
        else if (w < -demi + 2) couleur = COULEURS_LAMPE.reflet;
        poser(Math.round(lampe.origineX + ux * t + nx * w), Math.round(lampe.origineY + uy * t + ny * w), couleur);
      }
    }
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

  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");

  // La lampe suit la souris (ou le doigt) ; un seul dessin par image d'écran
  let dessinPrevu = false;
  function viserPointeur(e) {
    if (scene !== "portes") return;
    const r = canvas.getBoundingClientRect();
    lampe.x = ((e.clientX - r.left) / r.width) * L;
    lampe.y = ((e.clientY - r.top) / r.height) * H;
    if (dessinPrevu) return;
    dessinPrevu = true;
    requestAnimationFrame(() => {
      dessinPrevu = false;
      dessiner(rayon);
    });
  }
  window.addEventListener("pointermove", viserPointeur, { passive: true });
  window.addEventListener("pointerdown", viserPointeur, { passive: true });

  decor.addEventListener("fumee", (e) => {
    const nouvelle = e.detail.porte >= 0 && e.detail.porte !== fumee.porte;
    fumee.porte = e.detail.porte;
    // Au clavier, la lampe se tourne vers la porte choisie
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
    if (scene === "portes") placerLampe(); // la lampe vise d'abord la porte du milieu
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
