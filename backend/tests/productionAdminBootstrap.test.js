import assert from "node:assert/strict";
import test from "node:test";
import { createProductionAdminBootstrapQueries } from "../src/db/queries/productionAdminBootstrapQueries.js";
import {
  createProductionAdminBootstrapService,
  validateProductionAdminBootstrapEnv
} from "../src/services/productionAdminBootstrapService.js";

const adminEmail = "admin@example.test";
const adminUid = "firebase-admin-uid";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_PRODUCTION_ADMIN_BOOTSTRAP_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    NOBLESSE_PROD_ADMIN_EMAIL: adminEmail,
    ...overrides
  };
}

function createService({
  source = productionSource(),
  firebaseError,
  firebaseUser = { uid: adminUid },
  queryResult = {
    ok: true,
    category: "PRODUCTION_ADMIN_BOOTSTRAP_COMPLETE",
    adminReady: true,
    adminAlreadyReady: false,
    transactionCommitted: true
  }
} = {}) {
  const calls = [];
  const service = createProductionAdminBootstrapService({
    source,
    firebaseUserLookup: {
      async getUserByEmail(email) {
        calls.push({ type: "firebaseLookup", email });
        if (firebaseError) throw firebaseError;
        return firebaseUser;
      }
    },
    queries: {
      async bootstrapAdmin(input) {
        calls.push({ type: "bootstrapAdmin", input });
        return queryResult;
      }
    }
  });
  return { calls, service };
}

test("production admin bootstrap env rejects missing ALLOW", () => {
  const result = validateProductionAdminBootstrapEnv(
    productionSource({ NOBLESSE_PRODUCTION_ADMIN_BOOTSTRAP_ALLOW: "" })
  );
  assert.deepEqual(result, { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" });
});

test("production admin bootstrap env rejects non-production runtime", () => {
  const result = validateProductionAdminBootstrapEnv(
    productionSource({ NOBLESSE_RUNTIME_ENV: "staging" })
  );
  assert.deepEqual(result, { ok: false, category: "NON_PRODUCTION_RUNTIME" });
});

test("production admin bootstrap env rejects missing email", () => {
  const result = validateProductionAdminBootstrapEnv(
    productionSource({ NOBLESSE_PROD_ADMIN_EMAIL: "" })
  );
  assert.deepEqual(result, { ok: false, category: "MISSING_EMAIL_INPUT" });
});

test("production admin bootstrap reports missing Firebase user without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseError: { code: "auth/user-not-found" }
  });

  const result = await service.bootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_FIREBASE_USER_NOT_FOUND");
  assert.equal(result.adminFirebaseUserFound, false);
  assert.equal(calls.some((call) => call.type === "bootstrapAdmin"), false);
});

test("production admin bootstrap passes sanitized identity to query layer", async () => {
  const { calls, service } = createService({
    source: productionSource({ NOBLESSE_PROD_ADMIN_EMAIL: "  ADMIN@example.TEST  " })
  });

  const result = await service.bootstrap();
  const mutationCall = calls.find((call) => call.type === "bootstrapAdmin");

  assert.equal(result.ok, true);
  assert.deepEqual(mutationCall.input, {
    adminIdentity: { authUid: adminUid, email: adminEmail }
  });
});

function createFakePool({ adminUser, failOn = "" } = {}) {
  const calls = [];
  let releaseCount = 0;
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });

      if (failOn && normalized.includes(failOn)) throw new Error("fake query failure");
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };

      if (normalized.startsWith("select id, auth_uid")) {
        return { rows: adminUser ? [adminUser] : [] };
      }
      if (normalized.startsWith("insert into public.users")) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
      }
      if (normalized.startsWith("update public.users")) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
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

test("production admin query layer inserts approved admin in a transaction", async () => {
  const fake = createFakePool();

  const result = await createProductionAdminBootstrapQueries(fake.pool).bootstrapAdmin({
    adminIdentity: { authUid: adminUid, email: adminEmail }
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, true);
  assert.equal(result.adminReady, true);
  assert.equal(result.transactionCommitted, true);
  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.users")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
});

test("production admin query layer is idempotent for ready admin", async () => {
  const fake = createFakePool({
    adminUser: {
      id: "admin-user-1",
      auth_uid: adminUid,
      email: adminEmail,
      role: "admin",
      status: "approved"
    }
  });

  const result = await createProductionAdminBootstrapQueries(fake.pool).bootstrapAdmin({
    adminIdentity: { authUid: adminUid, email: adminEmail }
  });

  assert.equal(result.ok, true);
  assert.equal(result.adminReady, true);
  assert.equal(result.adminAlreadyReady, true);
});

test("production admin query layer refuses to convert an existing buyer", async () => {
  const fake = createFakePool({
    adminUser: {
      id: "buyer-user-1",
      auth_uid: adminUid,
      email: adminEmail,
      role: "buyer",
      status: "approved"
    }
  });

  const result = await createProductionAdminBootstrapQueries(fake.pool).bootstrapAdmin({
    adminIdentity: { authUid: adminUid, email: adminEmail }
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_EMAIL_ALREADY_BUYER");
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.some((text) => text.startsWith("update public.users")), false);
});

test("production admin query layer rolls back on failure", async () => {
  const fake = createFakePool({ failOn: "insert into public.users" });

  await assert.rejects(
    () =>
      createProductionAdminBootstrapQueries(fake.pool).bootstrapAdmin({
        adminIdentity: { authUid: adminUid, email: adminEmail }
      }),
    /fake query failure/
  );

  const texts = callTexts(fake.calls);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});

test("production admin bootstrap result does not contain email uid token or password", async () => {
  const { service } = createService();
  const result = await service.bootstrap();
  const serialized = JSON.stringify(result);

  assert.doesNotMatch(serialized, /example\.test|firebase-admin-uid|token|password/i);
});
