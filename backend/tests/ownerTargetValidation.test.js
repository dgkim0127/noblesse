import assert from "node:assert/strict";
import test from "node:test";
import {
  createOwnerTargetValidationService,
  validateOwnerTargetValidationEnv
} from "../src/services/ownerTargetValidationService.js";
import { createOwnerTargetValidationQueries } from "../src/db/queries/ownerTargetValidationQueries.js";

const targetIdentifier = "testadmin";
const targetEmail = "testadmin@example.test";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_OWNER_TARGET_VALIDATION_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    TARGET_OWNER_IDENTIFIER: targetIdentifier,
    TARGET_ACCOUNT_TYPE: "operator-controlled production admin account",
    CANARY_ACCOUNT_USED: "NO",
    PASSWORD_ROTATION_STATUS: "pending_after_recovery",
    ...overrides
  };
}

test("owner target validation env accepts approved testadmin target type", () => {
  assert.deepEqual(validateOwnerTargetValidationEnv(productionSource()), {
    ok: true,
    targetIdentifier,
    targetAccountType: "operator-controlled production admin account",
    passwordRotationStatus: "pending_after_recovery"
  });
});

test("owner target validation env rejects missing allow, canary, and refused rotation", () => {
  assert.equal(validateOwnerTargetValidationEnv({}).category, "TARGET_VALIDATION_NOT_ALLOWED");
  assert.equal(
    validateOwnerTargetValidationEnv(productionSource({ CANARY_ACCOUNT_USED: "YES" })).category,
    "UNSAFE_OWNER_TARGET"
  );
  assert.equal(
    validateOwnerTargetValidationEnv(productionSource({ PASSWORD_ROTATION_STATUS: "not_exposed" })).category,
    "PASSWORD_ROTATION_REQUIRED"
  );
  assert.equal(
    validateOwnerTargetValidationEnv(productionSource({ TARGET_OWNER_IDENTIFIER: "testbuyer" })).category,
    "UNSAFE_OWNER_TARGET"
  );
});

test("owner target validation service stops before Firebase when target query is unsafe", async () => {
  const calls = [];
  const service = createOwnerTargetValidationService({
    source: productionSource(),
    firebaseUserLookup: {
      async getUserByEmail() {
        calls.push("firebase");
        return { uid: "uid", disabled: false };
      }
    },
    queries: {
      async validateTarget() {
        return { ok: false, category: "TARGET_ACCOUNT_NOT_FOUND" };
      }
    }
  });

  const result = await service.validateTarget();

  assert.equal(result.ok, false);
  assert.equal(result.category, "TARGET_ACCOUNT_NOT_FOUND");
  assert.equal(calls.length, 0);
});

test("owner target validation service returns sanitized ready result", async () => {
  const service = createOwnerTargetValidationService({
    source: productionSource(),
    firebaseUserLookup: {
      async getUserByEmail(email) {
        assert.equal(email, targetEmail);
        return { uid: "firebase-uid", disabled: false };
      }
    },
    queries: {
      async validateTarget({ identifier }) {
        assert.equal(identifier, targetIdentifier);
        return {
          ok: true,
          category: "OWNER_TARGET_READY",
          targetFound: true,
          targetUnique: true,
          targetEligible: true,
          targetCurrentlyOwner: false,
          target: { email: targetEmail }
        };
      }
    }
  });

  const result = await service.validateTarget();

  assert.equal(result.ok, true);
  assert.equal(result.category, "OWNER_TARGET_READY");
  assert.equal(result.adminFirebaseUserFound, true);
  assert.equal(result.firebaseUserEnabled, true);
  assert.doesNotMatch(JSON.stringify(result), /example\.test|firebase-uid|token|password/i);
});

function createFakePool({ rows = [{ role: "admin", status: "approved", account_status: "active", admin_role: null }], hasAccountStatus = false, hasAdminProfiles = false } = {}) {
  const calls = [];
  return {
    calls,
    async connect() {
      return {
        async query(sql, params = []) {
          const text = String(sql).trim().replace(/\s+/g, " ");
          calls.push({ sql: text, params });
          if (text === "begin transaction read only" || text === "commit" || text === "rollback") return { rows: [] };
          if (/current_setting\('transaction_read_only'\)/i.test(text)) return { rows: [{ read_only: "on" }] };
          if (/from information_schema\.columns/i.test(text)) {
            const columnName = params[1];
            return { rowCount: columnName === "account_status" && hasAccountStatus ? 1 : 0, rows: [] };
          }
          if (/select to_regclass\(\$1\) as table_name/i.test(text)) {
            return { rows: [{ table_name: hasAdminProfiles ? "admin_profiles" : null }] };
          }
          if (/from public\.users u/i.test(text)) {
            return { rowCount: rows.length, rows };
          }
          throw new Error(`Unexpected query: ${text}`);
        },
        release() {}
      };
    }
  };
}

test("owner target validation query supports legacy schema before migration", async () => {
  const pool = createFakePool();
  const result = await createOwnerTargetValidationQueries(pool).validateTarget({ identifier: targetIdentifier });

  assert.equal(result.ok, true);
  assert.equal(result.targetEligible, true);
  assert.equal(result.targetCurrentlyOwner, false);
  assert.equal(pool.calls[0].sql, "begin transaction read only");
});

test("owner target validation query rejects duplicate, buyer, and existing owner", async () => {
  assert.equal(
    (await createOwnerTargetValidationQueries(createFakePool({ rows: [{}, {}] })).validateTarget({ identifier: "x" })).category,
    "TARGET_ACCOUNT_AMBIGUOUS"
  );
  assert.equal(
    (await createOwnerTargetValidationQueries(createFakePool({ rows: [{ role: "buyer", status: "approved", account_status: "active" }] })).validateTarget({ identifier: "x" })).category,
    "UNSAFE_OWNER_TARGET"
  );
  assert.equal(
    (await createOwnerTargetValidationQueries(createFakePool({ rows: [{ role: "admin", status: "approved", account_status: "active", admin_role: "owner" }], hasAdminProfiles: true })).validateTarget({ identifier: "x" })).category,
    "TARGET_ALREADY_OWNER"
  );
});
