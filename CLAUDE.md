# Portfolio de Fatima Zayani — notes pour Claude

Intro façon jeu à dialogues, en HTML/CSS/JS vanilla (pas de build). Code et
commentaires en français. Style **PC-98** : palette réduite, tramage de Bayer,
police bitmap (DotGothic16), lignes CRT, ambiance demeure éclairée à la bougie.

## Git

- On travaille sur `dev`. Fatima pousse elle-même depuis VS Code.
- `main` = site public : ne fusionner que quand elle le décide.
- Tout asset ajouté doit être crédité dans `CREDITS.md`.

## Deux versions, selon la saison

- `index.html` = version classique (servie toute l'année).
- `jeu.html` = version jeu, ouverte seulement du 24 octobre au 1er novembre
  (`js/saison.js`, date locale). Pendant ce temps, `index.html` renvoie vers
  le jeu, sauf `index.html?classique` (lien « Version rapide » du jeu).
- Hors saison : liens vers le jeu cachés (classe `saison-fermee`), et
  `jeu.html` renvoie vers `index.html`, sauf accès secret `jeu.html?halloween`.

## Parcours (version jeu)

1. Dialogues (`js/dialogues.js` : textes, thèmes, portes). Seuls des yeux
   brillants clignent dans l'arche.
2. Salle d'entrée : une seule grande porte, nom gravé et éclairé par un lustre
   (`inscription.style: "lustre"`), torches, souris. Pas de zoom.
3. Salle aux 3 portes (`js/fond-pixel.js`) : vue à la 1re personne, lampe à
   pétrole au premier plan dont la lumière suit la souris ; stèles gravées ;
   fumée au survol d'une porte. Chaque arche laisse voir sa pièce (méthode
   `apercu()` de chaque `window.PIECES`), révélée par la lampe.
4. Pièces derrière les portes (`window.PIECES`) :
   - **Projets** (`js/piece-projets.js`, données `js/projets.js`) : bureau
     ancien ; clic dessus → inventaire plein écran façon menu de jeu
     (onglets = catégories, touches Q/E ; grille, document en grand, fiche).
     Les 6 projets sont des EXEMPLES à remplacer.
   - **Qui suis-je ?** (`js/piece-whoami.js`, données `js/whoami.js`) : atelier
     avec lustre et rayon de lune. Elle peint de dos, nous entend, se retourne,
     dit une réplique (1re visite). Clic sur elle → fiche de personnage façon
     gacha : modèle 3D (`js/figurine-3d.js`, three.js r170 dans `js/vendor/`)
     qui surgit d'un cercle magique, puis panneau qui se déplie. Dans
     `js/whoami.js`, seuls nom, classe, devise et GitHub sont vrais.
   - **Contact** (`js/piece-contact.js`, données `js/contact.js`) : salon
     de la demeure, feu de cheminée animé (éclaire la pièce, crépite si le
     son est activé). Elle somnole sur le canapé, se réveille et parle ; clic
     sur elle = réplique suivante. Secrétaire → lettre (formulaire Formspree,
     ou `mailto:` si `formspree` est vide) qui se plie, se scelle et
     s'envole ; café → copie l'adresse ; cadres sur la cheminée → LinkedIn,
     GitHub, CV. Adresse, Formspree, LinkedIn et CV sont des EXEMPLES.

## Version classique

