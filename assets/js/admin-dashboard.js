const token = sessionStorage.getItem("admin_token");
if (!token) location.href = "index.html";
const errorBox = document.getElementById("dash-error");
const globalOpen = document.getElementById("global-open");
const globalStatus = document.getElementById("global-status");
const conferenceList = document.getElementById("conference-list");
const registrationRows = document.getElementById("registration-rows");
const registrationCount = document.getElementById("registration-count");
const memberSearch = document.getElementById("member-search");
const memberForm = document.getElementById("member-form");
const memberConference = document.getElementById("member-conference");
const noMembersResults = document.getElementById("no-members-results");
let allRegistrations = [];
let allConferences = [];

function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }
function makeButton(text, cls, callback) {
  const button = document.createElement("button");
  button.type = "button"; button.className = `admin-button ${cls || ""}`.trim(); button.textContent = text;
  button.addEventListener("click", callback); return button;
}
function addCell(row, value) {
  const td = document.createElement("td"); td.textContent = value || "—"; row.appendChild(td); return td;
}
function renderGlobal(isOpen) {
  globalOpen.checked = isOpen;
  globalStatus.textContent = isOpen ? "Ouvertes" : "Fermées";
  globalStatus.className = `status-pill ${isOpen ? "open" : "closed"}`;
}
function renderConferences(conferences) {
  conferenceList.replaceChildren();
  if (!conferences.length) {
    const p = document.createElement("p"); p.className = "muted"; p.textContent = "Aucune conférence ajoutée. Utilisez le formulaire ci-dessus."; conferenceList.appendChild(p); return;
  }
  conferences.forEach(c => {
    const item = document.createElement("article"); item.className = "conference-item";
    const info = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = c.name; info.appendChild(title);
    const meta = document.createElement("p"); meta.textContent = [c.date, c.description].filter(Boolean).join(" · ") || "Aucun détail supplémentaire"; info.appendChild(meta);
    const actions = document.createElement("div"); actions.className = "conference-item-actions";
    const status = document.createElement("span"); status.className = `status-pill ${c.isOpen ? "open" : "closed"}`; status.textContent = c.isOpen ? "Ouverte" : "Fermée"; actions.appendChild(status);
    actions.appendChild(makeButton(c.isOpen ? "Fermer les inscriptions" : "Ouvrir les inscriptions", c.isOpen ? "danger" : "", async () => {
      try { const result = await callApi("setConferenceOpen", { token, id: c.id, isOpen: !c.isOpen }); if (result.error) throw new Error(result.error); await loadDashboard(); }
      catch (e) { showError(e.message || "Impossible de modifier la conférence."); }
    }));
    item.append(info, actions); conferenceList.appendChild(item);
  });
}
function populateConferenceOptions(selectedId = "") {
  memberConference.replaceChildren();
  const empty = document.createElement("option"); empty.value = ""; empty.textContent = "Aucune conférence précisée"; memberConference.appendChild(empty);
  allConferences.forEach(c => {
    const option = document.createElement("option"); option.value = c.id; option.textContent = c.name;
    if (c.id === selectedId) option.selected = true;
    memberConference.appendChild(option);
  });
}
function renderRegistrations() {
  const query = memberSearch.value.trim().toLocaleLowerCase();
  const filtered = allRegistrations.filter(r => {
    const haystack = [r.firstName, r.familyName, r.email].join(" ").toLocaleLowerCase();
    return !query || haystack.includes(query);
  });
  registrationRows.replaceChildren();
  registrationCount.textContent = `${filtered.length} / ${allRegistrations.length} participant${allRegistrations.length !== 1 ? "s" : ""}`;
  noMembersResults.hidden = filtered.length !== 0;
  filtered.forEach(r => {
    const tr = document.createElement("tr");
    addCell(tr, r.time); addCell(tr, r.conferenceName); addCell(tr, r.firstName); addCell(tr, r.familyName);
    addCell(tr, r.email); addCell(tr, r.phone); addCell(tr, r.niveau); addCell(tr, r.filiere); addCell(tr, r.cne);
    const presenceCell = document.createElement("td");
    const isPresent = String(r.presence || "No").toLowerCase() === "yes" || String(r.presence || "").toLowerCase() === "oui";
    const presence = document.createElement("span"); presence.className = `status-pill ${isPresent ? "open" : "closed"}`; presence.textContent = isPresent ? "Présent" : "Absent / non marqué"; presenceCell.appendChild(presence); tr.appendChild(presenceCell);
    const actionsCell = document.createElement("td"); actionsCell.className = "member-actions-cell";
    actionsCell.appendChild(makeButton(isPresent ? "Marquer absent" : "Marquer présent", isPresent ? "secondary" : "", async () => {
      try {
        const result = await callApi("setPresence", { token, rowNumber: r.rowNumber, present: !isPresent });
        if (result.error) throw new Error(result.error);
        const target = allRegistrations.find(x => x.rowNumber === r.rowNumber); if (target) target.presence = result.presence;
        renderRegistrations();
      } catch (e) { showError(e.message || "Impossible de modifier la présence."); }
    }));
    actionsCell.appendChild(makeButton("Modifier", "secondary", () => openMemberForm(r)));
    tr.appendChild(actionsCell); registrationRows.appendChild(tr);
  });
}
function resetMemberForm() {
  memberForm.reset();
  document.getElementById("member-row-number").value = "";
  document.getElementById("member-form-title").textContent = "Ajouter un participant manuellement";
  document.getElementById("save-member-button").textContent = "Enregistrer le participant";
  populateConferenceOptions();
}
function openMemberForm(member = null) {
  clearError(); resetMemberForm();
  if (member) {
    document.getElementById("member-row-number").value = String(member.rowNumber);
    document.getElementById("member-first-name").value = member.firstName || "";
    document.getElementById("member-family-name").value = member.familyName || "";
    document.getElementById("member-email").value = member.email || "";
    document.getElementById("member-phone").value = member.phone || "";
    document.getElementById("member-niveau").value = member.niveau || "";
    document.getElementById("member-filiere").value = member.filiere || "";
    document.getElementById("member-cne").value = member.cne || "";
    populateConferenceOptions(member.conferenceId || "");
    document.getElementById("member-form-title").textContent = "Modifier les informations du participant";
    document.getElementById("save-member-button").textContent = "Enregistrer les modifications";
  }
  memberForm.hidden = false;
  memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("member-first-name").focus({ preventScroll: true });
}
function closeMemberForm() { memberForm.hidden = true; resetMemberForm(); }
async function loadDashboard() {
  clearError();
  try {
    const data = await callApi("adminDashboard", { token });
    if (data.authError) { sessionStorage.removeItem("admin_token"); location.href = "index.html"; return; }
    if (data.error) throw new Error(data.error);
    renderGlobal(data.registrationOpen);
    allConferences = data.conferences || [];
    renderConferences(allConferences);
    allRegistrations = data.registrations || [];
    populateConferenceOptions();
    renderRegistrations();
  } catch (e) { showError(e.message || "Impossible de charger le tableau de bord."); }
}
globalOpen.addEventListener("change", async () => {
  try {
    const result = await callApi("setRegistrationOpen", { token, isOpen: globalOpen.checked });
    if (result.error) throw new Error(result.error);
    renderGlobal(result.registrationOpen);
  } catch (e) { showError(e.message || "Impossible de modifier le statut."); globalOpen.checked = !globalOpen.checked; }
});
document.getElementById("conference-form").addEventListener("submit", async event => {
  event.preventDefault(); clearError();
  const button = document.getElementById("add-conference-button");
  button.disabled = true; button.textContent = "Ajout…";
  try {
    const result = await callApi("addConference", {
      token,
      name: document.getElementById("conference-name").value.trim(),
      date: document.getElementById("conference-date").value.trim(),
      description: document.getElementById("conference-description").value.trim(),
      isOpen: document.getElementById("new-conference-open").checked
    });
    if (result.error) throw new Error(result.error);
    event.target.reset(); document.getElementById("new-conference-open").checked = true;
    await loadDashboard();
  } catch (e) { showError(e.message || "Impossible d'ajouter la conférence."); }
  finally { button.disabled = false; button.textContent = "+ Ajouter la conférence"; }
});
document.getElementById("show-member-form").addEventListener("click", () => {
  if (memberForm.hidden) openMemberForm(); else closeMemberForm();
});
document.getElementById("cancel-member-form").addEventListener("click", closeMemberForm);
memberSearch.addEventListener("input", renderRegistrations);
memberForm.addEventListener("submit", async event => {
  event.preventDefault(); clearError();
  const button = document.getElementById("save-member-button");
  const originalText = button.textContent; button.disabled = true; button.textContent = "Enregistrement…";
  const rowValue = document.getElementById("member-row-number").value;
  try {
    const result = await callApi("adminSaveMember", {
      token,
      rowNumber: rowValue ? Number(rowValue) : 0,
      firstName: document.getElementById("member-first-name").value.trim(),
      familyName: document.getElementById("member-family-name").value.trim(),
      email: document.getElementById("member-email").value.trim(),
      phone: document.getElementById("member-phone").value.trim(),
      conferenceId: memberConference.value,
      niveau: document.getElementById("member-niveau").value.trim(),
      filiere: document.getElementById("member-filiere").value.trim(),
      cne: document.getElementById("member-cne").value.trim()
    });
    if (result.authError) { sessionStorage.removeItem("admin_token"); location.href = "index.html"; return; }
    if (result.error) throw new Error(result.error);
    closeMemberForm(); await loadDashboard();
  } catch (e) { showError(e.message || "Impossible d'enregistrer le participant."); }
  finally { button.disabled = false; button.textContent = originalText; }
});
document.getElementById("refresh-button").addEventListener("click", loadDashboard);
document.getElementById("logout-button").addEventListener("click", async () => {
  try { await callApi("logout", { token }); } catch (_) {}
  sessionStorage.removeItem("admin_token"); location.href = "index.html";
});
loadDashboard();
