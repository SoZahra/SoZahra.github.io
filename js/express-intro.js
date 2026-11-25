/*
 * Intro de la version classique (index.html) : ses yeux, en grand au
 * milieu de l'écran, regardent à gauche, à droite, clignent deux ou trois
 * fois, puis filent à leur place de logo (en haut à gauche) pendant que le
 * fond s'ouvre ; ensuite, le trousseau tombe sur son crochet
 * (quandOuvert : js/express.js y appelle lacher()).
 *
 * Une fois par session (sessionStorage), ou à chaque fois avec ?intro.
 * Un clic, une touche ou la molette la passent. Rien si l'utilisateur
 * préfère moins d'animations.
 */
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export function introAJouer(reduit) {
  if (reduit) return false;
  if (new URLSearchParams(location.search).has("intro")) return true;
  if (location.hash.length > 1) return false; // arrivée directe sur un volet
  try {
    if (sessionStorage.getItem("intro-vue")) return false;
    sessionStorage.setItem("intro-vue", "1");
  } catch (e) { /* sans mémoire : on la joue */ }
  return true;
}

export async function jouerIntro({ quandOuvert } = {}) {
  const logo = document.getElementById("yeux");
  const racine = document.documentElement;
  racine.classList.add("intro-en-cours");

  // le voile et une copie des yeux du logo (identifiants renommés)
  const voile = document.createElement("div");
  voile.className = "intro";
  voile.setAttribute("aria-hidden", "true");
  const svg = logo.querySelector("svg").cloneNode(true);
  svg.querySelectorAll("[id]").forEach((n) => { n.id = `intro-${n.id}`; });
  svg.querySelectorAll("[clip-path]").forEach((n) => {
    n.setAttribute("clip-path", n.getAttribute("clip-path").replace("url(#", "url(#intro-"));
  });
  voile.append(svg);
  document.body.append(voile);
  const iris = svg.querySelectorAll(".iris");

  let passee = false;
  const passer = () => { passee = true; };
  const evenements = ["pointerdown", "keydown", "wheel", "touchstart"];
  evenements.forEach((t) => window.addEventListener(t, passer, { once: true, passive: true }));
  const pause = async (ms) => { if (!passee) await attendre(ms); };

  const regarder = (x, y) => iris.forEach((i) => { i.style.transform = `translate(${x}px, ${y}px)`; });
  const cligner = async () => {
    if (passee) return;
    voile.classList.add("cligne");
    await attendre(190);
    voile.classList.remove("cligne");
  };

  // apparition, coup d'œil à gauche, à droite, clignements
  await pause(350);
  regarder(-2.6, 0.4); await pause(520);
  regarder(2.6, 0.4); await pause(520);
  regarder(0, 0); await pause(260);
  await cligner(); await pause(380);
  await cligner(); await pause(140);
  await cligner(); await pause(420);

  // les yeux filent vers le logo, le fond s'ouvre
  const de = svg.getBoundingClientRect(), vers = logo.querySelector("svg").getBoundingClientRect();
  const dx = vers.left + vers.width / 2 - (de.left + de.width / 2);
  const dy = vers.top + vers.height / 2 - (de.top + de.height / 2);
  const k = vers.width / de.width;
  const duree = passee ? 250 : 750;
  svg.animate(
    [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }],
    { duration: duree, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" },
  );
  voile.animate([{ backgroundColor: getComputedStyle(voile).backgroundColor }, { backgroundColor: "transparent" }],
    { duration: duree, delay: duree * 0.35, easing: "ease-out", fill: "forwards" });
  // le trousseau commence à tomber pendant que le fond s'ouvre
  setTimeout(() => quandOuvert && quandOuvert(), duree * 0.4);
  await attendre(duree);

  // le vrai logo réapparaît sous la copie, puis la copie s'en va
  racine.classList.remove("intro-en-cours");
  await attendre(220);
  voile.remove();
  evenements.forEach((t) => window.removeEventListener(t, passer));
}
