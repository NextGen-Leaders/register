// Paste your Apps Script Web App deployment URL here.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4ao_1kBcxBWdDOGoYHbEL7UtoJopnayxywdv5Su-MA_IBlOEzo1vTXLBr11j_tI23iA/exec";

const NIVEAU_OPTIONS = [
  "Baccalauréat", "Licence 1", "Licence 2", "Licence 3",
  "Master 1", "Master 2", "Doctorat", "Autre"
];

// FSAC programmes/filières, based on the faculty's public formation areas.
// The official offer changes; see the link in the registration page footer.
const FILIERE_OPTIONS = [
  "Biologie", "Sciences de la Vie", "Sciences Biologiques",
  "Sciences Biomédicales et Qualité (SBQ)",
  "Sciences de la Santé et Biotechnologies (SSB)",
  "Environnement Marin et Gestion des Bio-Ressources (EMGBR)",
  "Ingénierie pour l'Éco-Conception des Aliments (ICOA)",
  "Chimie", "Chimie et valorisation", "Physique", "Sciences physiques",
  "Mathématiques", "Sciences Mathématiques et Informatique",
  "Informatique", "Géologie", "Géosciences fondamentales et appliquées",
  "Sciences de l'environnement", "Énergies renouvelables",
  "Biotechnologie et Environnement", "Bio-Analyses Médicales",
  "Pharmacologie et Développement de Molécules (PDM)",
  "Formation continue — Bâtiment et travaux publics",
  "Formation continue — Électronique",
  "Formation continue — Énergies renouvelables",
  "Formation continue — Informatique",
  "Formation continue — Logistique",
  "Formation continue — Industrie automobile",
  "Autre formation FSAC"
];
const COORDINATOR_EMAIL = "mohammed.jazouli@univh2c.ma";
const ADMIN_CONTACT_EMAIL = "ssb3rd@gmail.com";
