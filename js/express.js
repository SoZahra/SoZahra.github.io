/*
 * Version classique du portfolio (index.html).
 * Remplit la page avec les mêmes données que la version jeu
 * (js/projets.js, js/whoami.js, js/contact.js), puis anime :
 *   - la colonne : texte vertical qui accompagne toute la visite (centrée à
 *     l'accueil, puis à gauche ; son texte change selon la section) ;
 *   - le paquet de cartes des projets, en éventail : visible au loin dès
 *     l'accueil, on s'en approche au défilement, puis la carte du dessus
 *     s'envole à chaque projet (js/express-paquet.js) ;
 *   - ses yeux en haut à gauche et le curseur personnalisé.
 */
import { creerPaquet } from "./express-paquet.js";

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
const sansExemple = (t) => t.replace(/^Exemple\s*—\s*/, "");

const annee = new Date().getFullYear();
document.getElementById("annee").textContent = annee;
document.getElementById("classe").textContent = W.classe || "";

/* ---------- La colonne ----------
   Cinq mots posés sur deux lignes, puis tournés d'un quart de tour : la
   ligne 1 devient la colonne de droite. Place = position le long de la
   colonne (en % de sa longueur). Chaque section a ses mots. */
const colonne = document.getElementById("colonne");
const motsColonne = {};
colonne.querySelectorAll("[data-place]").forEach((m) => { motsColonne[m.dataset.place] = m; });
// la classe (« Designer UI/UX · Développeuse ») se partage en deux mots
const [metier1, ...metier2] = (W.classe || "").split("·").map((s) => s.trim());
const [prenom, ...resteNom] = (W.nom || "Fatima Zayani").split(" ");
const nomInverse = `${resteNom.join(" ")} ${prenom}`.trim();
const PRESENTATION = {
  a: ["2026", 0], b: ["Portfolio", 6.5], c: [nomInverse, 29], d: [metier1 || "", 55], e: [metier2.join(" · "), 72],
};
PRESENTATION.a[0] = String(annee);

function textesColonne(section) {
  if (section === "projets" && actif >= 0) {
    const { p, cat } = projets[actif];
    return {
      a: [`${deux(actif + 1)} / ${deux(projets.length)}`, 0],
      b: ["Projets", 9],
      c: [sansExemple(p.titre), 25],
      d: [cat.libelle || "", 58],
      e: [p.annee || "", 86],
    };
  }
  if (section === "apropos") return { ...PRESENTATION, a: ["", 0], b: ["À propos", 6.5] };
  if (section === "contact") return { a: [String(annee), 0], b: ["Contact", 6.5], c: [C.email || "", 29], d: ["Écris-moi", 62], e: ["", 80] };
  return PRESENTATION;
}

let cleColonne = "";
function majColonne(section) {
  const textes = textesColonne(section);
  const cle = JSON.stringify(textes);
  if (cle === cleColonne) return;
  cleColonne = cle;
  Object.entries(textes).forEach(([place, [texte, pos]]) => {
    const m = motsColonne[place];
    if (m.textContent === texte && m.style.getPropertyValue("--pos") === `${pos}%`) return;
    // le mot s'efface en glissant, change, puis revient
    m.classList.add("change");
    setTimeout(() => {
      m.textContent = texte;
      m.style.setProperty("--pos", `${pos}%`);
      m.classList.remove("change");
    }, reduit ? 0 : 220);
  });
}

/* ---------- Fiche d'un projet ---------- */
const fiche = document.getElementById("fiche");
const ficheContenu = document.getElementById("fiche-contenu");

