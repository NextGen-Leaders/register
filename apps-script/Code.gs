/**
 * Shared registration backend for the four FSAC Master's programmes.
 *
 * Deploy as a Web App: Execute as Me; access Anyone.
 * Script Properties:
 *   ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SHEET_ID (optional),
 *   PREVENT_DUPLICATES ("true" by default)
 *
 * Sheets created automatically:
 *   Registrations, Conferences, Settings
 */
const REG_SHEET = "Registrations";
const CONF_SHEET = "Conferences";
const SETTINGS_SHEET = "Settings";
const REG_HEADERS = ["Time", "Conference ID", "Conference", "First Name", "Family Name", "E-mail", "Phone", "Niveau d'étude", "Filière", "CNE", "Presence"];
const CONF_HEADERS = ["ID", "Name", "Date", "Description", "Open", "Created"];
const SESSION_SECONDS = 6 * 60 * 60;

function doPost(e) {
  let data;
  try { data = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (_) { return jsonResponse({ error: "Invalid request." }); }
  try {
    switch (data.action) {
      case "getPublicData": return jsonResponse(getPublicData());
      case "register": return jsonResponse(handleRegister(data));
      case "adminLogin": return jsonResponse(handleAdminLogin(data));
      case "adminDashboard": return jsonResponse(handleAdminDashboard(data));
      case "setRegistrationOpen": return jsonResponse(setRegistrationOpen(data));
      case "addConference": return jsonResponse(addConference(data));
      case "setConferenceOpen": return jsonResponse(setConferenceOpen(data));
      case "setPresence": return jsonResponse(setPresence(data));
      case "adminSaveMember": return jsonResponse(adminSaveMember(data));
      case "logout": return jsonResponse(handleLogout(data));
      default: return jsonResponse({ error: "Unknown action." });
    }
  } catch (err) {
    return jsonResponse({ error: err && err.message ? err.message : "Unexpected server error." });
  }
}
function doGet() { return jsonResponse({ ok: true, message: "FSAC registration API is running." }); }
function jsonResponse(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Set SHEET_ID in Apps Script properties or bind this script to a spreadsheet.");
  return ss;
}
function ensureSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    const existing = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0];
    headers.forEach((header, i) => { if (!String(existing[i] || "").trim()) sheet.getRange(1, i + 1).setValue(header); });
  }
  return sheet;
}
function getRegistrationSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(REG_SHEET);
  if (sheet && sheet.getLastRow() > 0) {
    const oldHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(v => String(v || "").trim());
    // Migrate the earlier eight-column registration sheet without losing old entries.
    if (oldHeaders[1] === "First Name" && oldHeaders[2] === "Family Name" && oldHeaders[1] !== "Conference ID") {
      const oldRows = sheet.getDataRange().getValues();
      const migrated = [REG_HEADERS];
      for (let i = 1; i < oldRows.length; i++) {
        const r = oldRows[i];
        if (!r[1] && !r[2] && !r[3] && !r[6]) continue;
        migrated.push([r[0] || "", "", "", r[1] || "", r[2] || "", r[3] || "", "", r[4] || "", r[5] || "", r[6] || "", r[7] || "No"]);
      }
      sheet.clearContents();
      sheet.getRange(1, 1, migrated.length, REG_HEADERS.length).setValues(migrated);
      return sheet;
    }
  }
  return ensureSheet(REG_SHEET, REG_HEADERS);
}
function getConferenceSheet() { return ensureSheet(CONF_SHEET, CONF_HEADERS); }
function getSettingsSheet() {
  const sheet = ensureSheet(SETTINGS_SHEET, ["Key", "Value"]);
  if (!getSetting_("REGISTRATION_OPEN")) setSetting_("REGISTRATION_OPEN", "true");
  return sheet;
}
function getSetting_(key) {
  const sheet = ensureSheet(SETTINGS_SHEET, ["Key", "Value"]);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === key) return String(rows[i][1]);
  return "";
}
function setSetting_(key, value) {
  const sheet = ensureSheet(SETTINGS_SHEET, ["Key", "Value"]);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) { sheet.getRange(i + 1, 2).setValue(String(value)); return; }
  }
  sheet.appendRow([key, String(value)]);
}
function boolValue(value) { return value === true || String(value).toLowerCase() === "true"; }
function getConferences_() {
  const sheet = getConferenceSheet();
  const rows = sheet.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0] || !rows[i][1]) continue;
    out.push({ id: String(rows[i][0]), name: String(rows[i][1]), date: String(rows[i][2] || ""), description: String(rows[i][3] || ""), isOpen: boolValue(rows[i][4]), created: String(rows[i][5] || "") });
  }
  return out;
}
function getPublicData() {
  getSettingsSheet(); getRegistrationSheet();
  return { ok: true, registrationOpen: getSetting_("REGISTRATION_OPEN") !== "false", conferences: getConferences_().map(c => ({ id: c.id, name: c.name, date: c.date, description: c.description, isOpen: c.isOpen })) };
}
function handleRegister(data) {
  const values = {
    conferenceId: String(data.conference || data.conferenceId || "").trim(),
    conferenceName: String(data.conferenceName || "").trim(),
    firstName: String(data.firstName || "").trim(),
    familyName: String(data.familyName || "").trim(),
    email: String(data.email || "").trim(),
    phone: String(data.phone || "").trim(),
    niveau: String(data.niveau || "").trim(),
    filiere: String(data.filiere || "").trim(),
    cne: String(data.cne || "").trim()
  };
  const required = ["conferenceId", "firstName", "familyName", "email", "niveau", "filiere", "cne"];
  for (const key of required) if (!values[key]) return { field: key === "conferenceId" ? "conference" : key, error: "Ce champ est obligatoire." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { field: "email", error: "Adresse e-mail invalide." };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSettingsSheet();
    if (getSetting_("REGISTRATION_OPEN") === "false") return { error: "Les inscriptions aux conférences sont actuellement fermées." };
    const conference = getConferences_().find(c => c.id === values.conferenceId);
    if (!conference) return { field: "conference", error: "Cette conférence n'existe plus. Actualisez la page." };
    if (!conference.isOpen) return { field: "conference", error: "Les inscriptions pour cette conférence sont fermées." };
    values.conferenceName = conference.name;
    const sheet = getRegistrationSheet();
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty("PREVENT_DUPLICATES") !== "false") {
      const rows = sheet.getDataRange().getValues();
      const email = values.email.toLowerCase(), cne = values.cne.toLowerCase();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][5] || "").trim().toLowerCase() === email) return { field: "email", error: "Une inscription avec cette adresse e-mail existe déjà." };
        if (String(rows[i][9] || "").trim().toLowerCase() === cne) return { field: "cne", error: "Une inscription avec ce CNE existe déjà." };
      }
    }
    const time = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([time, values.conferenceId, values.conferenceName, values.firstName, values.familyName, values.email, values.phone, values.niveau, values.filiere, values.cne, "No"]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function sha256Hex(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}
// Run once from the editor to generate the hash for the password set below.
// Remove or change the sample password before using this helper.
function hashPasswordForSetup() { Logger.log(sha256Hex("CHANGE_THIS_PASSWORD")); }
function handleAdminLogin(data) {
  const props = PropertiesService.getScriptProperties();
  const username = String(data.username || "").trim();
  const password = String(data.password || "");
  const expectedUsername = props.getProperty("ADMIN_USERNAME");
  const expectedHash = props.getProperty("ADMIN_PASSWORD_HASH");
  if (!expectedUsername || !expectedHash) return { error: "Configuration administrateur manquante. Définissez ADMIN_USERNAME et ADMIN_PASSWORD_HASH." };
  if (username !== expectedUsername || sha256Hex(password) !== expectedHash) {
    Utilities.sleep(700); return { error: "Identifiants incorrects." };
  }
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("session_" + token, username, SESSION_SECONDS);
  return { ok: true, token: token };
}
function isValidSession_(token) { return !!token && !!CacheService.getScriptCache().get("session_" + token); }
function requireAdmin_(data) { return isValidSession_(data.token) ? null : { error: "Session expirée. Veuillez vous reconnecter.", authError: true }; }
function handleLogout(data) {
  if (data.token) CacheService.getScriptCache().remove("session_" + data.token);
  return { ok: true };
}
function setRegistrationOpen(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  setSetting_("REGISTRATION_OPEN", boolValue(data.isOpen) ? "true" : "false");
  return { ok: true, registrationOpen: boolValue(data.isOpen) };
}
function addConference(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  const name = String(data.name || "").trim();
  if (!name) return { error: "Le titre de la conférence est obligatoire." };
  if (name.length > 180) return { error: "Le titre est trop long." };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = getConferenceSheet();
    const id = Utilities.getUuid();
    const isOpen = boolValue(data.isOpen);
    sheet.appendRow([id, name, String(data.date || "").trim(), String(data.description || "").trim(), isOpen ? "true" : "false", Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss")]);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}
function setConferenceOpen(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  const id = String(data.id || "");
  const sheet = getConferenceSheet(); const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 5).setValue(boolValue(data.isOpen) ? "true" : "false");
      return { ok: true, id: id, isOpen: boolValue(data.isOpen) };
    }
  }
  return { error: "Conférence introuvable." };
}
function setPresence(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  const rowNumber = Number(data.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) return { error: "Participant introuvable." };
  const sheet = getRegistrationSheet();
  if (rowNumber > sheet.getLastRow()) return { error: "Participant introuvable. Actualisez la liste." };
  const present = boolValue(data.present);
  sheet.getRange(rowNumber, 11).setValue(present ? "Yes" : "No");
  return { ok: true, rowNumber: rowNumber, presence: present ? "Yes" : "No" };
}
function adminSaveMember(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  const firstName = String(data.firstName || "").trim();
  const familyName = String(data.familyName || "").trim();
  const email = String(data.email || "").trim();
  const phone = String(data.phone || "").trim();
  const conferenceId = String(data.conferenceId || "").trim();
  const niveau = String(data.niveau || "").trim();
  const filiere = String(data.filiere || "").trim();
  const cne = String(data.cne || "").trim();
  const rowNumber = Number(data.rowNumber || 0);
  if (!firstName || !familyName) return { error: "Le prénom et le nom sont obligatoires." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  let conferenceName = "";
  if (conferenceId) {
    const conference = getConferences_().find(c => c.id === conferenceId);
    if (!conference) return { error: "Conférence introuvable. Actualisez la page." };
    conferenceName = conference.name;
  }
  const sheet = getRegistrationSheet();
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (rowNumber) {
      if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) return { error: "Participant introuvable. Actualisez la liste." };
      const existing = sheet.getRange(rowNumber, 1, 1, REG_HEADERS.length).getValues()[0];
      sheet.getRange(rowNumber, 2, 1, 9).setValues([[conferenceId, conferenceName, firstName, familyName, email, phone, niveau, filiere, cne]]);
      return { ok: true, mode: "updated", rowNumber: rowNumber, presence: String(existing[10] || "No") };
    }
    const time = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([time, conferenceId, conferenceName, firstName, familyName, email, phone, niveau, filiere, cne, "No"]);
    return { ok: true, mode: "created", rowNumber: sheet.getLastRow(), presence: "No" };
  } finally { lock.releaseLock(); }
}
function handleAdminDashboard(data) {
  const auth = requireAdmin_(data); if (auth) return auth;
  getSettingsSheet(); const sheet = getRegistrationSheet();
  const rows = sheet.getDataRange().getValues(); const registrations = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (!r[0] && !r[3] && !r[4] && !r[9]) continue;
    registrations.push({ rowNumber: i + 1, time: String(r[0] || ""), conferenceId: String(r[1] || ""), conferenceName: String(r[2] || ""), firstName: String(r[3] || ""), familyName: String(r[4] || ""), email: String(r[5] || ""), phone: String(r[6] || ""), niveau: String(r[7] || ""), filiere: String(r[8] || ""), cne: String(r[9] || ""), presence: String(r[10] || "No") });
  }
  registrations.reverse();
  return { ok: true, registrationOpen: getSetting_("REGISTRATION_OPEN") !== "false", conferences: getConferences_(), registrations: registrations };
}
