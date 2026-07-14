import assert from "node:assert/strict";
import test from "node:test";
import { createAdminAnalyticsQueries } from "../src/db/queries/adminAnalyticsQueries.js";

function createAnalyticsPool() {
  return {
    async query(text) {
      const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.includes("as inquiry_total")) {
        return {
          rows: [{
            inquiry_total: 7,
            quote_total: 4,
            quote_issued: 3,
            buyer_total: 5,
            product_total: 12,
            product_visible: 9,
            product_hidden: 3
          }]
        };
      }
      if (normalized.includes("from public.inquiries group by status")) {
        return { rows: [{ status: "requested", count: 2 }, { status: "checking", count: 1 }, { status: "confirmed", count: 1 }] };
      }
      if (normalized.includes("from public.admin_quotes group by status")) {
        return { rows: [{ status: "draft", count: 1 }, { status: "sent", count: 1 }, { status: "accepted", count: 2 }] };
      }
      if (normalized.includes("from public.buyers group by")) {
        return { rows: [{ status: "pending", count: 2 }, { status: "approved", count: 3 }] };
      }
      if (normalized.includes("group by coalesce(nullif(market")) {
        return { rows: [{ market: "KR", count: 4 }, { market: "JP", count: 3 }] };
      }
      if (normalized.startsWith("with inquiry_totals")) {
        return {
          rows: [
            { currency: "JPY", request_count: 2, requested_total: "24000", issued_count: 1, issued_total: "13000" },
            { currency: "KRW", request_count: 5, requested_total: "80000", issued_count: 2, issued_total: "51000" }
          ]
        };
      }
      throw new Error(`Unexpected analytics query: ${normalized}`);
    }
  };
}

test("admin analytics aggregates operational counts without mixing currencies", async () => {
  const queries = createAdminAnalyticsQueries(createAnalyticsPool());
  const result = await queries.getAnalyticsSummary();

  assert.deepEqual(result.overview, {
    openInquiries: 3,
    draftQuotes: 1,
    awaitingBuyer: 1,
    acceptedQuotes: 2,
    pendingBuyers: 2
  });
  assert.equal(result.inquiries.total, 7);
  assert.deepEqual(result.inquiries.statuses, [
    { status: "requested", count: 2 },
    { status: "checking", count: 1 },
    { status: "quoted", count: 0 },
    { status: "confirmed", count: 1 },
    { status: "cancelled", count: 0 }
  ]);
  assert.equal(result.quotes.issued, 3);
  assert.deepEqual(result.markets, [{ market: "KR", count: 4 }, { market: "JP", count: 3 }]);
  assert.deepEqual(result.currencyTotals, [
    { currency: "JPY", requestCount: 2, requestedTotal: 24000, issuedCount: 1, issuedTotal: 13000 },
    { currency: "KRW", requestCount: 5, requestedTotal: 80000, issuedCount: 2, issuedTotal: 51000 }
  ]);
  assert.match(result.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
