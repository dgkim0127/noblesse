import assert from "node:assert/strict";
import test from "node:test";
import { createAdminBuyerQueries } from "../src/db/queries/adminBuyerQueries.js";

const buyerId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const adminViewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  requestId: "req-test-1",
  ipAddress: "127.0.0.1",
  userAgent: "node-test"
};

const existingBuyerRow = {
  id: buyerId,
  user_id: userId,
  email: "buyer@example.test",
  role: "buyer",
  status: "pending",
  account_status: "active",
  verification_status: "pending",
  company_name: "Buyer Co",
  contact_name: "Buyer",
  country: "KR",
  preferred_language: "kr",
  assigned_market: "KR",
  currency: "KRW",
  created_at: "2026-06-16T00:00:00.000Z",
  updated_at: "2026-06-16T00:00:00.000Z"
};

function createFakePool({ selectRows = [existingBuyerRow], failOn = "" } = {}) {
  const calls = [];
  let releaseCount = 0;
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });

      if (failOn && normalized.includes(failOn)) throw new Error("fake query failure");
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.startsWith("select")) return { rows: selectRows };
      if (normalized.startsWith("update public.buyers")) {
        return {
          rows: [{
            verification_status: params[1],
            reviewed_at: "2026-06-16T00:01:00.000Z",
            reviewed_by: adminViewer.userId,
            rejection_reason: params[1] === "rejected" ? params[3] : null,
            suspension_reason: params[1] === "suspended" ? params[3] : null,
            assigned_admin_id: params[4] || null,
            internal_memo: params[5] || null,
            updated_at: "2026-06-16T00:01:00.000Z"
          }]
        };
      }
      if (normalized.startsWith("update public.users")) {
        return {
          rows: [{
            id: userId,
            email: "buyer@example.test",
            role: "buyer",
            status: params.length > 2 ? params[2] : params[1],
            account_status: params[1],
            updated_at: "2026-06-16T00:01:00.000Z"
          }]
        };
      }
      if (normalized.startsWith("insert into public.audit_logs")) return { rows: [{ id: "audit-1" }] };
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

test("updateBuyerStatus runs select/update/audit in a transaction and commits", async () => {
  const fake = createFakePool();
  const result = await createAdminBuyerQueries(fake.pool).updateBuyerStatus(buyerId, "approved", adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("select") && text.includes("for update")), true);
  assert.equal(texts.some((text) => text.startsWith("update public.users")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
  assert.equal(result.buyer.status, "approved");
  assert.equal(result.auditLogId, "audit-1");
});

test("updateBuyerVerificationStatus dual-writes verification status and legacy user status", async () => {
  const fake = createFakePool();
  const result = await createAdminBuyerQueries(fake.pool).updateBuyerVerificationStatus(
    buyerId,
    { verificationStatus: "approved" },
    adminViewer
  );
  const buyerUpdate = fake.calls.find((call) => call.sql.toLowerCase().startsWith("update public.buyers"));
  const userUpdate = fake.calls.find((call) => call.sql.toLowerCase().startsWith("update public.users"));

  assert.equal(buyerUpdate.params[1], "approved");
  assert.equal(userUpdate.params[0], userId);
  assert.equal(userUpdate.params[1], "approved");
  assert.equal(result.buyer.verificationStatus, "approved");
  assert.equal(result.buyer.status, "approved");
});

test("updateBuyerAccountStatus dual-writes account status and keeps suspended legacy blocked", async () => {
  const fake = createFakePool({
    selectRows: [{ ...existingBuyerRow, status: "blocked", verification_status: "suspended" }]
  });
  const result = await createAdminBuyerQueries(fake.pool).updateBuyerAccountStatus(
    buyerId,
    { accountStatus: "active", reason: "reviewed" },
    adminViewer
  );
  const userUpdate = fake.calls.find((call) => call.sql.toLowerCase().startsWith("update public.users"));

  assert.equal(userUpdate.params[0], userId);
  assert.equal(userUpdate.params[1], "active");
  assert.equal(userUpdate.params[2], "blocked");
  assert.equal(result.buyer.accountStatus, "active");
  assert.equal(result.buyer.verificationStatus, "suspended");
  assert.equal(result.buyer.status, "blocked");
});

test("updateBuyerStatus inserts an admin buyer status audit log", async () => {
  const fake = createFakePool();
  await createAdminBuyerQueries(fake.pool).updateBuyerStatus(buyerId, "blocked", adminViewer);

  const auditCall = fake.calls.find((call) => call.sql.toLowerCase().startsWith("insert into public.audit_logs"));
  assert.equal(auditCall.params[0], adminViewer.userId);
  assert.equal(auditCall.params[2], "admin.buyer.status.update");
  assert.equal(auditCall.params[3], "buyers");
  assert.equal(auditCall.params[4], buyerId);
  assert.equal(auditCall.params[5].status, "pending");
  assert.equal(auditCall.params[6].status, "blocked");
  assert.equal(auditCall.params[7], adminViewer.requestId);
});

test("updateBuyerStatus rolls back and releases when buyer is not found", async () => {
  const fake = createFakePool({ selectRows: [] });
  const result = await createAdminBuyerQueries(fake.pool).updateBuyerStatus(buyerId, "approved", adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(result, null);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});
