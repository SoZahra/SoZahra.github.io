/*
 * Le volet GitHub de la version classique (index.html) : on y arrive par le
 * porte-clé ordinateur. Les dépôts mis en avant sont choisis ici (son
 * GitHub en compte 31, dont beaucoup d'exercices de 42) ; les chiffres
 * (nombre de dépôts, langages) viennent de l'API publique de GitHub au
 * moment de l'ouverture, et le volet s'en passe si elle ne répond pas.
 *
 * Champs d'un dépôt :
 *   depot : nom exact du dépôt sur GitHub (github.com/<pseudo>/<depot>)
 *   titre : nom affiché
 *   techno : langages / outils, en court
 *   resume : une phrase
 *
 * ⚠ Les résumés sont PROVISOIRES (écrits d'après les noms des dépôts) : à
 * confirmer par Fatima.
 */
window.GITHUB = {
  pseudo: "SoZahra",
  intro: "Le côté code : les projets de l'école 42 et ceux que je fais à côté.",
  depots: [
    { depot: "Matcha", titre: "Matcha", techno: "JavaScript", resume: "Site de rencontre complet : profils, recherche, likes, messagerie en temps réel." },
    { depot: "ft_transcendence", titre: "ft_transcendence", techno: "Web · jeu en ligne", resume: "Pong et Snake en ligne, avec comptes, amis, classement et statistiques." },
    { depot: "-Dashboard", titre: "Dashboard", techno: "TypeScript", resume: "Un tableau de bord en TypeScript." },
    { depot: "Front-Search-system---SPA", titre: "Search system", techno: "JavaScript · SPA", resume: "Une application d'une seule page avec un système de recherche." },
    { depot: "Fat-Bot", titre: "Fat-Bot", techno: "JavaScript", resume: "Un chatbot basé sur l'IA." },
    { depot: "Cub3D", titre: "Cub3D", techno: "C", resume: "Un moteur de rendu 3D en raycasting, façon Wolfenstein 3D." },
    { depot: "Minishell", titre: "Minishell", techno: "C", resume: "Un petit shell Unix : commandes, pipes, redirections, variables." },
    { depot: "Ft_irc", titre: "ft_irc", techno: "C++", resume: "Un serveur IRC en C++." },
    { depot: "Inception", titre: "Inception", techno: "Docker", resume: "Une infrastructure de services en conteneurs Docker." },
  ],
};
