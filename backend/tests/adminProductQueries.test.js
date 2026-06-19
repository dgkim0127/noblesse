import assert from "node:assert/strict";
import test from "node:test";
import { createAdminProductQueries } from "../src/db/queries/adminProductQueries.js";

const productId = "11111111-1111-4111-8111-111111111111";
const adminViewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  requestId: "req-test-1",
  ipAddress: "127.0.0.1",
  userAgent: "node-test"
};

const existingProductRow = {
  id: productId,
  code: "NB-001",
  name_ko: "상품",
  name_en: "Product",
  name_ja: "商品",
  category_id: "44444444-4444-4444-8444-444444444444",
  category_name_ko: "카테고리",
  category_name_en: "Category",
  material: "Surgical Steel",
  colors: ["Silver"],
  sizes: ["6mm"],
  moq_default: 20,
  lead_time: "2 weeks",
  origin: "KR",
  image_set: {},
  image_alt: {},
  is_visible: true,
  is_export_available: true,
  is_new: false,
  is_best: false,
  sort_order: 10,
  created_at: "2026-06-16T00:00:00.000Z",
  updated_at: "2026-06-16T00:00:00.000Z"
};

function createFakePool({ selectRows = [existingProductRow], failOn = "" } = {}) {
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
      if (normalized.startsWith("update public.products")) {
        return { rows: [{ ...existingProductRow, is_visible: params[1], updated_at: "2026-06-16T00:01:00.000Z" }] };
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

test("updateProductVisibility runs select/update/audit in a transaction and commits", async () => {
  const fake = createFakePool();
  const result = await createAdminProductQueries(fake.pool).updateProductVisibility(productId, false, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("select") && text.includes("for update")), true);
  assert.equal(texts.some((text) => text.startsWith("update public.products")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
  assert.equal(result.product.isVisible, false);
  assert.equal(result.auditLogId, "audit-1");
});

test("updateProductVisibility inserts an admin product visibility audit log", async () => {
  const fake = createFakePool();
  await createAdminProductQueries(fake.pool).updateProductVisibility(productId, false, adminViewer);

  const auditCall = fake.calls.find((call) => call.sql.toLowerCase().startsWith("insert into public.audit_logs"));
  assert.equal(auditCall.params[0], adminViewer.userId);
  assert.equal(auditCall.params[2], "admin.product.visibility.update");
  assert.equal(auditCall.params[3], "products");
  assert.equal(auditCall.params[4], productId);
  assert.equal(auditCall.params[5].isVisible, true);
  assert.equal(auditCall.params[6].isVisible, false);
  assert.equal(auditCall.params[7], adminViewer.requestId);
});

test("updateProductVisibility rolls back and releases when product is not found", async () => {
  const fake = createFakePool({ selectRows: [] });
  const result = await createAdminProductQueries(fake.pool).updateProductVisibility(productId, false, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(result, null);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});
