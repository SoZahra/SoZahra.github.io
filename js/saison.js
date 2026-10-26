/*
 * Saison d'Halloween : la version jeu (jeu.html) n'est ouverte que du
 * 24 octobre au 1er novembre inclus (date locale du visiteur). Le reste de
 * l'année, la racine sert la version classique (index.html) et le jeu est
 * caché.
 *
 *  - Accès secret hors saison : jeu.html?halloween (retenu le temps de la
 *    session, pour pouvoir recharger la page).
 *  - Pendant la saison, index.html renvoie vers le jeu, sauf si l'on a
 *    choisi la version classique (index.html?classique, retenu aussi).
 *
 * À charger tout en haut du <head>, sans defer, avec data-page="jeu" ou
 * data-page="classique" : la redirection a lieu avant tout affichage.
 * Pose window.SAISON et, hors saison, la classe « saison-fermee » sur <html>.
 */
(function () {
  // Bornes au format MMJJ : 24 octobre → 1er novembre
  var DEBUT = 1024;
  var FIN = 1101;

  function enSaison(date) {
    var mmjj = (date.getMonth() + 1) * 100 + date.getDate();
    return mmjj >= DEBUT && mmjj <= FIN;
  }

  // sessionStorage peut être bloqué : on fait alors sans mémoire
  function retenir(cle) {
    try { sessionStorage.setItem(cle, "1"); } catch (e) { /* tant pis */ }
  }
  function retenu(cle) {
    try { return sessionStorage.getItem(cle) === "1"; } catch (e) { return false; }
  }

  var params = new URLSearchParams(location.search);
  var secret = params.has("halloween");
  var classique = params.has("classique");
  if (secret) retenir("saison-secret");
  if (classique) retenir("saison-classique");
  secret = secret || retenu("saison-secret");
  classique = classique || retenu("saison-classique");

  // On retire le paramètre de l'adresse affichée (il est mémorisé)
  if (params.has("halloween") || params.has("classique")) {
    params.delete("halloween");
    params.delete("classique");
    var reste = params.toString();
    history.replaceState(null, "", location.pathname + (reste ? "?" + reste : "") + location.hash);
  }

  var saison = enSaison(new Date());
  window.SAISON = {
    enSaison: saison,
    // le jeu est accessible : en saison, ou par l'accès secret
    ouverte: saison || secret
  };
  if (!window.SAISON.ouverte) document.documentElement.classList.add("saison-fermee");

  var script = document.currentScript;
  var page = script && script.dataset.page;
  if (page === "jeu" && !window.SAISON.ouverte) {
    location.replace("index.html" + location.hash);
  } else if (page === "classique" && saison && !classique && !location.hash) {
    location.replace("jeu.html");
  }
})();
