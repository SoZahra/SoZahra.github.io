/*
 * Figurine 3D du personnage (page « whoami »), avec three.js (js/vendor).
 * Si un modèle .glb est donné (models/fatima.glb : généré à partir d'une
 * illustration, voir CREDITS.md), c'est lui qu'on montre, en pleine
 * résolution. Sinon, ou s'il ne charge pas, on retombe sur la figurine en
 * voxels faite à partir des sprites.
 *
 * Voxels : le sprite 16×32 de js/personnage-pixel.js est
 * chaque pixel est extrudé en profondeur (plus épais au milieu, comme un
 * volume arrondi), l'avant prend les couleurs du sprite de face, l'arrière
 * celles du sprite de dos. Le rendu se fait en basse résolution, agrandi
 * sans lissage : on garde l'esprit pixel art / PC-98.
 *
 * Chargé à la demande (import dynamique) par js/piece-whoami.js :
 *   prechargerModele(url) — commence à télécharger le .glb (dès l'entrée)
 *   const fig = creerFigurine(canvas, { face, dos, couleurs, reduit, modele, clignement });
 *                            (clignement : texture du modèle aux yeux fermés)
 *   fig.pret              — promesse : le modèle est en place (ou abandonné)
 *   fig.apparaitre(fin)   — cercle magique, pilier de lumière, elle surgit en
 *                            faisant un tour complet ; fin() quand c'est fini
 *   fig.placer({ x, y, zoom })  — recadre (x, y en fraction de l'écran)
 *   fig.tourner()         — un tour complet (aussi au clic sur elle)
 *   fig.changerModele(url, clignement) — change de modèle (tenues) ; promesse
 *   fig.pause() / fig.reprendre() / fig.redimensionner()
 * On peut la faire tourner en la glissant à la souris ou au doigt.
 */
import * as THREE from "./vendor/three.module.min.js";

const LARGEUR = 16, HAUTEUR = 32;

/* ---------- Modèle .glb ---------- */
const modeles = new Map();
export function prechargerModele(url) {
  if (!modeles.has(url)) {
    modeles.set(url, import("./vendor/GLTFLoader.js").then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url)));
  }
  return modeles.get(url);
}

// Courbes d'animation
const lisse = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sortie = (t) => 1 - (1 - t) ** 3;
const rebond = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const borne = (t) => Math.max(0, Math.min(1, t));

/* ---------- Construction des voxels ---------- */

// Épaisseur maximale selon la ligne du sprite : tête ronde, robe, jambes fines
function epaisseurMax(y) {
  if (y <= 13) return 13;
  if (y === 14) return 7;
  if (y <= 20) return 8;
  if (y <= 25) return 10;
  if (y <= 27) return 3;
  return 5; // bottes
}

// Le contour noir (K) du pixel art ferait une coque noire en 3D : sur les
// bords de la silhouette, on prend la couleur du voisin intérieur, assombrie
function couleurVoxel(lignes, x, y, couleurs) {
  const c = lignes[y][x];
  if (c !== "K") return couleurs[c];
  const vide = (i, j) => i < 0 || j < 0 || i >= LARGEUR || j >= HAUTEUR || lignes[j][i] === ".";
  const auBord = vide(x - 1, y) || vide(x + 1, y) || vide(x, y - 1) || vide(x, y + 1);
  if (!auBord) return couleurs.K;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const i = x + dx, j = y + dy;
    if (vide(i, j)) continue;
    const v = lignes[j][i];
    if (v !== "K" && v !== ".") return new THREE.Color(couleurs[v]).multiplyScalar(0.7).getStyle();
  }
  return couleurs.K;
}

// Couleur « de matière » à l'intérieur : les détails (yeux, reflets) ne
// sont peints que sur la face visible, pas dans l'épaisseur
const MATIERE = { E: "S", e: "S", Y: "B" };

