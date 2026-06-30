import assert from "node:assert/strict";
import test from "node:test";
import { createOwnerAdminRecoveryQueries } from "../src/db/queries/ownerAdminRecoveryQueries.js";
import {
  createOwnerAdminRecoveryService,
  validateOwnerAdminRecoveryEnv
} from "../src/services/ownerAdminRecoveryService.js";

const targetIdentifier = "admin";
const targetEmail = "admin@example.test";
const targetUid = "firebase-admin-uid";
const targetUserId = "admin-user-1";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_OWNER_ADMIN_RECOVERY_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    TARGET_OWNER_IDENTIFIER: targetIdentifier,
    RECOVERY_REASON: "owner_recovery_for_catalog_permission_bootstrap",
    ...overrides
  };
}

function createService({
  source = productionSource(),
  firebaseError,
  firebaseUser = { uid: targetUid, disabled: false },
  targetResult = {
    ok: true,
    category: "OWNER_RECOVERY_TARGET_READY",
    targetFound: true,
    targetUnique: true,
    targetEligible: true,
    target: {
      userId: targetUserId,
      email: targetEmail,
      authUid: targetUid,
      adminRole: "operator"
    }
  },
  recoveryResult = {
    ok: true,
    category: "OWNER_ADMIN_RECOVERY_COMPLETE",
    ownerReady: true,
    ownerAlreadyReady: false,
    explicitAdminsManageGrant: false,
    catalogWriteGranted: false,
    otherPermissionsGranted: false,
    auditLogged: true,
    transactionCommitted: true
  }
} = {}) {
  const calls = [];
  const service = createOwnerAdminRecoveryService({
    source,
    firebaseUserLookup: {
      async getUserByEmail(email) {
        calls.push({ type: "firebaseLookup", email });
        if (firebaseError) throw firebaseError;
        return firebaseUser;
      }
    },
    queries: {
      async findOwnerRecoveryTarget(input) {
        calls.push({ type: "findTarget", input });
        return targetResult;
      },
      async recoverOwnerRole(input) {
        calls.push({ type: "recoverOwnerRole", input });
        return recoveryResult;
      }
    }
  });
  return { calls, service };
}

test("owner recovery env rejects missing ALLOW", () => {
  const result = validateOwnerAdminRecoveryEnv(
    productionSource({ NOBLESSE_OWNER_ADMIN_RECOVERY_ALLOW: "" })
  );
  assert.deepEqual(result, { ok: false, category: "RECOVERY_NOT_ALLOWED" });
});

test("owner recovery env rejects non-production runtime", () => {
  const result = validateOwnerAdminRecoveryEnv(
    productionSource({ NOBLESSE_RUNTIME_ENV: "staging" })
  );
  assert.deepEqual(result, { ok: false, category: "NON_PRODUCTION_RUNTIME" });
});

test("owner recovery env rejects missing target identifier", () => {
  const result = validateOwnerAdminRecoveryEnv(productionSource({ TARGET_OWNER_IDENTIFIER: "" }));
  assert.deepEqual(result, { ok: false, category: "MISSING_TARGET_IDENTIFIER" });
});

test("owner recovery env rejects password input", () => {
  const result = validateOwnerAdminRecoveryEnv(
    productionSource({ TARGET_OWNER_PASSWORD: "never-accept-this" })
  );
  assert.deepEqual(result, { ok: false, category: "PASSWORD_INPUT_REJECTED" });
});

test("owner recovery env rejects canary or test target patterns", () => {
  const result = validateOwnerAdminRecoveryEnv(
    productionSource({ TARGET_OWNER_IDENTIFIER: "n56-canary-buyer" })
  );
  assert.deepEqual(result, { ok: false, category: "UNSAFE_OWNER_TARGET" });
});

test("owner recovery service stops on unknown target before Firebase lookup", async () => {
  const { calls, service } = createService({
    targetResult: {
      ok: false,
      category: "TARGET_ACCOUNT_NOT_FOUND",
      targetFound: false,
      targetUnique: false,
      targetEligible: false
    }
  });

  const result = await service.recoverOwner();

  assert.equal(result.ok, false);
  assert.equal(result.category, "TARGET_ACCOUNT_NOT_FOUND");
  assert.equal(calls.some((call) => call.type === "firebaseLookup"), false);
  assert.equal(calls.some((call) => call.type === "recoverOwnerRole"), false);
});

test("owner recovery service stops on duplicate target before mutation", async () => {
  const { calls, service } = createService({
    targetResult: {
      ok: false,
      category: "TARGET_ACCOUNT_AMBIGUOUS",
      targetFound: true,
      targetUnique: false,
      targetEligible: false
    }
  });

  const result = await service.recoverOwner();

  assert.equal(result.ok, false);
  assert.equal(result.category, "TARGET_ACCOUNT_AMBIGUOUS");
  assert.equal(calls.some((call) => call.type === "recoverOwnerRole"), false);
});

