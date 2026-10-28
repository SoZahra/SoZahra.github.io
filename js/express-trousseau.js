/*
 * Le trousseau de l'accueil (version classique, index.html) : un anneau
 * suspendu à un crochet, ses porte-clés accrochés autour par des chaînes
 * (images détourées, images/porte-cles/).
 *
 * Physique par positions (Verlet) : chaque chaîne est une file de maillons
 * qui ne peuvent pas s'écarter (mais peuvent se tasser : elle est souple),
 * chaque porte-clé un corps rigide (deux points : son œillet et son milieu),
 * l'anneau tourne autour du crochet et suit ce qui tire sur ses chaînes.
 * À la souris, on attrape un porte-clé, on le soulève, on le lance ; la
 * souris qui passe les pousse, le défilement les secoue, un petit courant
 * d'air les garde vivants. Les chaînes sont dessinées dans un canevas, le
 * reste est en DOM.
 *
 * breloques : [{ src, alt, ratio (largeur / hauteur de l'image), hauteur et
 *   chaine (en unités : 1 u = 1 % de la hauteur de la scène), anneau : [fx, fy]
 *   = où passe la chaîne dans l'image (fractions), penche (facultatif : son
 *   angle au repos, en rad, vers l'extérieur), lien ou clic, etiquette }]
 *   La première pend au milieu, les suivantes alternent gauche / droite.
 */
const G = 2600;           // pesanteur, en px/s²
const H = 1 / 180;        // pas de temps de la simulation (s)
const ITERATIONS = 8;     // passes sur les contraintes, par pas
const AMORTI = 0.994;     // frottement de l'air, par pas
const AMORTI_ANNEAU = 0.992;
const PAS = 0.7;          // écart entre deux attaches sur l'anneau (rad)
const ECARTEMENT = 0.5;   // les porte-clés se repoussent : ils pendent en éventail,
const PENCHE_MAX = 0.75;  // d'autant plus qu'ils sont loin du milieu (rad)
const MAILLON = 1.2;      // longueur d'un segment de chaîne simulé (u)
const POIDS_OBJET = 0.2;  // inverse de la masse d'un porte-clé moyen (un maillon : 1)
const POIDS_ANNEAU = 0.1; // inverse de la masse de l'anneau, vu d'un point d'attache
const MAIN = 0.25;        // souplesse de la main qui tient un porte-clé (1 : collé à la souris)
const ELAN = 0.4;         // part de l'élan gardée au lâcher
const VITESSE_LACHER = 700; // vitesse maximale au lâcher (px/s)
const PHI_MAX = 1.3;      // l'anneau peut tourner jusque-là autour du crochet (rad)
// images/porte-cles/anneau.webp : rayon du milieu du tube, et épaisseur du tube,
// en fraction de la largeur de l'image (le centre est au milieu de l'image)
const ANNEAU_RAYON = 174.5 / 418, ANNEAU_TUBE = 66 / 418;