function ouvrirFiche(p, cat) {
  ficheContenu.replaceChildren();
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

/* ---------- Projets : liste et projet actif ---------- */
const projets = P.liste.map((p) => ({ p, cat: P.categories[p.categorie] || { libelle: "" } }));
// accueil et projets forment une seule scène
const sectionProjets = document.getElementById("accueil");
const basProjets = document.getElementById("projets-bas");
const indiceAccueil = document.getElementById("accueil-indice");
const listeProjets = document.getElementById("projets-liste");
const projetActif = document.getElementById("projet-actif");

// Défilement (en px) qui amène le projet i sur le dessus du paquet
// L'approche (de l'accueil jusque devant le paquet), puis un pas par projet
const APPROCHE = () => innerHeight * 0.9;
const PAR_PROJET = () => innerHeight * 0.7;
function allerAuProjet(i) {
  if (reduit) { cibleF = i; return; }
  scrollTo({ top: sectionProjets.offsetTop + APPROCHE() + i * PAR_PROJET() + 2, behavior: "smooth" });
}

// Numéros en bas : un bouton par projet, qui feuillette le paquet jusqu'à lui
const lignesProjets = projets.map(({ p }, i) => {
  const li = el("li");
  const b = el("button", "projet-ligne", deux(i + 1));
  b.type = "button";
  b.setAttribute("aria-label", sansExemple(p.titre));
  b.addEventListener("click", () => allerAuProjet(i));
  li.append(b);
  listeProjets.append(li);
  return b;
});

let actif = -1;
function changerActif(i) {
  if (i === actif || !projets[i]) return;
  actif = i;
  const { p, cat } = projets[i];
  lignesProjets.forEach((b, k) => b.setAttribute("aria-current", k === i ? "true" : "false"));
  projetActif.textContent = `Projet ${i + 1} sur ${projets.length} : ${sansExemple(p.titre)}, ${[cat.libelle, p.annee].filter(Boolean).join(", ")}`;
}
changerActif(0);
const ouvrirActif = () => { if (actif >= 0) ouvrirFiche(projets[actif].p, projets[actif].cat); };
document.getElementById("projet-ouvrir").addEventListener("click", ouvrirActif);

/* ---------- À propos ---------- */
document.getElementById("devise").textContent = W.devise || "";
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
  document.querySelectorAll(".panneau > *, .apropos-grille > *, .contact h2, .contact-ligne, .liens").forEach((n, i) => {
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

/* ---------- Paquet de cartes ---------- */
const canvasPaquet = document.getElementById("paquet");
let paquet = null;
try {
  paquet = creerPaquet(canvasPaquet, projets, document.getElementById("etiquettes"));
  canvasPaquet.addEventListener("click", () => { if (proche > 0.9) ouvrirActif(); });
} catch (e) {
  canvasPaquet.remove(); // pas de WebGL : les numéros et la colonne suffisent
}

function mesurerProjets() {
  if (reduit) return;
  sectionProjets.style.setProperty("--approche", `${APPROCHE()}px`);
  sectionProjets.style.setProperty("--hauteur-projets", `${APPROCHE() + (projets.length - 1) * PAR_PROJET() + innerHeight}px`);
}
window.addEventListener("resize", () => {
  if (paquet) paquet.redimensionner();
  mesurerProjets();
});
mesurerProjets();

/* ---------- Boucle d'animation ---------- */
let fProjets = 0;
let cibleF = 0;
let xColonne = null;
let proche = reduit ? 1 : 0; // 0 = à l'accueil, cartes en vol ; 1 = devant le paquet
const regard = { x: 0, y: 0 }; // souris adoucie, pour la caméra
const sections = ["accueil", "apropos", "contact"].map((id) => document.getElementById(id));
const t0 = performance.now();

function image() {
  const t = (performance.now() - t0) / 1000;

  // Curseur : il rattrape la souris en douceur
  pointeur.x += (souris.x - pointeur.x) * 0.22;
  pointeur.y += (souris.y - pointeur.y) * 0.22;
  curseur.style.transform = `translate(${pointeur.x}px, ${pointeur.y}px)`;
  majYeux();

  // --- Approche du paquet : de l'accueil jusque devant les cartes ---
  const rp = sectionProjets.getBoundingClientRect();
  const cibleProche = reduit ? 1 : borne(-rp.top / APPROCHE());
  proche += (cibleProche - proche) * 0.12;
  if (Math.abs(cibleProche - proche) < 0.001) proche = cibleProche;

  // --- La colonne : du centre vers la gauche, au rythme de l'approche ---
  const largeurColonne = colonne.offsetHeight; // ses deux lignes, une fois tournée
  const marge = borne(innerWidth * 0.04, 16, 56); // comme --marge en CSS
  const centre = innerWidth / 2 - largeurColonne / 2;
  const cibleX = centre + (marge - centre) * (proche * proche * (3 - 2 * proche));
  xColonne = cibleX;
  colonne.style.setProperty("--x", `${xColonne.toFixed(1)}px`);
  // section au milieu de l'écran : c'est elle qui donne ses mots à la colonne
  const milieu = sections.find((sec) => { const r = sec.getBoundingClientRect(); return r.top <= innerHeight / 2 && r.bottom > innerHeight / 2; });
  majColonne(!milieu || milieu === sectionProjets ? (proche < 0.5 ? "accueil" : "projets") : milieu.id);
  indiceAccueil.style.opacity = String(1 - borne(proche * 3));
  basProjets.toggleAttribute("data-loin", proche < 0.9);
  canvasPaquet.classList.toggle("est-proche", proche > 0.9);

  // --- Projets : le paquet se feuillette avec le défilement ---
  if (rp.top < innerHeight && rp.bottom > 0) {
    if (!reduit) cibleF = borne((-rp.top - APPROCHE()) / PAR_PROJET(), 0, projets.length - 1);
    fProjets += (cibleF - fProjets) * (reduit ? 1 : 0.1); // mouvement adouci
    changerActif(Math.round(fProjets));
    regard.x += ((tactile ? 0 : souris.nx) - regard.x) * 0.05;
    regard.y += ((tactile ? 0 : souris.ny) - regard.y) * 0.05;
    if (paquet) paquet.maj(fProjets, reduit ? 0 : t, proche, regard.x, regard.y);
  }

  requestAnimationFrame(image);
}
requestAnimationFrame(image);
