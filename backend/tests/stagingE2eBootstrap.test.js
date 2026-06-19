import assert from "node:assert/strict";
import test from "node:test";
import { createStagingE2eBootstrapQueries } from "../src/db/queries/stagingE2eBootstrapQueries.js";
import {
  createStagingE2eBootstrapService,
  validateStagingBootstrapEnv
} from "../src/services/stagingE2eBootstrapService.js";

const adminEmail = "admin@example.test";
const buyerEmail = "buyer@example.test";
const adminUid = "firebase-admin-uid";

function stagingSource(overrides = {}) {
  return {
    NOBLESSE_STAGING_BOOTSTRAP_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "staging",
    NOBLESSE_STAGING_ADMIN_EMAIL: adminEmail,
    NOBLESSE_STAGING_BUYER_EMAIL: buyerEmail,
    ...overrides
  };
}

function createService({
  source = stagingSource(),
  firebaseError,
  firebaseUser = { uid: adminUid },
  queryResult = {
    ok: true,
    category: "BOOTSTRAP_COMPLETE",
    buyerRegistered: true,
    adminReady: true,
    buyerApproved: true,
    adminAlreadyReady: false,
    buyerAlreadyApproved: false
  }
} = {}) {
  const calls = [];
  const service = createStagingE2eBootstrapService({
    source,
    firebaseUserLookup: {
      async getUserByEmail(email) {
        calls.push({ type: "firebaseLookup", email });
        if (firebaseError) throw firebaseError;
        return firebaseUser;
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

test("staging bootstrap env rejects missing ALLOW", () => {
  const result = validateStagingBootstrapEnv(
    stagingSource({ NOBLESSE_STAGING_BOOTSTRAP_ALLOW: "" })
  );
  assert.deepEqual(result, { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" });
});

test("staging bootstrap env rejects non-staging runtime", () => {
  const result = validateStagingBootstrapEnv(stagingSource({ NOBLESSE_RUNTIME_ENV: "prod" }));
  assert.deepEqual(result, { ok: false, category: "NON_STAGING_RUNTIME" });
});

test("staging bootstrap env rejects identical admin and buyer emails", () => {
  const result = validateStagingBootstrapEnv(
    stagingSource({ NOBLESSE_STAGING_BUYER_EMAIL: adminEmail.toUpperCase() })
  );
  assert.deepEqual(result, { ok: false, category: "IDENTICAL_EMAILS_REJECTED" });
});

test("bootstrap reports Firebase admin user missing without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseError: { code: "auth/user-not-found" }
  });

  const result = await service.bootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_FIREBASE_USER_NOT_FOUND");
  assert.equal(result.adminFirebaseUserFound, false);
  assert.equal(calls.some((call) => call.type === "bootstrapAccounts"), false);
});

test("bootstrap reports unregistered buyer from query result", async () => {
  const { service } = createService({
    queryResult: {
      ok: false,
      category: "BUYER_NOT_REGISTERED",
      buyerRegistered: false
    }
  });

  const result = await service.bootstrap();

  assert.equal(result.ok, false);
  assert.equal(result.category, "BUYER_NOT_REGISTERED");
  assert.equal(result.adminFirebaseUserFound, true);
  assert.equal(result.buyerRegistered, false);
});

test("bootstrap passes sanitized admin identity and buyer email to query layer", async () => {
  const { calls, service } = createService({
    source: stagingSource({
      NOBLESSE_STAGING_ADMIN_EMAIL: "  ADMIN@example.TEST  ",
      NOBLESSE_STAGING_BUYER_EMAIL: "  BUYER@example.TEST  "
    })
  });

  const result = await service.bootstrap();
  const mutationCall = calls.find((call) => call.type === "bootstrapAccounts");

  assert.equal(result.ok, true);
  assert.deepEqual(mutationCall.input, {
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerEmail
  });
});

function createFakePool({ buyerUser, buyerProfile = { id: "buyer-profile-1" }, adminUser, failOn = "" } = {}) {
  const calls = [];
  let releaseCount = 0;
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });

      if (failOn && normalized.includes(failOn)) throw new Error("fake query failure");
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };

      if (normalized.startsWith("select id, role, status")) {
        return { rows: buyerUser ? [buyerUser] : [] };
      }
      if (normalized.startsWith("select id") && normalized.includes("from public.buyers")) {
        return { rows: buyerProfile ? [buyerProfile] : [] };
      }
      if (normalized.startsWith("select id, auth_uid")) {
        return { rows: adminUser ? [adminUser] : [] };
      }
      if (normalized.startsWith("insert into public.users")) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
      }
      if (normalized.startsWith("update public.users") && normalized.includes("set auth_uid")) {
        return { rows: [{ id: "admin-user-1", role: "admin", status: "approved" }] };
      }
      if (normalized.startsWith("update public.users") && normalized.includes("where id = $1 and role = 'buyer'")) {
        return { rows: [{ id: params[0], role: "buyer", status: "approved" }] };
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

test("query layer upserts approved admin and approves buyer in one transaction", async () => {
  const fake = createFakePool({
    buyerUser: { id: "buyer-user-1", role: "buyer", status: "pending" }
  });

  const result = await createStagingE2eBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerEmail
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, true);
  assert.equal(result.category, "BOOTSTRAP_COMPLETE");
  assert.equal(result.adminReady, true);
  assert.equal(result.buyerApproved, true);
  assert.equal(result.buyerAlreadyApproved, false);
  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.users")), true);
  assert.equal(texts.some((text) => text.includes("where id = $1 and role = 'buyer'")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
});

test("query layer keeps role/status exact on idempotent rerun", async () => {
  const fake = createFakePool({
    buyerUser: { id: "buyer-user-1", role: "buyer", status: "approved" },
    adminUser: {
      id: "admin-user-1",
      auth_uid: adminUid,
      email: adminEmail,
      role: "admin",
      status: "approved"
    }
  });

  const result = await createStagingE2eBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerEmail
  });

  assert.equal(result.ok, true);
  assert.equal(result.adminAlreadyReady, true);
  assert.equal(result.buyerAlreadyApproved, true);
  assert.equal(result.adminReady, true);
  assert.equal(result.buyerApproved, true);
});

test("query layer reports buyer not registered without admin mutation", async () => {
  const fake = createFakePool({ buyerUser: null });

  const result = await createStagingE2eBootstrapQueries(fake.pool).bootstrapAccounts({
    adminIdentity: { authUid: adminUid, email: adminEmail },
    buyerEmail
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, false);
  assert.equal(result.category, "BUYER_NOT_REGISTERED");
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.users")), false);
  assert.equal(texts.some((text) => text.includes("set auth_uid")), false);
});

test("query layer rolls back on failure", async () => {
  const fake = createFakePool({
    buyerUser: { id: "buyer-user-1", role: "buyer", status: "pending" },
    failOn: "insert into public.users"
  });

  await assert.rejects(
    () =>
      createStagingE2eBootstrapQueries(fake.pool).bootstrapAccounts({
        adminIdentity: { authUid: adminUid, email: adminEmail },
        buyerEmail
      }),
    /fake query failure/
  );

  const texts = callTexts(fake.calls);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});

test("sanitized bootstrap result does not contain email, uid, or token-shaped values", async () => {
  const { service } = createService();
  const result = await service.bootstrap();
  const serialized = JSON.stringify(result);

  assert.doesNotMatch(serialized, /example\.test|firebase-admin-uid|token|password/i);
});
