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
     GitHub, CV. Adresse, LinkedIn et CV réels ; Formspree vide (lettre par mailto:).

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
  propos, Contact). Navigation verticale, le mot roule au survol.
  Novembre 2026 : TOUT À GAUCHE et À L'HORIZONTALE (plus de texte
  vertical) : logo, dessous nom + métier, menu empilé en bas à gauche ;
  rien à droite. Au téléphone, nom et menu restent sur l'accueil (pas
  fixés). Colonne réduite à nom + métier (le reste est dans À
  propos / Contact), plus de lien fixe « Version immersive » (reste au
  pied de page). Le sommaire des projets sous le trousseau est caché, il
  n'apparaît qu'en ouvrant le dossier (ou « Projets » du menu). Fin novembre 2026, elle n'aimait ni la simple ligne de liens ni un index en grandes lettres : ce sont maintenant des FICHES papier (1er écran, numéro, nom, type · année) qui sortent du porte-clé dossier en volant et se posent de travers (`sortirFiches`/`rangerFiches` dans js/express.js) ; sur ordinateur le trousseau glisse à gauche (-22vw), au téléphone elles se posent au-dessus du menu. Survol : la fiche se redresse ; clic : le projet ; Échap, clic à côté ou dossier : elles rentrent.
  Un projet s'ouvre dans un volet de côté (`#projet`, novembre 2026,
  remplace la fiche en fenêtre au centre qu'elle n'aimait pas) : le dossier
  reste accroché, les autres tombent ; en haut les projets numérotés, grand
  titre, rôle/outils/apports en pointillés, « Maquettes », « Projet suivant ».
- Novembre 2026 : porte-clés refaits en style art toy MAT (vinyle, vrais
  tissus, d'après ses références Pinterest), elle avec son grain de beauté
  (signe distinctif, à garder) et la tenue jupe. Trousseau = elle (→ À propos,
  la palette est retirée), dossier (→ sommaire des projets, remplace les
  porte-clés par projet), enveloppe (Contact), CV, ordinateur `</>`
  (→ GitHub, son côté développeuse).
- PAS DE DÉFILEMENT (novembre 2026) : tout se passe sur l'accueil.
  À propos et Contact sont des volets (`.volet`) qui s'ouvrent par-dessus
  (liens #apropos / #contact, porte-clés, menu), fermés par ✕, Échap ou
  le logo ; l'ancien pied de page est en bas du volet Contact.
- Porte-clé ordinateur → volet GitHub DE CÔTÉ (`.volet-cote`, données
  `js/github.js` : dépôts choisis, résumés provisoires ; chiffres et
  langages en direct par l'API publique GitHub). Au clic, les autres
  porte-clés se DÉCROCHENT (`decrocher()` dans express-trousseau.js) et
  tombent, le trousseau se range à gauche ; à la fermeture tout retombe
  sur le crochet (`raccrocher()`). Dès qu'un volet est ouvert (classe
  `volet-ouvert`), il ne reste que le logo : nom, métier et menu s'effacent. Mécanisme à étendre aux autres
  porte-clés si elle le valide.
- Son porte-clé → volet À propos de côté (même mécanisme) : devise,
  histoire (BROUILLON tiré du CV, `histoire` dans js/whoami.js), « Ce que
  je fais » (`faire`), « En ce moment » (`enCeMoment`). Outils et parcours
  n'y sont plus (ils sont dans le CV). Ses OBJETS (café, caméra, console ; `objets`
  dans whoami.js, images dans `images/objets/`) tombent à l'ouverture, en
  bas à gauche, on les attrape et les lance PARTOUT sur la page (murs = bords de l'écran) (Matter.js,
  `js/express-objets.js`) ; à la fermeture ils tombent hors de l'écran.
- Porte-clé CV → volet CV de côté (même mécanisme que GitHub) : son CV
  en page web. Source unique `js/cv.js` (version GÉNÉRALE tirée de ses CV
  TF1, SANS téléphone : choix de Fatima), mise en page `js/cv-rendu.js` +
  `css/cv.css`, aussi utilisée par `documents/cv.html` qui sert à
  imprimer `documents/cv-fatima-zayani.pdf` (commande dans ce fichier :
  le régénérer après chaque modif de js/cv.js).
- Intro (`js/express-intro.js`, novembre 2026) : ses yeux en grand au
  milieu regardent à gauche/droite, clignent 3 fois, filent à la place du
  logo, puis le trousseau tombe. Une fois par session ; `?intro` pour la
  rejouer ; clic/touche/molette la passent.
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
  pousse, le défilement les secoue, et au téléphone on les secoue en secouant le téléphone (`js/express-secousse.js`, accéléromètre ; sur iPhone, bouton « Secoue ton téléphone » qui demande la permission, seul geste que Safari accepte). Le porte-clé
  d'un projet se déclare dans `js/projets-classique.js` (`porteCle`) ;
  manquent ceux de ft_transcendence (manette) et Spotflow (novembre 2026,
  a remplacé Michael Jackson, jugé trop maigre : une seule page). L'anneau et le crochet dorés sont aussi des images détourées
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
  et clignent ; AU SURVOL SEULEMENT (pas tout seul) la carte pivote et montre « Fatima Zayani »
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
