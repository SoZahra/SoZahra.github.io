/*
 * ESSAI : la sphère de projets (sphere.html), en three.js (js/vendor/).
 *
 * Une seule animation : des carrés découpés dans les écrans de ses projets
 * forment une boule qui tourne doucement. Au survol, le nom du projet du
 * carré ; au clic, le carré se détache, vole et devient la grande image de
 * son projet, pendant que les autres se rangent sur une grande roue dont on
 * ne voit que le bord, à gauche (d'après l'anneau de projets de CLOU
 * Architects, qu'elle aimait). Le projet s'affiche à droite (section
 * #projet, mise en page d'après sa maquette).
 *
 * La roue sert ensuite de menu : elle ne montre que les AUTRES projets ; au
 * milieu, en face du projet affiché, une place reste vide (le « trou »). Une
 * carte cliquée vole elle aussi jusqu'à la grande image. Échap ou le bouton
 * en haut à droite ramènent à la sphère. Fond noir ou blanc, au choix.
 *
 * Écrans : champ `ecrans` de js/projets-classique.js. Tant qu'il y en a peu,
 * chaque carré prend un morceau différent d'un écran (zoom et cadrage tirés
 * au hasard) ; avec plus d'exports, on peut cadrer plus large.
 */
import * as THREE from "./vendor/three.module.min.js";

const NB = 150;            // nombre de carrés
const RAYON = 2.2;         // rayon de la boule
const CAMERA_Z = 10;       // distance de la caméra au centre de la boule
const PLAN = 8;            // la roue et la carte qui vole : à 8 m de la caméra
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("scene");
const calque = document.querySelector(".etiquettes");

const rendu = new THREE.WebGLRenderer({ canvas, antialias: true });
rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
rendu.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 9, 30);

// fond noir ou blanc : le brouillard prend la couleur du fond, les carrés
// lointains s'y fondent dans les deux cas
const boutonFond = document.getElementById("choix-fond");
function appliquerFond() {
  const blanc = document.documentElement.dataset.fond === "blanc";
  const couleur = blanc ? 0xf7f7f5 : 0x000000;
  rendu.setClearColor(couleur);
  scene.fog.color.set(couleur);
  boutonFond.setAttribute("aria-label", blanc ? "Fond noir" : "Fond blanc");
}
boutonFond.addEventListener("click", () => {
  const blanc = document.documentElement.dataset.fond !== "blanc";
  if (blanc) document.documentElement.dataset.fond = "blanc";
  else delete document.documentElement.dataset.fond;
  try { localStorage.setItem("sphere-fond", blanc ? "blanc" : "noir"); } catch (e) {}
  appliquerFond();
});
appliquerFond();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const boule = new THREE.Group();
scene.add(boule);

// hasard reproductible : la boule est la même à chaque visite
let graine = 7;
function hasard() {
  graine = (graine * 16807) % 2147483647;
  return (graine - 1) / 2147483646;
}
const entre = (a, b) => a + (b - a) * hasard();
const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lisse = (a, b, x) => {
  const t = borne((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// écrans de tous les projets, avec leur projet d'origine
const projets = (window.PROJETS_CLASSIQUE && window.PROJETS_CLASSIQUE.liste) || [];
const ecrans = [];
projets.forEach((p, n) => (p.ecrans || []).forEach((e) => ecrans.push({ ...e, projet: n })));

const chargeur = new THREE.TextureLoader();
const textures = new Map();
function texture(src) {
  if (!textures.has(src)) {
    const t = chargeur.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = rendu.capabilities.getMaxAnisotropy();
    textures.set(src, t);
  }
  return textures.get(src);
}

// un carré = un morceau carré d'un écran (UV recadrées)
function geometrieCarre(ecran) {
  const g = new THREE.PlaneGeometry(1, 1);
  const cote = Math.min(ecran.l, ecran.h);
  const zoom = entre(0.35, 1);                  // part du petit côté gardée
  const u = (cote * zoom) / ecran.l, v = (cote * zoom) / ecran.h;
  const u0 = entre(0, 1 - u), v0 = entre(0, 1 - v);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * u, v0 + uv.getY(i) * v);
  }
  return g;
}

const carres = [];
const or = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < NB && ecrans.length; i++) {
  const ecran = ecrans[i % ecrans.length];
  const mesh = new THREE.Mesh(
    geometrieCarre(ecran),
    new THREE.MeshBasicMaterial({ map: texture(ecran.src), transparent: true })
  );
  // dans la boule : spirale de Fibonacci, rayon un peu irrégulier pour
  // qu'elle soit pleine et pas une simple coquille
  const y = 1 - (2 * (i + 0.5)) / NB;
  const r = Math.sqrt(1 - y * y);
  const dir = new THREE.Vector3(Math.cos(or * i) * r, y, Math.sin(or * i) * r);
  mesh.userData = {
    dansBoule: dir.multiplyScalar(RAYON * (0.55 + 0.45 * Math.sqrt(hasard()))),
    taille: entre(0.1, 0.41),
    retard: hasard() * 0.25,        // ils ne partent pas tous en même temps
    projet: ecran.projet,
    opacite: 1,
    presence: 0, angleRoue: 0,      // sur la roue (voir plus bas)
  };
  boule.add(mesh);
  carres.push(mesh);
}

