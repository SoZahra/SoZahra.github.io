/*
 * La galerie dans le noir (index.html), en three.js (js/vendor/).
 *
 * Un couloir obscur ; la souris dirige une lampe torche (elle s'allume en
 * grésillant à l'arrivée). À l'entrée, un cartel de musée sur le mur de
 * gauche : son nom et son métier. Puis ses projets, accrochés comme des
 * tableaux, un mur sur deux, chacun avec sa plaque. Au défilement, on
 * avance ; la vue se tourne vers le tableau qu'on longe. Au bout, une porte
 * ouverte sur une lumière grise : le gris de la page, où l'on entre.
 *
 *   const g = creerGalerie(canvas, { projets, nom, metier, reduit });
 *   g.maj(progres, visee, t)  // progres : 0 (entrée) → 1 (la porte) ;
 *                             // visee : { x, y } en -1..1, ou null (lampe seule)
 *   g.sous(x, y)              // numéro du tableau sous ce point (-1..1), ou -1
 *   g.proche()                // numéro du tableau qu'on longe, ou -1
 *   g.etapes                  // progrès où l'on se trouve face à chaque tableau
 *   g.redimensionner()
 */
import * as THREE from "./vendor/three.module.min.js";

const LARG = 4, HAUT = 3.2, PAS = 7, DEBUT = 4; // le couloir (mètres)
const NOIR = 0x050505;
const GRIS_PAGE = new THREE.Color("#c9c9c7");

