/*
 * Version rapide du portfolio (express.html).
 * Remplit la page avec les mêmes données que la version immersive
 * (js/projets.js, js/whoami.js, js/contact.js), puis anime :
 *   - l'intro : une affiche en papier à son nom arrive froissée et se déplie ;
 *     au défilement, elle se froisse de nouveau et s'envole (js/express-papier.js) ;
 *   - le manifeste qui s'allume mot à mot ;
 *   - les projets en billets qui défilent en diagonale (js/express-billets.js) ;
 *   - le curseur personnalisé.
 */
import { creerPapier } from "./express-papier.js";
import { creerBillets } from "./express-billets.js";

const P = window.PROJETS || { categories: {}, liste: [] };
const W = window.WHOAMI || {};
const C = window.CONTACT || {};
const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactile = window.matchMedia("(hover: none)").matches;

// Petit utilitaire : crée un élément avec classe et texte (jamais de HTML brut)
function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const deux = (n) => String(n).padStart(2, "0");
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lisse = (t) => t * t * (3 - 2 * t);
const entreSort = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* ---------- Textes ---------- */
document.getElementById("classe").textContent = W.classe || "";
const annee = new Date().getFullYear();
document.getElementById("annee").textContent = annee;

// Manifeste : la devise, mot à mot ; ce qui suit les points de suspension en rouge
const manifeste = document.getElementById("manifeste-texte");
const [debutDevise, ...finDevise] = (W.devise || "").split("…");
const mots = [];
function ajouterMots(texte, accent) {
  texte.split(/\s+/).filter(Boolean).forEach((m) => {
    const s = el("span", accent ? "mot accent" : "mot", m);
    mots.push(s);
    manifeste.append(s, " ");
  });
}
ajouterMots(debutDevise + (finDevise.length ? "…" : ""), false);
if (finDevise.length) ajouterMots(finDevise.join("…"), true);

/* ---------- Projets : liste, détails, fiche ---------- */
const fiche = document.getElementById("fiche");
const ficheContenu = document.getElementById("fiche-contenu");
document.getElementById("projet-total").textContent = `/${deux(P.liste.length)}`;

function ouvrirFiche(p, cat) {
  ficheContenu.replaceChildren();
  fiche.style.setProperty("--pastille", cat.couleur);
  const titre = el("h3", "", p.titre);
  titre.id = "fiche-titre";
  ficheContenu.append(el("span", "fiche-cat", `${cat.libelle} · ${p.annee || ""}`), titre);
  if (p.resume) ficheContenu.append(el("p", "fiche-resume", p.resume));
  (p.description || []).forEach((d) => ficheContenu.append(el("p", "", d)));
  const infos = el("dl");
  if (p.role) infos.append(el("dt", "", "Rôle"), el("dd", "", p.role));
  if (p.outils && p.outils.length) infos.append(el("dt", "", "Outils"), el("dd", "", p.outils.join(" · ")));
  if (p.effets && p.effets.length) infos.append(el("dt", "", "Apports"), el("dd", "", p.effets.map((e) => e.replace(/^\+\s*/, "")).join(" · ")));
  ficheContenu.append(infos);
  if (p.liens && p.liens.length) {
    const liens = el("p", "fiche-liens");
    p.liens.forEach((l) => {
      const a = el("a", "", `${l.libelle} ↗`);
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      liens.append(a);
    });
    ficheContenu.append(liens);
  }
  fiche.showModal();
}
document.getElementById("fiche-fermer").addEventListener("click", () => fiche.close());
// Clic hors de la fiche (sur le fond) : on ferme
fiche.addEventListener("click", (e) => { if (e.target === fiche) fiche.close(); });

const projets = P.liste.map((p) => ({ p, cat: P.categories[p.categorie] || { libelle: "", couleur: "#8a8784" } }));
const listeProjets = document.getElementById("projets-liste");
const infosProjet = document.getElementById("projet-infos");
const grandNum = document.getElementById("grand-num");