function construireVoxels(face, dos, couleurs) {
  const voxels = [];
  for (let y = 0; y < HAUTEUR; y++) {
    // Segments continus de la ligne (les deux jambes sont deux segments)
    let x = 0;
    while (x < LARGEUR) {
      if (face[y][x] === ".") { x++; continue; }
      const a = x;
      while (x < LARGEUR && face[y][x] !== ".") x++;
      const b = x - 1;
      const centre = (a + b + 1) / 2, demi = (b - a + 1) / 2;
      for (let i = a; i <= b; i++) {
        const t = (i + 0.5 - centre) / (demi + 0.5);
        const d = Math.max(1, Math.round(epaisseurMax(y) * Math.sqrt(Math.max(0, 1 - t * t))));
        // Les bottes dépassent un peu vers l'avant
        const avance = y >= 28 ? 1 : 0;
        for (let k = 0; k < d; k++) {
          const z = k - (d - 1) / 2 + avance * 0.5;
          const devant = z >= 0;
          const lignes = devant ? face : dos;
          const xi = devant ? i : LARGEUR - 1 - i; // le dos est dessiné vu de derrière
          const surface = k === 0 || k === d - 1;
          let c = lignes[y][xi];
          if (!surface && MATIERE[c]) c = MATIERE[c];
          const couleur = c === "K" ? couleurVoxel(lignes, xi, y, couleurs) : couleurs[c];
          voxels.push({ x: i - LARGEUR / 2 + 0.5, y: HAUTEUR / 2 - y - 0.5, z, couleur });
        }
      }
    }
  }
  return voxels;
}

/* ---------- Textures dessinées en pixels ---------- */

