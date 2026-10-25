/*
 * Projets de la version rapide (express.html) : chaque projet est un
 * « billet » (une image courbée comme du papier) qui défile en diagonale,
 * du bas à gauche vers le haut à droite, au rythme du défilement. Le billet
 * du centre est le projet actif ; ceux qui arrivent s'empilent en bas.
 *
 * Image d'un billet : `image` du projet (js/projets.js) si elle existe,
 * sinon un carré uni avec le numéro et le titre, dessiné ici.
 *
 *   const b = creerBillets(canvas, projets);   // [{ p, cat }]
 *   b.maj(f, t)          — f : position dans la liste (0 = premier, peut être
 *                          fractionnaire), t : temps en secondes
 *   b.redimensionner()
 */
import * as THREE from "./vendor/three.module.min.js";

const deux = (n) => String(n).padStart(2, "0");
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- Couverture : un carré uni, le numéro et le titre ---------- */
function dessinerAffiche({ p }, i) {
  const C = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = C;
  const g = c.getContext("2d");
  // noir et gris clair en alternance
  const sombre = i % 2 === 0;
  g.fillStyle = sombre ? "#151515" : "#e4e2de";
  g.fillRect(0, 0, C, C);
  g.fillStyle = sombre ? "#f6f5f2" : "#111111";
  g.textBaseline = "alphabetic";
  g.font = "500 36px system-ui, -apple-system, 'Segoe UI', sans-serif";
  g.fillText(deux(i + 1), 72, 120);
  // titre en bas à gauche, découpé en lignes
  g.font = "600 76px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const mots = p.titre.replace(/^Exemple\s*—\s*/, "").split(" "), out = [];
  let ligne = "";
  for (const m of mots) {
    const essai = ligne ? `${ligne} ${m}` : m;
    if (g.measureText(essai).width > C - 144 && ligne) { out.push(ligne); ligne = m; } else ligne = essai;
  }
  out.push(ligne);
  out.forEach((l, k) => g.fillText(l, 72, C - 80 - (out.length - 1 - k) * 86));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function chargerImage(url, secours) {
  const tex = secours;
  new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

/* ---------- Shaders : un plan courbé comme du papier ---------- */
const SOMMETS = `
  uniform float courbe;
  uniform float largeur;
  uniform float vague;
  uniform float temps;
  varying vec2 vUv;
  varying float vOmbre;
  void main() {
    vUv = uv;
    vec3 p = position;
    float nx = p.x / largeur * 2.0;
    float ny = uv.y * 2.0 - 1.0;
    p.z += courbe * nx * nx * largeur * 0.14;
    p.z += vague * sin(nx * 2.4 + ny * 1.6 + temps) * largeur * 0.025;
    vOmbre = 1.0 - abs(courbe) * nx * nx * 0.22;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FRAGMENTS = `
  uniform sampler2D carte;
  uniform float voile;
  uniform vec3 fond;
  varying vec2 vUv;
  varying float vOmbre;
  void main() {
    vec4 t = texture2D(carte, vUv);
    vec3 c = t.rgb * vOmbre;
    gl_FragColor = vec4(mix(c, fond, voile), 1.0);
    #include <colorspace_fragment>
  }
`;

// Petit hasard stable par billet (inclinaison propre à chacun)
const hasard = (i) => {
  const x = Math.sin(i * 127.1 + 31.7) * 43758.5453;
  return x - Math.floor(x);
};

export function creerBillets(canvas, projets) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
  const fond = new THREE.Color("#f6f5f2");

  const billets = projets.map((projet, i) => {
    const affiche = dessinerAffiche(projet, i);
    const carte = projet.p.image ? chargerImage(projet.p.image, affiche) : affiche;
    const mat = new THREE.ShaderMaterial({
      vertexShader: SOMMETS,
      fragmentShader: FRAGMENTS,
      side: THREE.DoubleSide,
      // pas de test de profondeur : les billets courbés se traverseraient ;
      // on les dessine du plus loin au plus proche (renderOrder)
      depthTest: false,
      depthWrite: false,
      uniforms: {
        carte: { value: carte },
        courbe: { value: 0 },
        largeur: { value: 1 },
        vague: { value: 0 },
        temps: { value: 0 },
        voile: { value: 0 },
        fond: { value: fond },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 30, 30), mat);
    scene.add(mesh);
    return mesh;
  });

  let W = 1, H = 1, largeur = 300;
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
    largeur = W < 760 ? Math.min(W * 0.56, 360) : borne(W * 0.21, 240, 400);
    billets.forEach((b) => {
      b.geometry.dispose();
      b.geometry = new THREE.PlaneGeometry(largeur, largeur, 30, 30);
      b.material.uniforms.largeur.value = largeur;
    });
  }
  redimensionner();

  function maj(f, t) {
    const etroit = W < 760;
    billets.forEach((b, i) => {
      const d = i - f;
      // Les billets à venir s'empilent : l'écart se resserre au-delà du suivant
      const s = d <= 1 ? d : 1 + (1 - Math.exp(-(d - 1) * 0.9)) * 0.55;
      const pasX = etroit ? W * 0.12 : W * 0.11;
      const pasY = H * (d < 0 ? 0.44 : 0.4) * (etroit ? 0.8 : 1);
      const sx = W * 0.5 - s * pasX * (d < 0 ? -1.1 : 1);
      const sy = H * (etroit ? 0.4 : 0.42) + s * pasY;
      b.position.set(sx - W / 2, H / 2 - sy, -Math.abs(d) * 30 - (d > 0 ? d * 20 : 0));
      const h = hasard(i) - 0.5;
      b.rotation.set(s * 0.3, s * 0.12, h * 0.14 - s * 0.05);
      const sc = 1 - Math.max(0, s - 1) * 0.08;
      b.scale.setScalar(sc);
      const u = b.material.uniforms;
      u.courbe.value = (i % 2 ? 1 : -1) * (0.06 + Math.min(Math.abs(s), 1.6) * 0.6);
      u.vague.value = 0.15 + Math.min(Math.abs(d), 2) * 0.6;
      u.temps.value = t * 0.8 + i;
      u.voile.value = borne((d - 1.3) * 0.25, 0, 0.55);
      b.visible = d > -2.2 && d < 7;
      b.renderOrder = -Math.round(Math.abs(d) * 100);
    });
    renderer.render(scene, camera);
  }

  return { maj, redimensionner };
}
