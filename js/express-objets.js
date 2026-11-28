/*
 * Ses objets, dans le volet À propos de la version classique (index.html) :
 * des images détourées dans le style des porte-clés (images/objets/), qui
 * tombent à l'ouverture du volet et s'empilent en bas, dans la place
 * laissée à gauche du volet (sous son porte-clé). On les attrape, on les
 * lance, ils se cognent ; au survol, une étiquette dit ce qu'ils racontent.
 * À la fermeture, le sol s'ouvre et ils tombent hors de l'écran.
 *
 * Physique : Matter.js (js/vendor/matter.min.js, licence MIT), chargé à la
 * première ouverture seulement. Données : `objets` dans js/whoami.js.
 * Pas d'objets au téléphone (le volet couvre l'écran) ; si l'utilisateur
 * préfère moins d'animations, ils sont posés sans tomber ni bouger.
 */
let matterPromesse = null;
function chargerMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  matterPromesse ??= new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "js/vendor/matter.min.js";
    s.onload = () => ok(window.Matter);
    s.onerror = ko;
    document.head.append(s);
  });
  return matterPromesse;
}

// perso : son porte-clé, pour que les objets s'y cognent (et le poussent) :
//   { boite: () => { x, y, angle, l, h } | null, pousser: (vx, vy) => void }
export function creerObjets({ objets, reduit, perso }) {
  const calque = document.createElement("div");
  calque.className = "objets";
  calque.setAttribute("aria-hidden", "true");
  document.body.append(calque);

  let M = null, moteur = null, sol = null, murs = [], corps = [], boucle = 0, prise = null, etat = "cache";
  let fantome = null, tailleFantome = ""; // sa silhouette, invisible, dans le monde des objets
  // ils tombent dans la place à gauche du volet (44vw), mais on peut les
  // emmener partout : murs et sol sont ceux de l'écran entier
  const zone = () => ({ l: Math.round(innerWidth * 0.44), h: innerHeight });

  function creerMonde() {
    const { Engine, Bodies, Composite } = M;
    moteur = Engine.create({ gravity: { y: 1.1 } });
    // le sol, un peu au-dessus du bas de l'écran (les objets ne touchent pas le bord)
    sol = Bodies.rectangle(0, 0, 1, 1, { isStatic: true, friction: 0.9 });
    murs = [Bodies.rectangle(0, 0, 1, 1, { isStatic: true }), Bodies.rectangle(0, 0, 1, 1, { isStatic: true })];
    placerBords();
    Composite.add(moteur.world, [sol, ...murs]);
    if (perso) {
      // sa silhouette suit son porte-clé (placée à chaque pas, voir suivre())
      fantome = Bodies.rectangle(-9999, -9999, 10, 10, { isStatic: true, restitution: 0.4, friction: 0.3 });
      Composite.add(moteur.world, fantome);
      // un objet qui la heurte la pousse, selon sa vitesse
      M.Events.on(moteur, "collisionStart", (e) => e.pairs.forEach(({ bodyA, bodyB }) => {
        if (bodyA !== fantome && bodyB !== fantome) return;
        const autre = bodyA === fantome ? bodyB : bodyA;
        const borne = (v) => Math.max(-420, Math.min(420, v * 60 * 0.55));
        perso.pousser(borne(autre.velocity.x), borne(autre.velocity.y));
      }));
    }
  }
  function suivre() {
    if (!fantome) return;
    const b = etat === "la" ? perso.boite() : null;
    if (!b) { M.Body.setPosition(fantome, { x: -9999, y: -9999 }); return; }
    // un peu plus petite que l'image (les bords détourés sont vides)
    const l = b.l * 0.62, h = b.h * 0.9, cle = `${Math.round(l)}x${Math.round(h)}`;
    if (cle !== tailleFantome) {
      tailleFantome = cle;
      M.Body.setAngle(fantome, 0);
      M.Body.setVertices(fantome, M.Vertices.fromPath(`0 0 ${l} 0 ${l} ${h} 0 ${h}`));
    }
    M.Body.setPosition(fantome, { x: b.x, y: b.y });
    M.Body.setAngle(fantome, b.angle);
  }
  // sol et murs aux bords de l'écran (refait si la fenêtre change de taille)
  function placerBords() {
    const { Body, Vertices } = M, L = innerWidth, h = innerHeight, e = 200;
    const poser = (b, x, y, w, hh) => {
      Body.setVertices(b, Vertices.fromPath(`0 0 ${w} 0 ${w} ${hh} 0 ${hh}`));
      Body.setPosition(b, { x, y });
    };
    poser(sol, L / 2, h + e / 2 - 28, L * 3, e);
    poser(murs[0], -e / 2, h / 2, e, h * 4);
    poser(murs[1], L + e / 2, h / 2, e, h * 4);
  }
  addEventListener("resize", () => { if (moteur && etat === "la") placerBords(); });

  async function preparerImages() {
    // chaque objet : son image, sa taille (en hauteur d'écran), son étiquette
    return Promise.all(objets.map(async (o) => {
      const el = document.createElement("div");
      el.className = "objet";
      const img = new Image();
      img.src = o.src; img.alt = ""; img.draggable = false;
      try { await img.decode(); } catch (e) { /* image absente : objet ignoré */ return null; }
      const etiquette = document.createElement("span");
      etiquette.className = "objet-etiquette";
      const nom = document.createElement("strong");
      nom.textContent = o.nom;
      etiquette.append(nom, document.createTextNode(o.texte ? ` — ${o.texte}` : ""));
      el.append(img);
      // l'étiquette est à part : elle suit l'objet sans tourner avec lui
      calque.append(el, etiquette);
      el.addEventListener("pointerenter", () => etiquette.classList.add("visible"));
      el.addEventListener("pointerleave", () => etiquette.classList.remove("visible"));
      return { o, el, img, etiquette, ratio: img.naturalWidth / img.naturalHeight };
    }));
  }

  function poser(liste) {
    const { Bodies, Composite, Body } = M;
    const { l, h } = zone();
    corps = liste.filter(Boolean).map((x, k, tous) => {
      const hauteur = (x.o.taille || 16) * h / 100, largeur = hauteur * x.ratio;
      x.el.style.width = `${largeur}px`;
      x.el.style.height = `${hauteur}px`;
      // répartis sur la largeur, lâchés au-dessus de l'écran les uns après les autres
      const px = l * (0.18 + 0.64 * (tous.length > 1 ? k / (tous.length - 1) : 0.5));
      const py = reduit ? h - hauteur / 2 - 8 : -hauteur - k * 140;
      const b = Bodies.rectangle(px, py, largeur * 0.86, hauteur * 0.92, {
        chamfer: { radius: Math.min(largeur, hauteur) * 0.18 },
        restitution: 0.25, friction: 0.6, frictionAir: 0.012, density: 0.002,
      });
      if (!reduit) Body.setAngle(b, (Math.random() - 0.5) * 0.25);
      Composite.add(moteur.world, b);
      x.corps = b; x.l = largeur; x.h = hauteur;
      x.el.addEventListener("pointerdown", (e) => attraper(x, e));
      return x;
    });
  }

  function dessiner() {
    corps.forEach((x) => {
      const { x: px, y: py } = x.corps.position;
      x.el.style.transform = `translate(${px - x.l / 2}px, ${py - x.h / 2}px) rotate(${x.corps.angle}rad)`;
      // l'étiquette reste dans l'écran, même quand l'objet est contre un bord
      const demi = (x.etiquette.offsetWidth || 200) / 2 + 8;
      const ex = Math.max(demi, Math.min(innerWidth - demi, px));
      x.etiquette.style.transform = `translate(${ex}px, ${Math.max(40, py - x.h / 2 - 10)}px) translate(-50%, -100%)`;
    });
  }

  // pas fixes de 1/60 s (ce que Matter.js préfère), rattrapés au besoin
  const PAS = 1000 / 60;
  let avant = 0, cumul = 0;
  function image(t) {
    cumul += Math.min(100, t - (avant || t));
    avant = t;
    while (cumul >= PAS) { suivre(); M.Engine.update(moteur, PAS); cumul -= PAS; }
    if (prise) {
      M.Body.setVelocity(prise.x.corps, { x: (prise.cx - prise.x.corps.position.x) * 0.25, y: (prise.cy - prise.x.corps.position.y) * 0.25 });
      M.Body.setAngularVelocity(prise.x.corps, prise.x.corps.angularVelocity * 0.9);
    }
    dessiner();
    // à la fermeture : quand tout est sorti par le bas, on arrête
    if (etat === "part" && corps.every((x) => x.corps.position.y > innerHeight + 300)) { arreter(); return; }
    boucle = requestAnimationFrame(image);
  }
  function lancerBoucle() { if (!boucle) { avant = 0; cumul = 0; boucle = requestAnimationFrame(image); } }
  function arreter() {
    cancelAnimationFrame(boucle); boucle = 0;
    calque.classList.remove("visible");
    calque.replaceChildren();
    corps = []; moteur = null; fantome = null; tailleFantome = ""; etat = "cache";
  }

  // attraper un objet : il suit la souris (un peu en retard), on le lance en lâchant
  function attraper(x, e) {
    if (reduit || e.button !== 0) return;
    e.preventDefault();
    prise = { x, cx: e.clientX, cy: e.clientY };
    x.el.classList.add("tenu");
    x.el.setPointerCapture(e.pointerId);
  }
  calque.addEventListener("pointermove", (e) => { if (prise) { prise.cx = e.clientX; prise.cy = e.clientY; } });
  const lacher = () => { if (!prise) return; prise.x.el.classList.remove("tenu"); prise = null; };
  calque.addEventListener("pointerup", lacher);
  calque.addEventListener("pointercancel", lacher);

  return {
    // téléphone (ou tablette) secoué : ax, ay en m/s², les objets partent à l'opposé
    secouer(ax, ay) {
      if (etat !== "la" || reduit) return;
      const borne = (v) => Math.max(-25, Math.min(25, v));
      corps.forEach((x) => {
        if (prise && prise.x === x) return;
        const v = x.corps.velocity, k = 0.6 + Math.random() * 0.4;
        M.Body.setVelocity(x.corps, { x: v.x + borne(-ax * k), y: v.y + borne(-ay * k) });
        M.Body.setAngularVelocity(x.corps, x.corps.angularVelocity + (Math.random() - 0.5) * 0.2);
      });
    },
    async montrer() {
      if (!objets?.length || matchMedia("(max-width: 760px)").matches) return;
      if (etat === "part") arreter();
      if (etat !== "cache") return;
      etat = "charge";
      try { M = await chargerMatter(); } catch (e) { etat = "cache"; return; }
      creerMonde();
      poser(await preparerImages());
      if (etat !== "charge") { arreter(); return; } // refermé pendant le chargement
      etat = "la";
      calque.classList.add("visible");
      dessiner();
      if (!reduit) lancerBoucle();
    },
    cacher() {
      if (etat === "charge") { etat = "part"; return; }
      if (etat !== "la") return;
      lacher();
      if (reduit) { arreter(); return; }
      // le sol et les murs s'effacent : tout tombe, avec un petit saut
      etat = "part";
      M.Composite.remove(moteur.world, [sol, ...murs]);
      corps.forEach((x) => M.Body.setVelocity(x.corps, { x: (Math.random() - 0.5) * 6, y: -6 - Math.random() * 4 }));
      lancerBoucle();
    },
  };
}
