/*
 * Son de l'enseigne au néon, généré avec la Web Audio API (aucun fichier) :
 *   - un bourdonnement électrique (ronflement grave + léger sifflement),
 *     dont le volume suit la part de lettres allumées ;
 *   - des crépitements quand une lettre grésille, s'éteint ou se rallume.
 * Piloté par js/fond-pixel.js (regler, crepiter) et par le bouton son de
 * l'intro (js/intro.js : activer, couper). Le navigateur n'autorise le son
 * qu'après une action du visiteur : activer() est appelé au clic sur le bouton.
 */
window.SON_NEON = (() => {
  "use strict";

  const VOLUME = 0.35;          // volume général
  const BOURDON = 0.08;         // volume du bourdonnement, toutes lettres allumées
  let audio = null;             // AudioContext, créé au premier activer()
  let general, bourdon, bruit;  // nœuds de gain
  let actif = false;
  let niveau = 0;               // part de lettres allumées (0 → 1)

  function creer() {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    general = audio.createGain();
    general.gain.value = 0;
    general.connect(audio.destination);

    // Bourdonnement : dent de scie grave + harmonique, adoucies par un filtre
    bourdon = audio.createGain();
    bourdon.gain.value = 0;
    const filtre = audio.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 900;
    filtre.Q.value = 2;
    bourdon.connect(filtre).connect(general);
    for (const [frequence, gain, forme] of [[100, 0.6, "sawtooth"], [200, 0.25, "square"], [50, 0.3, "sine"]]) {
      const osc = audio.createOscillator();
      osc.type = forme;
      osc.frequency.value = frequence;
      const g = audio.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(bourdon);
      osc.start();
    }

    // Sifflement : bruit blanc filtré, très faible
    bruit = audio.createGain();
    bruit.gain.value = 0;
    const source = audio.createBufferSource();
    source.buffer = bruitBlanc(2);
    source.loop = true;
    const passeBande = audio.createBiquadFilter();
    passeBande.type = "bandpass";
    passeBande.frequency.value = 4000;
    passeBande.Q.value = 0.8;
    source.connect(passeBande).connect(bruit).connect(general);
    source.start();
  }

  function bruitBlanc(secondes) {
    const tampon = audio.createBuffer(1, Math.floor(audio.sampleRate * secondes), audio.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return tampon;
  }

  // Volume du bourdonnement selon les lettres allumées (transition courte)
  function appliquerNiveau() {
    if (!audio) return;
    const t = audio.currentTime;
    bourdon.gain.setTargetAtTime(actif ? niveau * BOURDON : 0, t, 0.02);
    bruit.gain.setTargetAtTime(actif ? niveau * 0.015 : 0, t, 0.05);
  }

  return {
    // Au clic sur le bouton son (geste du visiteur : le navigateur l'autorise)
    activer() {
      if (!audio) creer();
      audio.resume();
      actif = true;
      general.gain.setTargetAtTime(VOLUME, audio.currentTime, 0.1);
      appliquerNiveau();
    },

    couper() {
      actif = false;
      if (!audio) return;
      general.gain.setTargetAtTime(0, audio.currentTime, 0.08);
    },

    // Part de lettres allumées (0 = enseigne éteinte ou hors de la salle)
    regler(part) {
      niveau = Math.max(0, Math.min(1, part));
      appliquerNiveau();
    },

    // Crépitement : petite décharge de bruit, plus forte si intensite → 1
    crepiter(intensite = 0.5) {
      if (!audio || !actif) return;
      const t = audio.currentTime;
      const duree = 0.03 + Math.random() * 0.06;
      const source = audio.createBufferSource();
      source.buffer = bruitBlanc(duree);
      const filtre = audio.createBiquadFilter();
      filtre.type = "highpass";
      filtre.frequency.value = 1200 + Math.random() * 2000;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.12 + intensite * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duree);
      source.connect(filtre).connect(g).connect(general);
      source.start(t);
    },
  };
})();
