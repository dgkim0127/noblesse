import assert from "node:assert/strict";
import test from "node:test";
import { createAdminQuoteQueries } from "../src/db/queries/adminQuoteQueries.js";

const inquiryId = "11111111-1111-4111-8111-111111111111";
const quoteId = "22222222-2222-4222-8222-222222222222";
const adminViewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin",
  requestId: "req-test",
  ipAddress: "127.0.0.1",
  userAgent: "node-test"
};

function createFakePool({ duplicate = false, inquiryRows = [{ id: inquiryId, inquiry_number: "INQ-001", currency: "JPY", estimated_total: 22000 }] } = {}) {
  const calls = [];
  let releaseCount = 0;
  let quoteStatus = "draft";
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.includes("from public.admin_quotes") && normalized.includes("where inquiry_id")) {
        return { rows: duplicate ? [{ id: quoteId }] : [] };
      }
      if (normalized.includes("from public.inquiries") && normalized.includes("for update")) {
        return { rows: inquiryRows };
      }
      if (normalized.includes("from public.inquiry_items")) {
        return { rows: [{ product_id: "product-1", product_code: "NB-001", quantity: 20, price_snapshot: 1100, subtotal: 22000 }] };
      }
      if (normalized.startsWith("insert into public.admin_quotes")) {
        return { rows: [{ id: quoteId, inquiry_id: inquiryId, status: "draft", confirmed_total: 22000, currency: "JPY", lead_time: null, shipping_note: null, admin_memo: null, quoted_by: adminViewer.userId, quoted_at: null, created_at: "2026-06-16T00:00:00.000Z", updated_at: "2026-06-16T00:00:00.000Z" }] };
      }
      if (normalized.startsWith("insert into public.admin_quote_items")) {
        return { rows: [{ id: "item-1", product_id: "product-1", product_code: "NB-001", requested_quantity: 20, confirmed_quantity: 20, requested_price_snapshot: 1100, confirmed_unit_price: 1100, confirmed_subtotal: 22000 }] };
      }
      if (normalized.startsWith("insert into public.audit_logs")) return { rows: [{ id: "audit-1" }] };
      if (normalized.includes("from public.admin_quotes") && normalized.includes("where aq.id")) {
        return {
          rows: [{
            id: quoteId,
            inquiry_id: inquiryId,
            inquiry_number: "INQ-001",
            company_name: "Buyer Co",
            status: quoteStatus,
            confirmed_total: 22000,
            requested_total: 22000,
            currency: "JPY",
            lead_time: null,
            shipping_note: null,
            admin_memo: null,
            quoted_by: null,
            quoted_at: null,
            current_document_id: null,
            created_at: "2026-06-16T00:00:00.000Z",
            updated_at: "2026-06-16T00:00:00.000Z"
          }]
        };
      }
      if (normalized.startsWith("update public.admin_quotes")) {
        quoteStatus = params[1] || quoteStatus;
        return { rows: [] };
      }
      if (normalized.startsWith("insert into public.admin_quote_status_history")) return { rows: [] };
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

test("createQuoteFromInquiry creates quote and items in one transaction", async () => {
  const fake = createFakePool();
  const result = await createAdminQuoteQueries(fake.pool).createQuoteFromInquiry(inquiryId, {}, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_quotes")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_quote_items")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
  assert.equal(result.quote.id, quoteId);
  assert.equal(result.items[0].confirmedSubtotal, 22000);
  assert.equal(result.auditLogId, "audit-1");
});

