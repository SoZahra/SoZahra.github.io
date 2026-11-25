/*
 * Met en page son CV (données : js/cv.js, window.CV) dans un élément.
 * Utilisé par le volet CV de index.html (js/express.js) et par la page
 * imprimable documents/cv.html (qui sert à fabriquer le PDF).
 *
 * Deux colonnes : à gauche le profil, l'expérience et les projets ; à
 * droite la formation, les compétences et les langues.
 */
function el(tag, classe, texte) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texte != null) n.textContent = texte;
  return n;
}

function bloc(titre) {
  const s = el("section", "cv-bloc");
  s.append(el("h3", "cv-titre", titre));
  return s;
}

// une ligne « intitulé — lieu ……… dates »
function ligne(intitule, lieu, dates) {
  const l = el("div", "cv-ligne");
  const gauche = el("span", "cv-intitule", intitule);
  if (lieu) gauche.append(el("span", "cv-lieu", ` — ${lieu}`));
  l.append(gauche, el("span", "cv-dates", dates || ""));
  return l;
}

export function rendreCV(racine, cv = window.CV || {}) {
  racine.replaceChildren();
  const gauche = el("div", "cv-col"), droite = el("div", "cv-col");

  if (cv.profil) {
    const b = bloc("Profil");
    b.append(el("p", "cv-profil", cv.profil));
    if (cv.disponibilite) b.append(el("p", "cv-dispo", cv.disponibilite));
    gauche.append(b);
  }
  if (cv.experiences?.length) {
    const b = bloc("Expérience");
    const ol = el("ol", "cv-liste");
    cv.experiences.forEach((x) => {
      const li = el("li");
      li.append(ligne(x.poste, x.lieu, x.dates));
      if (x.points?.length) {
        const ul = el("ul", "cv-points");
        x.points.forEach((p) => ul.append(el("li", "", p)));
        li.append(ul);
      }
      ol.append(li);
    });
    b.append(ol);
    gauche.append(b);
  }
  if (cv.projets?.length) {
    const b = bloc("Projets");
    const ul = el("ul", "cv-projets");
    cv.projets.forEach((p) => {
      const li = el("li");
      li.append(el("strong", "", p.nom), document.createTextNode(` — ${p.texte}`));
      ul.append(li);
    });
    b.append(ul);
    gauche.append(b);
  }

  if (cv.formation?.length) {
    const b = bloc("Formation");
    const ol = el("ol", "cv-liste");
    cv.formation.forEach((f) => {
      const li = el("li");
      li.append(ligne(f.titre, f.lieu, f.dates));
      ol.append(li);
    });
    b.append(ol);
    droite.append(b);
  }
  if (cv.competences?.length) {
    const b = bloc("Compétences");
    cv.competences.forEach((g) => {
      b.append(el("h4", "cv-groupe", g.groupe));
      const ul = el("ul", "cv-etiquettes");
      g.liste.forEach((c) => ul.append(el("li", "", c)));
      b.append(ul);
    });
    droite.append(b);
  }
  if (cv.langues?.length) {
    const b = bloc("Langues");
    b.append(el("p", "cv-langues", cv.langues.join(" · ")));
    droite.append(b);
  }

  const grille = el("div", "cv-grille");
  grille.append(gauche, droite);
  racine.append(grille);
}
