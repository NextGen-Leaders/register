# FSAC — Registration website for four Master's programmes

## Included
- Public registration page with the pink/magenta + navy palette inspired by the supplied flyer (not breast-cancer-specific).
- Master logo row in this order: ICOA, SSB, FSAC, SBQ, EMGBR.
- SSB logo links to https://masterssb3rd.github.io/MasterSSB/
- Coordinator details beneath the form.
- Admin login/dashboard: global registration switch, add conferences, open/close each conference, search participants by first name, family name, or e-mail, mark attendance, edit participant records, and manually add walk-ins or people who registered by e-mail.
- Google Apps Script backend that stores conferences, settings and registrations in Google Sheets.

## Add the four Master logos
Place these files in `assets/img/`:
- `icoa.logo.png`
- `ssb.logo.png`
- `sbq.logo.png`
- `emgbr.logo.png`

The FSAC logo supplied with this project is already at `assets/img/fsac.logo.jpg`.
The four missing logo images display text placeholders until you add them.

## Deploy the backend
1. Create or open the Google Sheet that should receive registrations.
2. Open Extensions → Apps Script and paste the complete contents of `apps-script/Code.gs`.
3. In Apps Script Project Settings → Script Properties, set:
   - `SHEET_ID` = the spreadsheet ID (recommended)
   - `ADMIN_USERNAME` = your chosen admin username
   - `ADMIN_PASSWORD_HASH` = SHA-256 hash of your admin password
   - `PREVENT_DUPLICATES` = `true` (optional; this prevents repeated email/CNE registrations across all conferences)
4. To generate a password hash, temporarily replace `CHANGE_THIS_PASSWORD` in `hashPasswordForSetup()` with the desired password, run that function, and copy the logged hash into `ADMIN_PASSWORD_HASH`. Then remove the password from the source and restore a safe placeholder. Do not use the old sample password.
5. Deploy → New deployment → Web app. Execute as **Me** and set access to **Anyone**. Copy the `/exec` URL into `assets/js/config.js` as `APPS_SCRIPT_URL`.
6. Deploy the website to GitHub Pages (or your static host). Preserve the folder structure.

## Update the Apps Script after replacing Code.gs
If the Apps Script Web App was already deployed, paste the updated `apps-script/Code.gs` into the existing Apps Script project, save it, then use **Deploy → Manage deployments → Edit** (pencil icon), select **New version**, and click **Deploy**. The existing `/exec` URL normally stays the same when updating that deployment. The new admin actions `setPresence` and `adminSaveMember` will not work against an older deployed version.

## First use
- Sign into `/admin/`.
- Switch global registration on/off.
- Add one or more conferences. Each conference appears automatically in the public form.
- A conference marked closed remains visible in the list but its applicant fields are replaced by a closed notice.
- If global registration is off, the public page shows the overall closed message.

## Notes
- The Filière dropdown contains a broad list of FSAC study areas and known programmes plus an “Autre formation FSAC” option. Confirm/update it against the current official offer at https://fsac.univh2c.ma/front/tabs.html?page=formations before publishing; the FSAC site page does not provide a single static list in the page's visible announcement section.
- This is a static front end with Apps Script as the API. Admin credentials must be configured in Script Properties; the site does not ship with an admin password.
