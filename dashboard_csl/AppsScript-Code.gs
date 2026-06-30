/**
 * Jwar-code — Backend de comptes utilisateurs (Google Apps Script)
 * ------------------------------------------------------------------
 * Ce script joue le rôle de petit serveur gratuit. Il stocke les comptes
 * (pseudo, mail, mot de passe haché) dans une feuille Google Sheets nommée
 * "iduser_account", qui se trouve dans TON Google Drive.
 *
 * Installation : voir README-dashboard-deploiement.md
 *
 * Actions exposées (POST en text/plain, body JSON) :
 *   - { action: "register", pseudo, email, password }
 *   - { action: "login",    email, password }
 *
 * Réponses JSON : { ok: true, user: {pseudo, email} } ou { ok:false, error:"..." }
 */

const SHEET_NAME = "iduser_account";
const SALT = "jwarcode-v1"; // simple sel statique — suffisant pour une démo, pas pour un vrai service sensible

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id", "pseudo", "email", "password_hash", "created_at"]);
  }
  return sheet;
}

function hashPassword_(password) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    SALT + password,
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ((b < 0 ? b + 256 : b).toString(16).padStart(2, "0"))).join("");
}

function findUserRow_(sheet, email) {
  const data = sheet.getDataRange().getValues();
  const emailLower = String(email).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() === emailLower) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: "requete_invalide" });
  }

  const action = body.action;
  const sheet = getSheet_();

  if (action === "register") {
    const pseudo = String(body.pseudo || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!pseudo || !email || !password) {
      return jsonOut_({ ok: false, error: "champs_manquants" });
    }
    if (findUserRow_(sheet, email)) {
      return jsonOut_({ ok: false, error: "deja_inscrit" });
    }

    const id = Utilities.getUuid();
    sheet.appendRow([id, pseudo, email, hashPassword_(password), new Date().toISOString()]);
    return jsonOut_({ ok: true, user: { pseudo: pseudo, email: email } });
  }

  if (action === "login") {
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return jsonOut_({ ok: false, error: "champs_manquants" });
    }
    const found = findUserRow_(sheet, email);
    if (!found) {
      return jsonOut_({ ok: false, error: "utilisateur_introuvable" });
    }
    const expectedHash = found.row[3];
    if (hashPassword_(password) !== expectedHash) {
      return jsonOut_({ ok: false, error: "mot_de_passe_incorrect" });
    }
    return jsonOut_({ ok: true, user: { pseudo: found.row[1], email: found.row[2] } });
  }

  return jsonOut_({ ok: false, error: "action_inconnue" });
}

function doGet(e) {
  return jsonOut_({ ok: true, message: "Backend Jwar-code actif. Utilise POST pour register/login." });
}