// le nom du projet de la carte survolée, à sa droite
const etiquette = document.createElement("span");
etiquette.className = "etiquette";
calque.appendChild(etiquette);

// souris : légère inclinaison de la boule, parallaxe de la caméra
const souris = { x: 0, y: 0, lx: 0, ly: 0, vue: false };
addEventListener("pointermove", (e) => {
  souris.x = (e.clientX / innerWidth) * 2 - 1;
  souris.y = (e.clientY / innerHeight) * 2 - 1;
  souris.vue = true;
});

/* ---------- La roue ----------
   Son centre est hors de l'écran, à gauche (en haut sur téléphone) : on
   n'en voit que le bord. Elle ne montre que les AUTRES projets (celui qui
   est affiché est déjà en grand) : au milieu, en face de lui, une place
   reste vide, le « trou » qui le représente. Au clic sur une carte, la roue
   tourne pour l'amener au milieu, où elle laisse le trou ; les autres
   carrés de son projet sortent vers le centre de la roue, ceux du projet
   quitté reviennent à leur place. */
const ROUE = { places: 14, rayon: 2.9, carte: 0.85 };
const PAS_ROUE = (Math.PI * 2) / ROUE.places;
const places = new Array(ROUE.places).fill(null);   // place → carré (ou rien)
let trou = 0;                       // la place vide, en face du projet affiché
let roue = new Map();               // carré → sa place sur la roue
let tourRoue = 0, tourVoulu = 0;    // angle de la roue (amorti) et visé
// les carrés de chaque projet, dans l'ordre où ils prendront les places
const carresDe = projets.map((p, n) => carres.filter((c) => c.userData.projet === n));

// n : le projet affiché ; avant : celui qu'on quitte ; nouveauTrou : la
// place de la carte cliquée (sinon, une place de ce projet, ou le trou actuel)
function remplirRoue(n, avant, nouveauTrou, aussitot) {
  if (nouveauTrou === undefined) {
    const sienne = places.findIndex((c) => c && c.userData.projet === n);
    nouveauTrou = sienne >= 0 ? sienne : trou;
  }
  trou = nouveauTrou;
  places[trou] = null;
  // remplaçants : d'abord le projet quitté, puis les autres, à tour de rôle
  const autres = projets.map((p, k) => k).filter((k) => k !== n && carresDe[k].length)
    .sort((a, b) => (b === avant) - (a === avant));
  const surRoue = new Set(places.filter(Boolean));
  let tour = 0;
  const suivant = () => {
    for (let essai = 0; essai < autres.length; essai++) {
      const k = autres[(tour++) % autres.length];
      const c = carresDe[k].find((c) => !surRoue.has(c));
      if (c) { surRoue.add(c); return c; }
    }
    return null;
  };
  // en partant du trou, une place sur deux change de projet
  for (let i = 1; i < ROUE.places; i++) {
    const k = (trou + i) % ROUE.places;
    if (!places[k] || places[k].userData.projet === n) {
      if (places[k]) surRoue.delete(places[k]);
      places[k] = suivant();
    }
  }
  roue = new Map(places.map((c, k) => [c, k]).filter(([c]) => c));
  // la roue tourne pour mettre le trou au milieu (angle 0), au plus court
  const vise = -trou * PAS_ROUE;
  tourVoulu = vise + Math.round((tourVoulu - vise) / (Math.PI * 2)) * Math.PI * 2;
  // en venant de la sphère, chaque carré connaît d'emblée sa place (il y
  // arrive par le chemin sphère → roue)
  if (aussitot) {
    tourRoue = tourVoulu;
    for (const c of carres) {
      const place = roue.get(c);
      c.userData.presence = place === undefined ? 0 : 1;
      c.userData.angleRoue = place === undefined ? 0 : place * PAS_ROUE;
    }
  }
}

