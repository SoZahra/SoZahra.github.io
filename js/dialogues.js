/*
 * ============================================================
 *  CONFIGURATION DE L'INTRO — le seul fichier à modifier
 *  pour changer les textes, le personnage ou les sprites.
 * ============================================================
 *
 * Ce fichier est chargé en premier (dans le <head>) : il ne fait
 * que déclarer un objet global, lu ensuite par js/intro.js.
 */
window.INTRO_CONFIG = {
  // Clé localStorage qui retient que l'intro a déjà été vue.
  // Change-la (ex. "fz-intro-vue-v2") pour rejouer l'intro chez tout le monde.
  cleStockage: "fz-intro-vue",

  /* ---------- Personnage ---------- */
  personnage: {
    // Nom affiché dans l'étiquette au-dessus de la bulle (vide = pas d'étiquette)
    nom: "",

    // Taille du canevas de tes dessins (en px). Les trois calques
    // (corps, yeux, pupilles) doivent avoir EXACTEMENT ce canevas,
    // empilés les uns sur les autres.
    canevas: { largeur: 200, hauteur: 240 },

    // Une image de corps par expression (vide = pas encore de dessin :
    // l'emplacement du personnage reste caché). "yeux: false" masque les
    // calques yeux + pupilles (ex. yeux fermés dessinés sur le corps).
    // Exemple : neutre: { corps: "assets/personnage/corps-neutre.png" },
    expressions: {
      neutre:   { corps: "" },
      joyeuse:  { corps: "" },
      curieuse: { corps: "" },
    },
    expressionParDefaut: "neutre",

    // Calques communs à toutes les expressions (même canevas que le corps).
    // Ex. "assets/personnage/yeux.png" et "assets/personnage/pupilles.png"
    yeux: "",
    pupilles: "",

    // Déplacement max des pupilles, en px du canevas (pas de l'écran).
    // Garde-le plus petit que l'espace libre dans le blanc de l'œil.
    amplitudePupilles: { x: 5, y: 5 },

    // Centre approximatif des yeux dans le canevas (pour calculer la direction du regard).
    centreYeux: { x: 100, y: 114 },
  },

  /* ---------- Dialogues ---------- */
  // Chaque bulle :
  //   texte      : la phrase (\n pour un retour à la ligne)
  //   expression : clé de personnage.expressions
  //   regard     : "fixe" (pupilles au centre) ou "visiteur"
  //                (suit la souris ; regard aléatoire sur mobile)
  //   choix      : (optionnel) liste de choix { libelle, cible }
  //                cible = id de la section du portfolio
  dialogues: [
    {
      texte: "Salut ! Moi c'est Fatima.",
      expression: "joyeuse",
      regard: "fixe",
    },
    {
      texte: "Je suis designer UI/UX et développeuse. Je dessine des interfaces… et je les code aussi.",
      expression: "neutre",
      regard: "visiteur",
    },
    {
      texte: "Qu'est-ce qui t'amène ici ?",
      expression: "curieuse",
      regard: "visiteur",
    },
  ],

  /* ---------- Portes (après la dernière bulle) ----------
   * On entre dans la porte et on arrive devant une porte par destination ; un clic sur
   * une porte ouvre la section correspondante du portfolio.
   * cible = id de la section. Supprime ce bloc pour revenir directement
   * au portfolio après la dernière bulle (ou mets des "choix" sur une bulle). */
  portes: {
    consigne: "Pointe ta lampe vers une porte.",
    liste: [
      { libelle: "Projets",       cible: "#projets" },
      { libelle: "whoami",        cible: "#about" },
      { libelle: "Contact",       cible: "#contact" },
    ],
  },

  /* ---------- Effet machine à écrire ---------- */
  machineAEcrire: {
    delaiLettre: 32,       // ms entre deux lettres
    pausePonctuation: 220, // pause supplémentaire après . ! ? … ,
  },

  /* ---------- Thème des bulles (sprites 9-slice) ----------
   * Choisis le pack actif ici. Chaque thème décrit ses images :
   *   image     = chemin d'un fichier, ou { planche, ligne, colonne… }
   *               pour prendre une case dans une planche de sprites
   *               (ou { planche, x, y, taille } si la planche n'a pas de grille)
   *   marges    = zones non étirées, en px de l'image source
   *   interieur = espace entre le bord de l'image et le texte (px source)
   * Toutes les valeurs en px source sont multipliées par l'échelle. */
  themeActif: "pc98",

  themes: {
    // « PC-98 » — style des jeux japonais NEC PC-98 : cadre à fin trait clair
    // sur fond noir, police bitmap (DotGothic16), lignes d'écran CRT.
    // Cadres dessinés pour ce site (assets/ui/pc98), sans licence tierce.
    // La police et les effets d'écran sont dans css/style.css ([data-theme-ui="pc98"]).
    pc98: {
      echelle: { bureau: 2, mobile: 2 },
      pixelArt: true,
      repetition: "stretch",
      couleurs: {
        texte: "#e4e2ee",
        nom: "#e4e2ee",
        choix: "#8e8aa6",
        choixActif: "#ffffff",
        surlignage: "rgba(196, 192, 216, 0.12)",
        bouton: "#e4e2ee",
      },
      cadreDialogue: {
        image: "assets/ui/pc98/cadre.svg",
        marges: { haut: 3, droite: 3, bas: 3, gauche: 3 },
        interieur: { haut: 7, droite: 10, bas: 7, gauche: 8 },
      },
      etiquetteNom: {
        image: "assets/ui/pc98/cadre.svg",
        marges: { haut: 3, droite: 3, bas: 3, gauche: 3 },
        interieur: { droite: 6, gauche: 6 },
        hauteur: 14,
        largeurMin: 32,
        decalage: 8,
        chevauchement: 1,
        inclinaison: 0,
      },
      bouton: {
        normal: "assets/ui/pc98/cadre.svg",
        survol: "assets/ui/pc98/cadre-survol.svg",
        marges: { haut: 3, droite: 3, bas: 3, gauche: 3 },
        interieur: { haut: 0, droite: 6, bas: 0, gauche: 6 },
        hauteur: 22,
      },
      fleche: { texte: "▼", droite: 8, bas: 5 },
    },

    // « frames 1-bit » — panneau sombre à fin contour clair, coins coupés.
    // Cette planche n'a pas de grille régulière (sections 48 / 32 / 24 px) :
    // la case est repérée par sa position en pixels (x, y) et sa taille.
    frames1bit: {
      echelle: { bureau: 3, mobile: 2 },
      pixelArt: true,
      repetition: "stretch",
      couleurs: {
        texte: "#eeeeee",
        nom: "#eeeeee",
        choix: "#9a9a9a",
        choixActif: "#ffffff",
        surlignage: "rgba(255, 255, 255, 0.08)",
        bouton: "#eeeeee",
      },
      cadreDialogue: {
        // fonce = fond à l'intérieur du contour ; autour, c'est transparent
        image: {
          planche: "assets/ui/frames32/frames-1bit.png", taille: 32, x: 16, y: 144,
          clair: "#eeeeee", fonce: "#111111", horsContourTransparent: true,
        },
        marges: { haut: 6, droite: 6, bas: 6, gauche: 6 },
        interieur: { haut: 8, droite: 10, bas: 8, gauche: 9 },
      },
      etiquetteNom: {
        image: {
          planche: "assets/ui/frames32/frames-1bit.png", taille: 32, x: 16, y: 144,
          clair: "#eeeeee", fonce: "#111111", horsContourTransparent: true,
        },
        marges: { haut: 6, droite: 6, bas: 6, gauche: 6 },
        interieur: { droite: 8, gauche: 8 },
        hauteur: 16,
        largeurMin: 32,
        decalage: 8,
        chevauchement: 1,
        inclinaison: 0,
      },
      bouton: {
        normal: {
          planche: "assets/ui/frames32/frames-1bit.png", taille: 32, x: 16, y: 144,
          clair: "#eeeeee", fonce: "#111111", horsContourTransparent: true,
        },
        survol: {
          planche: "assets/ui/frames32/frames-1bit.png", taille: 32, x: 16, y: 144,
          clair: "#ffffff", fonce: "#2a2a2a", horsContourTransparent: true,
        },
        marges: { haut: 6, droite: 6, bas: 6, gauche: 6 },
        interieur: { haut: 0, droite: 6, bas: 0, gauche: 6 },
        hauteur: 15,
      },
      fleche: { texte: "▼", droite: 9, bas: 7 },
    },

    // Frames32px — planche de 48 cadres pixel art (32×32, noir et blanc).
    // Au lieu d'un fichier par cadre, on indique une case de la planche :
    //   ligne / colonne : position de la case, en partant de 0 en haut à gauche
    //   clair / fonce   : couleurs qui remplacent le blanc et le noir
    //   exterieurTransparent : le noir autour du cadre devient transparent
    //   horsContourTransparent : idem pour un contour ouvert (coins détachés) :
    //     seul l'intérieur du contour est rempli avec "fonce"
    // Le texte de démo « 56 EF » au centre de chaque case est effacé automatiquement.
    frames32: {
      echelle: { bureau: 3, mobile: 2 },
      pixelArt: true,
      repetition: "stretch",
      couleurs: {
        texte: "#5a3b22",
        nom: "#fff8e7",
        choix: "#9a7a5c",
        choixActif: "#5a3b22",
        surlignage: "rgba(90, 59, 34, 0.1)",
        bouton: "#5a3b22",
      },
      cadreDialogue: {
        // case 1,4 : bulle arrondie avec une petite queue en bas à droite
        image: {
          planche: "assets/ui/frames32/Frames32px.png", taille: 32, ligne: 1, colonne: 4,
          clair: "#fdf6e3", fonce: "#fdf6e3", exterieurTransparent: true,
        },
        marges: { haut: 8, droite: 8, bas: 8, gauche: 8 },
        interieur: { haut: 8, droite: 10, bas: 8, gauche: 9 },
      },
      etiquetteNom: {
        // case 4,0 : cadre carré à bord épais → étiquette orange bordée de brun
        image: {
          planche: "assets/ui/frames32/Frames32px.png", taille: 32, ligne: 4, colonne: 0,
          clair: "#8a4f2a", fonce: "#e48f45", exterieurTransparent: true,
        },
        marges: { haut: 3, droite: 3, bas: 3, gauche: 3 },
        interieur: { droite: 6, gauche: 6 },
        hauteur: 12,
        largeurMin: 32,
        decalage: 10,
        chevauchement: 4,
        inclinaison: 0,
      },
      bouton: {
        normal: {
          planche: "assets/ui/frames32/Frames32px.png", taille: 32, ligne: 4, colonne: 0,
          clair: "#8a4f2a", fonce: "#fdf6e3", exterieurTransparent: true,
        },
        survol: {
          planche: "assets/ui/frames32/Frames32px.png", taille: 32, ligne: 4, colonne: 0,
          clair: "#8a4f2a", fonce: "#f3dfb8", exterieurTransparent: true,
        },
        marges: { haut: 3, droite: 3, bas: 3, gauche: 3 },
        interieur: { haut: 0, droite: 5, bas: 0, gauche: 5 },
        hauteur: 15,
      },
      // Pas de flèche dans cette planche : on affiche un caractère
      fleche: { texte: "▼", droite: 9, bas: 6 },
    },

    // Wordwright Lite (Cabin Circuit) — pixel art bois + parchemin, skin "Oakhold"
    wordwright: {
      // Agrandissement entier pour garder des pixels nets (bureau / mobile ≤ 640px)
      echelle: { bureau: 3, mobile: 2 },
      pixelArt: true,         // image-rendering: pixelated
      repetition: "repeat",   // bords répétés (texture du bois), pas étirés
      couleurs: {
        texte: "#3a2418",      // brun foncé sur parchemin
        nom: "#fff3dd",
        choix: "#7a5641",
        choixActif: "#3a2418",
        surlignage: "rgba(58, 36, 24, 0.1)",
        bouton: "#fff3dd",
      },
      cadreDialogue: {
        image: "assets/ui/wordwright/panel_window.png",
        marges: { haut: 8, droite: 8, bas: 8, gauche: 8 },
        interieur: { haut: 11, droite: 15, bas: 10, gauche: 12 },
      },
      etiquetteNom: {
        image: "assets/ui/wordwright/banner.png",
        marges: { haut: 0, droite: 5, bas: 0, gauche: 5 },
        interieur: { droite: 8, gauche: 8 },
        hauteur: 14,
        largeurMin: 40,
        decalage: 10,       // distance au bord gauche de la bulle
        chevauchement: 3,   // recouvre le haut de la bulle
        inclinaison: 0,     // en degrés (0 en pixel art pour rester net)
      },
      bouton: {
        normal: "assets/ui/wordwright/button_normal.png",
        survol: "assets/ui/wordwright/button_hover.png",
        presse: "assets/ui/wordwright/button_pressed.png",
        marges: { haut: 4, droite: 4, bas: 4, gauche: 4 },
        interieur: { haut: 3, droite: 6, bas: 4, gauche: 6 },
        hauteur: 16,
      },
      // Flèche "suite" : bande d'images animée (4 images de 9×9)
      fleche: {
        image: "assets/ui/wordwright/next_arrow_strip.png",
        largeur: 9, hauteur: 9, images: 4, ips: 6,
        droite: 7, bas: 6,
      },
    },

    // Menus and Dialogs (StationSupply) — vectoriel ardoise, déjà à taille écran
    menusDialogs: {
      echelle: { bureau: 1, mobile: 1 },
      pixelArt: false,
      repetition: "stretch",
      couleurs: {
        texte: "#e8eef8",
        nom: "#e8eef8",
        choix: "#a9b4c6",
        choixActif: "#ffffff",
        surlignage: "rgba(255, 255, 255, 0.07)",
        bouton: "#e8eef8",
      },
      cadreDialogue: {
        image: "assets/ui/menus-dialogs/dialogue_box_wide_640x160.svg",
        marges: { haut: 24, droite: 24, bas: 24, gauche: 24 },
        interieur: { haut: 24, droite: 28, bas: 22, gauche: 24 },
      },
      etiquetteNom: {
        image: "assets/ui/menus-dialogs/name_tab_left_160x40.svg",
        marges: { haut: 20, droite: 16, bas: 20, gauche: 16 },
        interieur: { droite: 30, gauche: 26 },
        hauteur: 40,
        largeurMin: 0,
        decalage: 24,
        chevauchement: 2,
        inclinaison: -3,
      },
      bouton: {
        normal: "assets/ui/menus-dialogs/tooltip_plain_160x64.svg",
        marges: { haut: 12, droite: 12, bas: 12, gauche: 12 },
        interieur: { haut: 0, droite: 18, bas: 0, gauche: 18 },
        hauteur: 44,
      },
      fleche: {
        image: "assets/ui/menus-dialogs/continue_arrow_32x32.svg",
        largeur: 32, hauteur: 32, images: 1,
        droite: 16, bas: 8,
      },
    },
  },

  /* ---------- Fond de la scène ----------
   * Vide = fond généré ci-dessous (ou noir s'il est désactivé).
   * Ex. "assets/fond/donjon.png" */
  fond: "",

  /* ---------- Fond généré (utilisé seulement si "fond" est vide) ----------
   * Mur de briques et porte en arche éclairés par une torche (js/fond-pixel.js). */
  fondGenere: {
    actif: true,
    largeur: 320,         // résolution « pixel » avant agrandissement
    hauteur: 200,
    scintillement: true,  // la torche vacille (coupé si mouvement réduit)
    // Du plus sombre au plus clair : gris froids et violets, façon PC-98
    palette: ["#000000", "#0e0e18", "#1e1d30", "#33314c", "#4f4c6e", "#77739a", "#aaa6c4", "#d8d6e4"],
  },

  /* ---------- Encadré en haut à gauche (façon jeu) ----------
   * Une ligne par entrée ; liste vide = pas d'encadré. Masqué sur petit écran. */
  hud: ["Niveau : 1", "Café : 42%"],

  /* ---------- Son (pas encore branché) ---------- */
  son: {
    actifParDefaut: false,
    // Emplacements prévus pour plus tard :
    // bip: "assets/son/bip.ogg",
    // musique: "assets/son/theme.ogg",
  },

  /* ---------- Libellés de l'interface ---------- */
  libelles: {
    passer: "Passer l'intro",
    sonCoupe: "Son coupé",
    sonActif: "Son activé",
    aideClavier: "Clic, Espace ou Entrée pour continuer. Échap pour passer l'intro.",
  },
};