// Liste à droite : un bouton par projet (ouvre sa fiche)
const lignesProjets = projets.map(({ p, cat }, i) => {
  const li = el("li");
  const b = el("button", "projet-ligne");
  b.type = "button";
  b.dataset.curseur = "Ouvrir";
  b.append(
    el("span", "projet-ligne-cat", cat.libelle),
    el("span", "projet-ligne-titre", p.titre.replace(/^Exemple\s*—\s*/, "")),
    el("span", "projet-ligne-tiret"),
    el("span", "projet-ligne-resume", p.resume || ""),
  );
  b.addEventListener("click", () => ouvrirFiche(p, cat));
  li.append(b);
  listeProjets.append(li);
  return li;
});

// Détails du projet actif, à gauche
function afficherInfos(i) {
  const { p, cat } = projets[i];
  const lignes = [
    ["Catégorie", cat.libelle],
    ["Rôle", p.role],
    ["Année", p.annee],
    ["Outils", (p.outils || []).join("\n")],
    ["Apports", (p.effets || []).map((e) => e.replace(/^\+\s*/, "")).join("\n")],
  ];
  infosProjet.replaceChildren();
  lignes.forEach(([dt, dd]) => {
    if (!dd) return;
    const d = el("dd", "", "");
    dd.split("\n").forEach((l, k) => { if (k) d.append(document.createElement("br")); d.append(l); });
    infosProjet.append(el("dt", "", dt), d);
  });
}

let actif = -1;
function changerActif(i) {
  if (i === actif) return;
  actif = i;
  lignesProjets.forEach((li, k) => li.classList.toggle("est-actif", k === i));
  // la liste glisse pour garder le projet actif au milieu
  const li = lignesProjets[i];
  listeProjets.style.transform = `translateY(${-(li.offsetTop + li.offsetHeight / 2)}px)`;
  grandNum.textContent = deux(i + 1);
  grandNum.classList.remove("roule");
  void grandNum.offsetWidth; // relance l'animation
  grandNum.classList.add("roule");
  infosProjet.classList.add("est-change");
  setTimeout(() => { afficherInfos(i); infosProjet.classList.remove("est-change"); }, reduit ? 0 : 180);
}
changerActif(0);

/* ---------- À propos ---------- */
function remplirDefilant(id, mots) {
  const piste = document.getElementById(id);
  // deux fois la même suite : la boucle est invisible
  for (let k = 0; k < 2; k++) {
    mots.forEach((m) => piste.append(el("span", "", m), el("i", "", "✦")));
  }
}
remplirDefilant("defilant-1", W.competences || []);
remplirDefilant("defilant-2", (W.attributs || []).map((a) => a.libelle));

const histoire = document.getElementById("histoire");
(W.histoire || []).forEach((h) => histoire.append(el("p", "", h)));
const competences = document.getElementById("competences");
(W.competences || []).forEach((c) => competences.append(el("li", "", c)));
const parcours = document.getElementById("parcours");
(W.quetes || []).forEach((q) => {
  const li = el("li");
  li.append(el("span", "annee", q.annee), el("span", "", q.titre), el("span", "lieu", q.lieu || ""));
  parcours.append(li);
});

/* ---------- Contact ---------- */
const email = document.getElementById("email");
email.textContent = C.email || "";
email.href = `mailto:${C.email || ""}`;
const copieOk = document.getElementById("copie-ok");
document.getElementById("copier").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(C.email || "");
    copieOk.textContent = "Adresse copiée !";
  } catch (e) {
    copieOk.textContent = "Copie impossible : sélectionne l'adresse à la main.";
  }
  setTimeout(() => { copieOk.textContent = ""; }, 2500);
});
const liens = document.getElementById("liens");
const vus = new Set();
[...(C.cadres || []), ...(W.liens || [])].forEach((l) => {
  if (vus.has(l.url)) return;
  vus.add(l.url);
  const a = el("a", "", `${l.libelle} ↗`);
  a.href = l.url;
  if (l.telecharger) a.setAttribute("download", "");
  else { a.target = "_blank"; a.rel = "noopener"; }
  const li = el("li");
  li.append(a);
  liens.append(li);
});

