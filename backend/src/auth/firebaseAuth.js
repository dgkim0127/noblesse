import admin from "firebase-admin";
import { internalError } from "../utils/errors.js";

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : "";
}

export function getFirebaseCredentialMode(env) {
  if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
    return "service-account";
  }
  if (env.firebaseProjectId) {
    return "application-default";
  }
  return "missing";
}

export function createFirebaseTokenVerifier(env, adminModule = admin) {
  if (getFirebaseCredentialMode(env) === "missing") {
    return {
      async verifyIdToken() {
        throw internalError("Firebase Admin credentials are not configured.");
      }
    };
  }

  const app = getFirebaseAdminApp(env, adminModule);

  return {
    verifyIdToken(token) {
      return app.auth().verifyIdToken(token);
    }
  };
}

export function getFirebaseAdminApp(env, adminModule = admin) {
  const appName = "noblesse-backend";
  const existing = adminModule.apps.find((app) => app.name === appName);
  const credentialMode = getFirebaseCredentialMode(env);
  const credential =
    credentialMode === "service-account"
      ? adminModule.credential.cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: normalizePrivateKey(env.firebasePrivateKey)
        })
      : adminModule.credential.applicationDefault();

  return (
    existing ||
    adminModule.initializeApp(
      {
        credential,
        projectId: env.firebaseProjectId
      },
      appName
    )
  );
}

export function createFirebaseUserLookup(env, adminModule = admin) {
  if (getFirebaseCredentialMode(env) === "missing") {
    return {
      async getUserByEmail() {
        throw internalError("Firebase Admin credentials are not configured.");
      }
    };
  }

  const app = getFirebaseAdminApp(env, adminModule);
  return {
    getUserByEmail(email) {
      return app.auth().getUserByEmail(email);
    }
  };
}