// Cercle magique : anneaux, runes et étoile, en pixels nets
function textureCercle() {
  const N = 96;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const point = (x, y) => g.fillRect(Math.round(x), Math.round(y), 1, 1);
  g.fillStyle = "#fff";
  const m = N / 2;
  for (const r of [46, 44, 34, 20]) {
    for (let a = 0; a < 720; a++) point(m + Math.cos((a * Math.PI) / 360) * r, m + Math.sin((a * Math.PI) / 360) * r);
  }
  // Runes entre les deux grands anneaux : petits traits au hasard (fixe)
  let graine = 7;
  const hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    const cx = m + Math.cos(a) * 39, cy = m + Math.sin(a) * 39;
    for (let p = 0; p < 6; p++) if (hasard() < 0.6) point(cx - 1 + (p % 3), cy - 1 + Math.floor(p / 3) * 2);
  }
  // Étoile à six branches (deux triangles)
  for (const decal of [0, Math.PI / 3]) {
    const s = [0, 1, 2].map((k) => [m + Math.cos(decal + (k * 2 * Math.PI) / 3 - Math.PI / 2) * 34, m + Math.sin(decal + (k * 2 * Math.PI) / 3 - Math.PI / 2) * 34]);
    for (let k = 0; k < 3; k++) {
      const [x0, y0] = s[k], [x1, y1] = s[(k + 1) % 3];
      for (let t = 0; t <= 1; t += 0.01) point(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// Dégradé vertical pour le pilier de lumière (opaque en bas, transparent en haut)
function textureDegrade() {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 32;
  const g = c.getContext("2d");
  const d = g.createLinearGradient(0, 0, 0, 32);
  d.addColorStop(0, "rgba(255,255,255,0)");
  d.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = d;
  g.fillRect(0, 0, 1, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

/* ---------- La figurine ---------- */

export function creerFigurine(canvas, { face, dos, couleurs, reduit = false, modele = null, clignement = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Boolean(modele), alpha: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  camera.position.set(0, 2, 88);
  camera.lookAt(0, 0, 0);

  // Lumières : feu chaud devant à gauche, lune froide derrière à droite
  scene.add(new THREE.HemisphereLight(0x8a7aa8, 0x1a1020, 1.6));
  const feu = new THREE.DirectionalLight(0xffb36b, 2.6);
  feu.position.set(-30, 25, 40);
  scene.add(feu);
  const lune = new THREE.DirectionalLight(0x7f9cff, 3.2);
  lune.position.set(35, 20, -40);
  scene.add(lune);
  // Lumière dorée du cercle, par en dessous
  const magie = new THREE.PointLight(0xf2ca70, 0, 50, 2);
  magie.position.set(0, -19, 12);
  scene.add(magie);

  // Le personnage
  const perso = new THREE.Group();
  // La couture jaune des bottes ferait un socle doré en 3D : on la fonce
  const voxels = construireVoxels(face, dos, { ...couleurs, Y: "#4a4030" });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const matiere = new THREE.MeshLambertMaterial();
  const maillage = new THREE.InstancedMesh(cube, matiere, voxels.length);
  const m4 = new THREE.Matrix4(), coul = new THREE.Color();
  voxels.forEach((v, k) => {
    m4.makeTranslation(v.x, v.y, v.z);
    maillage.setMatrixAt(k, m4);
    // un léger grain, comme une figurine peinte à la main
    coul.set(v.couleur).multiplyScalar(0.94 + ((k * 7919) % 13) / 100);
    maillage.setColorAt(k, coul);
  });
  perso.add(maillage);
  scene.add(perso);

  // Le vrai modèle remplace les voxels dès qu'il est chargé : mis à la
  // hauteur de la figurine, pieds au sol, centré sur l'axe de rotation
  // On peut aussi changer de modèle ensuite (les tenues de la fiche).
  let modeleCharge = false, objetActuel = maillage;
  // Clignement : une copie de la texture où les paupières sont peintes
  // fermées (models/fatima-yeux-fermes.jpg), affichée un court instant
  let peau = null, yeuxOuverts = null, yeuxFermes = null, prochainClin = 3, finClin = 0;
  // Lumière douce de face (comme un projecteur sur une fiche de perso) :
  // les textures peintes du modèle sont plus sombres que les voxels
  const projecteur = new THREE.DirectionalLight(0xffe6c8, 1.4);
  projecteur.position.set(0, 10, 60);

  // Un modèle n'est préparé qu'une fois (le .glb chargé reste en cache)
  function preparer(objet) {
    if (objet.userData.prepare) return;
    const boite = new THREE.Box3().setFromObject(objet);
    const taille = boite.getSize(new THREE.Vector3()), centre = boite.getCenter(new THREE.Vector3());
    const echelle = HAUTEUR / taille.y;
    objet.scale.setScalar(echelle);
    objet.position.set(-centre.x * echelle, -boite.min.y * echelle - HAUTEUR / 2, -centre.z * echelle);
    objet.traverse((o) => {
      if (!o.isMesh) return;
      // Sans reflets d'environnement, le métal paraît noir : on l'adoucit
      // (sans en ajouter à un modèle qui n'en a pas, comme le buste en tissu)
      o.material.metalness = Math.min(o.material.metalness, 0.35);
      if (o.material.specularIntensity !== undefined) o.material.specularIntensity = 0.5;
      if (!objet.userData.peau && o.material.map) objet.userData.peau = o.material;
    });
    objet.userData.prepare = true;
  }

  const texturesYeux = new Map();
  function chargerYeux(url, map) {
    if (!texturesYeux.has(url)) {
      texturesYeux.set(url, new THREE.TextureLoader().loadAsync(url).then((tex) => {
        // mêmes réglages que la texture du glTF (pas de retournement)
        tex.flipY = false;
        tex.colorSpace = map.colorSpace;
        tex.wrapS = map.wrapS;
        tex.wrapT = map.wrapT;
        return tex;
      }));
    }
    return texturesYeux.get(url);
  }

  function changerModele(url, yeux = null) {
    return prechargerModele(url).then((gltf) => {
      const objet = gltf.scene;
      preparer(objet);
      if (peau && yeuxOuverts) peau.map = yeuxOuverts; // l'ancien garde les yeux ouverts
      perso.remove(objetActuel);
      perso.add(objet);
      objetActuel = objet;
      if (!modeleCharge) scene.add(projecteur);
      modeleCharge = true;
      peau = objet.userData.peau || null;
      yeuxOuverts = peau && peau.map;
      yeuxFermes = null;
      if (yeux && peau) {
        chargerYeux(yeux, peau.map).then((tex) => { if (objetActuel === objet) yeuxFermes = tex; }).catch(() => {});
      }
      redimensionner();
    });
  }
  const pret = modele ? changerModele(modele, clignement).catch(() => {}) : Promise.resolve(); // sinon les voxels

  // Cercle magique au sol
  const SOL = -HAUTEUR / 2 - 0.5;
  const cercle = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshBasicMaterial({ map: textureCercle(), color: 0xf2ca70, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  cercle.rotation.x = -Math.PI / 2;
  cercle.position.y = SOL;
  scene.add(cercle);

  // Pilier de lumière
  const pilier = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 12, 70, 24, 1, true),
    new THREE.MeshBasicMaterial({ map: textureDegrade(), color: 0xf6dc9a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  pilier.position.y = SOL + 35;
  scene.add(pilier);

  // Étincelles qui montent du cercle
  const NB = 90;
  const positions = new Float32Array(NB * 3);
  const vitesses = new Float32Array(NB);
  const etincelle = (k, partout) => {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 13;
    positions[k * 3] = Math.cos(a) * r;
    positions[k * 3 + 1] = SOL + (partout ? Math.random() * 40 : 0);
    positions[k * 3 + 2] = Math.sin(a) * r;
    vitesses[k] = 0.05 + Math.random() * 0.12;
  };
  for (let k = 0; k < NB; k++) etincelle(k, true);
  const geoEtincelles = new THREE.BufferGeometry();
  geoEtincelles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const etincelles = new THREE.Points(geoEtincelles, new THREE.PointsMaterial({
    color: 0xffe2a0, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(etincelles);

  /* ---------- État ---------- */
  let largeur = 1, hauteur = 1, pixel = 3;
  let enMarche = false, debutApparition = -1, finApparition = null;
  let horloge = performance.now() / 1000;
  // Cadrage (animé vers la cible)
  const cadre = { x: 0.5, y: 0.5, zoom: 1 }, cible = { x: 0.5, y: 0.5, zoom: 1 };
  // Rotation : angle courant, angle de repos, élan donné au glisser
  let angle = 0, repos = 0, elan = 0, tour = null;
  let glisse = null;

  function redimensionner() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (modeleCharge) {
      // Vrai modèle : pleine résolution
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      canvas.style.imageRendering = "auto";
      largeur = w;
      hauteur = h;
    } else {
      // Voxels : ~240 lignes de rendu, agrandies sans lissage, gros pixels nets
      pixel = Math.max(2, Math.round(h / 240));
      largeur = Math.max(1, Math.floor(w / pixel));
      hauteur = Math.max(1, Math.floor(h / pixel));
    }
    renderer.setSize(largeur, hauteur, false);
    camera.aspect = largeur / hauteur;
    appliquerCadre();
  }

  function appliquerCadre() {
    // Décale l'image pour que le personnage soit en (x, y) de l'écran
    camera.zoom = cadre.zoom;
    camera.setViewOffset(largeur, hauteur, (0.5 - cadre.x) * largeur, (0.5 - cadre.y) * hauteur, largeur, hauteur);
    camera.updateProjectionMatrix();
  }

  function image(maintenant) {
    if (!enMarche) return;
    requestAnimationFrame(image);
    const t = maintenant / 1000, dt = Math.min(0.05, t - horloge);
    horloge = t;

    // Apparition : cercle, pilier, puis elle surgit en faisant un tour
    let a = 1;
    if (debutApparition >= 0) {
      const e = t - debutApparition;
      a = borne(e / 2.6);
      const c = sortie(borne(e / 0.6));
      cercle.scale.setScalar(Math.max(0.001, c));
      pilier.material.opacity = 0.4 * borne(e / 0.4) * (1 - borne((e - 1.9) / 0.7));
      pilier.scale.set(1 - 0.5 * borne((e - 1.9) / 0.7), 1, 1 - 0.5 * borne((e - 1.9) / 0.7));
      etincelles.material.opacity = borne(e / 0.5);
      magie.intensity = 120 * borne(e / 0.5) * (1 - 0.6 * borne((e - 2) / 0.6));
      const s = rebond(borne((e - 0.25) / 0.9));
      perso.scale.setScalar(Math.max(0.001, s));
      perso.position.y = -8 * (1 - sortie(borne((e - 0.25) / 1.2)));
      angle = repos + Math.PI * 2 * (1 - sortie(borne((e - 0.25) / 2.2)));
      if (e >= 2.6) {
        debutApparition = -1;
        angle = repos;
        if (finApparition) { const f = finApparition; finApparition = null; f(); }
      }
    } else {
      // Au repos : elle flotte doucement au-dessus du cercle
      perso.position.y = 0.8 * Math.sin(t * 1.6) + 0.6;
      if (tour) {
        const e = borne((t - tour.debut) / 1.3);
        angle = tour.depart + Math.PI * 2 * lisse(e);
        if (e >= 1) { tour = null; angle = repos; }
      } else if (!glisse) {
        // élan du glisser, puis retour vers l'angle de repos
        angle += elan * dt;
        elan *= Math.pow(0.04, dt);
        if (Math.abs(elan) < 0.3) {
          let d = repos - angle;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          angle += d * Math.min(1, dt * 2.5);
        }
      }
    }
    perso.rotation.y = angle;
    cercle.rotation.z = t * 0.25;

    // Elle cligne des yeux toutes les 2 à 6 s (parfois deux fois de suite)
    if (yeuxFermes) {
      if (t >= prochainClin) {
        finClin = t + 0.13;
        prochainClin = t + (Math.random() < 0.2 ? 0.35 : 2 + Math.random() * 4);
      }
      peau.map = t < finClin ? yeuxFermes : yeuxOuverts;
    }

    // Étincelles
    for (let k = 0; k < NB; k++) {
      positions[k * 3 + 1] += vitesses[k] * (a < 1 ? 2 : 1) * dt * 60;
      if (positions[k * 3 + 1] > SOL + 42) etincelle(k, false);
    }
    geoEtincelles.attributes.position.needsUpdate = true;

    // Cadrage
    const k = Math.min(1, dt * 4);
    let bouge = false;
    for (const p of ["x", "y", "zoom"]) {
      if (Math.abs(cible[p] - cadre[p]) > 0.0005) { cadre[p] += (cible[p] - cadre[p]) * k; bouge = true; }
    }
    if (bouge) appliquerCadre();

    renderer.render(scene, camera);
  }

  /* ---------- Glisser pour la faire tourner ---------- */
  canvas.addEventListener("pointerdown", (e) => {
    if (debutApparition >= 0) return;
    glisse = { x: e.clientX, depart: e.clientX, t: performance.now(), bouge: false };
    tour = null;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!glisse) return;
    const dx = e.clientX - glisse.x;
    const now = performance.now();
    angle += dx * 0.012;
    elan = (dx * 0.012) / Math.max(0.008, (now - glisse.t) / 1000);
    glisse.x = e.clientX;
    glisse.t = now;
    if (Math.abs(e.clientX - glisse.depart) > 4) glisse.bouge = true;
  });
  const lacher = () => {
    if (!glisse) return;
    // Un simple clic (sans glisser) : elle refait un tour
    if (!glisse.bouge) { elan = 0; tourner(); }
    glisse = null;
  };
  canvas.addEventListener("pointerup", lacher);
  canvas.addEventListener("pointercancel", lacher);

  /* ---------- Commandes ---------- */
  function reprendre() {
    if (enMarche) return;
    enMarche = true;
    horloge = performance.now() / 1000;
    requestAnimationFrame(image);
  }
  function pause() {
    enMarche = false;
  }
  function apparaitre(fin) {
    redimensionner();
    repos = 0;
    angle = 0;
    elan = 0;
    tour = null;
    if (reduit) {
      // Mouvement réduit : elle est là tout de suite, sans tour ni pilier
      cercle.scale.setScalar(1);
      perso.scale.setScalar(1);
      perso.position.y = 0;
      pilier.material.opacity = 0;
      etincelles.material.opacity = 0.6;
      magie.intensity = 48;
      debutApparition = -1;
      reprendre();
      renderer.render(scene, camera);
      if (fin) fin();
      return;
    }
    cercle.scale.setScalar(0.001);
    perso.scale.setScalar(0.001);
    debutApparition = performance.now() / 1000;
    finApparition = fin || null;
    reprendre();
  }
  function tourner() {
    if (reduit || debutApparition >= 0 || tour) return;
    tour = { debut: performance.now() / 1000, depart: angle };
  }
  function placer({ x = 0.5, y = 0.5, zoom = 1, regard = 0 } = {}) {
    Object.assign(cible, { x, y, zoom });
    repos = regard; // angle de repos (tournée vers le panneau)
    if (reduit) { Object.assign(cadre, cible); angle = repos; appliquerCadre(); }
  }

  redimensionner();
  return { pret, apparaitre, tourner, placer, pause, reprendre, redimensionner, changerModele };
}
