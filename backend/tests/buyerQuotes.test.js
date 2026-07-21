import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerQuoteQueries } from "../src/db/queries/buyerQuoteQueries.js";
import { createBuyerQuoteService } from "../src/services/buyerQuoteService.js";

const quoteId = "11111111-1111-4111-8111-111111111111";
const inquiryId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const viewer = {
  userId: "44444444-4444-4444-8444-444444444444",
  buyerId: "55555555-5555-4555-8555-555555555555",
  role: "buyer",
  accountStatus: "active",
  verificationStatus: "approved"
};

function buyerQuoteRow(status = "sent") {
  return {
    id: quoteId,
    inquiry_id: inquiryId,
    quote_number: "QT-001",
    status,
    valid_until: "2099-12-31",
    current_document_id: documentId,
    decision_note: null,
    accepted_at: status === "accepted" ? "2026-07-13T00:00:00.000Z" : null,
    rejected_at: null,
    revision: 1,
    document_locale: "en",
    snapshot: { total: 100 },
    issued_at: "2026-07-13T00:00:00.000Z"
  };
}

test("buyer quote service allows an active registered buyer before manual approval", async () => {
  let called = false;
  const service = createBuyerQuoteService({
    queries: { async getQuoteForInquiry() { called = true; return { quoteId }; } },
    objectStore: {}
  });

  const result = await service.getQuoteForInquiry(inquiryId, { ...viewer, verificationStatus: "pending" });

  assert.equal(called, true);
  assert.equal(result.quoteId, quoteId);
});

test("buyer quote service rejects restricted or incomplete buyer accounts", async () => {
  let called = false;
  const service = createBuyerQuoteService({
    queries: { async getQuoteForInquiry() { called = true; } },
    objectStore: {}
  });

  for (const currentViewer of [
    { ...viewer, verificationStatus: "rejected" },
    { ...viewer, verificationStatus: "suspended" },
    { ...viewer, accountStatus: "blocked" },
    { ...viewer, buyerId: null }
  ]) {
    await assert.rejects(
      () => service.getQuoteForInquiry(inquiryId, currentViewer),
      (error) => error.code === "FORBIDDEN"
    );
  }
  assert.equal(called, false);
});

test("buyer document access is served only after an ownership query succeeds", async () => {
  let requested;
  const stream = { pipe() {} };
  const service = createBuyerQuoteService({
    queries: {
      async getDocumentAccess(currentViewer, currentQuoteId, currentDocumentId) {
        requested = [currentViewer.buyerId, currentQuoteId, currentDocumentId];
        return { pdfObjectKey: "quotes/private.pdf", quoteNumber: "QT-001", revision: 1 };
      }
    },
    objectStore: { async createReadStream(key) { assert.equal(key, "quotes/private.pdf"); return stream; } }
  });

  const result = await service.getQuoteDocument(quoteId, documentId, viewer);
  assert.deepEqual(requested, [viewer.buyerId, quoteId, documentId]);
  assert.equal(result.stream, stream);
  assert.equal(result.filename, "QT-001-v1.pdf");
});

test("buyer quote query accepts only the current sent document and records history", async () => {
  const calls = [];
  let status = "sent";
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).toLowerCase().replace(/\s+/g, " ").trim();
      calls.push({ normalized, params });
      if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.includes("select q.*, i.buyer_id")) return { rows: [{ ...buyerQuoteRow(status), buyer_id: viewer.buyerId }] };
      if (normalized.startsWith("select ($1::date < current_date)")) return { rows: [{ expired: false }] };
      if (normalized.startsWith("update public.admin_quotes")) { status = params[1]; return { rows: [] }; }
      if (normalized.startsWith("insert into public.admin_quote_status_history")) return { rows: [] };
      if (normalized.includes("from public.admin_quotes q") && normalized.includes("where q.id = $1")) return { rows: [buyerQuoteRow(status)] };
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {}
  };
  const queries = createBuyerQuoteQueries({ async connect() { return client; } });

  const result = await queries.decideQuote(viewer, quoteId, { documentId, decision: "accepted", note: "Please follow up" });

  assert.equal(result.quote.status, "accepted");
  assert.equal(result.accepted, true);
  assert.equal(calls.some((call) => call.normalized.includes("for update of q")), true);
  assert.equal(calls.some((call) => call.normalized.startsWith("insert into public.admin_quote_status_history")), true);
  assert.equal(calls.some((call) => call.normalized === "commit"), true);
});

test("buyer quote query rejects a stale document before mutation", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      const normalized = String(sql).toLowerCase().replace(/\s+/g, " ").trim();
      calls.push(normalized);
      if (["begin", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.includes("select q.*, i.buyer_id")) return { rows: [{ ...buyerQuoteRow(), current_document_id: "66666666-6666-4666-8666-666666666666" }] };
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {}
  };
  const queries = createBuyerQuoteQueries({ async connect() { return client; } });

  const result = await queries.decideQuote(viewer, quoteId, { documentId, decision: "rejected", note: "" });

  assert.equal(result.stale, true);
  assert.equal(calls.some((call) => call.startsWith("update public.admin_quotes")), false);
  assert.equal(calls.includes("rollback"), true);
});

test("buyer quote query disables accept and reject for the offline fulfillment workflow", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      const normalized = String(sql).toLowerCase().replace(/\s+/g, " ").trim();
      calls.push(normalized);
      if (["begin", "rollback"].includes(normalized)) return { rows: [] };
      if (normalized.includes("select q.*, i.buyer_id")) {
        return { rows: [{ ...buyerQuoteRow(), workflow_version: 2, workflow_status: "picking", buyer_id: viewer.buyerId }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {}
  };
  const queries = createBuyerQuoteQueries({ async connect() { return client; } });

  const result = await queries.decideQuote(viewer, quoteId, { documentId, decision: "accepted", note: "" });

  assert.equal(result.decisionDisabled, true);
  assert.equal(calls.some((sql) => sql.startsWith("update public.admin_quotes")), false);
  assert.equal(calls.includes("rollback"), true);
});
