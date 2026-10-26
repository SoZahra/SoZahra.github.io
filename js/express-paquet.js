/*
 * Accueil et projets de la version classique (index.html), en une scène.
 *
 * À l'accueil, les cartes des projets flottent dans l'espace et avancent
 * doucement vers nous, en boucle ; une profondeur de champ les rend floues,
 * sauf à une certaine distance où elles passent nettes. Quelques étiquettes
 * « • Titre » les accompagnent. Au défilement (proche : 0 → 1), une carte par
 * projet vient se ranger dans un paquet en éventail, carrées et épaisses ;
 * les autres nous dépassent et s'effacent. Ensuite, la carte du dessus
 * s'envole à chaque projet.
 *
 * Le flou est précalculé : pour chaque projet, une planche de 4 niveaux de
 * flou (net → très flou, bords compris) ; un petit shader mélange les deux
 * niveaux voisins selon la distance de la carte au plan net.
 *
 * Image d'une carte : `image` du projet (js/projets.js) si elle existe,
 * recadrée au carré ; sinon un carré uni avec le numéro et le titre.
 *
 *   const p = creerPaquet(canvas, projets, etiquettes);   // projets : [{ p, cat }]
 *   p.maj(f, t, proche, sx, sy)
 *        f : projet du dessus (peut être fractionnaire) ; t : temps (s) ;
 *        proche : 0 = accueil, cartes en vol → 1 = paquet ; sx, sy : souris (−1 à 1)
 *   p.redimensionner()
 */
import * as THREE from "./vendor/three.module.min.js";

const deux = (n) => String(n).padStart(2, "0");
const sansExemple = (t) => t.replace(/^Exemple\s*—\s*/, "");
const lisse = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const COULEURS = [
  { fond: "#151515", texte: "#f4f4f2" },
  { fond: "#ff4a3d", texte: "#151515" },
  { fond: "#f4f4f2", texte: "#151515" },
  { fond: "#8d8a86", texte: "#f4f4f2" },
];
const POLICE = "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif";
const TRANCHE = 0x2a2928; // bord des cartes, comme un carton épais

const COTE = 2.2;          // côté d'une carte
const CASE = 512;          // une case de la planche de flou
const MARGE = 80;          // marge transparente autour de la carte, pour que le flou déborde
const FLOUS = [0, 7, 16, 30]; // rayon de flou (px) de chaque niveau
const NET = 11;            // distance (devant la caméra) où les cartes sont nettes
const PROFONDEUR = 30;     // épaisseur du champ de cartes en vol
const VITESSE = 1.1;       // avancée des cartes en vol (unités / s)

/* ---------- Carré uni : numéro en haut, titre en bas ---------- */
function dessinerCarre(c, { p }, i) {
  const C = c.width;
  const g = c.getContext("2d");
  const { fond, texte } = COULEURS[i % COULEURS.length];
  g.fillStyle = fond;
  g.fillRect(0, 0, C, C);
  g.fillStyle = texte;
  g.font = `500 ${C * 0.045}px ${POLICE}`;
  g.fillText(deux(i + 1), C * 0.08, C * 0.12);
  g.font = `800 ${C * 0.08}px ${POLICE}`;
  const mots = sansExemple(p.titre).toUpperCase().split(" "), lignes = [];
  let ligne = "";
  for (const m of mots) {
    const essai = ligne ? `${ligne} ${m}` : m;
    if (g.measureText(essai).width > C * 0.84 && ligne) { lignes.push(ligne); ligne = m; } else ligne = essai;
  }
  lignes.push(ligne);
  lignes.forEach((l, k) => g.fillText(l, C * 0.08, C * 0.9 - (lignes.length - 1 - k) * C * 0.09));
}