/* ---------- Le projet affiché ----------
   Mise en page de sa maquette : titre et sous-titre, rôle et outils à
   droite ; une grande image, deux petites et une phrase ; le texte ; une
   image large. Les cases sans image disparaissent. */
const racine = document.documentElement;
const section = document.getElementById("projet");
const contenuProjet = document.getElementById("projet-contenu");
const boutonsAcces = [];
let actuel = -1;

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
}
function figure(e, classe) {
  const f = el("figure", classe);
  if (!e) return f;
  const img = document.createElement("img");
  img.src = e.src;
  img.alt = e.alt || "";
  img.width = e.l;
  img.height = e.h;
  if (e.taille === "telephone") f.classList.add("est-telephone");
  f.appendChild(img);
  return f;
}
function remplir(p) {
  const ecrans = p.ecrans || [];
  const entete = el("header", "projet-entete");
  const titres = el("div");
  const titre = el("h2", "projet-titre", p.titre);
  titre.id = "projet-titre";
  titre.tabIndex = -1;
  titres.append(titre, el("p", "projet-sous-titre", [p.type, p.annee].filter(Boolean).join(", ")));
  const role = el("p", "projet-role");
  role.append(p.role || "", document.createElement("br"), (p.outils || []).join(", "));
  entete.append(titres, role);

  const haut = el("div", "projet-haut");
  haut.appendChild(figure(ecrans[0], "projet-grand"));
  const petits = ecrans.slice(1, 3);
  petits.forEach((e) => haut.appendChild(figure(e, "projet-petit")));
  haut.classList.toggle("sans-petits", !petits.length);
  haut.appendChild(el("p", "projet-court", p.resume));

  contenuProjet.replaceChildren(entete, haut);
  const texte = el("div", "projet-texte");
  for (const para of p.description || []) texte.appendChild(el("p", "", para));
  contenuProjet.appendChild(texte);
  ecrans.slice(3).forEach((e) => contenuProjet.appendChild(figure(e, "projet-large")));
  if ((p.liens || []).length) {
    const liens = el("p", "projet-liens");
    for (const l of p.liens) {
      const a = el("a", "", l.texte || l.label || l.url);
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      liens.appendChild(a);
    }
    contenuProjet.appendChild(liens);
  }
}

/* ---------- La carte qui vole ----------
   Le carré cliqué quitte la sphère (ou la roue) et se pose, de face, au
   centre de la grande image, à sa hauteur. Posé, il laisse l'image s'ouvrir
   depuis lui (sphere.html : .attend), puis s'efface. */
const VOL = 0.9;                    // durée du vol (s)
let volant = null, depart = 0, fondu = 0, pose = false;
let minuteur = 0;

// change de projet. carte : le carré cliqué (sinon, un carré du projet)
function choisir(n, { carte, focus = false } = {}) {
  if (!projets[n] || n === actuel) return;
  const depuisSphere = actuel < 0;
  remplirRoue(n, actuel, carte ? roue.get(carte) : undefined, depuisSphere);
  actuel = n;
  boutonsAcces.forEach((b, k) => b.setAttribute("aria-current", String(k === n)));
  racine.classList.add("vue-projet");

  // l'ancien contenu s'efface ; le nouveau attend que la carte se pose
  contenuProjet.classList.add("attend");
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    remplir(projets[n]);
    section.scrollTop = 0;
    if (focus) document.getElementById("projet-titre").focus({ preventScroll: true });
  }, depuisSphere ? 0 : 220);

  if (volant) { volant.renderOrder = 0; volant.material.depthTest = true; }
  volant = carte || carresDe[n][0] || null;
  if (volant) {
    volant.renderOrder = 10;       // par-dessus les autres pendant le vol
    volant.material.depthTest = false;
  }
  depart = performance.now();
  fondu = 0;
  pose = false;
}

// retour à la sphère
function revenir() {
  if (actuel < 0) return;
  actuel = -1;
  clearTimeout(minuteur);
  racine.classList.remove("vue-projet");
  contenuProjet.classList.add("attend");
  boutonsAcces.forEach((b) => b.setAttribute("aria-current", "false"));
  if (volant) { volant.renderOrder = 0; volant.material.depthTest = true; }
  volant = null;
}
document.getElementById("vers-sphere").addEventListener("click", revenir);
addEventListener("keydown", (e) => { if (e.key === "Escape") revenir(); });