test("createQuoteFromInquiry returns conflict marker when quote already exists", async () => {
  const fake = createFakePool({ duplicate: true });
  const result = await createAdminQuoteQueries(fake.pool).createQuoteFromInquiry(inquiryId, {}, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(result.conflictQuoteId, quoteId);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_quotes")), false);
});

test("createQuoteFromInquiry rolls back when inquiry is not found", async () => {
  const fake = createFakePool({ inquiryRows: [] });
  const result = await createAdminQuoteQueries(fake.pool).createQuoteFromInquiry(inquiryId, {}, adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(result, null);
  assert.equal(texts.includes("rollback"), true);
  assert.equal(texts.includes("commit"), false);
  assert.equal(fake.releaseCount, 1);
});

test("updateQuoteDraft keeps quantity parameters consistently typed", async () => {
  const calls = [];
  const quoteRow = {
    id: quoteId,
    inquiry_id: inquiryId,
    inquiry_number: "INQ-001",
    company_name: "Buyer Co",
    status: "draft",
    confirmed_total: 1800,
    requested_total: 1800,
    currency: "KRW",
    lead_time: "7-14 business days",
    shipping_note: "EXW",
    valid_until: "2026-07-27",
    document_locale: "kr",
    customer_note: "Quote note",
    admin_memo: null,
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-20T00:00:00.000Z"
  };
  const itemRow = {
    id: "44444444-4444-4444-8444-444444444444",
    product_id: "product-1",
    product_code: "NB-001",
    product_name: "Test product",
    requested_quantity: 1,
    confirmed_quantity: 1,
    requested_price_snapshot: 1800,
    confirmed_unit_price: 1800,
    confirmed_subtotal: 1800
  };
  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim();
      const normalized = text.toLowerCase();
      calls.push({ sql: text, params });
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.includes("from public.admin_quotes") && normalized.includes("where aq.id")) return { rows: [quoteRow] };
      if (normalized.startsWith("update public.admin_quote_items")) return { rows: [{ id: itemRow.id }] };
      if (normalized.startsWith("select coalesce(sum(confirmed_subtotal)")) return { rows: [{ total: 1800 }] };
      if (normalized.startsWith("update public.admin_quotes")) return { rows: [] };
      if (normalized.includes("from public.admin_quote_items")) return { rows: [itemRow] };
      if (normalized.startsWith("insert into public.audit_logs")) return { rows: [{ id: "audit-1" }] };
      throw new Error(`Unexpected query: ${text}`);
    },
    release() {}
  };
  const pool = { async connect() { return client; } };

  const result = await createAdminQuoteQueries(pool).updateQuoteDraft(quoteId, {
    leadTime: quoteRow.lead_time,
    shippingNote: quoteRow.shipping_note,
    validUntil: quoteRow.valid_until,
    documentLocale: quoteRow.document_locale,
    customerNote: quoteRow.customer_note,
    adminMemo: "",
    items: [{
      id: itemRow.id,
      confirmedQuantity: 1,
      confirmedUnitPrice: 1800,
      itemNote: ""
    }]
  }, adminViewer);

  const itemUpdate = calls.find((call) => call.sql.toLowerCase().startsWith("update public.admin_quote_items"));
  assert.match(itemUpdate.sql, /confirmed_quantity = \$3::integer/i);
  assert.match(itemUpdate.sql, /round\(\(\$3::integer \* \$4::numeric\), 2\)/i);
  assert.equal(result.quote.confirmedTotal, 1800);
  assert.equal(result.items[0].confirmedQuantity, 1);
});

test("updateQuoteStatus cancels a quote and writes status history and audit log", async () => {
  const fake = createFakePool();
  const result = await createAdminQuoteQueries(fake.pool).updateQuoteStatus(quoteId, "cancelled", adminViewer);
  const texts = fake.calls.map((call) => call.sql.toLowerCase());

  assert.equal(texts.includes("begin"), true);
  assert.equal(texts.some((text) => text.includes("for update of aq")), true);
  assert.equal(texts.some((text) => text.startsWith("update public.admin_quotes")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.admin_quote_status_history")), true);
  assert.equal(texts.some((text) => text.startsWith("insert into public.audit_logs")), true);
  assert.equal(texts.includes("commit"), true);
  assert.equal(fake.releaseCount, 1);
  assert.equal(result.quote.status, "cancelled");
  assert.equal(result.auditLogId, "audit-1");
});
