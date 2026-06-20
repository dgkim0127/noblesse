import assert from "node:assert/strict";
import test from "node:test";
import {
  createFirebaseTokenVerifier,
  createFirebaseUserLookup,
  getFirebaseAdminApp,
  getFirebaseCredentialMode
} from "../src/auth/firebaseAuth.js";

function createFakeAdminModule() {
  const calls = [];
  const auth = {
    verifyIdToken(token) {
      calls.push({ type: "verifyIdToken", token });
      return { uid: "uid-1" };
    },
    getUserByEmail(email) {
      calls.push({ type: "getUserByEmail", email });
      return { uid: "uid-2" };
    }
  };
  return {
    calls,
    apps: [],
    credential: {
      cert(input) {
        calls.push({ type: "cert", input });
        return { mode: "service-account" };
      },
      applicationDefault() {
        calls.push({ type: "applicationDefault" });
        return { mode: "application-default" };
      }
    },
    initializeApp(options, name) {
      calls.push({ type: "initializeApp", options, name });
      const app = { name, auth: () => auth };
      this.apps.push(app);
      return app;
    }
  };
}

test("getFirebaseCredentialMode prefers explicit service account credentials", () => {
  assert.equal(
    getFirebaseCredentialMode({
      firebaseProjectId: "project-1",
      firebaseClientEmail: "client@example.test",
      firebasePrivateKey: "key"
    }),
    "service-account"
  );
});

test("getFirebaseCredentialMode allows Cloud Run ADC with project id", () => {
  assert.equal(
    getFirebaseCredentialMode({
      firebaseProjectId: "pors-piercing-pos"
    }),
    "application-default"
  );
});

test("getFirebaseAdminApp initializes with application default credentials", () => {
  const fakeAdmin = createFakeAdminModule();
  const app = getFirebaseAdminApp({ firebaseProjectId: "pors-piercing-pos" }, fakeAdmin);

  assert.equal(app.name, "noblesse-backend");
  assert.equal(fakeAdmin.calls.some((call) => call.type === "applicationDefault"), true);
  assert.equal(fakeAdmin.calls.some((call) => call.type === "cert"), false);
  const initializeCall = fakeAdmin.calls.find((call) => call.type === "initializeApp");
  assert.equal(initializeCall.options.projectId, "pors-piercing-pos");
});

test("token verifier uses ADC app when service account key is not configured", async () => {
  const fakeAdmin = createFakeAdminModule();
  const verifier = createFirebaseTokenVerifier(
    { firebaseProjectId: "pors-piercing-pos" },
    fakeAdmin
  );

  const decoded = await verifier.verifyIdToken("token-1");

  assert.equal(decoded.uid, "uid-1");
  assert.equal(fakeAdmin.calls.some((call) => call.type === "verifyIdToken"), true);
});

test("Firebase user lookup uses ADC app when service account key is not configured", async () => {
  const fakeAdmin = createFakeAdminModule();
  const lookup = createFirebaseUserLookup({ firebaseProjectId: "pors-piercing-pos" }, fakeAdmin);

  const user = await lookup.getUserByEmail("admin@example.test");

  assert.equal(user.uid, "uid-2");
  assert.equal(fakeAdmin.calls.some((call) => call.type === "getUserByEmail"), true);
});

test("Firebase verifier fails closed when project id is missing", async () => {
  const verifier = createFirebaseTokenVerifier({});

  await assert.rejects(() => verifier.verifyIdToken("token-1"), /not configured/);
});