/* ---------- Planche de flou : 4 niveaux en 2 × 2 cases ---------- */
const filtreCanvas = "filter" in CanvasRenderingContext2D.prototype;
function dessinerPlanche(planche, carte) {
  const g = planche.getContext("2d");
  const cote = CASE - 2 * MARGE;
  g.clearRect(0, 0, planche.width, planche.height);
  FLOUS.forEach((r, n) => {
    const x = (n % 2) * CASE + MARGE, y = Math.floor(n / 2) * CASE + MARGE;
    if (!r) { g.drawImage(carte, x, y, cote, cote); return; }
    if (filtreCanvas) {
      g.filter = `blur(${r}px)`;
      g.drawImage(carte, x, y, cote, cote);
      g.filter = "none";
      return;
    }
    // sans filtre canvas (Safari) : on réduit fort puis on agrandit, ce qui floute
    const k = Math.max(4, Math.round(cote / (r * 0.9)));
    const petit = document.createElement("canvas");
    const m = Math.ceil(k * (MARGE / cote));
    petit.width = petit.height = k + 2 * m;
    petit.getContext("2d").drawImage(carte, m, m, k, k);
    g.imageSmoothingQuality = "high";
    g.drawImage(petit, x - MARGE, y - MARGE, CASE, CASE);
  });
}

const SOMMETS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// mélange de deux niveaux de flou voisins ; la planche est en espace sRGB brut
const FRAGMENTS = /* glsl */ `
  uniform sampler2D planche;
  uniform float niveau;
  uniform float opacite;
  uniform float teinte;
  varying vec2 vUv;
  vec4 lire(float n) {
    vec2 decalage = vec2(mod(n, 2.0) * 0.5, 0.5 - floor(n / 2.0) * 0.5);
    return texture2D(planche, vUv * 0.5 + decalage);
  }
  void main() {
    float n0 = floor(niveau);
    float n1 = min(n0 + 1.0, 3.0);
    vec4 c = mix(lire(n0), lire(n1), niveau - n0);
    gl_FragColor = vec4(c.rgb * teinte, c.a * opacite);
  }
`;

