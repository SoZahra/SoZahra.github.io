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
import { introAJouer, jouerIntro } from "./express-intro.js";
import { rendreCV } from "./cv-rendu.js";
import { creerObjets } from "./express-objets.js";

const P = window.PROJETS_CLASSIQUE || { liste: [] };
const W = window.WHOAMI || {};
const C = window.CONTACT || {};
const GH = window.GITHUB || {};
const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
// peu de mots : son nom et son métier ; le reste est dans À propos et Contact
// (positions entre 0 et 50 % : le bas de la colonne laisse place au menu)
const PRESENTATION = {
  c: [nomInverse, 0], b: [metiers[0] || "", 0], d: [metiers.slice(1).join(" · "), 0], a: ["", 0], e: ["", 0],
};

// section : "accueil", "apropos", "contact" ou le numéro d'un projet
function textesColonne(section) {
  if (typeof section === "number") {
    const p = P.liste[section];
    return { c: [p.titre, 0], b: [p.type || "", 0], d: ["", 0], a: ["", 0], e: ["", 0] };
  }
  if (section === "apropos") return { ...PRESENTATION, b: ["À propos", 0], d: ["", 0] };
  if (section === "cv") return { ...PRESENTATION, c: ["CV", 0], b: ["Mon parcours", 0], d: ["", 0] };
  if (section === "github") return { ...PRESENTATION, c: ["GitHub", 0], b: ["Le code", 0], d: ["", 0] };
  if (section === "contact") return { ...PRESENTATION, c: ["Contact", 0], b: ["Écris-moi", 0], d: ["", 0] };
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
const faire = document.getElementById("faire");
(W.faire || []).forEach((f) => {
  const li = el("li");
  li.append(el("strong", "", f.titre), el("span", "", f.texte));
  faire.append(li);
});
const enCeMoment = document.getElementById("en-ce-moment");
if (W.enCeMoment) {
  enCeMoment.append(el("span", "en-ce-moment-titre", "En ce moment"), el("span", "", W.enCeMoment));
} else enCeMoment.hidden = true;

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
   Elle au milieu (elle mène à « À propos »), puis les porte-clés des pages,
   en alternance de part et d'autre : dossier (projets), enveloppe
   (Contact), CV, ordinateur (GitHub). anneau = où passe la chaîne dans
   l'image (fractions de sa largeur et de sa hauteur). Les porte-clés par
   projet (porteCle dans js/projets-classique.js) ne sont plus accrochés :
   le dossier les remplace (novembre 2026). */
const CV = window.CV || null;
const PAGES = [
  { src: "images/porte-cles/dossier.webp", ratio: 842 / 900, hauteur: 21, chaine: 4, anneau: [0.481, 0.024], penche: 0.5,
    etiquette: "Projets", section: "accueil", sur: `${P.liste.length} projets`, titre: "Projets",
    clic: () => montrerSommaire() },
  { src: "images/porte-cles/enveloppe.webp", ratio: 810 / 900, hauteur: 19, chaine: 4, anneau: [0.499, 0.024], penche: 0.5,
    etiquette: "Contact", section: "contact", sur: "Écris-moi", titre: "Contact", lien: "#contact" },
];
// le CV : un volet de côté, comme GitHub (son CV en page web + le PDF)
if (CV) {
  PAGES.push({ src: "images/porte-cles/cv.webp", ratio: 686 / 900, hauteur: 21, chaine: 28, anneau: [0.501, 0.024], penche: 0.27,
    etiquette: "CV", section: "cv", sur: "Mon parcours", titre: "CV", volet: "cv",
    clic: () => (voletOuvert === "cv" ? fermerVolet() : ouvrirVolet("cv")) });
}
// le côté code : l'ordinateur ouvre le volet GitHub (en face du CV) ; les
// autres porte-clés se décrochent, lui se range à gauche avec l'anneau
if (GH.pseudo) {
  PAGES.push({ src: "images/porte-cles/dev.webp", ratio: 706 / 900, hauteur: 20, chaine: 28, anneau: [0.5, 0.024], penche: 0.27,
    etiquette: "GitHub", section: "github", sur: "Le code", titre: "GitHub", volet: "github",
    clic: () => (voletOuvert === "github" ? fermerVolet() : ouvrirVolet("github")) });
}
const breloques = [
  { src: "images/porte-cles/fatima.webp", ratio: 406 / 900, hauteur: 52, chaine: 6, anneau: [0.515, 0.014],
    etiquette: "À propos", section: "apropos", sur: "À propos · Qui je suis", titre: W.nom || "Fatima Zayani", volet: "apropos",
    clic: () => (voletOuvert === "apropos" ? fermerVolet() : ouvrirVolet("apropos")) },
  ...PAGES,
];

// le dossier (et le menu « Projets ») : le sommaire, sous le trousseau,
// s'allume nom après nom, et le premier projet prend le focus
// Le sommaire est caché tant qu'on n'a pas ouvert le dossier.
function montrerSommaire() {
  fermerVolet();
  const sommaire = document.getElementById("projets");
  sommaire.classList.add("ouvert");
  sommaire.classList.remove("appel");
  void sommaire.offsetWidth; // relance l'animation
  sommaire.classList.add("appel");
  sommaire.querySelector("button")?.focus({ preventScroll: true });
}

// au survol d'un porte-clé : la légende et la colonne disent où il mène
const legendeSur = document.getElementById("legende-sur");
const legendeTitre = document.getElementById("legende-titre");
// pas de consigne : le trousseau se comprend seul (la légende ne parle qu'au survol)
const consigne = "";
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
// l'intro (ses yeux en grand, js/express-intro.js), une fois par session :
// le trousseau attend en haut, puis tombe quand elle se termine
const intro = introAJouer(reduit);
try {
  // à la première visite (ou avec ?chute), le trousseau tombe sur le crochet
  let tomber = new URLSearchParams(location.search).has("chute");
  try {
    if (!localStorage.getItem("trousseau-vu")) tomber = true;
    localStorage.setItem("trousseau-vu", "1");
  } catch (e) { /* sans mémoire : pas de chute */ }
  trousseau = creerTrousseau(sceneTrousseau, { breloques, reduit, auSurvol, tomber, enAttente: intro });
} catch (e) {
  sceneTrousseau.hidden = true; // il reste le sommaire et les liens du menu
}
if (intro) jouerIntro({ quandOuvert: () => trousseau && trousseau.lacher() });

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
  montrerSommaire();
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
  // la carte ne pivote (et montre « Fatima Zayani ») qu'au survol : CSS
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

/* ---------- Les volets : À propos et Contact ----------
   La page ne défile pas : les liens #apropos et #contact (menu, porte-clés)
   ouvrent un volet par-dessus l'accueil ; ✕, Échap ou le logo le ferment. */
const volets = {
  apropos: document.getElementById("apropos"), contact: document.getElementById("contact"), github: document.getElementById("github"),
  cv: document.getElementById("cv"),
};
let voletOuvert = null, avantVolet = null;
// ses objets (café, caméra, console…) tombent avec le volet À propos
const objets = creerObjets({
  objets: W.objets || [], reduit,
  // son porte-clé (le n° 0 du trousseau) : les objets s'y cognent et le poussent
  perso: { boite: () => trousseau?.boite(0) ?? null, pousser: (vx, vy) => trousseau?.pousser(0, vx, vy) },
});
function ouvrirVolet(id) {
  if (!volets[id] || voletOuvert === id) return;
  if (voletOuvert) fermerVolet(true);
  else avantVolet = document.activeElement;
  voletOuvert = id;
  const v = volets[id];
  document.documentElement.classList.add("volet-ouvert"); // ne reste que le logo
  // un volet « de côté » : on garde son porte-clé, les autres se décrochent
  const garde = breloques.findIndex((b) => b.volet === id);
  if (garde >= 0) {
    document.documentElement.classList.add("trousseau-de-cote");
    trousseau?.decrocher(garde);
  }
  if (id === "github") remplirGithub();
  if (id === "cv") remplirCV();
  if (id === "apropos") objets.montrer();
  v.inert = false;
  v.scrollTop = 0;
  v.classList.add("ouvert");
  v.querySelector("[data-fermer]").focus({ preventScroll: true });
  history.replaceState(null, "", `#${id}`);
  reveiller();
}
function fermerVolet(remplace) {
  if (!voletOuvert) return;
  const v = volets[voletOuvert];
  if (voletOuvert === "apropos") objets.cacher();
  if (document.documentElement.classList.contains("trousseau-de-cote")) {
    // tout revient : le trousseau au milieu, les porte-clés retombent
    document.documentElement.classList.remove("trousseau-de-cote");
    trousseau?.raccrocher();
  }
  v.classList.remove("ouvert");
  v.inert = true;
  voletOuvert = null;
  if (!remplace) document.documentElement.classList.remove("volet-ouvert");
  if (!remplace) {
    history.replaceState(null, "", location.pathname + location.search);
    avantVolet?.focus?.({ preventScroll: true });
  }
  reveiller();
}
document.addEventListener("click", (e) => {
  if (e.defaultPrevented) return;
  if (e.target.closest("[data-fermer]")) { fermerVolet(); return; }
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href").slice(1);
  if (volets[id]) { e.preventDefault(); ouvrirVolet(id); }
  else if (id === "haut") { e.preventDefault(); fermerVolet(); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && voletOuvert && !fiche.open) fermerVolet();
});

/* ---------- Le volet GitHub ----------
   Les dépôts choisis (js/github.js), puis, si l'API publique de GitHub
   répond, le nombre de dépôts et la part de chaque langage. */
let githubRempli = false;
function remplirGithub() {
  if (githubRempli) return;
  githubRempli = true;
  const profil = `https://github.com/${GH.pseudo}`;
  document.getElementById("github-intro").textContent = GH.intro || "";
  document.getElementById("github-tout").href = profil;
  const liste = document.getElementById("github-depots");
  (GH.depots || []).forEach((d) => {
    const a = el("a");
    a.href = `${profil}/${d.depot}`;
    a.target = "_blank"; a.rel = "noopener";
    a.append(el("span", "nom", d.titre), el("span", "techno", d.techno || ""), el("span", "resume", d.resume || ""));
    const li = el("li");
    li.append(a);
    liste.append(li);
  });
  const chiffres = document.getElementById("github-chiffres");
  const chiffre = (valeur, libelle) => {
    const bloc = el("div");
    bloc.append(el("dt", "", libelle), el("dd", "", String(valeur)));
    chiffres.append(bloc);
  };
  fetch(`https://api.github.com/users/${GH.pseudo}/repos?per_page=100`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((depots) => {
      const siens = depots.filter((d) => !d.fork);
      const parLangage = {};
      siens.forEach((d) => { if (d.language) parLangage[d.language] = (parLangage[d.language] || 0) + 1; });
      const tries = Object.entries(parLangage).sort((a, b) => b[1] - a[1]);
      chiffre(siens.length, "Dépôts");
      chiffre(tries.length, "Langages");
      // les 4 premiers langages, le reste regroupé : une liste à pointillés
      // (nom … part), le premier en corail
      const total = tries.reduce((t, [, n]) => t + n, 0) || 1;
      const tete = tries.slice(0, 4), reste = tries.slice(4).reduce((t, [, n]) => t + n, 0);
      if (reste) tete.push(["Autres", reste]);
      const liste = el("ol");
      tete.forEach(([nom, n]) => {
        const li = el("li");
        li.append(el("span", "nom", nom), el("span", "points"), el("span", "part", `${Math.round((n / total) * 100)} %`));
        liste.append(li);
      });
      document.getElementById("github-langages").append(liste);
    })
    .catch(() => { /* hors ligne ou limite de l'API : la liste suffit */ });
}

/* ---------- Le volet CV ---------- */
let cvRempli = false;
function remplirCV() {
  if (cvRempli || !CV) return;
  cvRempli = true;
  document.getElementById("cv-sous-titre").textContent = [CV.titre, CV.ville].filter(Boolean).join(" · ");
  document.getElementById("cv-telecharger").href = CV.pdf;
  rendreCV(document.getElementById("cv-contenu"), CV);
}

/* ---------- Boucle d'animation ---------- */

// La boucle ne tourne que pendant un court moment après un geste (souris,
// volet) : le logo suit la souris, la colonne suit le volet ouvert
const REPOS = 1500;
let derniereActivite = performance.now();
let enCours = false;
function reveiller() {
  derniereActivite = performance.now();
  if (enCours) return;
  enCours = true;
  requestAnimationFrame(image);
}
["pointermove", "resize"].forEach((type) => window.addEventListener(type, reveiller, { passive: true }));

function image() {
  majLogo(yeux.getBoundingClientRect());
  // la colonne : ses mots selon le volet ouvert, ou ceux du porte-clé survolé
  if (voletOuvert) majColonne(voletOuvert);
  else majColonne(survole >= 0 ? breloques[survole].section : "accueil");

  if (performance.now() - derniereActivite < REPOS) requestAnimationFrame(image);
  else enCours = false;
}
reveiller();

// arrivée directe sur #apropos ou #contact : le volet est déjà ouvert
if (volets[location.hash.slice(1)]) ouvrirVolet(location.hash.slice(1));
