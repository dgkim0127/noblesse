import admin from "firebase-admin";
import { internalError } from "../utils/errors.js";

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : "";
}

export function createFirebaseTokenVerifier(env) {
  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    return {
      async verifyIdToken() {
        throw internalError("Firebase Admin credentials are not configured.");
      }
    };
  }

  const appName = "noblesse-backend";
  const existing = admin.apps.find((app) => app.name === appName);
  const app =
    existing ||
    admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: normalizePrivateKey(env.firebasePrivateKey)
        })
      },
      appName
    );

  return {
    verifyIdToken(token) {
      return app.auth().verifyIdToken(token);
    }
  };
}