export function creerPaquet(canvas, projets, etiquettes) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  let zPres = 11, xPres = 1.9; // cadrage du paquet (recalculé au redimensionnement)

  // Une planche (4 niveaux de flou) et une face nette par projet
  const textures = projets.map((projet, i) => {
    const carte = document.createElement("canvas");
    carte.width = carte.height = 1024;
    const planche = document.createElement("canvas");
    planche.width = planche.height = CASE * 2;
    const face = new THREE.CanvasTexture(carte);
    face.colorSpace = THREE.SRGBColorSpace;
    face.anisotropy = 8;
    const flou = new THREE.CanvasTexture(planche);
    const redessiner = (image) => {
      if (image) {
        // recadrage au carré, centré
        const { width: l, height: h } = image;
        const k = Math.min(l, h);
        carte.getContext("2d").drawImage(image, (l - k) / 2, (h - k) / 2, k, k, 0, 0, 1024, 1024);
      } else dessinerCarre(carte, projet, i);
      dessinerPlanche(planche, carte);
      face.needsUpdate = flou.needsUpdate = true;
    };
    redessiner();
    // la police arrive parfois après le premier dessin : on redessine
    if (document.fonts && !projet.p.image) document.fonts.ready.then(() => redessiner());
    if (projet.p.image) new THREE.TextureLoader().load(projet.p.image, (t) => redessiner(t.image));
    return { face, flou };
  });

  // Une carte : un plan flou (toujours) et, pour celles du paquet, une boîte
  // épaisse nette qui prend le relais à l'arrivée
  const cotePlan = COTE * CASE / (CASE - 2 * MARGE);
  const geoPlan = new THREE.PlaneGeometry(cotePlan, cotePlan);
  const geoBoite = new THREE.BoxGeometry(COTE, COTE, 0.035);
  const hasard = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();

  function fabriquerCarte(k, principale) {
    const plan = new THREE.Mesh(geoPlan, new THREE.ShaderMaterial({
      uniforms: { planche: { value: textures[k].flou }, niveau: { value: 0 }, opacite: { value: 1 }, teinte: { value: 1 } },
      vertexShader: SOMMETS, fragmentShader: FRAGMENTS, transparent: true, depthWrite: false,
    }));
    const carte = { k, principale, plan, boite: null };
    if (principale) {
      const tranche = new THREE.MeshBasicMaterial({ color: TRANCHE, transparent: true });
      const face = new THREE.MeshBasicMaterial({ map: textures[k].face, transparent: true });
      const dos = new THREE.MeshBasicMaterial({ color: 0x1d1c1b, transparent: true });
      // ordre des faces d'une BoxGeometry : +x, −x, +y, −y, +z (face), −z (dos)
      carte.boite = new THREE.Mesh(geoBoite, [tranche, tranche, tranche, tranche, face, dos]);
      scene.add(carte.boite);
    }
    // position de vol : répartie dans le champ, un peu de biais
    carte.vol = {
      x: (hasard() * 2 - 1) * 7.5, y: (hasard() * 2 - 1) * 4, z: -hasard() * PROFONDEUR,
      ry: (hasard() * 2 - 1) * 0.5, rz: (hasard() * 2 - 1) * 0.12,
      echelle: principale ? 0.6 : 0.4 + hasard() * 0.3, phase: hasard() * 6.3,
    };
    scene.add(plan);
    return carte;
  }
  const n = Math.max(1, projets.length);
  const cartes = projets.map((_, k) => fabriquerCarte(k, true));
  // des échos des projets pour peupler le champ
  for (let i = 0; i < Math.max(6, 14 - n); i++) cartes.push(fabriquerCarte(i % n, false));

  // Étiquettes « • Titre » à côté des cartes principales, pendant le vol
  const libelles = cartes.filter((c) => c.principale).map((c) => {
    const e = document.createElement("span");
    e.className = "etiquette";
    e.textContent = sansExemple(projets[c.k].p.titre);
    if (etiquettes) etiquettes.append(e);
    return { carte: c, el: e };
  });

  function redimensionner() {
    const l = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    // en portrait, on recule et le paquet se recentre
    zPres = camera.aspect < 1 ? 11 / Math.max(camera.aspect, 0.55) : 11;
    xPres = camera.aspect < 1 ? 1.1 : 1.9;
    camera.updateProjectionMatrix();
  }

  // Pose dans le paquet de la carte k quand le projet f est dessus
  function poseDansPaquet(k, f) {
    const s = k - f;
    if (s >= 0) {
      return {
        p: new THREE.Vector3(xPres - s * 0.42, 0.15 - s * 0.16, -s * 0.42),
        r: new THREE.Euler(-0.12 - s * 0.02, 0.62 + s * 0.09, 0.3 + s * 0.04),
        ombre: Math.max(0.45, 1 - s * 0.1), alpha: 1,
      };
    }
    // la carte partie s'envole vers la droite en tournant, et s'efface
    const u = Math.min(1, -s);
    return {
      p: new THREE.Vector3(xPres + u * 4.5, 0.15 + u * 1.6, u * 2),
      r: new THREE.Euler(-0.12 - u * 0.5, 0.62 - u * 1.6, 0.3 + u * 0.4),
      ombre: 1, alpha: 1 - u,
    };
  }

  const v = new THREE.Vector3();
  function maj(f, t = 0, proche = 1, sx = 0, sy = 0) {
    const e = lisse(0, 1, proche);
    // la caméra suit un peu la souris pendant le vol
    camera.position.set(sx * 0.5 * (1 - e), -sy * 0.3 * (1 - e), zPres);
    camera.lookAt(sx * 0.2 * (1 - e), 0, 0);

    cartes.forEach((c) => {
      const o = c.vol;
      // --- en vol : la carte avance vers nous, en boucle ---
      const avance = c.principale ? t * VITESSE : t * VITESSE + e * 14; // les échos filent au défilement
      const zc = ((((o.z + avance) % PROFONDEUR) + PROFONDEUR) % PROFONDEUR) - PROFONDEUR + 1; // de −29 à 1
      const d = -zc; // distance devant la caméra
      const pVol = new THREE.Vector3(o.x, o.y + Math.sin(t * 0.6 + o.phase) * 0.15, zPres + zc);
      const rVol = new THREE.Euler(Math.sin(t * 0.4 + o.phase) * 0.08, o.ry, o.rz);
      const niveauVol = Math.min(3, (Math.abs(d - NET) / 7) * 3);
      // apparition au fond, disparition juste devant la caméra
      const alphaVol = lisse(2, 6, d) * (1 - lisse(PROFONDEUR - 7, PROFONDEUR - 1, d));

      if (!c.principale) {
        c.plan.position.copy(pVol);
        c.plan.rotation.copy(rVol);
        c.plan.scale.setScalar(o.echelle);
        c.plan.material.uniforms.niveau.value = niveauVol;
        c.plan.material.uniforms.opacite.value = alphaVol * (1 - e);
        c.plan.visible = e < 1 && alphaVol > 0.01;
        return;
      }

      // --- carte d'un projet : du vol vers sa place dans le paquet ---
      const cible = poseDansPaquet(c.k, e < 1 ? 0 : f);
      const pos = pVol.lerp(cible.p, e);
      const rot = new THREE.Euler(
        rVol.x + (cible.r.x - rVol.x) * e,
        rVol.y + (cible.r.y - rVol.y) * e,
        rVol.z + (cible.r.z - rVol.z) * e,
      );
      // léger balancement du paquet, une fois arrivé
      rot.y += Math.sin(t * 0.5) * 0.04 * e;
      rot.x += Math.sin(t * 0.37) * 0.025 * e;
      const alpha = alphaVol + (cible.alpha - alphaVol) * e;
      // la boîte nette prend le relais du plan flou à la toute fin
      const relais = lisse(0.85, 1, proche);
      c.plan.position.copy(pos);
      c.plan.rotation.copy(rot);
      c.plan.translateZ(0.02);
      const echelle = o.echelle + (1 - o.echelle) * e;
      c.plan.scale.setScalar(echelle);
      c.boite.scale.setScalar(echelle);
      c.plan.material.uniforms.niveau.value = niveauVol * (1 - e);
      c.plan.material.uniforms.opacite.value = alpha * (1 - relais);
      c.plan.material.uniforms.teinte.value = 1 + (cible.ombre - 1) * e;
      c.plan.visible = relais < 1 && alpha > 0.01;
      c.boite.position.copy(pos);
      c.boite.rotation.copy(rot);
      c.boite.material[4].color.setScalar(cible.ombre);
      c.boite.material.forEach((m) => { m.opacity = alpha * relais; });
      c.boite.visible = relais > 0 && alpha > 0.01;
    });

    scene.updateMatrixWorld();
    // étiquettes : contre le bord droit de leur carte, seulement quand elle est assez nette
    libelles.forEach(({ carte, el }) => {
      v.set(COTE / 2, 0, 0).applyMatrix4(carte.plan.matrixWorld).project(camera);
      const net = 1 - Math.min(1, carte.plan.material.uniforms.niveau.value / 1.6);
      const visible = v.z < 1 ? net * carte.plan.material.uniforms.opacite.value * (1 - e) : 0;
      el.style.opacity = visible.toFixed(2);
      if (visible > 0.01) {
        const x = (v.x * 0.5 + 0.5) * canvas.clientWidth, y = (-v.y * 0.5 + 0.5) * canvas.clientHeight;
        el.style.transform = `translate(${(x + 14).toFixed(0)}px, ${(y - 10).toFixed(0)}px)`;
      }
    });

    renderer.render(scene, camera);
  }

  redimensionner();
  return { maj, redimensionner };
}
