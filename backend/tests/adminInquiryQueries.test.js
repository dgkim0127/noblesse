import assert from "node:assert/strict";
import test from "node:test";
import { createAdminInquiryQueries } from "../src/db/queries/adminInquiryQueries.js";

const inquiryId = "11111111-1111-4111-8111-111111111111";
const adminViewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  requestId: "req-test-1",
  ipAddress: "127.0.0.1",
  userAgent: "node-test"
};

const existingInquiryRow = {
  id: inquiryId,
  inquiry_number: "INQ-001",
  admin_memo: "Before memo",
  updated_at: "2026-06-16T00:00:00.000Z"
};

const updatedInquiryRow = {
  id: inquiryId,
  inquiry_number: "INQ-001",
  admin_memo: "After memo",
  updated_at: "2026-06-16T00:01:00.000Z"
};

function createFakePool({ selectRows = [existingInquiryRow], failOn = "" } = {}) {
  const calls = [];
  let releaseCount = 0;

  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });

      if (failOn && normalized.includes(failOn)) {
        throw new Error("fake query failure");
      }

      if (normalized === "begin" || normalized === "commit" || normalized === "rollback") {
        return { rows: [] };
      }

      if (normalized.startsWith("select")) {
        return { rows: selectRows };
      }

      if (normalized.startsWith("update public.inquiries")) {
        return { rows: [updatedInquiryRow] };
      }

      if (normalized.startsWith("insert into public.audit_logs")) {
        return { rows: [{ id: "audit-1" }] };
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

function queryTexts(calls) {
  return calls.map((call) => call.sql.toLowerCase());
}

test("updateInquiryMemo runs select/update/audit in a transaction and commits", async () => {
  const fake = createFakePool();
  const queries = createAdminInquiryQueries(fake.pool);

  const result = await queries.updateInquiryMemo(inquiryId, "After memo", adminViewer);
  const texts = queryTexts(fake.calls);

  assert.deepEqual(
    texts.map((text) => {
      if (text.startsWith("select")) return "select";
      if (text.startsWith("update public.inquiries")) return "update";
      if (text.startsWith("insert into public.audit_logs")) return "audit";
      return text;
    }),
    ["connect", "begin", "select", "update", "audit", "commit"]
  );
  assert.equal(fake.releaseCount, 1);
  assert.deepEqual(result, {
    inquiry: {
      id: inquiryId,
      inquiryNumber: "INQ-001",
      adminMemo: "After memo",
      updatedAt: "2026-06-16T00:01:00.000Z"
    },
    auditLogId: "audit-1"
  });
});

test("updateInquiryMemo selects the inquiry row for update", async () => {
  const fake = createFakePool();
  const queries = createAdminInquiryQueries(fake.pool);

  await queries.updateInquiryMemo(inquiryId, "After memo", adminViewer);

  const selectCall = fake.calls.find((call) => call.sql.toLowerCase().startsWith("select"));
  assert.match(selectCall.sql.toLowerCase(), /for update/);
  assert.deepEqual(selectCall.params, [inquiryId]);
});

test("updateInquiryMemo uses parameterized queries for inquiryId and adminMemo", async () => {
  const fake = createFakePool();
  const queries = createAdminInquiryQueries(fake.pool);
  const adminMemo = "Memo with 'quotes' and $1-like text";

  await queries.updateInquiryMemo(inquiryId, adminMemo, adminViewer);

  const updateCall = fake.calls.find((call) => call.sql.toLowerCase().startsWith("update public.inquiries"));
  assert.equal(updateCall.sql.includes(inquiryId), false);
  assert.equal(updateCall.sql.includes(adminMemo), false);
  assert.deepEqual(updateCall.params, [inquiryId, adminMemo]);
});

test("updateInquiryMemo inserts audit_logs with before and after snapshots", async () => {
  const fake = createFakePool();
  const queries = createAdminInquiryQueries(fake.pool);

  await queries.updateInquiryMemo(inquiryId, "After memo", adminViewer);

  const auditCall = fake.calls.find((call) => call.sql.toLowerCase().startsWith("insert into public.audit_logs"));
  assert.equal(auditCall.params[0], adminViewer.userId);
  assert.equal(auditCall.params[1], "admin");
  assert.equal(auditCall.params[2], "admin.inquiry.memo.update");
  assert.equal(auditCall.params[3], "inquiries");
  assert.equal(auditCall.params[4], inquiryId);
  assert.deepEqual(auditCall.params[5], {
    id: inquiryId,
    inquiryNumber: "INQ-001",
    adminMemo: "Before memo",
    updatedAt: "2026-06-16T00:00:00.000Z"
  });
  assert.deepEqual(auditCall.params[6], {
    id: inquiryId,
    inquiryNumber: "INQ-001",
    adminMemo: "After memo",
    updatedAt: "2026-06-16T00:01:00.000Z"
  });
  assert.equal(auditCall.params[7], adminViewer.requestId);
  assert.equal(auditCall.params[8], adminViewer.ipAddress);
  assert.equal(auditCall.params[9], adminViewer.userAgent);
});

test("updateInquiryMemo rolls back and releases when inquiry is not found", async () => {
  const fake = createFakePool({ selectRows: [] });
  const queries = createAdminInquiryQueries(fake.pool);

  const result = await queries.updateInquiryMemo(inquiryId, "After memo", adminViewer);
  const texts = queryTexts(fake.calls);

  assert.equal(result, null);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(texts.some((text) => text.startsWith("update public.inquiries")), false);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), false);
  assert.equal(fake.releaseCount, 1);
});

test("updateInquiryMemo rolls back and releases on query failure", async () => {
  const fake = createFakePool({ failOn: "insert into public.audit_logs" });
  const queries = createAdminInquiryQueries(fake.pool);

  await assert.rejects(
    () => queries.updateInquiryMemo(inquiryId, "After memo", adminViewer),
    /fake query failure/
  );

  const texts = queryTexts(fake.calls);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});

test("updateInquiryMemo requires a transaction-capable pool", async () => {
  const queries = createAdminInquiryQueries({ query: async () => ({ rows: [] }) });

  await assert.rejects(
    () => queries.updateInquiryMemo(inquiryId, "After memo", adminViewer),
    /must support transactions/
  );
});
