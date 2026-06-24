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
    assignedMarket: "CN",
    currency: "CNY"
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /pp\.market = \$1/i);
  assert.match(calls[0].sql, /pp\.currency = \$2/i);
  assert.doesNotMatch(calls[0].sql, /pp\.currency = \$2\s+or\s+pp\.market = \$1/i);
  assert.deepEqual(calls[0].params, ["CN", "CNY"]);
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
            name_ko: "상품",
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
      assignedMarket: "CN",
      currency: "CNY",
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
  assert.deepEqual(priceQuery.params, ["NB-001", "CN", "CNY"]);
});
