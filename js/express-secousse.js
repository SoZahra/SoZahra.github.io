/*
 * Secouer le téléphone : l'accéléromètre (devicemotion) donne la secousse,
 * on la passe au trousseau et aux objets, qui sont projetés à l'opposé
 * (comme des clés dans une poche : le téléphone part, elles restent).
 *
 * Sur iPhone, Safari demande la permission : on la demande au premier
 * toucher sur la page (il faut un geste de la personne), une seule fois.
 * Il faut aussi du HTTPS (GitHub Pages l'a ; en local, seulement localhost).
 */

const SEUIL = 9;      // secousse minimale (m/s², sans la pesanteur)
const ECART = 110;    // au plus une poussée toutes les 110 ms

// rappel(ax, ay) : la secousse en m/s², dans le repère de l'écran
// (x vers la droite, y vers le bas)
export function ecouterSecousses(rappel) {
  if (typeof DeviceMotionEvent === "undefined") return;
  if (!matchMedia("(pointer: coarse)").matches) return; // pas sur ordinateur

  let gx = 0, gy = 0, gz = 0, amorce = false, dernier = 0;
  function mouvement(e) {
    let ax, ay, az;
    if (e.acceleration && e.acceleration.x != null) {
      ({ x: ax, y: ay, z: az } = e.acceleration);
    } else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
      // sans « acceleration » seule : on retire la pesanteur, estimée en
      // lissant le signal (ce qui reste, c'est la secousse)
      const g = e.accelerationIncludingGravity;
      if (!amorce) { gx = g.x; gy = g.y; gz = g.z; amorce = true; }
      gx += (g.x - gx) * 0.1; gy += (g.y - gy) * 0.1; gz += (g.z - gz) * 0.1;
      ax = g.x - gx; ay = g.y - gy; az = g.z - gz;
    } else return;
    if (Math.hypot(ax, ay, az) < SEUIL) return;
    const t = performance.now();
    if (t - dernier < ECART) return;
    dernier = t;
    // repère de l'appareil (y vers le haut, en portrait) → repère de l'écran,
    // selon que le téléphone est tenu droit ou couché
    const angle = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) * Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle);
    // (angle 90 : tourné d'un quart de tour vers la gauche, le haut à gauche)
    rappel(ax * c - ay * s, -(ax * s + ay * c));
  }

  const ecouter = () => addEventListener("devicemotion", mouvement);
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    // iPhone / iPad : permission au premier toucher
    const demander = () => {
      DeviceMotionEvent.requestPermission()
        .then((r) => { if (r === "granted") ecouter(); })
        .catch(() => {});
    };
    addEventListener("touchend", demander, { once: true });
  } else {
    ecouter();
  }
}