/* ---------- Apparition au défilement ---------- */
if ("IntersectionObserver" in window && !reduit) {
  const obs = new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("est-visible");
      obs.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".apropos-grille > *, .contact h2, .contact-ligne, .liens").forEach((n, i) => {
    n.classList.add("revele");
    n.style.transitionDelay = `${(i % 2) * 120}ms`;
    obs.observe(n);
  });
}

/* ---------- Curseur ---------- */
const curseur = document.getElementById("curseur");
const curseurTexte = document.getElementById("curseur-texte");
const souris = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
const pointeur = { x: souris.x, y: souris.y };
window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  souris.x = e.clientX;
  souris.y = e.clientY;
  souris.nx = (e.clientX / innerWidth) * 2 - 1;
  souris.ny = (e.clientY / innerHeight) * 2 - 1;
  document.body.classList.add("a-curseur");
  // Grand rond avec un mot sur les cartes et l'adresse, rond moyen sur les liens
  const cible = e.target.closest ? e.target.closest("[data-curseur], a, button") : null;
  const mot = cible && cible.dataset.curseur;
  curseur.classList.toggle("est-grand", Boolean(mot));
  curseur.classList.toggle("est-lien", Boolean(cible) && !mot);
  curseurTexte.textContent = mot || "";
}, { passive: true });
document.addEventListener("pointerleave", () => document.body.classList.remove("a-curseur"));

/* ---------- Ses yeux, en haut à gauche ---------- */
const yeux = document.getElementById("yeux");
const iris = yeux.querySelectorAll(".iris");
const regardYeux = { x: 0, y: 0 };
// clignement toutes les 2,5 à 6 secondes
if (!reduit) {
  const cligner = () => {
    yeux.classList.add("cligne");
    setTimeout(() => yeux.classList.remove("cligne"), 200);
    setTimeout(cligner, 2500 + Math.random() * 3500);
  };
  setTimeout(cligner, 2000);
  // toutes les 9 secondes environ, la carte pivote et montre « Fatima Zayani »
  const tourner = () => {
    yeux.classList.add("tourne");
    setTimeout(() => yeux.classList.remove("tourne"), 2600);
    setTimeout(tourner, 8000 + Math.random() * 3000);
  };
  setTimeout(tourner, 5000);
}
function majYeux() {
  // direction de la souris vue depuis les yeux, pupilles décalées d'au plus 3 unités
  const r = yeux.getBoundingClientRect();
  const dx = souris.x - (r.left + r.width / 2), dy = souris.y - (r.top + r.height * 0.68);
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / 220);
  regardYeux.x += ((dx / d) * 3.2 * k - regardYeux.x) * 0.2;
  regardYeux.y += ((dy / d) * 2.2 * k - regardYeux.y) * 0.2;
  iris.forEach((g) => g.setAttribute("transform", `translate(${regardYeux.x.toFixed(2)} ${regardYeux.y.toFixed(2)})`));
}

/* ---------- Intro : l'affiche en papier ---------- */
const intro = document.getElementById("intro");
const canvasPapier = document.getElementById("papier");
const cotes = document.querySelectorAll(".intro-infos, .intro-passer");
const [prenom, ...resteNom] = (W.nom || "Fatima Zayani").split(" ");
let papier = null;
try {
  papier = creerPapier(canvasPapier, {
    prenom: prenom.toUpperCase(),
    nom: resteNom.join(" ").toUpperCase(),
    lignes: [W.classe || ""],
  });
} catch (e) {
  canvasPapier.remove(); // pas de WebGL : la page reste lisible
}
const DEPLIAGE = reduit ? 0 : 2.4; // durée du dépliage à l'arrivée (s)
const debutDepliage = performance.now();
const regard = { x: 0, y: 0 };

