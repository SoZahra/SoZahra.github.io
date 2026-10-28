/*
 * Version classique du portfolio (index.html). Remplit la page avec ses
 * projets (js/projets-classique.js) et les données partagées avec la version
 * jeu (js/whoami.js, js/contact.js), puis anime :
 *   - le trousseau de l'accueil (js/express-trousseau.js) : elle au milieu,
 *     et des porte-clés qui mènent chacun à une page (projets, À propos,
 *     Contact, CV) ;
 *   - la colonne : texte vertical qui accompagne toute la visite et change
 *     de mots selon la section ;
 *   - son petit logo (ses yeux), qui suit la souris.
 */
import { creerTrousseau } from "./express-trousseau.js";

const P = window.PROJETS_CLASSIQUE || { liste: [] };
const W = window.WHOAMI || {};
const C = window.CONTACT || {};
const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const aLaSouris = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Petit utilitaire : crée un élément avec classe et texte (jamais de HTML brut)
function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const deux = (n) => String(n).padStart(2, "0");
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const typeEtAnnee = (p) => [p.type, p.annee].filter(Boolean).join(", ");

const annee = new Date().getFullYear();
const metiers = (W.classe || "").split("·").map((s) => s.trim()).filter(Boolean);
document.getElementById("annee").textContent = annee;
document.getElementById("classe").textContent = W.classe || "";
document.getElementById("accueil-devise").textContent = W.devise || "";

/* ---------- La colonne ----------
   Cinq mots posés sur deux lignes, puis tournés d'un quart de tour : la
   ligne 1 devient la colonne de droite. Place = position le long de la
   colonne (en % de sa longueur). Chaque section a ses mots. */
const colonne = document.getElementById("colonne");
const motsColonne = {};
colonne.querySelectorAll("[data-place]").forEach((m) => { motsColonne[m.dataset.place] = m; });
const [prenom, ...resteNom] = (W.nom || "Fatima Zayani").split(" ");
const nomInverse = `${resteNom.join(" ")} ${prenom}`.trim();
const PRESENTATION = {
  a: [String(annee), 0], b: ["Portfolio", 6.5], c: [nomInverse, 29], d: [metiers[0] || "", 55], e: [metiers.slice(1).join(" · "), 72],
};

// section : "accueil", "apropos", "contact" ou le numéro d'un projet
function textesColonne(section) {
  if (typeof section === "number") {
    const p = P.liste[section];
    return {
      a: [`${deux(section + 1)} / ${deux(P.liste.length)}`, 0],
      b: ["Projets", 9],
      c: [p.titre, 25],
      d: [p.type || "", 52],
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

function ouvrirFiche(p) {
  ficheContenu.replaceChildren();
  const titre = el("h3", "", p.titre);
  titre.id = "fiche-titre";
  ficheContenu.append(el("span", "fiche-cat", typeEtAnnee(p)), titre);
  if (p.resume) ficheContenu.append(el("p", "fiche-resume", p.resume));
  (p.description || []).forEach((d) => ficheContenu.append(el("p", "", d)));
  const infos = el("dl");
  if (p.role) infos.append(el("dt", "", "Rôle"), el("dd", "", p.role));
  if (p.outils && p.outils.length) infos.append(el("dt", "", "Outils"), el("dd", "", p.outils.join(", ")));
  if (p.effets && p.effets.length) infos.append(el("dt", "", "Apports"), el("dd", "", p.effets.join(", ")));
  ficheContenu.append(infos);
  if (p.ecrans && p.ecrans.length) {
    const ecrans = el("div", "fiche-ecrans");
    p.ecrans.forEach((e) => {
      const img = el("img", e.taille === "telephone" ? "est-telephone" : "");
      Object.assign(img, { src: e.src, alt: e.alt, width: e.l, height: e.h, decoding: "async" });
      ecrans.append(img);
    });
    ficheContenu.append(ecrans);
  }
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

/* ---------- Le trousseau ----------
   Elle au milieu (la faire tinter ne mène nulle part), puis les porte-clés
   des projets qui en ont un, et ceux des pages. anneau = où passe la
   chaîne dans l'image (fractions de sa largeur et de sa hauteur). */
const cv = (C.cadres || []).find((c) => c.icone === "cv");
const avecPorteCle = P.liste.map((p, i) => [p, i]).filter(([p]) => p.porteCle);
const PAGES = [
  { src: "images/porte-cles/palette.webp", ratio: 710 / 900, hauteur: 23, chaine: 3, anneau: [0.496, 0.02], penche: 0.55,
    etiquette: "À propos", section: "apropos", sur: "Qui je suis", titre: "À propos", lien: "#apropos" },
  { src: "images/porte-cles/enveloppe.webp", ratio: 981 / 900, hauteur: 18, chaine: 28, anneau: [0.5, 0.02], penche: 0.27,
    etiquette: "Contact", section: "contact", sur: "Écris-moi", titre: "Contact", lien: "#contact" },
];
if (cv) {
  PAGES.push({ src: "images/porte-cles/etiquette.webp", ratio: 654 / 900, hauteur: 20, chaine: 28, anneau: [0.454, 0.02], penche: 0.27,
    etiquette: `${cv.libelle} (téléchargement)`, section: "contact", sur: "Télécharger", titre: cv.libelle, lien: cv.url, telecharger: cv.telecharger });
}
const breloques = [
  { src: "images/porte-cles/fatima.webp", ratio: 382 / 900, hauteur: 52, chaine: 6, anneau: [0.5, 0.02],
    section: "accueil", sur: W.classe || "", titre: W.nom || "Fatima Zayani" },
];
// projets et pages alternent autour d'elle, les projets au plus près
const projetsCles = avecPorteCle.map(([p, i]) => ({
  ...p.porteCle, etiquette: `Projet ${p.titre}`, section: i, sur: `Projet ${deux(i + 1)} · ${p.type || ""}`, titre: p.titre,
  clic: () => ouvrirFiche(p),
}));
for (let k = 0; k < Math.max(projetsCles.length, PAGES.length); k++) {
  if (projetsCles[k]) breloques.push(projetsCles[k]);
  if (PAGES[k]) breloques.push(PAGES[k]);
}

// au survol d'un porte-clé : la légende et la colonne disent où il mène
const legendeSur = document.getElementById("legende-sur");
const legendeTitre = document.getElementById("legende-titre");
const consigne = aLaSouris ? "Touche un porte-clé" : "Choisis un porte-clé";
legendeSur.textContent = consigne;
let survole = -1;
function auSurvol(i) {
  survole = i;
  const b = breloques[i];
  legendeSur.textContent = b ? b.sur : consigne;
  legendeTitre.textContent = b ? b.titre : "";
  reveiller();
}
const sceneTrousseau = document.getElementById("trousseau");
let trousseau = null;
try {
  trousseau = creerTrousseau(sceneTrousseau, { breloques, reduit, auSurvol });
} catch (e) {
  sceneTrousseau.hidden = true; // il reste le sommaire et les liens du menu
}

// le sommaire : tous les projets, même ceux qui n'ont pas de porte-clé
P.liste.forEach((p) => {
  const li = el("li");
  const b = el("button", "", p.titre);
  b.type = "button";
  b.addEventListener("click", () => ouvrirFiche(p));
  li.append(b);
  document.getElementById("sommaire").append(li);
});
// les liens « Projets » du menu mènent au sommaire, sous le trousseau
document.querySelectorAll('a[href="#projets"]').forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: reduit ? "instant" : "smooth" });
  document.querySelector("#sommaire button")?.focus({ preventScroll: true });
}));

