import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createBuyerRecentProductQueries } from "../src/db/queries/buyerRecentProductQueries.js";

function createPool(handler) {
  const calls = [];
  const client = {
    async query(sql, params) {
      const call = { sql: String(sql), params };
      calls.push(call);
      return handler(call, calls);
    },
    release() {
      calls.push({ sql: "release", params: undefined });
    }
  };
  return {
    calls,
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

const viewer = { buyerId: "buyer-1" };
const policy = { limit: 10, retentionDays: 90 };

test("listRecentProducts prunes by buyer, age, and rank before returning visible products", async () => {
  const fixture = createPool(({ sql }) => {
    if (/select\s+p\.code as product_code/i.test(sql)) {
      return {
        rows: [
          { product_code: "NB-NEWEST", viewed_at: "2026-08-06T00:00:00.000Z" },
          { product_code: "NB-OLDER", viewed_at: "2026-08-05T00:00:00.000Z" }
        ]
      };
    }
    return { rows: [] };
  });

  const result = await createBuyerRecentProductQueries(fixture.pool).listRecentProducts(viewer, policy);

  assert.deepEqual(result.map((item) => item.productCode), ["NB-NEWEST", "NB-OLDER"]);
  const deletes = fixture.calls.filter((call) => /delete from public\.buyer_recent_product_views/i.test(call.sql));
  assert.equal(deletes.length, 3);
  assert.deepEqual(deletes[0].params, ["buyer-1"]);
  assert.match(deletes[0].sql, /products\.is_visible = false/i);
  assert.deepEqual(deletes[1].params, ["buyer-1", 90]);
  assert.deepEqual(deletes[2].params, ["buyer-1", 10]);
  assert.match(fixture.calls.find((call) => /select\s+p\.code as product_code/i.test(call.sql)).sql, /p\.is_visible = true/i);
  assert.ok(fixture.calls.some((call) => call.sql === "commit"));
});

test("recordProductView upserts the current buyer product and keeps only the latest ten", async () => {
  const fixture = createPool(({ sql }) => {
    if (/from public\.products/i.test(sql)) {
      return { rows: [{ id: "product-1", code: "NB-RECENT-1" }] };
    }
    if (/insert into public\.buyer_recent_product_views/i.test(sql)) {
      return { rows: [{ viewed_at: "2026-08-06T00:00:00.000Z" }] };
    }
    return { rows: [] };
  });

  const result = await createBuyerRecentProductQueries(fixture.pool).recordProductView(
    viewer,
    "NB-RECENT-1",
    policy
  );

  assert.equal(result.productCode, "NB-RECENT-1");
  const upsert = fixture.calls.find((call) => /insert into public\.buyer_recent_product_views/i.test(call.sql));
  assert.deepEqual(upsert.params, ["buyer-1", "product-1"]);
  assert.match(upsert.sql, /on conflict \(buyer_id, product_id\)/i);
  assert.ok(fixture.calls.some((call) => call.sql === "commit"));
});

test("recordProductView rolls back without storing hidden or missing products", async () => {
  const fixture = createPool(() => ({ rows: [] }));

  const result = await createBuyerRecentProductQueries(fixture.pool).recordProductView(
    viewer,
    "NB-HIDDEN",
    policy
  );

  assert.equal(result, null);
  assert.ok(fixture.calls.some((call) => call.sql === "rollback"));
  assert.ok(!fixture.calls.some((call) => /insert into public\.buyer_recent_product_views/i.test(call.sql)));
});

test("recent product migration cascades buyer and product deletion", () => {
  const migration = readFileSync(
    join(process.cwd(), "migrations", "20260806_buyer_recent_product_views.sql"),
    "utf8"
  );

  assert.match(migration, /buyer_id uuid NOT NULL REFERENCES public\.buyers\(id\) ON DELETE CASCADE/i);
  assert.match(migration, /product_id uuid NOT NULL REFERENCES public\.products\(id\) ON DELETE CASCADE/i);
  assert.match(migration, /PRIMARY KEY \(buyer_id, product_id\)/i);
  assert.match(migration, /buyer_recent_product_views_buyer_viewed_idx/i);
});
