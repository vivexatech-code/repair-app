const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const sa = parseServiceAccount();
  if (!sa) {
    throw new Error(
      'Missing FIREBASE_SERVICE_ACCOUNT_JSON (paste service account JSON or base64 on Vercel)',
    );
  }
  return initializeApp({
    credential: cert(sa),
    projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
  });
}

function getDb() {
  getAdminApp();
  return getFirestore();
}

function getFcm() {
  getAdminApp();
  return getMessaging();
}

module.exports = { getDb, getFcm, parseServiceAccount };
