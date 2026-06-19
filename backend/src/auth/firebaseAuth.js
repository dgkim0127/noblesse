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

  const app = getFirebaseAdminApp(env);

  return {
    verifyIdToken(token) {
      return app.auth().verifyIdToken(token);
    }
  };
}

export function getFirebaseAdminApp(env) {
  const appName = "noblesse-backend";
  const existing = admin.apps.find((app) => app.name === appName);
  return (
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
    )
  );
}

export function createFirebaseUserLookup(env) {
  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    return {
      async getUserByEmail() {
        throw internalError("Firebase Admin credentials are not configured.");
      }
    };
  }

  const app = getFirebaseAdminApp(env);
  return {
    getUserByEmail(email) {
      return app.auth().getUserByEmail(email);
    }
  };
}
