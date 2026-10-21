/*
 * Intro façon jeu à dialogues : personnage, bulle machine à écrire, choix.
 * Toute la configuration (textes, images) vient de js/dialogues.js.
 */
(() => {
  "use strict";

  const CONFIG = window.INTRO_CONFIG;
  const racine = document.documentElement;
  const $ = (id) => document.getElementById(id);

  const el = {
    intro: $("intro"),
    aide: $("intro-aide"),
    portfolio: $("portfolio"),
    personnage: $("personnage"),
    corps: $("calque-corps"),
    yeux: $("calque-yeux"),
    pupilles: $("calque-pupilles"),
    bulle: $("bulle"),
    nom: $("bulle-nom"),
    texte: $("bulle-texte"),
    live: $("bulle-live"),
    choix: $("choix"),
    fleche: $("bulle-fleche"),
    btnSon: $("btn-son"),
    btnSonLibelle: $("btn-son-libelle"),
    btnPasser: $("btn-passer"),
    btnPasserLibelle: $("btn-passer-libelle"),
    btnRejouer: $("btn-rejouer"),
    hud: $("hud"),
    portes: $("portes"),
    decor: $("decor"),
  };

  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");
  // Écran tactile sans survol (mobile/tablette) : regard aléatoire au lieu de la souris
  const sansSouris = matchMedia("(hover: none), (pointer: coarse)");

  // État courant de l'intro
  const etat = {
    index: -1,          // bulle en cours
    // "inactif" | "ecriture" | "attente" | "choix" | "entree" | "portes" | "fin"
    phase: "inactif",
    minuterie: null,    // timer de la machine à écrire
    position: 0,        // nombre de caractères déjà affichés
    regardActif: false, // les pupilles suivent-elles la souris / bougent-elles ?
    son: !!(CONFIG.son && CONFIG.son.actifParDefaut),
  };

  /* ============================================================
     Stockage (localStorage peut lever une exception : navigation
     privée, cookies bloqués…)
     ============================================================ */

  function marquerVue() {
    try {
      localStorage.setItem(CONFIG.cleStockage, "1");
    } catch (e) { /* tant pis : l'intro se rejouera à la prochaine visite */ }
  }

  function oublierVue() {
    try {
      localStorage.removeItem(CONFIG.cleStockage);
    } catch (e) { /* rien à faire */ }
  }

  /* ============================================================
     Application de la config : variables CSS des cadres 9-slice
     ============================================================ */

  const ecranMobile = matchMedia("(max-width: 640px)");

  // Thème de bulles actif (cf. themeActif dans dialogues.js)
  function theme() {
    return CONFIG.themes[CONFIG.themeActif];
  }

  // Échelle entière (x1, x2, x3…) pour garder des pixels nets
  function echelle() {
    const e = theme().echelle;
    const valeur = typeof e === "number" ? e : (ecranMobile.matches ? e.mobile : e.bureau);
    return Math.max(1, Math.round(valeur || 1));
  }

  // Une url() dans une variable CSS se résout depuis la feuille qui l'utilise
  // (css/) : on passe donc une URL absolue, calculée depuis la page.
  function urlCss(chemin) {
    return `url("${new URL(chemin, document.baseURI).href}")`;
  }

  /* ---------- Planche de sprites : découper une case ----------
   * border-image ne sait pas prendre une zone d'une image : on découpe
   * la case dans un canvas, on la recolore, puis on la convertit en image. */

  const imagesChargees = new Map(); // chemin → promesse d'<img>
  const casesPretes = new Map();    // config de la case → URL de l'image découpée

  function chargerImage(chemin) {
    if (!imagesChargees.has(chemin)) {
      imagesChargees.set(chemin, new Promise((ok, echec) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => echec(new Error(`Image introuvable : ${chemin}`));
        img.src = chemin;
      }));
    }
    return imagesChargees.get(chemin);
  }

  // Convertit "#rrggbb" en [r, g, b]
  function couleurRvb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  async function decouperCase(c, marges) {
    const img = await chargerImage(c.planche);
    const t = c.taille || 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = t;
    const ctx = canvas.getContext("2d");
    // Position de la case : en pixels (x, y) si la planche n'a pas de grille
    // régulière, sinon calculée depuis ligne / colonne
    const sx = c.x ?? c.colonne * t;
    const sy = c.y ?? c.ligne * t;
    ctx.drawImage(img, sx, sy, t, t, 0, 0, t, t);
    const donnees = ctx.getImageData(0, 0, t, t);
    const px = donnees.data;
    const clair = (i) => px[i] + px[i + 1] + px[i + 2] > 382; // planche en noir et blanc

    // 1. Le fond autour du cadre (relié aux bords de la case) devient transparent
    if (c.exterieurTransparent) {
      const fondClair = clair(0);
      const vu = new Uint8Array(t * t);
      const pile = [];
      for (let k = 0; k < t; k++) pile.push([k, 0], [k, t - 1], [0, k], [t - 1, k]);
      while (pile.length) {
        const [x, y] = pile.pop();
        if (x < 0 || y < 0 || x >= t || y >= t || vu[y * t + x]) continue;
        const i = (y * t + x) * 4;
        if (clair(i) !== fondClair) continue;
        vu[y * t + x] = 1;
        px[i + 3] = 0;
        pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    // 1 bis. Contour ouvert (coins détachés) : on garde uniquement ce qui est
    //    "entre" les traits clairs — à gauche ET à droite sur la ligne, ou
    //    au-dessus ET en dessous sur la colonne. Le reste devient transparent.
    if (c.horsContourTransparent) {
      const estClair = (x, y) => px[(y * t + x) * 4 + 3] !== 0 && clair((y * t + x) * 4);
      const ligneMin = new Array(t).fill(t), ligneMax = new Array(t).fill(-1);
      const colMin = new Array(t).fill(t), colMax = new Array(t).fill(-1);
      for (let y = 0; y < t; y++) {
        for (let x = 0; x < t; x++) {
          if (!estClair(x, y)) continue;
          ligneMin[y] = Math.min(ligneMin[y], x); ligneMax[y] = Math.max(ligneMax[y], x);
          colMin[x] = Math.min(colMin[x], y); colMax[x] = Math.max(colMax[x], y);
        }
      }
      for (let y = 0; y < t; y++) {
        for (let x = 0; x < t; x++) {
          const dedans = (x > ligneMin[y] && x < ligneMax[y]) || (y > colMin[x] && y < colMax[x]);
          if (!dedans && !estClair(x, y)) px[(y * t + x) * 4 + 3] = 0;
        }
      }
      // Seconde passe : bouche les trous restés près des coins
      // (pixel transparent entouré de pixels gardés sur sa ligne)
      for (let y = 0; y < t; y++) {
        let min = -1, max = -1;
        for (let x = 0; x < t; x++) {
          if (px[(y * t + x) * 4 + 3] !== 0) { if (min < 0) min = x; max = x; }
        }
        for (let x = min + 1; x < max; x++) px[(y * t + x) * 4 + 3] = 255;
      }
    }

    // 2. Recoloration : blanc → "clair", noir → "fonce"
    const rvbClair = couleurRvb(c.clair || "#ffffff");
    const rvbFonce = couleurRvb(c.fonce || "#000000");
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const [r, g, b] = clair(i) ? rvbClair : rvbFonce;
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
    ctx.putImageData(donnees, 0, 0);

    // 3. On efface le centre (texte de démo) avec la couleur intérieure du cadre,
    //    prise juste à l'intérieur de la marge gauche
    const m = marges;
    const echantillon = ctx.getImageData(m.gauche, Math.floor(t / 2), 1, 1).data;
    ctx.fillStyle = `rgba(${echantillon[0]}, ${echantillon[1]}, ${echantillon[2]}, ${echantillon[3] / 255})`;
    ctx.clearRect(m.gauche, m.haut, t - m.gauche - m.droite, t - m.haut - m.bas);
    ctx.fillRect(m.gauche, m.haut, t - m.gauche - m.droite, t - m.haut - m.bas);

    return canvas.toDataURL("image/png");
  }

  // Une image de thème : un chemin, ou une case de planche à découper
  async function preparerImage(source, marges) {
    if (!source) return null;
    if (typeof source === "string") return new URL(source, document.baseURI).href;
    const cle = JSON.stringify([source, marges]);
    if (!casesPretes.has(cle)) casesPretes.set(cle, decouperCase(source, marges));
    return casesPretes.get(cle);
  }

  // Prépare toutes les images du thème (à faire avant d'afficher la bulle)
  async function preparerImagesTheme() {
    const t = theme();
    const b = t.bouton;
    const [dlg, nom, normal, survol, presse] = await Promise.all([
      preparerImage(t.cadreDialogue.image, t.cadreDialogue.marges),
      preparerImage(t.etiquetteNom.image, t.etiquetteNom.marges),
      preparerImage(b.normal, b.marges),
      preparerImage(b.survol, b.marges),
      preparerImage(b.presse, b.marges),
    ]);
    imagesTheme = { dlg, nom, normal, survol: survol || normal, presse: presse || survol || normal };
  }
  let imagesTheme = {};

  const urlVar = (url) => (url ? `url("${url}")` : "none");

  const px = (v) => `${(v || 0) * echelle()}px`;
  const definir = (nom, valeur) => racine.style.setProperty(nom, valeur);

  // Déclare les variables CSS d'un cadre 9-slice : image, découpe,
  // largeur des bords et espace intérieur (déjà multipliés par l'échelle).
  function definirCadre(prefixe, cadre, image) {
    const m = cadre.marges;
    const ordre = ["haut", "droite", "bas", "gauche"];
    if (image !== undefined) definir(`--${prefixe}-image`, urlVar(image));
    definir(`--${prefixe}-slice`, ordre.map((c) => m[c]).join(" "));
    definir(`--${prefixe}-bord`, ordre.map((c) => px(m[c])).join(" "));
    const int = cadre.interieur || {};
    definir(`--${prefixe}-pad`, ordre.map((c) => px(int[c])).join(" "));
  }

  // (Re)calcule toutes les variables du thème ; rappelé si on passe mobile ↔ bureau
  function appliquerTheme() {
    const t = theme();
    definir("--s", echelle());
    definir("--repetition", t.repetition || "stretch");
    racine.classList.toggle("ui-pixel", !!t.pixelArt);

    const c = t.couleurs;
    definir("--bulle-texte", c.texte);
    definir("--bulle-nom", c.nom);
    definir("--bulle-choix", c.choix);
    definir("--bulle-choix-actif", c.choixActif);
    definir("--bulle-surlignage", c.surlignage);
    definir("--bouton-texte", c.bouton);

    definirCadre("dlg", t.cadreDialogue, imagesTheme.dlg);

    const n = t.etiquetteNom;
    definirCadre("nom", n, imagesTheme.nom);
    definir("--nom-hauteur", px(n.hauteur));
    definir("--nom-min", px(n.largeurMin));
    definir("--nom-gauche", px(n.decalage));
    definir("--nom-chevauchement", px(n.chevauchement));
    definir("--nom-inclinaison", `${n.inclinaison || 0}deg`);

    const b = t.bouton;
    definirCadre("btn", b);
    definir("--btn-normal", urlVar(imagesTheme.normal));
    definir("--btn-survol", urlVar(imagesTheme.survol));
    definir("--btn-presse", urlVar(imagesTheme.presse));
    definir("--btn-hauteur", px(b.hauteur));

    // Flèche : une bande de N images qu'on fait défiler par paliers
    const f = t.fleche;
    const images = f.images || 1;
    // Sans image : on affiche un caractère (ex. "▼") dans la couleur du texte
    el.fleche.textContent = f.image ? "" : (f.texte || "▼");
    racine.classList.toggle("fleche-texte", !f.image);
    definir("--fleche-image", f.image ? urlCss(f.image) : "none");
    definir("--fleche-largeur", px(f.largeur));
    definir("--fleche-hauteur", px(f.hauteur));
    definir("--fleche-bande", px(f.largeur * images));
    definir("--fleche-images", images);
    definir("--fleche-duree", `${images / (f.ips || 6)}s`);
    definir("--fleche-droite", px(f.droite));
    definir("--fleche-bas", px(f.bas));
    racine.classList.toggle("fleche-animee", !!f.image && images > 1);
  }

  async function appliquerConfig() {
    try {
      await preparerImagesTheme();
    } catch (e) {
      // Image manquante : on continue sans cadre plutôt que de bloquer l'intro
      console.error(e);
    }
    appliquerTheme();
    ecranMobile.addEventListener("change", appliquerTheme);

    // Image de fond de la scène (facultative, sinon fond noir)
    if (CONFIG.fond) definir("--fond-image", urlCss(CONFIG.fond));

    // Encadré façon jeu en haut à gauche (une ligne par entrée)
    const hud = CONFIG.hud || [];
    el.hud.textContent = hud.join("\n");
    el.hud.hidden = !hud.length;

    creerPortes();

    const p = CONFIG.personnage;
    definir("--ratio-perso", `${p.canevas.largeur} / ${p.canevas.hauteur}`);
    if (p.yeux) el.yeux.src = p.yeux;
    if (p.pupilles) el.pupilles.src = p.pupilles;
    el.nom.textContent = p.nom;
    el.nom.hidden = !p.nom;

    // Libellés
    const l = CONFIG.libelles;
    el.btnPasserLibelle.textContent = l.passer;
    el.aide.textContent = l.aideClavier;
    majBoutonSon();

    // Précharge les expressions pour éviter un clignotement
    Object.values(p.expressions).forEach((e) => { if (e.corps) new Image().src = e.corps; });
  }

  /* ============================================================
     Personnage : expressions + regard
     ============================================================ */

  function changerExpression(nom, avecSautillement) {
    const p = CONFIG.personnage;
    const expr = p.expressions[nom] || p.expressions[p.expressionParDefaut];
    // Pas encore de dessin : l'emplacement du personnage reste caché
    el.personnage.hidden = !(expr && expr.corps);
    if (el.personnage.hidden) return;
    const nouvelleImage = new URL(expr.corps, document.baseURI).href;
    const change = el.corps.src !== nouvelleImage;
    el.corps.src = expr.corps;
    // Expression avec les yeux dessinés sur le corps : on masque les calques yeux/pupilles
    const yeuxVisibles = expr.yeux !== false && !!p.yeux;
    el.yeux.hidden = !yeuxVisibles;
    el.pupilles.hidden = !yeuxVisibles;

    if (change && avecSautillement && !mouvementReduit.matches) {
      rejouerAnimation(el.personnage, "sautille");
    }
  }

  // Relance une animation CSS même si la classe est déjà présente
  function rejouerAnimation(noeud, classe) {
    noeud.classList.remove("apparait", "sautille");
    void noeud.offsetWidth; // force le recalcul pour redémarrer l'animation
    noeud.classList.add(classe);
  }

  // Cible du regard (en px du canevas, relatif au centre) et position lissée
  const regard = { cibleX: 0, cibleY: 0, x: 0, y: 0, boucle: null, timerAleatoire: null };

  function definirRegard(mode) {
    etat.regardActif = mode === "visiteur";
    clearTimeout(regard.timerAleatoire);
    if (!etat.regardActif) {
      regard.cibleX = 0;
      regard.cibleY = 0;
    } else if (sansSouris.matches) {
      regardAleatoire();
    }
    demarrerBoucleRegard();
  }

  // Suivi de la souris : direction depuis le centre des yeux vers le pointeur
  function surMouvementSouris(e) {
    if (!etat.regardActif || sansSouris.matches || el.personnage.hidden) return;
    const p = CONFIG.personnage;
    const boite = el.personnage.getBoundingClientRect();
    const ratio = boite.width / p.canevas.largeur; // px écran par px de canevas
    const cx = boite.left + p.centreYeux.x * ratio;
    const cy = boite.top + p.centreYeux.y * ratio;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const distance = Math.hypot(dx, dy) || 1;
    // Plus la souris est loin, plus les pupilles vont au bord (plafonné à 1)
    const force = Math.min(distance / 250, 1);
    regard.cibleX = (dx / distance) * force * p.amplitudePupilles.x;
    regard.cibleY = (dy / distance) * force * p.amplitudePupilles.y;
    demarrerBoucleRegard();
  }

  // Mobile : le personnage regarde dans une direction au hasard, de temps en temps
  function regardAleatoire() {
    if (!etat.regardActif || mouvementReduit.matches) return;
    const a = CONFIG.personnage.amplitudePupilles;
    const centre = Math.random() < 0.3; // revient parfois regarder droit devant
    const angle = Math.random() * Math.PI * 2;
    regard.cibleX = centre ? 0 : Math.cos(angle) * a.x;
    regard.cibleY = centre ? 0 : Math.sin(angle) * a.y;
    demarrerBoucleRegard();
    regard.timerAleatoire = setTimeout(regardAleatoire, 900 + Math.random() * 1800);
  }

  // Interpolation douce vers la cible (instantanée si mouvement réduit)
  function demarrerBoucleRegard() {
    if (regard.boucle) return;
    const etape = () => {
      const lissage = mouvementReduit.matches ? 1 : 0.2;
      regard.x += (regard.cibleX - regard.x) * lissage;
      regard.y += (regard.cibleY - regard.y) * lissage;
      if (Math.abs(regard.cibleX - regard.x) < 0.01 && Math.abs(regard.cibleY - regard.y) < 0.01) {
        regard.x = regard.cibleX;
        regard.y = regard.cibleY;
        regard.boucle = null;
      } else {
        regard.boucle = requestAnimationFrame(etape);
      }
      // Déplacement en % du calque → indépendant de la taille d'affichage
      const c = CONFIG.personnage.canevas;
      el.pupilles.style.transform =
        `translate(${(regard.x / c.largeur) * 100}%, ${(regard.y / c.hauteur) * 100}%)`;
    };
    regard.boucle = requestAnimationFrame(etape);
  }

  /* ============================================================
     Bulle : machine à écrire
     ============================================================ */

  const PONCTUATION = /[.!?…,]/;

  function afficherBulle(index) {
    const ligne = CONFIG.dialogues[index];
    etat.index = index;
    etat.position = 0;

    changerExpression(ligne.expression, index > 0);
    definirRegard(ligne.regard);

    el.choix.hidden = true;
    el.choix.replaceChildren();
    el.bulle.classList.remove("attend-suite");

    // Texte complet annoncé aux lecteurs d'écran dès le début
    el.live.textContent = ligne.texte;

    if (mouvementReduit.matches) {
      terminerEcriture();
      return;
    }
    etat.phase = "ecriture";
    ecrireLettre();
  }

  // Affiche le caractère suivant ; la suite du texte reste invisible
  // mais occupe déjà sa place (pas de retour à la ligne qui saute).
  function ecrireLettre() {
    const texte = CONFIG.dialogues[etat.index].texte;
    const caracteres = Array.from(texte); // gère correctement « … » et les accents
    etat.position++;
    rendreTexte(caracteres, etat.position);

    if (etat.position >= caracteres.length) {
      terminerEcriture();
      return;
    }
    const mc = CONFIG.machineAEcrire;
    const dernier = caracteres[etat.position - 1];
    const prochain = caracteres[etat.position];
    // Pause après la ponctuation (sauf si elle est suivie d'une autre, ex. « ?! »)
    const pause = PONCTUATION.test(dernier) && !PONCTUATION.test(prochain) ? mc.pausePonctuation : 0;
    // TODO son : jouer un petit "bip" ici si etat.son est vrai
    etat.minuterie = setTimeout(ecrireLettre, mc.delaiLettre + pause);
  }

  function rendreTexte(caracteres, n) {
    const tape = document.createTextNode(caracteres.slice(0, n).join(""));
    const reste = document.createElement("span");
    reste.className = "reste";
    reste.textContent = caracteres.slice(n).join("");
    el.texte.replaceChildren(tape, reste);
  }

  // Affiche la phrase entière d'un coup
  function terminerEcriture() {
    clearTimeout(etat.minuterie);
    const ligne = CONFIG.dialogues[etat.index];
    el.texte.textContent = ligne.texte;

    if (ligne.choix && ligne.choix.length) {
      afficherChoix(ligne.choix);
    } else {
      etat.phase = "attente";
      el.bulle.classList.add("attend-suite");
    }
  }

  // Clic / Espace / Entrée : compléter la phrase, puis passer à la suivante
  function avancer() {
    if (etat.phase === "ecriture") {
      terminerEcriture();
    } else if (etat.phase === "attente") {
      if (etat.index + 1 < CONFIG.dialogues.length) {
        afficherBulle(etat.index + 1);
      } else if (CONFIG.portes) {
        entrerDansPorte();
      } else {
        quitterIntro(null); // dernière bulle sans choix : on arrive en haut du portfolio
      }
    }
  }

  /* ============================================================
     Portes : on entre dans la porte, puis le visiteur choisit une porte
     ============================================================ */

  // Un bouton par porte ; --i = position par rapport au centre (… -1, 0, 1 …),
  // utilisée par le CSS pour le poser sur l'arche dessinée par js/fond-pixel.js
  function creerPortes() {
    if (!CONFIG.portes) return;
    const liste = CONFIG.portes.liste;
    const boutons = liste.map((p, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "porte";
      b.style.setProperty("--i", k - (liste.length - 1) / 2);
      const plaque = document.createElement("span");
      plaque.className = "porte-plaque";
      plaque.textContent = p.libelle;
      b.append(plaque);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (etat.phase === "portes") quitterIntro(p.cible);
      });
      // Lampe pointée sur la porte (survol souris) : elle prend le focus
      // et de la fumée en sort
      b.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse" || etat.phase !== "portes") return;
        b.focus({ preventScroll: true });
        fumer(k);
      });
      b.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "mouse") fumer(-1);
      });
      b.addEventListener("focus", () => activerDans(el.portes, b));
      return b;
    });
    el.portes.replaceChildren(...boutons);
  }

  // Fumée dessinée par js/fond-pixel.js devant une porte (-1 = aucune) ;
  // viser = la lampe à pétrole se place devant la porte (clavier : la souris,
  // elle, guide déjà la lampe)
  function fumer(porte, viser = false) {
    el.decor.dispatchEvent(new CustomEvent("fumee", { detail: { porte, viser } }));
  }

  // Changement de scène dans le décor (js/fond-pixel.js) :
  // "yeux" (dialogues), "aucune" (traversée de la porte), "portes"
  function changerScene(etat) {
    el.decor.dispatchEvent(new CustomEvent("scene", { detail: { etat } }));
  }

  // Durée lue dans le CSS (0 si mouvement réduit)
  function dureeCss(nom) {
    return parseFloat(getComputedStyle(racine).getPropertyValue(nom)) || 0;
  }

  // 1. la caméra plonge dans la porte d'entrée jusqu'au noir (les yeux disparaissent),
  // 2. on arrive dans la salle aux trois portes, sombre, avec une lampe à pétrole,
  // 3. les portes deviennent cliquables et la consigne s'affiche
  function entrerDansPorte() {
    etat.phase = "entree";
    el.bulle.classList.remove("attend-suite", "est-visible", "apparait");
    changerScene("aucune");
    racine.classList.add("entree-porte");

    etat.minuterie = setTimeout(() => {
      racine.classList.remove("entree-porte");
      racine.classList.add("vue-portes");
      changerScene("portes");
      etat.minuterie = setTimeout(montrerPortes, dureeCss("--duree-arrivee"));
    }, dureeCss("--duree-entree"));
  }

  function montrerPortes() {
    etat.phase = "portes";
    el.portes.hidden = false;

    // La bulle revient avec la consigne
    const consigne = CONFIG.portes.consigne || "";
    el.texte.textContent = consigne;
    el.live.textContent = consigne;
    el.bulle.classList.toggle("est-visible", !!consigne);
    if (consigne && !mouvementReduit.matches) rejouerAnimation(el.bulle, "apparait");

    const premiere = el.portes.querySelector(".porte");
    premiere.focus({ preventScroll: true });
    activerDans(el.portes, premiere);
  }

  /* ============================================================
     Choix : souris + clavier (flèches haut/bas, Entrée)
     ============================================================ */

  function afficherChoix(liste) {
    etat.phase = "choix";
    const items = [];
    const boutons = liste.map((c) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      li.append(b);
      items.push(li);
      b.type = "button";
      b.className = "choix-btn";
      b.textContent = c.libelle;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        quitterIntro(c.cible);
      });
      // La souris déplace le curseur ► (et le focus) comme dans un jeu
      b.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") b.focus({ preventScroll: true });
      });
      b.addEventListener("focus", () => activerDans(el.choix, b));
      return b;
    });
    el.choix.replaceChildren(...items);
    el.choix.hidden = false;
    boutons[0].focus({ preventScroll: true });
    activerDans(el.choix, boutons[0]);
  }

  /* Liste de boutons (choix ou portes) : un seul est "actif" à la fois */

  function activerDans(conteneur, bouton) {
    conteneur.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("est-actif", b === bouton);
    });
  }

  function refocaliserDans(conteneur) {
    const actif = conteneur.querySelector("button.est-actif") || conteneur.querySelector("button");
    if (actif) actif.focus({ preventScroll: true });
  }

  function deplacerDans(conteneur, sens) {
    const boutons = Array.from(conteneur.querySelectorAll("button"));
    const actuel = boutons.findIndex((b) => b.classList.contains("est-actif"));
    const suivant = actuel === -1
      ? 0
      : (actuel + sens + boutons.length) % boutons.length; // boucle aux extrémités
    boutons[suivant].focus({ preventScroll: true });
  }

  /* ============================================================
     Clavier et clic global
     ============================================================ */

  function surTouche(e) {
    if (!racine.classList.contains("intro-active") || etat.phase === "fin") return;

    if (e.key === "Escape") {
      e.preventDefault();
      quitterIntro(null);
      return;
    }

    // Pendant l'entrée dans la porte, on attend que les portes apparaissent
    if (etat.phase === "entree") {
      if (e.key === " " || e.key === "Enter") e.preventDefault();
      return;
    }

    if (etat.phase === "choix" || etat.phase === "portes") {
      const conteneur = etat.phase === "choix" ? el.choix : el.portes;
      // Choix empilés : haut/bas ; portes côte à côte : gauche/droite (et haut/bas)
      const sens = { ArrowDown: 1, ArrowUp: -1 };
      if (etat.phase === "portes") Object.assign(sens, { ArrowRight: 1, ArrowLeft: -1 });
      if (sens[e.key]) {
        e.preventDefault();
        deplacerDans(conteneur, sens[e.key]);
        // Au clavier, la lampe et la fumée suivent la porte choisie
        if (etat.phase === "portes") {
          fumer(Array.from(el.portes.children).indexOf(document.activeElement), true);
        }
      } else if ((e.key === " " || e.key === "Enter") && !e.target.closest("button")) {
        // Focus perdu (clic dans le vide) : on le rend au bouton actif
        e.preventDefault();
        refocaliserDans(conteneur);
      }
      return; // Entrée/Espace sur un bouton : clic natif
    }

    if (e.key === " " || e.key === "Enter") {
      // Sur "Passer" ou "Son", Entrée/Espace activent le bouton, pas la bulle
      if (e.target.closest("button")) return;
      e.preventDefault();
      if (!e.repeat) avancer();
    }
  }

  function surClic(e) {
    if (e.target.closest("button, a")) return;
    if (etat.phase === "choix") refocaliserDans(el.choix);
    else if (etat.phase === "portes") refocaliserDans(el.portes);
    else avancer();
  }

  /* ============================================================
     Son : bouton qui active le bourdonnement du néon (js/son-neon.js)
     ============================================================ */

  function majBoutonSon() {
    el.btnSon.setAttribute("aria-pressed", String(etat.son));
    const libelle = etat.son ? CONFIG.libelles.sonActif : CONFIG.libelles.sonCoupe;
    el.btnSonLibelle.textContent = libelle;
    el.btnSon.title = libelle;
  }

  function basculerSon(e) {
    e.stopPropagation();
    etat.son = !etat.son;
    majBoutonSon();
    appliquerSon();
  }

  // Bourdonnement de l'enseigne au néon (js/son-neon.js), selon le bouton son
  function appliquerSon() {
    if (!window.SON_NEON) return;
    if (etat.son && racine.classList.contains("intro-active")) window.SON_NEON.activer();
    else window.SON_NEON.couper();
  }

  /* ============================================================
     Démarrage / sortie
     ============================================================ */

  function demarrerIntro() {
    clearTimeout(etat.minuterie);
    etat.phase = "inactif";
    racine.classList.remove("intro-sortie");
    racine.classList.add("intro-active");
    el.portfolio.inert = true;

    el.personnage.classList.remove("est-visible", "apparait", "sautille");
    el.bulle.classList.remove("est-visible", "apparait", "attend-suite");
    el.texte.textContent = "";
    el.live.textContent = "";
    el.choix.hidden = true;
    // Retour dans la salle d'entrée : portes cachées, seuls des yeux
    // brillent dans l'arche
    racine.classList.remove("vue-portes", "entree-porte");
    el.portes.hidden = true;
    fumer(-1);
    changerScene("yeux");
    appliquerSon();
    regard.x = regard.y = regard.cibleX = regard.cibleY = 0;
    el.pupilles.style.transform = "";

    changerExpression(CONFIG.dialogues[0].expression, false);
    el.intro.focus({ preventScroll: true });

    // 1. le personnage apparaît (pop), 2. puis la bulle, 3. puis le texte
    const reduit = mouvementReduit.matches;
    el.personnage.classList.add("est-visible");
    if (!reduit) el.personnage.classList.add("apparait");

    etat.minuterie = setTimeout(() => {
      el.bulle.classList.add("est-visible");
      if (!reduit) el.bulle.classList.add("apparait");
      afficherBulle(0);
    }, reduit ? 0 : 380);
  }

  // Fondu vers le portfolio, éventuellement vers une section précise
  function quitterIntro(cible) {
    if (etat.phase === "fin") return;
    etat.phase = "fin";
    clearTimeout(etat.minuterie);
    clearTimeout(regard.timerAleatoire);
    etat.regardActif = false;
    marquerVue();
    if (window.SON_NEON) window.SON_NEON.couper(); // le portfolio est silencieux

    el.portfolio.inert = false;
    const section = cible ? document.querySelector(cible) : null;

    // On positionne le portfolio derrière l'intro avant le fondu
    racine.classList.add("intro-sortie");
    if (section) {
      history.replaceState(null, "", cible);
      section.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo(0, 0);
    }

    const finir = () => {
      racine.classList.remove("intro-active", "intro-sortie");
      // Focus sur le titre de la section (ou le haut du site) pour le clavier / lecteur d'écran
      const focus = section ? section.querySelector("h2") : document.querySelector(".site-nom");
      if (focus) focus.focus({ preventScroll: true });
      if (section) section.scrollIntoView({ block: "start" });
    };

    const duree = parseFloat(getComputedStyle(racine).getPropertyValue("--duree-fondu")) || 0;
    if (duree === 0) finir();
    else setTimeout(finir, duree * 1.4); // le portfolio apparaît avec un léger décalage
  }

  /* ============================================================
     Initialisation
     ============================================================ */

  // Les cadres sont préparés (découpe des planches) avant de lancer l'intro
  const configPrete = appliquerConfig();

  document.addEventListener("keydown", surTouche);
  el.intro.addEventListener("click", surClic);
  window.addEventListener("pointermove", surMouvementSouris, { passive: true });
  el.btnSon.addEventListener("click", basculerSon);
  el.btnPasser.addEventListener("click", (e) => {
    e.stopPropagation();
    quitterIntro(null);
  });

  // "Revoir l'intro" depuis le pied de page
  el.btnRejouer.addEventListener("click", () => {
    oublierVue();
    history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
    demarrerIntro();
  });

  // La classe intro-active a été posée dans le <head> si l'intro doit se jouer
  // (on vérifie après le chargement : Échap a pu être pressé entre-temps)
  configPrete.then(() => {
    if (racine.classList.contains("intro-active") && etat.phase === "inactif") {
      demarrerIntro();
    }
  });
})();