/* ---------- Son petit logo, en haut à gauche ---------- */
const yeux = document.getElementById("yeux");
const irisLogo = yeux.querySelectorAll(".iris");
const regardLogo = { x: 0, y: 0 };
const pointeur = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => { pointeur.x = e.clientX; pointeur.y = e.clientY; }, { passive: true });
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
function majLogo(r) {
  // direction de la souris vue depuis les yeux, pupilles décalées d'au plus 3 unités
  const dx = pointeur.x - (r.left + r.width / 2), dy = pointeur.y - (r.top + r.height * 0.68);
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / 220);
  regardLogo.x += ((dx / d) * 3.2 * k - regardLogo.x) * 0.2;
  regardLogo.y += ((dy / d) * 2.2 * k - regardLogo.y) * 0.2;
  irisLogo.forEach((g) => g.setAttribute("transform", `translate(${regardLogo.x.toFixed(2)} ${regardLogo.y.toFixed(2)})`));
}

window.addEventListener("resize", () => { if (trousseau) trousseau.redimensionner(); });

/* ---------- Boucle d'animation ---------- */
const sectionAccueil = document.getElementById("accueil");
const sections = [sectionAccueil, document.getElementById("apropos"), document.getElementById("contact")];
const indiceDefile = document.getElementById("accueil-indice");

// La boucle ne tourne que pendant un court moment après un geste (souris,
// défilement) : le logo suit la souris, la colonne suit la section
const REPOS = 1500;
let derniereActivite = performance.now();
let enCours = false;
function reveiller() {
  derniereActivite = performance.now();
  if (enCours) return;
  enCours = true;
  requestAnimationFrame(image);
}
["pointermove", "scroll", "resize"].forEach((type) => window.addEventListener(type, reveiller, { passive: true }));

function image() {
  const milieu = sections.find((sec) => { const r = sec.getBoundingClientRect(); return r.top <= innerHeight / 2 && r.bottom > innerHeight / 2; });
  majLogo(yeux.getBoundingClientRect());
  indiceDefile.style.opacity = String(1 - borne(scrollY / (innerHeight * 0.15)));
  // la colonne : ses mots, ou ceux du porte-clé survolé
  if (milieu === sectionAccueil && survole >= 0) majColonne(breloques[survole].section);
  else majColonne(milieu ? milieu.id : "accueil");

  if (performance.now() - derniereActivite < REPOS) requestAnimationFrame(image);
  else enCours = false;
}
reveiller();
