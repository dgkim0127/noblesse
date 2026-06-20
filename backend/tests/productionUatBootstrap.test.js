import assert from "node:assert/strict";
import test from "node:test";
import { createProductionUatBootstrapQueries } from "../src/db/queries/productionUatBootstrapQueries.js";
import {
  createProductionUatBootstrapService,
  validateProductionUatBootstrapEnv
} from "../src/services/productionUatBootstrapService.js";

const adminEmail = "admin@example.test";
const buyerEmail = "buyer@example.test";
const adminUid = "firebase-admin-uid";
const buyerUid = "firebase-buyer-uid";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_PRODUCTION_UAT_BOOTSTRAP_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    NOBLESSE_PROD_UAT_ADMIN_EMAIL: adminEmail,
    NOBLESSE_PROD_UAT_BUYER_EMAIL: buyerEmail,
    ...overrides
  };
}

function createService({
  source = productionSource(),
  firebaseErrorByEmail = {},
  firebaseUsers = {
    [adminEmail]: { uid: adminUid },
    [buyerEmail]: { uid: buyerUid }
  },
  queryResult = {
    ok: true,
    category: "PRODUCTION_UAT_BOOTSTRAP_COMPLETE",
    adminReady: true,
    buyerReady: true,
    buyerProfileReady: true,
    adminAlreadyReady: false,
    buyerAlreadyReady: false
  }
} = {}) {
  const calls = [];
  const service = createProductionUatBootstrapService({
    source,
    firebaseUserLookup: {
      async getUserByEmail(email) {
        calls.push({ type: "firebaseLookup", email });
        if (firebaseErrorByEmail[email]) throw firebaseErrorByEmail[email];
        return firebaseUsers[email];
      }
    },
    queries: {
      async bootstrapAccounts(input) {
        calls.push({ type: "bootstrapAccounts", input });
        return queryResult;
      }
    }
  });
  return { calls, service };
}

test("production UAT bootstrap env rejects missing ALLOW", () => {
  const result = validateProductionUatBootstrapEnv(
    productionSource({ NOBLESSE_PRODUCTION_UAT_BOOTSTRAP_ALLOW: "" })
  );
  assert.deepEqual(result, { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" });
});

test("production UAT bootstrap env rejects non-production runtime", () => {
  const result = validateProductionUatBootstrapEnv(
    productionSource({ NOBLESSE_RUNTIME_ENV: "staging" })
  );
  assert.deepEqual(result, { ok: false, category: "NON_PRODUCTION_RUNTIME" });
});

test("production UAT bootstrap env rejects identical admin and buyer emails", () => {
  const result = validateProductionUatBootstrapEnv(
    productionSource({ NOBLESSE_PROD_UAT_BUYER_EMAIL: adminEmail.toUpperCase() })
  );
  assert.deepEqual(result, { ok: false, category: "IDENTICAL_EMAILS_REJECTED" });
});

test("production UAT bootstrap reports missing admin Firebase user without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseErrorByEmail: { [adminEmail]: { code: "auth/user-not-found" } }
  });

  const result = await service.bootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_FIREBASE_USER_NOT_FOUND");
  assert.equal(result.adminFirebaseUserFound, false);
  assert.equal(calls.some((call) => call.type === "bootstrapAccounts"), false);
});

test("production UAT bootstrap reports missing buyer Firebase user without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseErrorByEmail: { [buyerEmail]: { code: "auth/user-not-found" } }
  });

  const result = await service.bootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "BUYER_FIREBASE_USER_NOT_FOUND");
  assert.equal(result.adminFirebaseUserFound, true);
  assert.equal(result.buyerFirebaseUserFound, false);
  assert.equal(calls.some((call) => call.type === "bootstrapAccounts"), false);
});

test("production UAT bootstrap passes sanitized identities to query layer", async () => {
  const { calls, service } = createService({
    source: productionSource({
      NOBLESSE_PROD_UAT_ADMIN_EMAIL: "  ADMIN@example.TEST  ",
      NOBLESSE_PROD_UAT_BUYER_EMAIL: "  BUYER@example.TEST  "
    })
  });

  const result = await service.bootstrap();
  const mutationCall = calls.find((call) => call.type === "bootstrapAccounts");

  assert.equal(result.ok, true);
  assert.deepEqual(mutationCall.input, {
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerIdentity: { authUid: buyerUid, email: buyerEmail }
  });
});