// plâtre : un bruit doux dessiné une fois, répété sur les murs
function texturePlatre(base, ecart, repetX, repetY) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = base + (Math.random() - 0.5) * ecart;
    img.data.set([v, v * 0.98, v * 0.95, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repetX, repetY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// texte peint sur un canvas transparent (cartel, plaques)
function textureTexte(l, h, dessiner) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  const g = c.getContext("2d");
  if ("fontStretch" in g) g.fontStretch = "expanded";
  dessiner(g, l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function creerGalerie(canvas, { projets = [], nom = "", metier = "", reduit = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(NOIR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NOIR, 0.06);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);

  const n = Math.max(1, projets.length);
  const zTableau = (i) => -(5 + i * PAS);
  const zFond = zTableau(n - 1) - 8;
  const longueur = DEBUT - zFond + 1, milieu = (DEBUT + 1 + zFond) / 2;

  /* ---------- Le couloir ---------- */
  const platre = new THREE.MeshStandardMaterial({ map: texturePlatre(52, 26, longueur / 3, 1.2), roughness: 0.95 });
  const sol = new THREE.MeshStandardMaterial({ map: texturePlatre(30, 18, 2, longueur / 2), roughness: 0.55, metalness: 0.1 });
  const plan = (l, h, mat, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    scene.add(m);
    return m;
  };
  plan(longueur, HAUT, platre, -LARG / 2, HAUT / 2, milieu, 0, Math.PI / 2);   // mur gauche
  plan(longueur, HAUT, platre, LARG / 2, HAUT / 2, milieu, 0, -Math.PI / 2);   // mur droit
  plan(LARG, longueur, sol, 0, 0, milieu, -Math.PI / 2, 0);                     // sol
  plan(LARG, longueur, platre, 0, HAUT, milieu, Math.PI / 2, 0);                // plafond
  plan(LARG, HAUT, platre, 0, HAUT / 2, DEBUT + 1, 0, Math.PI);                 // mur derrière nous
  // le fond, percé d'une porte ouverte sur la lumière grise (le gris de la page)
  const PORTE = { l: 1.3, h: 2.3 };
  plan((LARG - PORTE.l) / 2, HAUT, platre, -(LARG + PORTE.l) / 4, HAUT / 2, zFond, 0, 0);
  plan((LARG - PORTE.l) / 2, HAUT, platre, (LARG + PORTE.l) / 4, HAUT / 2, zFond, 0, 0);
  plan(PORTE.l, HAUT - PORTE.h, platre, 0, PORTE.h + (HAUT - PORTE.h) / 2, zFond, 0, 0);
  const lumiereGrise = new THREE.MeshBasicMaterial({ color: GRIS_PAGE, toneMapped: false, fog: false });
  plan(PORTE.l + 0.02, PORTE.h, lumiereGrise, 0, PORTE.h / 2, zFond - 0.6, 0, 0);
  // la lumière de la porte déborde un peu sur le sol et les murs
  const halo = new THREE.PointLight(0xdedcd6, 6, 9, 1.6);
  halo.position.set(0, 1.4, zFond + 0.4);
  scene.add(halo);
  scene.add(new THREE.AmbientLight(0xffffff, 0.015));

  /* ---------- Le cartel, à l'entrée (mur de gauche) ---------- */
  const cartel = textureTexte(2048, 640, (g, l, h) => {
    g.fillStyle = "#e4e0d8";
    g.font = `800 210px Archivo, system-ui, sans-serif`;
    g.fillText(nom, 40, 250);
    g.font = `500 76px Archivo, system-ui, sans-serif`;
    g.fillStyle = "#b9b4aa";
    g.fillText(metier, 46, 400);
    g.fillRect(46, 470, 160, 6);
  });
  const matCartel = new THREE.MeshStandardMaterial({ map: cartel, transparent: true, roughness: 0.9 });
  plan(3.8, 3.8 * 640 / 2048, matCartel, -LARG / 2 + 0.01, 1.85, -0.4, 0, Math.PI / 2);

  /* ---------- Les tableaux ---------- */
  const chargeur = new THREE.TextureLoader();
  const toiles = [];
  const tableaux = projets.map((p, i) => {
    const e = (p.ecrans || [])[0] || { l: 4, h: 3 };
    const ratio = e.l / e.h;
    let h = ratio >= 1 ? 1.3 : 1.75, l = h * ratio;
    if (l > 2.3) { l = 2.3; h = l / ratio; }
    const cote = i % 2 ? 1 : -1; // gauche, droite, gauche…
    const groupe = new THREE.Group();
    groupe.position.set(cote * (LARG / 2 - 0.04), 1.7, zTableau(i));
    groupe.rotation.y = -cote * Math.PI / 2;
    const cadre = new THREE.Mesh(new THREE.BoxGeometry(l + 0.14, h + 0.14, 0.06), new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.5, metalness: 0.2 }));
    const toile = new THREE.Mesh(new THREE.PlaneGeometry(l, h), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
    toile.position.z = 0.032;
    if (e.src) chargeur.load(e.src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      toile.material.map = t;
      toile.material.color.set(0xffffff);
      toile.material.needsUpdate = true;
    });
    toile.userData.index = i;
    toiles.push(toile);
    const plaque = textureTexte(640, 200, (g) => {
      g.fillStyle = "#e4e0d8";
      g.font = `700 64px Archivo, system-ui, sans-serif`;
      g.fillText(p.titre, 0, 78);
      g.fillStyle = "#a8a39a";
      g.font = `400 38px Archivo, system-ui, sans-serif`;
      g.fillText([p.type, p.annee].filter(Boolean).join(", "), 2, 150);
    });
    const etiquette = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.225), new THREE.MeshStandardMaterial({ map: plaque, transparent: true, roughness: 0.9 }));
    etiquette.position.set(-l / 2 + 0.36, -h / 2 - 0.32, 0.01);
    groupe.add(cadre, toile, etiquette);
    scene.add(groupe);
    return { z: zTableau(i), cote };
  });

  /* ---------- La lampe torche ---------- */
  const lampe = new THREE.SpotLight(0xfff1dc, 60, 26, 0.34, 0.55, 1.4);
  scene.add(lampe, lampe.target);

  // le chemin : des haltes (l'entrée, un peu avant chaque tableau, la porte) ;
  // entre deux haltes on avance, et on marque une pause à chacune
  const RECUL = 1.6; // on s'arrête 1,6 m avant le tableau, tourné vers lui
  const zFin = zFond + 0.15;
  const haltes = [DEBUT, ...tableaux.map((tb) => tb.z + RECUL), zFin];
  const etapes = tableaux.map((_, i) => (i + 1) / (haltes.length - 1));
  function zDe(progres) {
    const f = progres * (haltes.length - 1);
    const k = Math.min(haltes.length - 2, Math.floor(f));
    const u = f - k;
    // pause autour de chaque halte, mouvement doux entre les deux
    const v = Math.min(1, Math.max(0, (u - 0.2) / 0.6));
    return haltes[k] + (haltes[k + 1] - haltes[k]) * v * v * (3 - 2 * v);
  }
  const raycaster = new THREE.Raycaster();
  const visee = new THREE.Vector2(), viseeLisse = new THREE.Vector2();
  let lacet = 0, tangage = 0, procheIndex = -1;

  function redimensionner() {
    const l = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    // en portrait, on voit plus large
    camera.fov = camera.aspect < 1 ? 72 : 55;
    camera.updateProjectionMatrix();
  }

  function maj(progres, cible, t) {
    const z = zDe(progres);
    // vers quel mur regarder : le cartel au départ, puis le tableau de la halte
    let voulu = 0.52 * Math.exp(-Math.pow((z - DEBUT) / 1.6, 2));
    procheIndex = -1;
    let meilleur = 0;
    tableaux.forEach((tb, i) => {
      const influence = Math.exp(-Math.pow((z - tb.z - RECUL) / 1.8, 2));
      voulu += -tb.cote * 0.88 * influence;
      if (influence > 0.4 && influence > meilleur) { meilleur = influence; procheIndex = i; }
    });
    // sans souris : la lampe éclaire le cartel au départ, le tableau de la
    // halte ensuite, et balaie doucement entre les deux
    const balaie = reduit ? 0 : 1;
    const v = cible || (procheIndex >= 0
      ? { x: Math.sin(t * 0.6) * 0.08 * balaie, y: 0.05 }
      : z > DEBUT - 1.2
        ? { x: -0.15 + Math.sin(t * 0.5) * 0.15 * balaie, y: 0.12 }
        : { x: Math.sin(t * 0.5) * 0.4 * balaie, y: Math.sin(t * 0.37) * 0.15 * balaie });
    visee.set(v.x, v.y);
    viseeLisse.lerp(visee, reduit ? 1 : 0.12);
    const k = reduit ? 1 : 0.06;
    lacet += (voulu - viseeLisse.x * 0.25 - lacet) * k;
    tangage += (viseeLisse.y * 0.12 - tangage) * k;
    camera.position.set(0, 1.6 + (reduit ? 0 : Math.sin(z * 1.6) * 0.012), z);
    camera.rotation.set(tangage, lacet, 0, "YXZ");
    camera.updateMatrixWorld();

    // la lampe part de la main (un peu à droite, en bas) vers le point visé
    raycaster.setFromCamera(viseeLisse, camera);
    lampe.position.copy(camera.position).add(new THREE.Vector3(0.25, -0.3, 0).applyQuaternion(camera.quaternion));
    lampe.target.position.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, 6);
    lampe.target.updateMatrixWorld();
    // à l'arrivée, elle s'allume en grésillant
    let force = 1;
    if (!reduit && t < 1.6) {
      force = t < 0.35 ? 0 : t < 1.2 ? (Math.sin(t * 47) > 0.1 ? 1 : 0.15) * Math.min(1, (t - 0.35) * 2) : 1;
    }
    lampe.intensity = 60 * force;
    renderer.render(scene, camera);
  }

  // le tableau sous un point de l'écran (-1..1)
  function sous(x, y) {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const touche = raycaster.intersectObjects(toiles, false)[0];
    return touche && touche.distance < 9 ? touche.object.userData.index : -1;
  }

  redimensionner();
  return { maj, sous, proche: () => procheIndex, etapes, redimensionner };
}