// accès au clavier et aux lecteurs d'écran : un bouton par projet
const acces = document.getElementById("acces-projets");
projets.forEach((p, n) => {
  const li = document.createElement("li");
  const b = el("button", "", p.titre);
  b.type = "button";
  b.addEventListener("click", () => choisir(n, { focus: true }));
  li.appendChild(b);
  acces.appendChild(li);
  boutonsAcces.push(b);
});

/* ---------- Survol et clic ----------
   Sur la sphère, tous les carrés ; ensuite, ceux de la roue. La section du
   projet passe par-dessus la scène : un clic hors de son contenu vaut un
   clic dans la scène. */
const raycaster = new THREE.Raycaster();
let survole = null;
function cliquer() { if (survole) choisir(survole.userData.projet, { carte: survole }); }
canvas.addEventListener("click", cliquer);
section.addEventListener("click", (e) => { if (!contenuProjet.contains(e.target)) cliquer(); });

// bord gauche du contenu du projet (en pixels) : la roue s'y accroche
const panneau = document.querySelector(".projet-panneau");
let bordContenu = 0, ecartRoue = 64;
function redimensionner() {
  const l = innerWidth, h = innerHeight;
  rendu.setSize(l, h, false);
  camera.aspect = l / h;
  // sur téléphone, on recule pour que la boule tienne en largeur
  camera.userData.recul = l < h ? 4 : 0;
  camera.updateProjectionMatrix();
  bordContenu = panneau.getBoundingClientRect().left;
  ecartRoue = parseFloat(getComputedStyle(section).getPropertyValue("--ecart")) || 64;
}
addEventListener("resize", redimensionner);
redimensionner();

let angle = 0, vue = 0, avant = performance.now();
const v = new THREE.Vector3(), cible = new THREE.Vector3(), centre = new THREE.Vector3();
const qFace = new THREE.Quaternion();
const demiPlan = () => PLAN * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

// un point de l'écran (en pixels) → le plan à 8 m devant la caméra
function versPlan(x, y, sortie) {
  const dh = demiPlan(), dl = dh * camera.aspect;
  return sortie.set(camera.position.x + ((x / innerWidth) * 2 - 1) * dl,
    camera.position.y - ((y / innerHeight) * 2 - 1) * dh, camera.position.z - PLAN);
}

