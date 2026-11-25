/*
 * Son CV, une seule source pour deux usages :
 *   - le volet CV de la version classique (index.html, porte-clé CV) ;
 *   - le PDF à télécharger, imprimé depuis documents/cv.html (voir ce
 *     fichier pour le régénérer après une modification).
 *
 * Version générale (novembre 2026), tirée de ses CV ciblés TF1 : sans
 * mention d'une offre dans le titre, et SANS NUMÉRO DE TÉLÉPHONE (site
 * public : email, LinkedIn et GitHub suffisent).
 */
window.CV = {
  nom: "Fatima Zayani",
  titre: "Développeuse créative & UI/UX",
  ville: "Paris",
  email: "zayani.fatima.z@gmail.com",
  pdf: "documents/cv-fatima-zayani.pdf",
  liens: [
    { libelle: "LinkedIn", url: "https://www.linkedin.com/in/fatima-zayani-4362a9109" },
    { libelle: "GitHub", url: "https://github.com/SoZahra" },
    { libelle: "Portfolio", url: "https://fatimazayani.com" },
  ],

  profil: "Étudiante à l'École 42 Paris, développeuse créative avec un parcours de designer (BTS Design Graphique, Master Direction Artistique) et une expérience au sein de TF1. Je développe des applications web complètes, j'écris de la documentation technique et j'utilise l'IA au quotidien. Curieuse, autonome et à l'aise en équipe.",
  disponibilite: "Je recherche un CDI, un stage ou une alternance menant à un CDI, dès que possible.",

  experiences: [
    {
      poste: "Stage Développement Fullstack", lieu: "getWelcom", dates: "2025 – 2026",
      points: [
        "Implémentation d'un module d'authentification backend (magic links, JWT, SMS Twilio)",
        "Développement et correction de templates d'emails transactionnels (MJML, Mailjet) sur un backend NestJS",
        "Rédaction de roadmaps structurées : flux AWS SES, refonte du backoffice, architecture d'une application invité",
        "Travail en équipe avec tickets Jira et maquettes de design",
      ],
    },
    {
      poste: "Graphiste & Créatrice de contenu", lieu: "TF1", dates: "2022 – 2024",
      points: [
        "Création de contenus multimédias digitaux, montage vidéo et motion design pour les réseaux sociaux",
        "Collaboration avec les équipes éditoriales et marketing du groupe, délais courts",
      ],
    },
    {
      poste: "Chargée de communication & Direction artistique", lieu: "Guy Moquet (ex Iwest)", dates: "2021",
      points: ["Identité visuelle, site vitrine et réseaux sociaux de l'agence"],
    },
  ],

  projets: [
    { nom: "Matcha", texte: "application web fullstack de rencontres" },
    { nom: "Fat'Bot", texte: "chatbot basé sur l'IA" },
    { nom: "ft_transcendence", texte: "plateforme de jeu d'arcade multijoueur" },
  ],

  formation: [
    { titre: "École 42 — Développement informatique", lieu: "Paris", dates: "2024 – aujourd'hui" },
    { titre: "Google UX Design Certificate", lieu: "", dates: "2025 – aujourd'hui" },
    { titre: "BTS Design Graphique & Master Direction Artistique", lieu: "", dates: "2017 – 2023" },
  ],

  competences: [
    { groupe: "Développement", liste: ["JavaScript", "TypeScript", "React", "Next.js", "NestJS", "Node.js", "C", "Git"] },
    { groupe: "API & données", liste: ["API REST", "JWT, magic links", "PostgreSQL", "MongoDB", "DynamoDB", "AWS SES"] },
    { groupe: "Méthode", liste: ["Jira", "Documentation technique", "Roadmaps", "Travail par tickets"] },
    { groupe: "IA", liste: ["Claude", "ChatGPT", "Midjourney"] },
    { groupe: "UI/UX & design", liste: ["Figma", "Photoshop", "Illustrator", "InDesign", "After Effects"] },
  ],

  langues: ["Français natif", "Anglais bilingue", "Arabe bilingue"],
};