`index.html` (`css/express.css`, `js/express.js`) : le portfolio en une
page (ex-`express.html`, d'où le nom des fichiers). Lien « Version rapide »
en haut de l'intro du jeu. Refaite en octobre 2026 d'après ses références
(portfolio Andy Lin) : fond gris clair `#c9c9c7`
avec grain, police Archivo très large (Google Fonts), une seule couleur vive
en touches (corail `#ff4a3d`), rien de trop sombre, du simple.
- Structure (d'après sa maquette « Welcome page ») : une colonne de texte
  vertical (« 2026 / Portfolio / Zayani Fatima / Designer UI/UX /
  Développeuse ») qui l'accompagne pendant toute la visite, à gauche, et
  change de mots (et de couleur) selon la section (projet en cours, À
  propos, Contact). Navigation verticale à droite, le mot roule au survol.
- Accueil = un TROUSSEAU suspendu à un crochet (`js/express-trousseau.js`,
  octobre 2026, a remplacé la galerie) : elle en porte-clé au milieu, autour
  des porte-clés qui mènent chacun à une page (projet → fiche, palette → À
  propos, enveloppe → Contact, étiquette → CV). Style « art toy » en
  porcelaine brillante (joues rosées, paupières mi-closes), images générées
  par IA et détourées (rembg) dans `images/porte-cles/`. Physique Verlet :
  chaînes souples (dessinées dans un canevas), porte-clés rigides qu'on
  attrape à la souris, soulève et lance (un glisser n'ouvre pas le lien ;
  au doigt, pas de prise pour laisser défiler) ; l'anneau tourne autour du
  crochet, retenu par le poids des porte-clés. La souris qui passe les
  pousse, le défilement les secoue. Le porte-clé
  d'un projet se déclare dans `js/projets-classique.js` (`porteCle`) ;
  manquent ceux de ft_transcendence (manette) et Michael Jackson (gant à
  paillettes). L'anneau et le crochet dorés sont aussi des images détourées
  (`anneau.webp`, `crochet.webp`). 2D voulue (pas de .glb) : plus léger, le
  brillant reste.
- Avant : une GALERIE DANS LE NOIR, en 3D (`js/express-galerie.js`, plus
  chargé mais gardé), choisie par elle (« plus impactant, 3D, profondeur, mouvement,
  intriguer »). La souris est une lampe torche (s'allume en grésillant) ;
  cartel de musée avec son nom à l'entrée ; ses projets accrochés comme des
  tableaux, un mur sur deux, avec plaques ; au défilement on avance de halte
  en halte (pause face à chaque tableau) jusqu'à une porte ouverte sur le
  gris de la page (« À propos »). Sommaire des projets et bouton « Voir le
  projet » en HTML (clavier, lecteurs d'écran) ; sans souris, la lampe vise
  seule. Données : `js/projets-classique.js` (ses 3 vrais projets ; textes
  encore provisoires), images dans `images/projets/` exportées de ses Figma.
  `js/projets.js` reste celui du jeu.
- Refusé aussi : la version « regard » (ses yeux en très grand, iris en
  verre, vues plein écran par projet avec clignement de paupières).
- Pistes d'accueil essayées puis REFUSÉES (octobre 2026, fichiers
  supprimés) : bulle de verre liquide qui déforme la devise (elle la
  préférait aux yeux, mais « juste une bulle ») ; devise en lettres de
  verre sur fond liquide ; prénom en lettres-ballons (2D puis 3D avec
  ficelles) ; peinture (pinceau qui peint autour des lettres, puis
  « colorier pour révéler la phrase » en corail qui sèche en noir). Autres
  pistes proposées, jamais faites : gelée, particules, tissu. Retenu de ces
  essais : un index des projets (noms en très grand, une goutte de verre
  montre l'écran au survol) lui plaisait plutôt.
- Puis « À propos » dans un panneau à coins marqués, et contact.
- En haut à gauche, ses yeux (frange arrondie, eye-liner) suivent la souris
  et clignent ; de temps en temps la carte pivote et montre « Fatima Zayani »
  (pas de monogramme « FZ »). Éviter `-webkit-text-stroke` avec Cinzel.
- Abandonnés (elle n'a pas aimé) : affiche froissée, billets en diagonale,
  anamorphose, objets 3D en ouverture, anneau de cartes façon Manet,
  paquet de cartes en éventail (« effet cartes »), son nom répété en
  filigrane partout, projets en « planches » décalées sur fond gris.

## Le personnage

- Pixel art 16×32 : `js/personnage-pixel.js` (face, profil, dos, dos qui
  peint). Le dos doit rester le miroir exact de la silhouette de face (la
  figurine en voxels de secours en dépend).
- Modèle 3D : `models/fatima.glb`, version « mage-peintre » (long manteau
  bordeaux brodé d'or, corset, épaulière dorée, pinceau-bâton lumineux).
  Généré dans Figma Weave (illustration Nano Banana 2.1, puis Hunyuan 3D V3
  avec vues de face et de dos, Face Count 100000, sans PBR), textures réduites
  en JPEG (couleur 2048, normale et métal/rugosité 1024) pour passer de 34 Mo
  à 3,3 Mo. Si le modèle ne charge pas, la figurine en voxels prend le relais.
- Les sprites pixel portent la même tenue que le modèle 3D : garder les deux
  cohérents.

## En cours

Cette version armure ne lui ressemble pas assez. Une version « jupe » est
prête en images (veste courte bordeaux brodée d'or, débardeur noir, collier à
fleur noire, ceinture à deux fioles ambrées, longue jupe noire à ourlet doré,
bottines anciennes boutonnées, pinceau doré) : `skirt 1.jpg` (face) et
`skirt 2.jpg` (dos). Il manque les crédits Weave pour la 3D.

Quand le `.glb` arrive :
1. Garder l'actuel sous `models/fatima-armure.glb` pour comparer.
2. Alléger le nouveau de la même façon et le mettre en `models/fatima.glb`.
3. Redessiner les sprites pixel dans la tenue jupe.

Ne plus proposer Trellis ni la démo Hugging Face de Hunyuan 3D : le visage
était raté. Hunyuan 3D V3 avec face + dos est ce qui a marché.

## Préférences connues

- Pas de lucioles. Les stèles de la salle aux 3 portes restent petites et
  grises. Le nom d'entrée reste vraiment doré.
- Les licences des assets ont été tranchées par elle : ne pas relancer le sujet.
- Tester avec un serveur local (la 3D ne marche pas en `file://`).
