import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    // Dev mode without service account — credit enforcement is skipped
    return null;
  }

  try {
    const json = JSON.parse(raw);
    return initializeApp({ credential: cert(json) });
  } catch {
    console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT — check the JSON format");
    return null;
  }
}

export function adminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function adminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export { FieldValue };