test("owner recovery service stops on buyer or unsafe target before mutation", async () => {
  const { calls, service } = createService({
    targetResult: {
      ok: false,
      category: "UNSAFE_OWNER_TARGET",
      targetFound: true,
      targetUnique: true,
      targetEligible: false
    }
  });

  const result = await service.recoverOwner();

  assert.equal(result.ok, false);
  assert.equal(result.category, "UNSAFE_OWNER_TARGET");
  assert.equal(calls.some((call) => call.type === "recoverOwnerRole"), false);
});

test("owner recovery service reports missing Firebase user without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseError: { code: "auth/user-not-found" }
  });

  const result = await service.recoverOwner();

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_FIREBASE_USER_NOT_FOUND");
  assert.equal(result.adminFirebaseUserFound, false);
  assert.equal(calls.some((call) => call.type === "recoverOwnerRole"), false);
});

test("owner recovery service reports disabled Firebase user without DB mutation", async () => {
  const { calls, service } = createService({
    firebaseUser: { uid: targetUid, disabled: true }
  });

  const result = await service.recoverOwner();

  assert.equal(result.ok, false);
  assert.equal(result.category, "ADMIN_FIREBASE_USER_DISABLED");
  assert.equal(result.adminFirebaseUserFound, true);
  assert.equal(result.firebaseUserEnabled, false);
  assert.equal(calls.some((call) => call.type === "recoverOwnerRole"), false);
});

test("owner recovery service recovers owner only and keeps permission grants false", async () => {
  const { calls, service } = createService();

  const result = await service.recoverOwner();
  const mutationCall = calls.find((call) => call.type === "recoverOwnerRole");

  assert.equal(result.ok, true);
  assert.equal(result.ownerReady, true);
  assert.equal(result.catalogWriteGranted, false);
  assert.equal(result.explicitAdminsManageGrant, false);
  assert.equal(result.otherPermissionsGranted, false);
  assert.equal(result.transactionCommitted, true);
  assert.deepEqual(mutationCall.input, {
    targetUserId,
    firebaseAuthUid: targetUid,
    recoveryReason: "owner_recovery_for_catalog_permission_bootstrap"
  });
});

test("owner recovery service result does not contain email uid token or password", async () => {
  const { service } = createService();
  const result = await service.recoverOwner();
  const serialized = JSON.stringify(result);

  assert.doesNotMatch(serialized, /example\.test|firebase-admin-uid|token|password/i);
});

