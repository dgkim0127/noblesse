import assert from "node:assert/strict";
import test from "node:test";
import { createAdminBuyerQueries } from "../src/db/queries/adminBuyerQueries.js";

const buyerId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const adminViewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  requestId: "request-delete-1",
  ipAddress: "127.0.0.1",
  userAgent: "node-test"
};

function createDeletePool({ found = true } = {}) {
  const calls = [];
  let released = false;
  const existing = {
    id: buyerId,
    user_id: userId,
    company_name: "Buyer Co",
    contact_name: "Buyer",
    email: "buyer@example.test",
    auth_uid: "firebase-buyer-uid",
    role: "buyer"
  };
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.startsWith("select") && normalized.includes("for update")) {
        return { rows: found ? [existing] : [] };
      }
      if (normalized.startsWith("select") && normalized.includes("pdf_object_keys")) {
        return { rows: [{ inquiry_count: 3, pdf_object_keys: ["quotes/one.pdf"] }] };
      }
      if (normalized.startsWith("insert into public.audit_logs")) return { rows: [{ id: "audit-delete-1" }] };
      if (normalized.startsWith("delete from public.users")) return { rows: [{ id: userId }] };
      if (normalized.startsWith("delete ") || normalized.startsWith("update ")) return { rows: [] };
      throw new Error(`Unexpected query: ${text}`);
    },
    release() {
      released = true;
    }
  };
  return {
    calls,
    get released() {
      return released;
    },
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

test("deleteBuyer removes dependent inquiries, buyer profile, and buyer user in one transaction", async () => {
  const fake = createDeletePool();
  const result = await createAdminBuyerQueries(fake.pool).deleteBuyer(buyerId, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("delete from public.inquiries")), true);
  assert.equal(texts.some((text) => text.startsWith("delete from public.buyers")), true);
  assert.equal(texts.some((text) => text.startsWith("delete from public.users")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.released, true);
  assert.equal(result.email, "buyer@example.test");
  assert.equal(result.authUid, "firebase-buyer-uid");
  assert.equal(result.inquiryCount, 3);
  assert.deepEqual(result.pdfObjectKeys, ["quotes/one.pdf"]);

  const audit = fake.calls.find((call) => call.sql.toLowerCase().startsWith("insert into public.audit_logs"));
  assert.equal(audit.params[2], "admin.buyer.delete");
  assert.equal(audit.params[4], buyerId);
  assert.equal(audit.params[5].inquiryCount, 3);
});

test("deleteBuyer rolls back when the buyer no longer exists", async () => {
  const fake = createDeletePool({ found: false });
  const result = await createAdminBuyerQueries(fake.pool).deleteBuyer(buyerId, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(result, null);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.released, true);
});
