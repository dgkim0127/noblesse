import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerInquiryQueries } from "../src/db/queries/buyerInquiryQueries.js";

test("buyer product price query requires exact market and currency", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      return { rows: [] };
    }
  };

  await createBuyerInquiryQueries(pool).listProductPrices({
    role: "buyer",
    assignedMarket: "TW",
    currency: "TWD"
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /pp\.market = \$1/i);
  assert.match(calls[0].sql, /pp\.currency = \$2/i);
  assert.doesNotMatch(calls[0].sql, /pp\.currency = \$2\s+or\s+pp\.market = \$1/i);
  assert.deepEqual(calls[0].params, ["TW", "TWD"]);
});

test("createInquiry rolls back if a priced product is not the viewer exact price book", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/from public\.products p/i.test(sql)) {
        return {
          rows: [{
            product_id: "product-1",
            product_code: "NB-001",
            name_en: "Product",
            name_ko: "?í’ˆ",
            category_id: "category-1",
            material: "Surgical Steel",
            id: "price-1",
            market: "US",
            currency: "USD",
            wholesale_price: 8.8,
            moq: 20,
            visible_to: "approved_only",
            is_active: true
          }]
        };
      }
      return { rows: [] };
    },
    release() {}
  };
  const pool = {
    async connect() {
      return client;
    }
  };

  const inquiry = await createBuyerInquiryQueries(pool).createInquiry(
    {
      buyerId: "buyer-1",
      assignedMarket: "TW",
      currency: "TWD",
      discountRate: 0
    },
    {
      requestMemo: "",
      items: [{ productCode: "NB-001", quantity: 20 }]
    }
  );

  assert.equal(inquiry, null);
  assert.ok(calls.some((call) => call.sql === "rollback"));
  assert.ok(!calls.some((call) => /insert into public\.inquiries/i.test(call.sql)));
  const priceQuery = calls.find((call) => /from public\.products p/i.test(call.sql));
  assert.match(priceQuery.sql, /pp\.market = \$2/i);
  assert.match(priceQuery.sql, /pp\.currency = \$3/i);
  assert.deepEqual(priceQuery.params, ["NB-001", "TW", "TWD"]);
});

test("createInquiry stores discounted cents and subtotal without floating drift", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/from public\.products p/i.test(sql)) {
        return {
          rows: [params[0] === "NB-001" ? {
            product_id: "product-1",
            product_code: "NB-001",
            name_en: "Product One",
            name_ko: "?í’ˆ1",
            category_id: "category-1",
            material: "Surgical Steel",
            id: "price-1",
            market: "US",
            currency: "USD",
            wholesale_price: "9.99",
            moq: 1,
            visible_to: "approved_only",
            is_active: true
          } : {
            product_id: "product-2",
            product_code: "NB-002",
            name_en: "Product Two",
            name_ko: "?í’ˆ2",
            category_id: "category-1",
            material: "Cubic",
            id: "price-2",
            market: "US",
            currency: "USD",
            wholesale_price: "2.01",
            moq: 1,
            visible_to: "approved_only",
            is_active: true
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
            id: `item-${calls.length}`,
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
      assignedMarket: "US",
      currency: "USD",
      discountRate: 10,
      companyName: "Buyer",
      country: "US"
    },
    {
      requestMemo: "Check cents",
      items: [
        { productCode: "NB-001", quantity: 3 },
        { productCode: "NB-002", quantity: 5 }
      ]
    }
  );

  const inquiryInsert = calls.find((call) => /insert into public\.inquiries/i.test(call.sql));
  const itemInserts = calls.filter((call) => /insert into public\.inquiry_items/i.test(call.sql));

  assert.equal(inquiry.market, "US");
  assert.equal(inquiry.currency, "USD");
  assert.deepEqual(inquiryInsert.params.slice(2, 7), ["US", "USD", 2, 8, 36.02]);
  assert.equal(itemInserts[0].params[10], 8.99);
  assert.equal(itemInserts[0].params[11], 26.97);
  assert.equal(itemInserts[1].params[10], 1.81);
  assert.equal(itemInserts[1].params[11], 9.05);
  assert.ok(calls.some((call) => call.sql === "commit"));
});

test("createInquiry rolls back if subtotal exceeds safe integer range", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/from public\.products p/i.test(sql)) {
        return {
          rows: [{
            product_id: "product-1",
            product_code: "NB-001",
            name_en: "Product",
            name_ko: "Product",
            category_id: "category-1",
            material: "Surgical Steel",
            id: "price-1",
            market: "KR",
            currency: "KRW",
            wholesale_price: Number.MAX_SAFE_INTEGER,
            moq: 1,
            visible_to: "approved_only",
            is_active: true
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
      discountRate: 0
    },
    {
      requestMemo: "",
      items: [{ productCode: "NB-001", quantity: 2 }]
    }
  );

  assert.equal(inquiry, null);
  assert.ok(calls.some((call) => call.sql === "rollback"));
  assert.ok(!calls.some((call) => /insert into public\.inquiries/i.test(call.sql)));
});