/* ---------- Projets : les billets suivent le défilement ---------- */
const sectionProjets = document.getElementById("projets");
const canvasBillets = document.getElementById("billets");
let billets = null;
if (!reduit) {
  try {
    billets = creerBillets(canvasBillets, projets);
  } catch (e) {
    canvasBillets.remove(); // pas de WebGL : la liste à droite suffit
  }
  canvasBillets.addEventListener("click", () => { if (actif >= 0) ouvrirFiche(projets[actif].p, projets[actif].cat); });
}
function mesurerProjets() {
  if (reduit) return;
  // ~80 % d'écran de défilement par projet
  sectionProjets.style.setProperty("--hauteur-projets", `${(projets.length - 1) * innerHeight * 0.8 + innerHeight}px`);
  if (billets) billets.redimensionner();
}
window.addEventListener("resize", () => {
  if (papier) papier.redimensionner();
  mesurerProjets();
});
mesurerProjets();

/* ---------- Boucle d'animation ---------- */
let fProjets = 0;
const t0 = performance.now();

function progres(section) {
  const r = section.getBoundingClientRect();
  const max = section.offsetHeight - innerHeight;
  return max > 0 ? borne(-r.top / max) : 0;
}

function image() {
  const t = (performance.now() - t0) / 1000;

  // Curseur : il rattrape la souris en douceur
  pointeur.x += (souris.x - pointeur.x) * 0.22;
  pointeur.y += (souris.y - pointeur.y) * 0.22;
  curseur.style.transform = `translate(${pointeur.x}px, ${pointeur.y}px)`;
  majYeux();

  // --- Intro : l'affiche se déplie, puis se froisse et s'envole au défilement ---
  const rIntro = intro.getBoundingClientRect();
  if (papier && rIntro.bottom > 0) {
    const p = reduit ? 0 : progres(intro);
    // arrivée : de la boule froissée à la feuille à plat
    const a = DEPLIAGE ? borne((performance.now() - debutDepliage) / 1000 / DEPLIAGE) : 1;
    const ouvert = 1 - (1 - a) ** 3;
    // départ : froissée de nouveau, rapetisse, tourne et file vers le haut
    const q = entreSort(borne(p));
    // au repos, l'affiche reste un peu froissée, comme une vraie affiche
    const REPOS = 0.12;
    const froisse = Math.max(REPOS + (1 - REPOS) * (1 - ouvert), REPOS + (1 - REPOS) * q);
    // la feuille s'incline un peu vers la souris (balancement lent sur tactile)
    const sx = tactile ? Math.sin(t * 0.5) * 0.4 : souris.nx;
    const sy = tactile ? 0 : souris.ny;
    regard.x += (sx - regard.x) * 0.06;
    regard.y += (sy - regard.y) * 0.06;
    papier.maj({
      froisse,
      echelle: (0.6 + 0.4 * ouvert) * (1 - 0.6 * q),
      x: 0.12 * p ** 2,
      y: -0.02 + 0.75 * p ** 4 + (reduit ? 0 : Math.sin(t * 0.9) * 0.004), // s'envole à la fin
      rx: regard.y * 0.18 * (1 - q) + 0.06,
      ry: regard.x * 0.22 * (1 - q),
      rz: -0.5 * (1 - ouvert) + 0.9 * q,
    });
    cotes.forEach((c) => { c.style.opacity = String(1 - borne(p * 6)); });
  }

  // --- Manifeste : les mots s'allument au fil du défilement ---
  const rm = manifeste.parentElement.getBoundingClientRect();
  if (!reduit && rm.top < innerHeight && rm.bottom > 0) {
    const q = borne((innerHeight * 0.75 - rm.top) / (rm.height * 0.55));
    const n = Math.round(q * mots.length);
    mots.forEach((m, i) => m.classList.toggle("est-allume", i < n));
  }

  // --- Projets ---
  if (!reduit) {
    const rp = sectionProjets.getBoundingClientRect();
    if (rp.top < innerHeight && rp.bottom > 0) {
      const cible = progres(sectionProjets) * (projets.length - 1);
      fProjets += (cible - fProjets) * 0.12; // défilement adouci
      changerActif(Math.round(fProjets));
      if (billets) billets.maj(fProjets, t);
    }
  }

  requestAnimationFrame(image);
}
requestAnimationFrame(image);