function createFakePool({
  targetRows = [
    {
      user_id: targetUserId,
      auth_uid: targetUid,
      email: targetEmail,
      role: "admin",
      status: "approved",
      account_status: "active",
      admin_role: "operator"
    }
  ],
  userRow = {
    user_id: targetUserId,
    auth_uid: targetUid,
    role: "admin",
    status: "approved",
    account_status: "active"
  },
  profileRole = "operator",
  missingAdminProfiles = false,
  missingAuditLogs = false,
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
      if (normalized.startsWith("select to_regclass")) {
        if (params[0] === "public.admin_profiles") {
          return { rows: [{ table_name: missingAdminProfiles ? null : "admin_profiles" }] };
        }
        if (params[0] === "public.audit_logs") {
          return { rows: [{ table_name: missingAuditLogs ? null : "audit_logs" }] };
        }
      }
      if (normalized.includes("from information_schema.columns")) {
        return { rowCount: 1, rows: [{ "?column?": 1 }] };
      }
      if (normalized.startsWith("select") && normalized.includes("left join public.admin_profiles")) {
        return { rowCount: targetRows.length, rows: targetRows };
      }
      if (normalized.startsWith("select") && normalized.includes("from public.users u") && normalized.includes("for update")) {
        return { rowCount: userRow ? 1 : 0, rows: userRow ? [userRow] : [] };
      }
      if (normalized.startsWith("select admin_role from public.admin_profiles")) {
        return { rowCount: profileRole ? 1 : 0, rows: profileRole ? [{ admin_role: profileRole }] : [] };
      }
      if (normalized.startsWith("insert into public.admin_profiles")) {
        return { rows: [] };
      }
      if (normalized.startsWith("insert into public.audit_logs")) {
        return { rows: [] };
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
      async query(sql, params = []) {
        return client.query(sql, params);
      },
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

test("owner recovery query resolves exact active approved admin target", async () => {
  const fake = createFakePool();

  const result = await createOwnerAdminRecoveryQueries(fake.pool).findOwnerRecoveryTarget({
    identifier: targetIdentifier
  });

  assert.equal(result.ok, true);
  assert.equal(result.targetFound, true);
  assert.equal(result.targetUnique, true);
  assert.equal(result.targetEligible, true);
  assert.equal(result.target.email, targetEmail);
});

test("owner recovery query rejects duplicate target matches", async () => {
  const fake = createFakePool({
    targetRows: [
      {
        user_id: "admin-user-1",
        auth_uid: "uid-1",
        email: "admin@example.test",
        role: "admin",
        status: "approved",
        account_status: "active",
        admin_role: "operator"
      },
      {
        user_id: "admin-user-2",
        auth_uid: "uid-2",
        email: "admin@example.co",
        role: "admin",
        status: "approved",
        account_status: "active",
        admin_role: "operator"
      }
    ]
  });

  const result = await createOwnerAdminRecoveryQueries(fake.pool).findOwnerRecoveryTarget({
    identifier: targetIdentifier
  });

  assert.equal(result.ok, false);
  assert.equal(result.category, "TARGET_ACCOUNT_AMBIGUOUS");
});

test("owner recovery query rejects buyer or customer target", async () => {
  const fake = createFakePool({
    targetRows: [
      {
        user_id: "buyer-user-1",
        auth_uid: "buyer-uid",
        email: "buyer@example.test",
        role: "buyer",
        status: "approved",
        account_status: "active",
        admin_role: null
      }
    ]
  });

  const result = await createOwnerAdminRecoveryQueries(fake.pool).findOwnerRecoveryTarget({
    identifier: "buyer"
  });

  assert.equal(result.ok, false);
  assert.equal(result.category, "UNSAFE_OWNER_TARGET");
});

test("owner recovery query fails closed when admin profile schema is absent", async () => {
  const fake = createFakePool({ missingAdminProfiles: true });

  const result = await createOwnerAdminRecoveryQueries(fake.pool).findOwnerRecoveryTarget({
    identifier: targetIdentifier
  });

  assert.equal(result.ok, false);
  assert.equal(result.category, "OWNER_RECOVERY_SCHEMA_UNSUPPORTED");
});

test("owner recovery mutation grants owner role only and writes audit log", async () => {
  const fake = createFakePool();

  const result = await createOwnerAdminRecoveryQueries(fake.pool).recoverOwnerRole({
    targetUserId,
    firebaseAuthUid: targetUid,
    recoveryReason: "owner_recovery_for_catalog_permission_bootstrap"
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, true);
  assert.equal(result.ownerReady, true);
  assert.equal(result.ownerAlreadyReady, false);
  assert.equal(result.explicitAdminsManageGrant, false);
  assert.equal(result.catalogWriteGranted, false);
  assert.equal(result.otherPermissionsGranted, false);
  assert.equal(result.auditLogged, true);
  assert.equal(result.transactionCommitted, true);
  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_profiles")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), true);
  assert.equal(texts.some((text) => text.includes("admin_permission_overrides")), false);
  assert.equal(texts.some((text) => text.includes("catalog.write")), false);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
});

test("owner recovery mutation is idempotent for existing owner", async () => {
  const fake = createFakePool({ profileRole: "owner" });

  const result = await createOwnerAdminRecoveryQueries(fake.pool).recoverOwnerRole({
    targetUserId,
    firebaseAuthUid: targetUid,
    recoveryReason: "owner_recovery_for_catalog_permission_bootstrap"
  });

  assert.equal(result.ok, true);
  assert.equal(result.ownerReady, true);
  assert.equal(result.ownerAlreadyReady, true);
});

test("owner recovery mutation rejects Firebase identity mismatch", async () => {
  const fake = createFakePool();

  const result = await createOwnerAdminRecoveryQueries(fake.pool).recoverOwnerRole({
    targetUserId,
    firebaseAuthUid: "different-firebase-uid",
    recoveryReason: "owner_recovery_for_catalog_permission_bootstrap"
  });
  const texts = callTexts(fake.calls);

  assert.equal(result.ok, false);
  assert.equal(result.category, "FIREBASE_IDENTITY_MISMATCH");
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_profiles")), false);
});

test("owner recovery mutation rolls back on failure", async () => {
  const fake = createFakePool({ failOn: "insert into public.audit_logs" });

  await assert.rejects(
    () =>
      createOwnerAdminRecoveryQueries(fake.pool).recoverOwnerRole({
        targetUserId,
        firebaseAuthUid: targetUid,
        recoveryReason: "owner_recovery_for_catalog_permission_bootstrap"
      }),
    /fake query failure/
  );

  const texts = callTexts(fake.calls);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});
