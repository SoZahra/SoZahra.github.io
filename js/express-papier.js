/*
 * Intro de la version rapide (express.html) : une affiche en papier avec
 * son prénom et son nom en très grand. Elle arrive froissée en boule, se
 * déplie, puis se froisse de nouveau et s'envole au défilement.
 *
 * Le froissage est fait dans le shader : une suite de plis le long de droites
 * au hasard (chaque pli fait tourner un côté de la feuille autour de la
 * droite) donne une boule de papier en facettes, éclairée facette par facette.
 *
 *   const papier = creerPapier(canvas, { prenom, nom, lignes });
 *   papier.maj({ froisse, echelle, x, y, rx, ry, rz });
 *   papier.redimensionner();
 */
import * as THREE from "./vendor/three.module.min.js";

const COULEUR_PAPIER = "#ff4a3d"; // la touche de couleur du site
const COULEUR_ENCRE = "#111111";

/* ---------- L'affiche ---------- */
function dessiner({ prenom, nom, lignes }, L, H) {
  const c = document.createElement("canvas");
  c.width = L;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = COULEUR_PAPIER;
  g.fillRect(0, 0, L, H);
  // léger grain de papier
  const img = g.getImageData(0, 0, L, H);
  for (let k = 0; k < img.data.length; k += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[k] += n; img.data[k + 1] += n; img.data[k + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const marge = L * 0.06;
  g.fillStyle = COULEUR_ENCRE;
  g.textBaseline = "alphabetic";
  // Le nom remplit la largeur : on ajuste la taille de police à chaque mot
  const police = (t) => `900 ${t}px "Arial Black", "Helvetica Neue", system-ui, sans-serif`;
  const ajuster = (mot) => {
    g.font = police(100);
    return Math.min((100 * (L - marge * 2)) / g.measureText(mot).width, H * 0.42);
  };
  const t1 = ajuster(prenom), t2 = ajuster(nom);
  const t = Math.min(t1, t2);
  if ("letterSpacing" in g) g.letterSpacing = `${-t * 0.04}px`;
  g.font = police(t);
  const y1 = H * 0.12 + t * 0.78;
  g.fillText(prenom, marge, y1);
  g.fillText(nom, marge, y1 + t * 0.86);
  if ("letterSpacing" in g) g.letterSpacing = "0px";

  // Petites lignes en italique, comme sur une affiche
  g.font = `italic 500 ${Math.round(H * 0.035)}px Georgia, "Times New Roman", serif`;
  lignes.forEach((l, k) => g.fillText(l, marge, H - marge - (lignes.length - 1 - k) * H * 0.045));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- Shaders ---------- */
const SOMMETS = `
  uniform float froisse;
  uniform vec2 taille;
  uniform vec4 plis[NB_PLIS]; // direction (x, y), décalage, angle
  varying vec3 vPos;
  varying vec2 vUv;

  // rotation de v autour de l'axe unitaire a, d'un angle t (formule de Rodrigues)
  vec3 tourner(vec3 v, vec3 a, float t) {
    float c = cos(t), s = sin(t);
    return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
  }

  void main() {
    vUv = uv;
    vec2 p0 = position.xy;
    vec3 p = vec3(p0, 0.0);
    float f = froisse;
    float pente = taille.x * 0.02; // largeur d'une pliure : petite = arête nette
    // Plis successifs : la partie de la feuille d'un côté d'une droite tourne
    // autour de cette droite. L'angle varie continûment à travers la pliure :
    // la feuille ne se déchire jamais.
    for (int k = 0; k < NB_PLIS; k++) {
      vec2 d = plis[k].xy;
      float o = plis[k].z * taille.x;
      float angle = plis[k].w;
      float cote = smoothstep(-pente, pente, dot(p0, d) - o);
      vec3 centre = vec3(d * o, 0.0);
      vec3 axe = vec3(-d.y, d.x, 0.0);
      p = tourner(p - centre, axe, angle * f * cote) + centre;
    }
    vec4 w = modelMatrix * vec4(p, 1.0);
    vPos = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FRAGMENTS = `
  uniform sampler2D affiche;
  uniform vec3 couleurDos;
  varying vec3 vPos;
  varying vec2 vUv;
  void main() {
    // normale de la facette : les plis restent nets
    vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
    if (n.z < 0.0) n = -n;
    vec3 lumiere = normalize(vec3(-0.6, 0.6, 0.55));
    float eclairage = 0.5 + 0.62 * max(dot(n, lumiere), 0.0);
    // le recto porte l'affiche, le verso est uni
    vec3 c = gl_FrontFacing ? texture2D(affiche, vUv).rgb : couleurDos;
    gl_FragColor = vec4(c * eclairage, 1.0);
    #include <colorspace_fragment>
  }
`;

/* ---------- Les plis (tirés une fois) et le même pliage côté JS ---------- */
const NB_PLIS = 11;
const hasard = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
// direction (x, y), décalage (en largeur de feuille), angle de pli
const PLIS = Array.from({ length: NB_PLIS }, (_, k) => {
  const a = hasard(k + 0.31) * 6.2832;
  return new THREE.Vector4(
    Math.cos(a), Math.sin(a),
    (hasard(k + 4.7) - 0.5) * 0.5,
    (hasard(k + 9.2) < 0.5 ? -1 : 1) * (0.7 + hasard(k + 2.9) * 2.1),
  );
});
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function plier(x0, y0, f, l) {
  let px = x0, py = y0, pz = 0;
  const pente = l * 0.02;
  for (const pli of PLIS) {
    const dx = pli.x, dy = pli.y, o = pli.z * l, angle = pli.w;
    const t = angle * f * lisse(-pente, pente, x0 * dx + y0 * dy - o);
    // rotation autour de l'axe (-dy, dx, 0) passant par (dx·o, dy·o, 0)
    const ax = -dy, ay = dx, c = Math.cos(t), s = Math.sin(t);
    const vx = px - dx * o, vy = py - dy * o, vz = pz;
    const kx = ay * vz, ky = -ax * vz, kz = ax * vy - ay * vx; // a × v
    const ad = ax * vx + ay * vy;
    px = vx * c + kx * s + ax * ad * (1 - c) + dx * o;
    py = vy * c + ky * s + ay * ad * (1 - c) + dy * o;
    pz = vz * c + kz * s;
  }
  return [px, py, pz];
}

export function creerPapier(canvas, textes) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000);
  const uniforms = {
    affiche: { value: null },
    froisse: { value: 1 },
    taille: { value: new THREE.Vector2(1, 1) },
    couleurDos: { value: new THREE.Color(COULEUR_PAPIER).multiplyScalar(0.92) },
    plis: { value: PLIS },
  };
  const mat = new THREE.ShaderMaterial({ defines: { NB_PLIS }, vertexShader: SOMMETS, fragmentShader: FRAGMENTS, uniforms, side: THREE.DoubleSide });
  const feuille = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  scene.add(feuille);

  let W = 1, H = 1;
  function redimensionner() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // 1 unité = 1 pixel dans le plan z = 0
    camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // feuille paysage sur grand écran, portrait sur téléphone
    const portrait = W < H;
    const ratio = portrait ? 1.3 : 0.62; // hauteur / largeur
    let l = W * (portrait ? 0.86 : 0.78);
    if (l * ratio > H * 0.74) l = (H * 0.74) / ratio;
    const h = l * ratio;
    feuille.geometry.dispose();
    feuille.geometry = new THREE.PlaneGeometry(l, h, 200, Math.round(200 * ratio));
    uniforms.taille.value.set(l, h);
    if (uniforms.affiche.value) uniforms.affiche.value.dispose();
    const echelleTexture = Math.min(2048 / l, 2);
    uniforms.affiche.value = dessiner(textes, Math.round(l * echelleTexture), Math.round(h * echelleTexture));
  }
  redimensionner();

  // Boîte de la feuille pliée (sur une grille de points), pour la recentrer
  // et la faire tenir dans le cadre de la feuille à plat
  function cadre(f) {
    const { x: l, y: h } = uniforms.taille.value;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i <= 16; i++) for (let j = 0; j <= 12; j++) {
      const [px, py, pz] = plier((i / 16 - 0.5) * l, (j / 12 - 0.5) * h, f, l);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px);
      y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      z0 = Math.min(z0, pz); z1 = Math.max(z1, pz);
    }
    // plus elle est froissée, plus la boule est petite (profondeur comprise)
    const dim = Math.max(x1 - x0, (y1 - y0) * (l / h), z1 - z0);
    const ajuste = Math.min(1, (l * (1 - 0.6 * f)) / dim);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, ajuste };
  }

  function maj({ froisse = 0, echelle = 1, x = 0, y = 0, rx = 0, ry = 0, rz = 0 }) {
    uniforms.froisse.value = froisse;
    const c = cadre(froisse);
    const e = echelle * c.ajuste;
    feuille.scale.setScalar(e);
    feuille.rotation.set(rx, ry, rz);
    feuille.updateMatrix();
    // le centre de la feuille pliée revient au point visé
    const centre = new THREE.Vector3(c.cx, c.cy, c.cz).applyMatrix4(feuille.matrix).sub(feuille.position);
    feuille.position.set(x * W - centre.x, y * H - centre.y, -centre.z);
    renderer.render(scene, camera);
  }

  return { maj, redimensionner };
}