function createFakePool({
  adminUser,
  buyerUser,
  buyerProfile = { id: "buyer-profile-1" },
  failOn = ""
} = {}) {
  const calls = [];
  let releaseCount = 0;
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });

      if (failOn && normalized.includes(failOn)) throw new Error("fake query failure");
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };

      if (normalized.startsWith("select id, auth_uid") && params[0] === adminUid) {
        return { rows: adminUser ? [adminUser] : [] };
      }
      if (normalized.startsWith("select id, auth_uid") && params[0] === buyerUid) {
        return { rows: buyerUser ? [buyerUser] : [] };
      }
      if (normalized.startsWith("insert into public.users") && params[0] === adminUid) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
      }
      if (normalized.startsWith("insert into public.users") && params[0] === buyerUid) {
        return { rows: [{ id: "buyer-user-1", role: "buyer", status: "approved" }] };
      }
      if (normalized.startsWith("update public.users") && params[1] === adminUid) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
      }
      if (normalized.startsWith("update public.users") && params[1] === buyerUid) {
        return { rows: [{ id: "buyer-user-1", role: "buyer", status: "approved" }] };
      }
      if (normalized.startsWith("insert into public.buyers")) {
        return { rows: buyerProfile ? [buyerProfile] : [] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
    release() {
      releaseCount += 1;
    }
  };
  return {
    calls,
    get releaseCount() {
      return releaseCount;
    },
    pool: {
      async connect() {
        calls.push({ sql: "connect", params: [] });
        return client;
      }
    }
  };
}

function callTexts(calls) {
  return calls.map((call) => String(call.sql).toLowerCase());
}

test("production UAT query layer upserts admin and buyer with buyer profile", async () => {
  const fake = createFakePool();

  const result = await createProductionUatBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerIdentity: { authUid: buyerUid, email: buyerEmail }
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, true);
  assert.equal(result.adminReady, true);
  assert.equal(result.buyerReady, true);
  assert.equal(result.buyerProfileReady, true);
  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.users")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.buyers")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
});

test("production UAT query layer is idempotent for ready accounts", async () => {
  const fake = createFakePool({
    adminUser: {
      id: "admin-user-1",
      auth_uid: adminUid,
      email: adminEmail,
      role: "admin",
      status: "approved"
    },
    buyerUser: {
      id: "buyer-user-1",
      auth_uid: buyerUid,
      email: buyerEmail,
      role: "buyer",
      status: "approved"
    }
  });

  const result = await createProductionUatBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerIdentity: { authUid: buyerUid, email: buyerEmail }
  });

  assert.equal(result.ok, true);
  assert.equal(result.adminAlreadyReady, true);
  assert.equal(result.buyerAlreadyReady, true);
  assert.equal(result.adminReady, true);
  assert.equal(result.buyerReady, true);
});

test("production UAT query layer rejects buyer role conflict", async () => {
  const fake = createFakePool({
    buyerUser: {
      id: "buyer-user-1",
      auth_uid: buyerUid,
      email: buyerEmail,
      role: "admin",
      status: "approved"
    }
  });

  const result = await createProductionUatBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerIdentity: { authUid: buyerUid, email: buyerEmail }
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, false);
  assert.equal(result.category, "BUYER_ROLE_CONFLICT");
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.buyers")), false);
});

test("production UAT query layer rolls back on failure", async () => {
  const fake = createFakePool({ failOn: "insert into public.buyers" });

  await assert.rejects(
    () =>
      createProductionUatBootstrapQueries(fake.pool).bootstrapAccounts({
        adminIdentity: { authUid: adminUid, email: adminEmail },
        buyerIdentity: { authUid: buyerUid, email: buyerEmail }
      }),
    /fake query failure/
  );

  const texts = callTexts(fake.calls);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});

test("production UAT bootstrap result does not contain email uid token or password", async () => {
  const { service } = createService();
  const result = await service.bootstrap();
  const serialized = JSON.stringify(result);

  assert.doesNotMatch(serialized, /example\.test|firebase-admin-uid|firebase-buyer-uid|token|password/i);
});
