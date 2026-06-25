import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createAdminPriceQueries } from "../src/db/queries/adminPriceQueries.js";

test("listPrices queries product_prices with product metadata joins and filters", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      return {
        rows: [
          {
            id: "price-1",
            product_id: "product-1",
            product_code: "NB-001",
            product_name_ko: "상품",
            product_name_en: "Product",
            market: "JP",
            currency: "JPY",
            wholesale_price: 1100,
            retail_price: 1800,
            moq: 20,
            min_order_amount: 0,
            visible_to: "approved_only",
            is_active: true,
            updated_at: "2026-06-16T00:00:00.000Z"
          }
        ]
      };
    }
  };

  const prices = await createAdminPriceQueries(pool).listPrices({
    market: "JP",
    active: true,
    q: "NB-001",
    limit: 20,
    offset: 0
  });

  assert.match(calls[0].sql, /from public\.product_prices pp/i);
  assert.match(calls[0].sql, /join public\.products p/i);
  assert.deepEqual(calls[0].params, ["JP", true, "%NB-001%", 20, 0]);
  assert.equal(prices[0].productCode, "NB-001");
  assert.equal(prices[0].wholesalePrice, 1100);
});

test("price-book FX setup preserves existing automatic publication state on retry", () => {
  const source = readFileSync(join(process.cwd(), "src", "db", "queries", "adminPriceQueries.js"), "utf8");

  assert.match(source, /published_price_id = product_price_policies\.published_price_id/i);
  assert.match(source, /status = product_price_policies\.status/i);
  assert.match(source, /product_price_policies\.pricing_mode = 'fx_auto'/i);
  assert.doesNotMatch(source, /published_price_id = null,\s*status = 'pending_rate',\s*paused_at = null/is);
});

test("FX evaluator validates source and published price ownership before mutation", () => {
  const source = readFileSync(join(process.cwd(), "src", "db", "queries", "adminFxQueries.js"), "utf8");

  assert.match(source, /Source price ownership mismatch/i);
  assert.match(source, /Published price ownership mismatch/i);
  assert.match(source, /and product_id = \$2\s+and market = \$3\s+and currency = \$4\s+for update/is);
  assert.match(source, /triggerType === "manual_recheck"\) return null/);
  assert.match(source, /triggerType === "mode_change"/);
});