export function creerTrousseau(scene, { breloques, reduit, auSurvol }) {
  const crochets = scene.querySelectorAll(".trousseau-crochet");
  const toile = document.createElement("canvas");
  toile.className = "trousseau-chaines";
  toile.setAttribute("aria-hidden", "true");
  const ctx = toile.getContext("2d");
  const liste = document.createElement("ul");
  liste.className = "breloques";
  const anneau = document.createElement("div");
  anneau.className = "trousseau-anneau";
  const imgAnneau = document.createElement("img");
  Object.assign(imgAnneau, { className: "anneau-metal", src: "images/porte-cles/anneau.webp", alt: "", draggable: false });
  anneau.append(imgAnneau);
  scene.append(toile, liste, anneau);

  // l'anneau : un pendule autour du crochet (angle et angle au pas d'avant)
  const A = { phi: 0, ophi: 0 };

  /* ---------- Les porte-clés ---------- */
  const items = breloques.map((b, i) => {
    const cote = i === 0 ? 0 : (i % 2 ? -1 : 1);
    const rang = Math.ceil(i / 2);
    const alpha = cote * rang * PAS;
    const li = document.createElement("li");
    li.className = "breloque";
    li.style.zIndex = String(20 - i);
    let objet;
    if (b.lien) {
      objet = document.createElement("a");
      objet.href = b.lien;
      if (b.telecharger) objet.setAttribute("download", "");
    } else if (b.clic) {
      objet = document.createElement("button");
      objet.type = "button";
    } else {
      objet = document.createElement("span"); // décoratif : on peut juste le faire tinter
      objet.setAttribute("aria-hidden", "true");
    }
    objet.className = "breloque-objet";
    objet.draggable = false;
    if (b.etiquette) objet.setAttribute("aria-label", b.etiquette);
    const img = document.createElement("img");
    Object.assign(img, { src: b.src, alt: "", decoding: "async", draggable: false });
    objet.append(img);
    li.append(objet);
    liste.append(li);

    const it = {
      b, li, objet, alpha, i,
      repos: Math.sign(alpha) * (b.penche ?? Math.min(Math.abs(alpha) * ECARTEMENT, PENCHE_MAX)),
      pts: [], L: 1, c: 1, w: 1, h: 1, dAB: 1, angleRepos: 0, sansClic: false,
    };
    // après un glisser, le clic qui suit ne compte pas (enregistré avant les autres)
    objet.addEventListener("click", (e) => {
      if (!it.sansClic) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    });
    if (b.clic) objet.addEventListener("click", b.clic);
    const survol = () => { auSurvol && auSurvol(i); lancer(it, (Math.random() - 0.5) * 120, 0); };
    const quitte = () => { auSurvol && auSurvol(-1); };
    objet.addEventListener("pointerenter", survol);
    objet.addEventListener("focus", survol);
    objet.addEventListener("pointerleave", quitte);
    objet.addEventListener("blur", quitte);
    objet.addEventListener("click", () => {
      lancer(it, (Math.random() < 0.5 ? -1 : 1) * 900, -300);
      A.ophi -= (Math.random() - 0.5) * 0.6 * H;
    });
    objet.addEventListener("pointerdown", (e) => attraper(it, e));
    return it;
  });
  const point = (x, y, w) => ({ x, y, ox: x, oy: y, w });
  const oeillet = (it) => it.pts[it.pts.length - 2];
  const milieu = (it) => it.pts[it.pts.length - 1];

  /* ---------- Mesures ---------- */
  let u = 1, R = 10, hx = 0, hy = 0, W = 0, Hs = 0;
  function mesurer() {
    W = scene.clientWidth; Hs = scene.clientHeight;
    u = Math.min(Hs / 100, W / (W < 760 ? 80 : 68)); // sur téléphone, de la place pour la colonne et le menu
    R = 7.5 * u;
    hx = W / 2;
    // le trousseau (environ 75 u du crochet aux pieds) est centré dans la scène
    hy = Math.max(15 * u, (Hs - 75 * u) / 2);
    // l'anneau, en image : le milieu de son tube passe par (0, 0) en haut
    const taille = R / ANNEAU_RAYON;
    Object.assign(imgAnneau.style, { left: `${-taille / 2}px`, top: `${R - taille / 2}px`, width: `${taille}px` });
    // le tube de l'anneau repose dans le creux du crochet (son repère est en CSS)
    crochets.forEach((c) => Object.assign(c.style, { left: `${hx}px`, top: `${hy + 0.3 * ANNEAU_TUBE * taille}px` }));
    crochets.forEach((c) => c.style.setProperty("--u", `${u}px`));
    anneau.style.setProperty("--u", `${u}px`);
    liste.style.setProperty("--u", `${u}px`);
    const dpr = Math.min(2, devicePixelRatio || 1);
    toile.width = Math.round(W * dpr);
    toile.height = Math.round(Hs * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // chaque porte-clé repart d'aplomb, dans la direction où il penche au repos
    A.phi = A.ophi = 0;
    items.forEach((it) => {
      const [fx, fy] = it.b.anneau;
      it.h = it.b.hauteur * u;
      it.w = it.h * it.b.ratio;
      it.c = it.b.chaine * u;
      it.masse = (it.b.hauteur * it.b.hauteur * it.b.ratio) / 400; // les gros retiennent l'anneau
      const n = Math.max(2, Math.round(it.b.chaine / MAILLON));
      it.L = it.c / n;
      // du point d'attache de l'œillet au milieu de l'image
      const dx = (0.5 - fx) * it.w, dy = (0.5 - fy) * it.h;
      it.dAB = Math.hypot(dx, dy);
      it.angleRepos = Math.atan2(dy, dx);
      it.objet.style.width = `${it.w}px`;
      it.objet.style.height = `${it.h}px`;
      const a = attache(it), s = Math.sin(it.repos), co = Math.cos(it.repos);
      it.pts = [];
      for (let k = 0; k <= n; k++) it.pts.push(point(a.x - s * k * it.L, a.y + co * k * it.L, k === n ? POIDS_OBJET / it.masse : 1));
      const A0 = it.pts[n];
      it.pts.push(point(A0.x - s * it.dAB, A0.y + co * it.dAB, POIDS_OBJET / it.masse));
    });
    // on laisse le tout se poser avant de l'afficher
    for (let k = 0; k < 360; k++) pas();
    items.forEach((it) => it.pts.forEach((p) => { p.ox = p.x; p.oy = p.y; }));
    A.ophi = A.phi;
  }

  // point d'attache d'un porte-clé sur l'anneau (repère de la scène)
  function attache(it) {
    const a = A.phi;
    const lx = -R * Math.sin(it.alpha), ly = R + R * Math.cos(it.alpha);
    return { x: hx + lx * Math.cos(a) - ly * Math.sin(a), y: hy + lx * Math.sin(a) + ly * Math.cos(a) };
  }
  // tirer sur l'anneau au point d'attache a : il tourne autour du crochet
  function tirerAnneau(a, ex, ey, part) {
    const rx = a.x - hx, ry = a.y - hy, r2 = rx * rx + ry * ry || 1;
    A.phi = Math.max(-PHI_MAX, Math.min(PHI_MAX, A.phi + (part * (rx * ey - ry * ex)) / r2));
  }

  /* ---------- Physique ---------- */
  let prise = null; // { it, t (où on le tient, de l'œillet 0 au milieu 1), x, y, x0, y0, bouge }

  function lancer(it, vx, vy) {
    if (reduit) return;
    const p = milieu(it);
    p.ox -= vx * H;
    p.oy -= vy * H;
    reveiller();
  }

  function pas() {
    // l'anneau
    const vphi = (A.phi - A.ophi) * AMORTI_ANNEAU;
    A.ophi = A.phi;
    A.phi += vphi - (G / (R * 2.2)) * Math.sin(A.phi) * H * H;
    // les points : pesanteur, et l'éventail (chaque porte-clé est poussé
    // de côté, comme repoussé par ses voisins, sauf celui qu'on tient)
    items.forEach((it) => {
      const deCote = prise && prise.it === it ? 0 : -G * Math.tan(it.repos); // repos > 0 : vers la gauche
      it.pts.forEach((p) => {
        const vx = (p.x - p.ox) * AMORTI, vy = (p.y - p.oy) * AMORTI;
        p.ox = p.x; p.oy = p.y;
        p.x += vx + deCote * H * H;
        p.y += vy + G * H * H;
      });
    });
    for (let n = 0; n < ITERATIONS; n++) contraintes();
  }

  function contraintes() {
    // la main qui tient un porte-clé
    if (prise) {
      const it = prise.it, a = oeillet(it), m = milieu(it), t = prise.t;
      const px = a.x + (m.x - a.x) * t, py = a.y + (m.y - a.y) * t;
      // la main suit la souris avec un peu de souplesse (pas d'à-coups)
      const dx = (prise.x - px) * MAIN, dy = (prise.y - py) * MAIN, s = 1 / ((1 - t) ** 2 + t * t);
      a.x += dx * (1 - t) * s; a.y += dy * (1 - t) * s;
      m.x += dx * t * s; m.y += dy * t * s;
    }
    items.forEach((it) => {
      const P = it.pts, n = P.length - 2; // P[n] : l'œillet, P[n + 1] : le milieu
      // les maillons ne s'écartent pas (mais se tassent)
      for (let k = 0; k < n; k++) {
        const p = P[k], q = P[k + 1];
        const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
        if (d <= it.L) continue;
        const f = (d - it.L) / d / (p.w + q.w);
        p.x += dx * f * p.w; p.y += dy * f * p.w;
        q.x -= dx * f * q.w; q.y -= dy * f * q.w;
      }
      // le porte-clé est rigide
      const o = P[n], m = P[n + 1];
      const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - it.dAB) / d / 2;
      o.x += dx * f; o.y += dy * f;
      m.x -= dx * f; m.y -= dy * f;
      // la chaîne entière ne s'allonge pas : chaque point reste à portée de
      // l'anneau ; ce qui tire au-delà fait tourner l'anneau, d'autant plus
      // que le porte-clé est lourd (ou tenu : la main ne cède pas)
      let a = attache(it);
      const tenu = prise && prise.it === it;
      for (let k = n; k >= 1; k--) {
        const p = P[k], ex = p.x - a.x, ey = p.y - a.y, e = Math.hypot(ex, ey), max = k * it.L;
        if (e <= max) continue;
        if (k === n) {
          const w = tenu ? 1 : p.w, part = POIDS_ANNEAU / (w + POIDS_ANNEAU);
          tirerAnneau(a, ex * (1 - max / e), ey * (1 - max / e), part);
          a = attache(it);
        }
        const gx = p.x - a.x, gy = p.y - a.y, g = Math.hypot(gx, gy) || 1;
        if (g > max) { p.x = a.x + (gx * max) / g; p.y = a.y + (gy * max) / g; }
      }
      // le premier maillon est accroché à l'anneau
      P[0].x = a.x; P[0].y = a.y;
    });
  }

  /* ---------- Dessin ---------- */
  function dessiner() {
    anneau.style.transform = `translate(${hx}px, ${hy}px) rotate(${A.phi}rad)`;
    ctx.clearRect(0, 0, W, Hs);
    items.forEach((it) => {
      const o = oeillet(it), m = milieu(it);
      const rot = Math.atan2(m.y - o.y, m.x - o.x) - it.angleRepos;
      const [fx, fy] = it.b.anneau;
      it.objet.style.transform = `translate(${o.x}px, ${o.y}px) rotate(${rot}rad) translate(${-fx * it.w}px, ${-fy * it.h}px)`;
      dessinerChaine(it.pts.slice(0, -1));
    });
  }

  // une petite chaîne dorée : des maillons vus de face et de profil, en alternance
  function dessinerChaine(P) {
    const pasM = 0.75 * u;
    let reste = 0, face = true;
    for (let k = 0; k < P.length - 1; k++) {
      const p = P[k], q = P[k + 1];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d < 0.01) continue;
      const ang = Math.atan2(dy, dx);
      for (let s = reste; s < d; s += pasM) {
        const x = p.x + (dx * s) / d, y = p.y + (dy * s) / d;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        if (face) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 0.5 * u, 0.32 * u, 0, 0, Math.PI * 2);
          ctx.lineWidth = 0.2 * u; ctx.strokeStyle = "#a77a2a"; ctx.stroke();
          ctx.lineWidth = 0.08 * u; ctx.strokeStyle = "#fbe7a8"; ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-0.42 * u, 0); ctx.lineTo(0.42 * u, 0);
          ctx.lineCap = "round";
          ctx.lineWidth = 0.22 * u; ctx.strokeStyle = "#9a7128"; ctx.stroke();
          ctx.lineWidth = 0.08 * u; ctx.strokeStyle = "#f6dc93"; ctx.stroke();
        }
        ctx.restore();
        face = !face;
        reste = s + pasM - d;
      }
    }
  }

  /* ---------- Gestes ---------- */
  function position(e) {
    const r = scene.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // attraper un porte-clé (à la souris : au doigt, on fait défiler la page)
  function attraper(it, e) {
    if (reduit || e.pointerType !== "mouse" || e.button !== 0) return;
    e.preventDefault();
    const { x, y } = position(e);
    const a = oeillet(it), m = milieu(it);
    const ax = m.x - a.x, ay = m.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ax + (y - a.y) * ay) / (ax * ax + ay * ay || 1)));
    prise = { it, t, x, y, x0: x, y0: y, bouge: false };
    try { it.objet.setPointerCapture(e.pointerId); } catch (_) { /* pointeur déjà parti */ }
    it.li.classList.add("tenue");
    reveiller();
  }
  function lacher() {
    if (!prise) return;
    const it = prise.it;
    it.li.classList.remove("tenue");
    // au lâcher, il garde un peu de son élan, pas tout
    it.pts.forEach((p) => {
      let vx = (p.x - p.ox) * ELAN, vy = (p.y - p.oy) * ELAN;
      const v = Math.hypot(vx, vy), max = VITESSE_LACHER * H;
      if (v > max) { vx *= max / v; vy *= max / v; }
      p.ox = p.x - vx; p.oy = p.y - vy;
    });
    A.ophi = A.phi - (A.phi - A.ophi) * ELAN;
    if (prise.bouge) {
      it.sansClic = true;
      setTimeout(() => { it.sansClic = false; }, 0);
    }
    prise = null;
    reveiller();
  }
  items.forEach((it) => {
    it.objet.addEventListener("pointerup", lacher);
    it.objet.addEventListener("pointercancel", lacher);
    it.objet.addEventListener("lostpointercapture", lacher);
  });

  let souris = null;
  scene.addEventListener("pointermove", (e) => {
    if (reduit || e.pointerType === "touch") return;
    const { x, y } = position(e);
    if (prise) {
      // on ne sort pas de la scène
      prise.x = Math.max(0, Math.min(W, x));
      prise.y = Math.max(0, Math.min(Hs, y));
      if (Math.hypot(x - prise.x0, y - prise.y0) > 5) prise.bouge = true;
      reveiller();
      souris = null;
      return;
    }
    const t = performance.now();
    if (souris && t > souris.t) {
      const vx = ((x - souris.x) / (t - souris.t)) * 1000;
      // la souris qui passe sur un porte-clé le pousse
      items.forEach((it) => {
        const r = it.objet.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          lancer(it, Math.max(-450, Math.min(450, vx * 0.08)), 0);
        }
      });
      // en frôlant l'anneau, on le fait tourner un peu
      const centre = { x: hx - R * Math.sin(A.phi), y: hy + R * Math.cos(A.phi) };
      const d = Math.hypot(x - centre.x, y - centre.y);
      if (Math.abs(d - R) < 2 * u) { A.ophi += vx * 0.0003 * H; reveiller(); }
    }
    souris = { x, y, t };
  }, { passive: true });
  scene.addEventListener("pointerleave", () => { souris = null; });

  let dernierY = scrollY;
  window.addEventListener("scroll", () => {
    const dy = scrollY - dernierY;
    dernierY = scrollY;
    if (reduit || scrollY > scene.offsetHeight) return;
    const f = Math.max(-60, Math.min(60, dy)) * 12;
    items.forEach((it, i) => lancer(it, f * (i % 2 ? -1 : 1) * (0.6 + Math.random() * 0.6), -Math.abs(f) * 0.3));
  }, { passive: true });

  /* ---------- Boucle ----------
     Elle ne tourne que si le trousseau est à l'écran et bouge encore ; un
     courant d'air, de temps en temps, le relance. */
  let visible = true, enCours = false, avant = 0, cumul = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) reveiller(); }).observe(scene);
  function reveiller() {
    if (enCours || reduit || !visible) return;
    enCours = true;
    avant = performance.now();
    cumul = 0;
    requestAnimationFrame(image);
  }
  function image(t) {
    cumul += Math.min(0.05, Math.max(0, (t - avant) / 1000));
    avant = t;
    let bouge = 0;
    while (cumul >= H) {
      pas();
      cumul -= H;
    }
    dessiner();
    items.forEach((it) => it.pts.forEach((p) => { bouge = Math.max(bouge, Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy)); }));
    bouge = Math.max(bouge, Math.abs(A.phi - A.ophi) * R);
    if (visible && (prise || bouge > 0.01)) requestAnimationFrame(image);
    else enCours = false;
  }
  if (!reduit) {
    const courantDAir = () => {
      A.ophi -= (Math.random() - 0.5) * 0.12 * H;
      items.forEach((it) => lancer(it, (Math.random() - 0.5) * 220, 0));
      setTimeout(courantDAir, 2500 + Math.random() * 3500);
    };
    setTimeout(courantDAir, 2500);
  }

  mesurer();
  dessiner();
  if (!reduit) items.forEach((it) => lancer(it, (Math.random() - 0.5) * 500, 0));

  return {
    redimensionner() { prise = null; mesurer(); dessiner(); },
  };
}
