# Crédits

## Interface

- **Frames 1-bit** et **Frames32px** (`assets/ui/frames32/`) — par [piiixl](https://piiixl.itch.io/frames-1-bit),
  sous licence [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
  Les cases sont découpées et recolorées au chargement par `js/intro.js`.
- **Wordwright Lite** (`assets/ui/wordwright/`) — par Cabin Circuit. Utilisation non commerciale.
- **Menus and Dialogs** (`assets/ui/menus-dialogs/`) — par StationSupply. Utilisation non commerciale.
- **Cadres PC-98** (`assets/ui/pc98/`), fond généré (`js/fond-pixel.js`), police gravée
  (`js/police-pixel.js`), personnage (`js/personnage-pixel.js`), pièces (`js/piece-projets.js`,
  `js/piece-whoami.js`) et figurine 3D (`js/figurine-3d.js`) — réalisés pour ce site.
- **Version classique** (`index.html`, `js/saison.js`, `css/express.css`, `js/express.js`,
  `js/express-galerie.js`, `js/projets-classique.js`, essai `sphere.html` + `js/sphere.js`) — réalisée pour ce site.

## Projets

- **Captures des projets** (`images/projets/`) — maquettes de Fatima (Matcha,
  ft_transcendence, Spotflow), exportées de ses fichiers Figma.
  - Matcha : la pièce ancienne (`matcha-piece.webp`) est une image générée avec Gemini ;
    source de la photo du verre de matcha (`matcha-affiche.webp`) à préciser.
  - Spotflow (`spotflow-*.webp`) : photos des cafés et des boissons dans les maquettes,
    source à préciser.
- **Archivo** (police de la version classique, chargée depuis Google Fonts) — par Omnibus-Type,
  sous [SIL Open Font License 1.1](https://openfontlicense.org).
- **EB Garamond** (fiche d'un projet dans l'essai `sphere.html`, chargée depuis Google Fonts) —
  par Georg Duffner et Octavio Pardo, sous [SIL Open Font License 1.1](https://openfontlicense.org).

## Bibliothèques

- **three.js** r170 (`js/vendor/three.module.min.js`) — three.js authors,
  [licence MIT](js/vendor/three-LICENSE.txt). Utilisée pour la figurine 3D de la page « whoami »
  et pour la galerie 3D de la version classique.
  Le chargeur de modèles (`js/vendor/GLTFLoader.js`, `js/vendor/BufferGeometryUtils.js`)
  vient du même dépôt, sous la même licence.

## Modèle 3D

- `models/fatima.glb` — buste 3D de Fatima en mage-peintre (tenue par défaut) :
  quatre vues (face, profils, dos) générées avec Gemini à partir de sa photo,
  puis modèle 3D généré avec Hunyuan 3D V3, via Figma Weave. Texture réduite
  pour le web.
- `models/fatima-yeux-fermes.jpg` — la même texture, paupières peintes fermées
  pour le clignement — réalisée pour ce site.
- `models/fatima-armure.glb` — tenue « Armure », personnage en pied :
  illustrations générées à partir de sa photo avec Nano Banana 2.1, puis modèle
  3D généré avec Hunyuan 3D V3, via Figma Weave. Textures réduites pour le web.
- `models/fatima-buste.glb` — tenue « Veste brodée », en buste : modèle 3D
  généré avec Meshy V6, via Figma Weave, à partir d'une illustration ; grain de
  beauté replacé et teint retouché sur la texture ; frange, mèches tombant
  devant les épaules, collier à fleur
  noire et créoles modélisés dans Blender
  pour ce site. Texture réduite pour le web.
- `images/tenues/veste.jpg` — vignette rendue depuis ce modèle (Blender, EEVEE).
- `models/fatima-simple.glb` — tenue « Veste simple » : le même buste, veste
  repeinte en écru uni sans broderies dans Blender pour ce site.
- `images/tenues/simple.jpg` — vignette rendue depuis ce modèle (Blender, EEVEE).
- `models/fatima-levres.png` — masque des lèvres sur la texture de ce modèle (lèvres en couleur
  sur le buste en noir et blanc de la version rapide) — réalisé pour ce site.
- `images/tenues/` — vignettes des tenues, recadrées depuis ces illustrations.
- `images/porte-cles/` — porte-clés du trousseau (elle, dossier,
  enveloppe, CV, ordinateur ; anciens : matcha, palette, étiquette) : images générées par IA
  (Gemini / Nano Banana ; novembre 2026 : style art toy mat) à
  partir de sa photo et de prompts écrits pour ce site, détourées avec rembg
  (modèles IS-Net et BiRefNet). Réduites pour le web. L'anneau et le
  crochet (`anneau.webp`, `crochet.webp`) : images générées par IA, fournies
  par elle, détourées avec ImageMagick (fond gris retiré par la saturation).

- `images/objets/` — ses objets du volet À propos (café, caméra, console, carnet à dessin) :
  images générées par IA (Gemini / Nano Banana) dans le style des
  porte-clés, détourées avec rembg (IS-Net), réduites pour le web.
- `js/vendor/matter.min.js` — Matter.js 0.20.0 (moteur physique 2D),
  par Liam Brummitt, licence MIT : https://github.com/liabru/matter-js

## Polices

- **DotGothic16** — The DotGothic16 Project Authors (Fontworks),
  [SIL Open Font License 1.1](fonts/DotGothic16-OFL.txt). Version réduite aux caractères latins.
- **Cinzel** — The Cinzel Project Authors (Natanael Gama),
  [SIL Open Font License 1.1](fonts/Cinzel-OFL.txt).
