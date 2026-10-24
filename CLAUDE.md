# Portfolio de Fatima Zayani — notes pour Claude

Intro façon jeu à dialogues, en HTML/CSS/JS vanilla (pas de build). Code et
commentaires en français. Style **PC-98** : palette réduite, tramage de Bayer,
police bitmap (DotGothic16), lignes CRT, ambiance demeure éclairée à la bougie.

## Git

- On travaille sur `dev`. Fatima pousse elle-même depuis VS Code.
- `main` = site public : ne fusionner que quand elle le décide.
- Tout asset ajouté doit être crédité dans `CREDITS.md`.

## Parcours

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
