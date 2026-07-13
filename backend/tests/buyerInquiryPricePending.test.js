import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerInquiryQueries } from "../src/db/queries/buyerInquiryQueries.js";

test("createInquiry creates a price-pending inquiry when visible product has no exact price", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/join public\.product_prices/i.test(sql)) {
        return { rows: [] };
      }
      if (/from public\.products p/i.test(sql)) {
        return {
          rows: [{
            product_id: "product-1",
            product_code: "NB-001",
            name_en: "Product One",
            name_ko: "Product One",
            category_id: "category-1",
            material: "Surgical Steel",
            moq_default: 1
          }]
        };
      }
      if (/insert into public\.inquiries/i.test(sql)) {
        return {
          rows: [{
            id: "inquiry-1",
            inquiry_number: "INQ-001",
            buyer_id: params[1],
            market: params[2],
            currency: params[3],
            status: "requested",
            total_items: params[4],
            total_quantity: params[5],
            estimated_total: params[6],
            request_memo: params[7],
            admin_memo: "",
            created_at: "2026-06-24T00:00:00.000Z",
            updated_at: "2026-06-24T00:00:00.000Z"
          }]
        };
      }
      if (/insert into public\.inquiry_items/i.test(sql)) {
        return {
          rows: [{
            id: "item-1",
            product_code: params[2],
            product_name: params[3],
            category_id: params[4],
            material: params[5],
            color: params[6],
            size: params[7],
            quantity: params[8],
            moq: params[9],
            price_snapshot: params[10],
            subtotal: params[11]
          }]
        };
      }
      return { rows: [] };
    },
    release() {}
  };
  const pool = { async connect() { return client; } };

  const inquiry = await createBuyerInquiryQueries(pool).createInquiry(
    {
      buyerId: "buyer-1",
      assignedMarket: "KR",
      currency: "KRW",
      discountRate: 0,
      companyName: "Buyer",
      country: "KR"
    },
    {
      requestMemo: "Need review",
      items: [{ productCode: "NB-001", color: "OR", quantity: 1 }]
    }
  );

  const inquiryInsert = calls.find((call) => /insert into public\.inquiries/i.test(call.sql));
  const itemInsert = calls.find((call) => /insert into public\.inquiry_items/i.test(call.sql));

  assert.equal(inquiry.market, "KR");
  assert.equal(inquiry.currency, "KRW");
  assert.equal(inquiry.estimatedTotal, 0);
  assert.equal(inquiry.items[0].priceUnavailable, true);
  assert.deepEqual(inquiryInsert.params.slice(2, 7), ["KR", "KRW", 1, 1, 0]);
  assert.equal(itemInsert.params[10], 0);
  assert.equal(itemInsert.params[11], 0);
  assert.ok(calls.some((call) => call.sql === "commit"));
});

test("createInquiry keeps hidden or unknown products blocked when no exact price exists", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/join public\.product_prices/i.test(sql)) return { rows: [] };
      if (/from public\.products p/i.test(sql)) return { rows: [] };
      return { rows: [] };
    },
    release() {}
  };
  const pool = { async connect() { return client; } };

  const inquiry = await createBuyerInquiryQueries(pool).createInquiry(
    {
      buyerId: "buyer-1",
      assignedMarket: "KR",
      currency: "KRW",
      discountRate: 0
    },
    {
      requestMemo: "",
      items: [{ productCode: "NB-HIDDEN", quantity: 1 }]
    }
  );

  assert.equal(inquiry, null);
  assert.ok(calls.some((call) => call.sql === "rollback"));
  assert.ok(!calls.some((call) => /insert into public\.inquiries/i.test(call.sql)));
});