function image(maintenant) {
  const dt = Math.min(0.05, (maintenant - avant) / 1000);
  avant = maintenant;

  // vue : 0 = la sphère, 1 = le projet et la roue
  vue += ((actuel >= 0 ? 1 : 0) - vue) * Math.min(1, dt * (reduit ? 20 : 2.5));
  souris.lx += (souris.x - souris.lx) * Math.min(1, dt * 3);
  souris.ly += (souris.y - souris.ly) * Math.min(1, dt * 3);
  tourRoue += (tourVoulu - tourRoue) * Math.min(1, dt * (reduit ? 20 : 3));

  // la boule tourne seule et suit un peu la souris
  if (!reduit) angle += dt * 0.18;
  boule.rotation.y = angle + souris.lx * 0.35 * (1 - vue);
  boule.rotation.x = souris.ly * 0.25 * (1 - vue);
  boule.updateMatrixWorld();
  qFace.copy(boule.quaternion).invert();

  camera.position.set(souris.lx * 0.5 * (1 - vue), -souris.ly * 0.35 * (1 - vue), CAMERA_Z + camera.userData.recul);
  camera.lookAt(camera.position.x * 0.4, camera.position.y * 0.4, camera.position.z - 10);
  camera.updateMatrixWorld();

  // le centre de la roue, hors de l'écran
  const portrait = innerWidth < innerHeight;
  const dh = demiPlan(), dl = dh * camera.aspect;
  centre.set(camera.position.x, camera.position.y, camera.position.z - PLAN);
  if (portrait) centre.y += dh + ROUE.rayon - 2.2;
  else {
    // la carte la plus à droite s'arrête à un écart du contenu, et le trou
    // est à mi-hauteur de l'écran, en face du projet
    centre.x += (((bordContenu - ecartRoue) / innerWidth) * 2 - 1) * dl - ROUE.carte / 2 - ROUE.rayon;
  }

  for (const c of carres) {
    const d = c.userData;
    // 1. dans la boule, de face
    c.position.copy(d.dansBoule);
    if (!reduit) c.position.y += Math.sin(maintenant / 1400 + d.retard * 40) * 0.03;
    c.quaternion.copy(qFace);
    let taille = d.taille;
    // 2. sur la roue. Présence (0 à 1) et angle sont amortis : un carré qui
    // entre ou sort glisse le long du rayon, depuis ou vers le centre
    const place = roue.get(c);
    const k = Math.min(1, dt * (reduit ? 20 : 3.5));
    d.presence += ((place === undefined ? 0 : 1) - d.presence) * k;
    if (place !== undefined) {
      const voulu = place * PAS_ROUE;
      if (d.presence < 0.05) d.angleRoue = voulu;
      else d.angleRoue += Math.atan2(Math.sin(voulu - d.angleRoue), Math.cos(voulu - d.angleRoue)) * k;
    }
    const r = lisse(d.retard * 0.6, d.retard * 0.6 + 0.75, vue);
    if (r > 0) {
      const a = d.angleRoue + tourRoue;
      const rayon = ROUE.rayon - 1.8 * (1 - d.presence);
      cible.copy(centre);
      if (portrait) cible.add(v.set(Math.sin(a) * rayon, -Math.cos(a) * rayon, 0));
      else cible.add(v.set(Math.cos(a) * rayon, Math.sin(a) * rayon, 0));
      boule.worldToLocal(cible);
      c.position.lerp(cible, r);
      taille += (ROUE.carte * d.presence - taille) * r;
    }
    // au survol, le projet visé ressort, les autres pâlissent
    let voulue = !survole || d.projet === survole.userData.projet ? 1 : 0.35;
    // 3. la carte qui vole jusqu'à la grande image
    if (c === volant) {
      const t = reduit ? 1 : borne((maintenant - depart) / 1000 / VOL);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const grand = contenuProjet.querySelector(".projet-grand");
      const rect = grand && grand.getBoundingClientRect();
      if (rect && rect.height) {
        versPlan(rect.left + rect.width / 2, rect.top + rect.height / 2, cible);
        boule.worldToLocal(cible);
        // un léger arc : la carte passe un peu devant pendant le vol
        c.position.lerp(cible, e);
        c.position.add(v.set(0, 0, Math.sin(e * Math.PI) * 1.2).applyQuaternion(qFace));
        taille += ((rect.height / innerHeight) * 2 * dh - taille) * e;
      }
      c.quaternion.copy(qFace);
      // posée : l'image s'ouvre depuis elle, puis la carte s'efface
      if (t >= 1 && !pose) {
        pose = true;
        contenuProjet.classList.remove("attend");
      }
      if (pose) fondu = Math.min(1, fondu + dt / 0.5);
      voulue = 1 - lisse(0.3, 1, fondu);
      d.opacite = voulue;
      if (fondu >= 1) {
        c.renderOrder = 0;
        c.material.depthTest = true;
        volant = null;
        taille = 0;
      }
    }
    c.scale.setScalar(Math.max(0.0001, taille));
    d.opacite += (voulue - d.opacite) * Math.min(1, dt * 8);
    c.material.opacity = d.opacite;
  }

  // survol : les carrés de la sphère, puis ceux de la roue
  let nouveau = null;
  if (souris.vue && (vue < 0.05 || vue > 0.95)) {
    raycaster.setFromCamera(new THREE.Vector2(souris.x, -souris.y), camera);
    const cibles = vue < 0.05 ? carres : [...roue.keys()];
    const touche = raycaster.intersectObjects(cibles, false)[0];
    nouveau = touche ? touche.object : null;
  }
  if (nouveau !== survole) {
    survole = nouveau;
    racine.classList.toggle("sur-carte", !!survole);
  }

  rendu.render(scene, camera);

  if (survole) {
    etiquette.textContent = projets[survole.userData.projet].titre;
    survole.getWorldPosition(v);
    v.x += survole.scale.x * 0.62;
    v.project(camera);
    etiquette.style.transform = `translate(${((v.x + 1) / 2) * innerWidth}px, ${((1 - v.y) / 2) * innerHeight - 8}px)`;
  }
  etiquette.style.opacity = survole ? "1" : "0";

  requestAnimationFrame(image);
}
requestAnimationFrame(image);
