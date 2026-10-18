const form = document.getElementById("registration-form");
const conferenceSelect = document.getElementById("conference");
const loadingState = document.getElementById("loading-state");
const closedState = document.getElementById("closed-state");
const closedConferenceState = document.getElementById("conference-closed-state");
const applicantFields = document.getElementById("applicant-fields");
const submitButton = document.getElementById("submit-button");
const formError = document.getElementById("form-error");
let conferences = [];
let lang = "fr";

function applyLanguage(next) {
  lang = next;
  document.documentElement.lang = next;
  document.documentElement.dataset.lang = next;
  document.querySelectorAll("[data-fr][data-en]").forEach(el => {
    el.textContent = el.dataset[next];
  });
  document.getElementById("lang-toggle").textContent = next === "fr" ? "EN" : "FR";
  document.title = next === "fr" ? "Inscription — Les quatre Masters de la FSAC" : "Registration — Four FSAC Master's programmes";
}
document.getElementById("lang-toggle").addEventListener("click", () => applyLanguage(lang === "fr" ? "en" : "fr"));

function fillSelect(id, options) {
  const select = document.getElementById(id);
  options.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}
fillSelect("niveau", NIVEAU_OPTIONS);
fillSelect("filiere", FILIERE_OPTIONS);

function selectedConference() {
  return conferences.find(c => c.id === conferenceSelect.value);
}
function showFormAvailability() {
  const c = selectedConference();
  const isAvailable = Boolean(c && c.isOpen);
  applicantFields.hidden = !isAvailable;
  closedConferenceState.hidden = !c || isAvailable;
  document.getElementById("conference-details").hidden = !c;
  const details = document.getElementById("conference-details");
  details.textContent = "";
  if (c) {
    const title = document.createElement("strong");
    title.textContent = c.name;
    details.appendChild(title);
    if (c.date) {
      const date = document.createElement("div");
      date.textContent = c.date;
      details.appendChild(date);
    }
    if (c.description) {
      const desc = document.createElement("div");
      desc.textContent = c.description;
      details.appendChild(desc);
    }
  }
}
conferenceSelect.addEventListener("change", showFormAvailability);

async function init() {
  try {
    const data = await callApi("getPublicData");
    if (data.error) throw new Error(data.error);
    conferences = Array.isArray(data.conferences) ? data.conferences : [];
    loadingState.hidden = true;
    if (!data.registrationOpen || conferences.length === 0) {
      closedState.hidden = false;
      form.hidden = true;
      return;
    }
    form.hidden = false;
    conferences.forEach(c => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = `${c.name}${c.isOpen ? "" : (lang === "fr" ? " — Inscriptions fermées" : " — Registration closed")}`;
      conferenceSelect.appendChild(option);
    });
    const defaultConference = conferences.find(c => c.isOpen) || conferences[0];
    if (defaultConference) conferenceSelect.value = defaultConference.id;
    showFormAvailability();
  } catch (error) {
    loadingState.textContent = "Impossible de charger les conférences. Veuillez actualiser la page ou contacter ssb3rd@gmail.com.";
  }
}

const requiredFields = ["conference", "firstName", "familyName", "email", "niveau", "filiere", "cne"];
function clearErrors() {
  requiredFields.forEach(name => {
    const el = document.getElementById(name);
    const error = document.getElementById(`error-${name}`);
    if (el) el.closest(".field")?.classList.remove("invalid");
    if (error) error.textContent = "";
  });
  formError.hidden = true;
  formError.textContent = "";
}
function setError(name, message) {
  const el = document.getElementById(name);
  if (el) el.closest(".field")?.classList.add("invalid");
  const error = document.getElementById(`error-${name}`);
  if (error) error.textContent = message;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  clearErrors();
  const values = Object.fromEntries(new FormData(form).entries());
  const errors = {};
  if (!values.conference) errors.conference = lang === "fr" ? "Veuillez choisir une conférence." : "Please choose a conference.";
  if (!values.firstName.trim()) errors.firstName = lang === "fr" ? "Champ obligatoire." : "This field is required.";
  if (!values.familyName.trim()) errors.familyName = lang === "fr" ? "Champ obligatoire." : "This field is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = lang === "fr" ? "Adresse e-mail invalide." : "Enter a valid email address.";
  if (!values.niveau) errors.niveau = lang === "fr" ? "Veuillez choisir un niveau." : "Choose a study level.";
  if (!values.filiere) errors.filiere = lang === "fr" ? "Veuillez choisir une filière." : "Choose a programme.";
  if (!values.cne.trim()) errors.cne = lang === "fr" ? "Champ obligatoire." : "This field is required.";
  const conference = selectedConference();
  if (conference && !conference.isOpen) errors.conference = lang === "fr" ? "Les inscriptions pour cette conférence sont fermées." : "Registration for this conference is closed.";
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([name, message]) => setError(name, message));
    return;
  }
  values.firstName = values.firstName.trim();
  values.familyName = values.familyName.trim();
  values.email = values.email.trim();
  values.phone = (values.phone || "").trim();
  values.cne = values.cne.trim();
  values.conferenceName = conference.name;
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = lang === "fr" ? "Envoi en cours…" : "Submitting…";
  try {
    const result = await callApi("register", values);
    if (result.error && result.field) {
      setError(result.field, result.error);
    } else if (result.error) {
      formError.textContent = result.error;
      formError.hidden = false;
    } else if (result.ok) {
      form.hidden = true;
      document.getElementById("success-state").hidden = false;
    }
  } catch (error) {
    formError.textContent = lang === "fr" ? "Erreur lors de l'enregistrement. Veuillez réessayer." : "Registration failed. Please try again.";
    formError.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = lang === "fr" ? "Envoyer l'inscription" : "Submit registration";
  }
});
document.getElementById("register-another").addEventListener("click", () => {
  form.reset();
  clearErrors();
  document.getElementById("success-state").hidden = true;
  form.hidden = false;
  showFormAvailability();
});
applyLanguage("fr");
init();
