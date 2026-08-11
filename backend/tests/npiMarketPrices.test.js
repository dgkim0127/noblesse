import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { toRateScaled } from "../src/fx/fxMath.js";
import {
  buildNpiMarketPriceRunKey,
  buildNpiMarketPriceTargets,
  classifyNpiMarketPriceState,
  executeNpiMarketPrices,
  npiMarketPriceExpectations,
  validateNpiDatabaseSnapshot,
  validateOfficialCompleteBundle
} from "../src/jobs/npiMarketPrices.js";
import { loadPublicationPlan } from "../src/jobs/npiPublication.js";
import { getNpiMarketPriceExecutionMode } from "../src/scripts/publishNpiMarketPrices.js";

const NOW = new Date("2026-08-11T06:00:00.000Z");
const SOURCE_EFFECTIVE_AT = "2026-08-11T05:00:00.000Z";
const FETCHED_AT = "2026-08-11T05:01:00.000Z";
const PAYLOAD_HASH = "a".repeat(64);

function uuid(group, index) {
  return `${String(group).padStart(8, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function createBundleRows(overrides = {}) {
  const rates = [
    ["KRW", 1],
    ["JPY", 10],
    ["USD", 1400],
    ["TWD", 45]
  ];
  return rates.map(([currency, krwPerUnit], index) => ({
    id: uuid(91, index + 1),
    provider: "exchange_rate_api",
    base_currency: "KRW",
    quote_currency: currency,
    krw_per_unit: String(krwPerUnit),
    rate_scaled: String(toRateScaled(krwPerUnit)),
    source_effective_at: SOURCE_EFFECTIVE_AT,
    fetched_at: FETCHED_AT,
    payload_hash: PAYLOAD_HASH,
    ...overrides
  }));
}

function createDatabaseFixture(plan) {
  const publishByCode = new Map(plan.publish.map((item) => [item.code, item]));
  const allCodes = [...plan.publish.map((item) => item.code), ...plan.hold.map((item) => item.code)].sort();
  const productRows = allCodes.map((code, index) => ({
    id: uuid(1, index + 1),
    code,
    is_visible: publishByCode.has(code)
  }));
  const productByCode = new Map(productRows.map((row) => [row.code, row]));
  const sourceRows = [...plan.publish]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((item, index) => ({
      id: uuid(2, index + 1),
      product_id: productByCode.get(item.code).id,
      code: item.code,
      market: "KR",
      currency: "KRW",
      wholesale_price: String(item.wholesalePriceKrw),
      retail_price: null,
      moq: 1,
      min_order_amount: "0",
      visible_to: "approved_only",
      is_active: true,
      updated_at: "2026-08-11T04:00:00.000Z"
    }));
  return { productRows, sourceRows, productByCode };
}

async function createPlanningFixture() {
  const plan = await loadPublicationPlan();
  const database = createDatabaseFixture(plan);
  const bundleRows = createBundleRows();
  const bundle = validateOfficialCompleteBundle(bundleRows, { now: NOW });
  const sources = validateNpiDatabaseSnapshot({ ...database, plan });
  const targets = buildNpiMarketPriceTargets({ plan, sources, bundle });
  const runKey = buildNpiMarketPriceRunKey(plan, bundle);
  return { plan, ...database, bundleRows, bundle, sources, targets, runKey };
}

function createFakePool(fixture) {
  const state = {
    targetPrices: [],
    policies: [],
    run: null,
    events: [],
    audits: []
  };
  const calls = [];
  let released = false;

  function productCode(productId) {
    return fixture.productRows.find((row) => row.id === productId)?.code || null;
  }

  const client = {
    async query(sql, params = []) {
      const text = String(sql);
      const normalized = text.trim().toLowerCase();
      calls.push({ sql: text, params });
      if (["begin", "commit", "rollback", "set transaction isolation level serializable"].includes(normalized)) {
        return { rows: [] };
      }
      if (normalized.startsWith("select pg_advisory_xact_lock")) return { rows: [{}] };
      if (text.includes("npi-market-prices:npi-products")) return { rows: fixture.productRows.map((row) => ({ ...row })) };
      if (text.includes("npi-market-prices:kr-source-prices")) return { rows: fixture.sourceRows.map((row) => ({ ...row })) };
      if (text.includes("npi-market-prices:official-fx-bundle")) return { rows: fixture.bundleRows.map((row) => ({ ...row })) };
      if (text.includes("npi-market-prices:invariant-fingerprint")) {
        return {
          rows: [{
            non_npi_price_count: 4,
            non_npi_price_digest: "non-npi-price",
            non_npi_policy_count: 4,
            non_npi_policy_digest: "non-npi-policy",
            non_npi_event_count: 2,
            non_npi_event_digest: "non-npi-event",
            hold_product_count: 17,
            hold_product_digest: "hold-product",
            hold_price_count: 0,
            hold_price_digest: "hold-price",
            hold_policy_count: 0,
            hold_policy_digest: "hold-policy",
            hold_event_count: 0,
            hold_event_digest: "hold-event"
          }]
        };
      }
      if (text.includes("npi-market-prices:target-prices") && !text.includes("insert-target-prices")) {
        return { rows: state.targetPrices.map((row) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:target-policies")) {
        return { rows: state.policies.map((row) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:run") && !text.includes("insert-run") && !text.includes("complete-run")) {
        return { rows: state.run ? [{ ...state.run }] : [] };
      }
      if (text.includes("npi-market-prices:events") && !text.includes("insert-events")) {
        return { rows: state.events.map((row) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:audits")) {
        return { rows: state.audits.map((row) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:insert-target-prices")) {
        const input = JSON.parse(params[0]);
        state.targetPrices = input.map((row, index) => ({
          id: uuid(3, index + 1),
          product_id: row.product_id,
          product_code: productCode(row.product_id),
          market: row.market,
          currency: row.currency,
          wholesale_price: String(row.wholesale_price),
          retail_price: row.retail_price == null ? null : String(row.retail_price),
          moq: row.moq,
          min_order_amount: String(row.min_order_amount),
          visible_to: "approved_only",
          is_active: true,
          updated_at: NOW.toISOString()
        }));
        return { rows: state.targetPrices.map(({ product_code: _productCode, ...row }) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:insert-run */")) {
        state.run = {
          id: uuid(4, 1),
          trigger_type: "manual_recheck",
          provider: params[0],
          source_effective_at: params[1],
          payload_hash: params[2],
          idempotency_key: params[3],
          update_threshold_bps: params[4],
          circuit_breaker_bps: params[5],
          max_rate_age_hours: params[6],
          status: "running",
          evaluated_count: 0,
          created_count: 0,
          updated_count: 0,
          held_count: 0,
          blocked_count: 0,
          error_count: 0,
          failure_category: null,
          started_at: params[7],
          completed_at: null
        };
        return { rows: [{ ...state.run }] };
      }
      if (text.includes("npi-market-prices:insert-policies")) {
        const input = JSON.parse(params[0]);
        state.policies = input.map((row, index) => ({
          id: uuid(5, index + 1),
          product_id: row.product_id,
          product_code: productCode(row.product_id),
          target_market: row.target_market,
          target_currency: row.target_currency,
          pricing_mode: "fx_auto",
          source_price_id: row.source_price_id,
          published_price_id: row.published_price_id,
          status: "created",
          latest_reference_wholesale_price: row.latest_reference_wholesale_price,
          latest_reference_retail_price: row.latest_reference_retail_price,
          latest_reference_min_order_amount: row.latest_reference_min_order_amount,
          latest_reference_rate_snapshot_id: row.rate_snapshot_id,
          last_applied_rate_snapshot_id: row.rate_snapshot_id,
          latest_source_price_updated_at: row.source_price_updated_at,
          last_applied_source_price_updated_at: row.source_price_updated_at,
          last_evaluated_at: params[1],
          last_applied_at: params[1]
        }));
        return { rows: state.policies.map((row) => ({ ...row })) };
      }
      if (text.includes("npi-market-prices:insert-events")) {
        const input = JSON.parse(params[0]);
        state.events = input.map((row, index) => ({
          id: uuid(6, index + 1),
          event_key: row.event_key,
          run_id: params[1],
          policy_id: row.policy_id,
          product_id: row.product_id,
          target_market: row.target_market,
          target_currency: row.target_currency,
          pricing_mode: "fx_auto",
          action: "initial_created",
          previous_wholesale_price: null,
          reference_wholesale_price: row.reference_wholesale_price,
          applied_wholesale_price: row.applied_wholesale_price,
          divergence_bps: null,
          rate_change_bps: null,
          rate_snapshot_id: row.rate_snapshot_id,
          source_price_updated_at: row.source_price_updated_at,
          reason: params[2]
        }));
        return { rows: state.events.map((row) => ({ id: row.id, event_key: row.event_key })) };
      }
      if (text.includes("npi-market-prices:insert-price-audits")) {
        const input = JSON.parse(params[0]);
        const rows = input.map((row, index) => ({
          id: uuid(7, index + 1),
          actor_user_id: null,
          actor_role: "system",
          action: "fx.auto.price.create",
          target_table: "product_prices",
          target_id: row.target_id,
          before_snapshot: null,
          after_snapshot: row.after_snapshot,
          request_id: params[1],
          ip_address: null,
          user_agent: params[2],
          created_at: NOW.toISOString()
        }));
        state.audits.push(...rows);
        return { rows: rows.map((row) => ({ id: row.id })) };
      }
      if (text.includes("npi-market-prices:complete-run")) {
        state.run = {
          ...state.run,
          status: "completed",
          evaluated_count: params[1],
          created_count: params[1],
          updated_count: 0,
          held_count: 0,
          blocked_count: 0,
          error_count: 0,
          completed_at: params[2]
        };
        return { rows: [{ ...state.run }] };
      }
      if (text.includes("npi-market-prices:insert-run-audit")) {
        const row = {
          id: uuid(8, 1),
          actor_user_id: null,
          actor_role: "system",
          action: "fx.auto.run.completed",
          target_table: "fx_auto_price_runs",
          target_id: params[0],
          before_snapshot: null,
          after_snapshot: JSON.parse(params[1]),
          request_id: params[2],
          ip_address: null,
          user_agent: params[3],
          created_at: NOW.toISOString()
        };
        state.audits.push(row);
        return { rows: [{ id: row.id }] };
      }
      throw new Error(`Unexpected fake query: ${normalized.slice(0, 160)}`);
    },
    release() {
      released = true;
    }
  };
  return {
    state,
    calls,
    get released() {
      return released;
    },
    pool: {
      async connect() {
        return client;
      }
    }
  };
}

test("official bundle accepts only a fresh, complete, internally consistent provider snapshot", () => {
  const bundle = validateOfficialCompleteBundle(createBundleRows(), { now: NOW });
  assert.equal(bundle.provider, "exchange_rate_api");
  assert.equal(bundle.sourceEffectiveAt, SOURCE_EFFECTIVE_AT);
  assert.deepEqual(Object.keys(bundle.rates).sort(), ["JPY", "KRW", "TWD", "USD"]);
  assert.equal(bundle.rates.KRW.rateScaled, 100000000);
  assert.equal(bundle.rates.USD.rateScaled, toRateScaled(1400));
});

test("official bundle validation fails closed for manual, incomplete, stale, mixed, or scaled-rate data", async (t) => {
  await t.test("manual provider", () => {
    assert.throws(
      () => validateOfficialCompleteBundle(createBundleRows({ provider: "manual" }), { now: NOW }),
      /official provider/
    );
  });
  await t.test("incomplete bundle", () => {
    assert.throws(
      () => validateOfficialCompleteBundle(createBundleRows().slice(0, 3), { now: NOW }),
      /exactly four rates/
    );
  });
  await t.test("stale bundle", () => {
    assert.throws(
      () => validateOfficialCompleteBundle(createBundleRows(), { now: new Date("2026-08-15T06:00:00.000Z") }),
      /stale or future-dated/
    );
  });
  await t.test("mixed payload", () => {
    const rows = createBundleRows();
    rows[2].payload_hash = "b".repeat(64);
    assert.throws(() => validateOfficialCompleteBundle(rows, { now: NOW }), /metadata is mixed/);
  });
  await t.test("scaled-rate mismatch", () => {
    const rows = createBundleRows();
    rows[1].rate_scaled = String(Number(rows[1].rate_scaled) + 1);
    assert.throws(() => validateOfficialCompleteBundle(rows, { now: NOW }), /scaled rate mismatch/);
  });
});

test("pinned NPI plan produces exactly 726 x 3 official-FX target prices with existing rounding", async () => {
  const fixture = await createPlanningFixture();
  assert.equal(fixture.sources.length, 726);
  assert.equal(fixture.targets.length, 2178);
  assert.equal(new Set(fixture.targets.map((target) => target.key)).size, 2178);
  assert.deepEqual(
    Object.fromEntries(["JP", "US", "TW"].map((market) => [
      market,
      fixture.targets.filter((target) => target.market === market).length
    ])),
    { JP: 726, US: 726, TW: 726 }
  );

  const priced = fixture.plan.publish.find((item) => item.wholesalePriceKrw === 1500);
  const byMarket = Object.fromEntries(
    fixture.targets.filter((target) => target.productCode === priced.code).map((target) => [target.market, target])
  );
  assert.equal(byMarket.JP.wholesalePrice, 150);
  assert.equal(byMarket.US.wholesalePrice, 1.07);
  assert.equal(byMarket.TW.wholesalePrice, 33.33);
});

test("NPI database snapshot requires all 726 published products visible and all 17 holds inactive", async () => {
  const plan = await loadPublicationPlan();
  const fixture = createDatabaseFixture(plan);
  assert.equal(validateNpiDatabaseSnapshot({ ...fixture, plan }).length, 726);

  const heldCode = plan.hold[0].code;
  const heldVisible = fixture.productRows.map((row) => row.code === heldCode ? { ...row, is_visible: true } : row);
  assert.throws(
    () => validateNpiDatabaseSnapshot({ productRows: heldVisible, sourceRows: fixture.sourceRows, plan }),
    /held product is visible/
  );

  const wrongSources = fixture.sourceRows.map((row, index) => index === 0
    ? { ...row, wholesale_price: String(Number(row.wholesale_price) + 1) }
    : row);
  assert.throws(
    () => validateNpiDatabaseSnapshot({ productRows: fixture.productRows, sourceRows: wrongSources, plan }),
    /KR source price mismatch/
  );

  const publicSource = fixture.sourceRows.map((row, index) => index === 0
    ? { ...row, visible_to: "public" }
    : row);
  assert.throws(
    () => validateNpiDatabaseSnapshot({ productRows: fixture.productRows, sourceRows: publicSource, plan }),
    /missing active KR\/KRW source price/
  );
});

test("existing state classifier accepts only empty or fully materialized state", async () => {
  const fixture = await createPlanningFixture();
  const empty = { priceRows: [], policyRows: [], runRows: [], eventRows: [], auditRows: [] };
  assert.equal(classifyNpiMarketPriceState({
    targets: fixture.targets,
    runKey: fixture.runKey,
    bundle: fixture.bundle,
    manifestSha256: fixture.plan.manifestSha256,
    state: empty
  }), "empty");

  const target = fixture.targets[0];
  assert.throws(() => classifyNpiMarketPriceState({
    targets: fixture.targets,
    runKey: fixture.runKey,
    bundle: fixture.bundle,
    manifestSha256: fixture.plan.manifestSha256,
    state: {
      ...empty,
      priceRows: [{
        id: uuid(3, 1),
        product_id: target.productId,
        product_code: target.productCode,
        market: target.market,
        currency: target.currency,
        wholesale_price: target.wholesalePrice,
        retail_price: target.retailPrice,
        moq: target.moq,
        min_order_amount: target.minOrderAmount,
        visible_to: "approved_only",
        is_active: true
      }]
    }
  }), /partial, manual, or conflicting existing state/);
});

test("verify mode uses SERIALIZABLE plus both advisory locks and never writes", async () => {
  const fixture = await createPlanningFixture();
  const fake = createFakePool(fixture);
  const result = await executeNpiMarketPrices({ pool: fake.pool, mode: "verify", now: NOW });

  assert.equal(result.state, "empty");
  assert.equal(result.changed, 0);
  assert.equal(result.committed, false);
  assert.equal(fake.released, true);
  const statements = fake.calls.map((call) => call.sql.trim());
  assert.equal(statements.includes("set transaction isolation level serializable"), true);
  const locks = statements.filter((statement) => statement.startsWith("select pg_advisory_xact_lock"));
  assert.deepEqual(locks, [
    "select pg_advisory_xact_lock(hashtext('noblesse.fx_auto_price_evaluation'))",
    "select pg_advisory_xact_lock(hashtext('noblesse-npi-market-prices-20260811'))"
  ]);
  assert.equal(statements.at(-1), "rollback");
  assert.equal(statements.some((statement) => /insert into public\./i.test(statement)), false);
  const appendOnlyReads = fake.calls
    .map((call) => call.sql)
    .filter((sql) => /npi-market-prices:(events|audits)/.test(sql));
  assert.equal(appendOnlyReads.length, 2);
  assert.equal(appendOnlyReads.some((sql) => /for update/i.test(sql)), false);
});

test("full mode rolls back before writes when the validated official bundle misses its apply pin", async () => {
  const fixture = await createPlanningFixture();
  const fake = createFakePool(fixture);
  await assert.rejects(
    () => executeNpiMarketPrices({
      pool: fake.pool,
      mode: "full",
      now: NOW,
      expectedPayloadHash: "b".repeat(64),
      expectedSourceEffectiveAt: SOURCE_EFFECTIVE_AT
    }),
    /does not match the pinned payload hash\/source time/
  );
  const statements = fake.calls.map((call) => call.sql.trim());
  assert.equal(statements.at(-1), "rollback");
  assert.equal(statements.some((statement) => /npi-market-prices:insert-/i.test(statement)), false);
  assert.equal(fake.released, true);
});

test("full mode rolls back a partial/manual NPI target state without overwriting it", async () => {
  const fixture = await createPlanningFixture();
  const fake = createFakePool(fixture);
  const target = fixture.targets[0];
  fake.state.targetPrices.push({
    id: uuid(31, 1),
    product_id: target.productId,
    product_code: target.productCode,
    market: target.market,
    currency: target.currency,
    wholesale_price: String(target.wholesalePrice),
    retail_price: target.retailPrice,
    moq: target.moq,
    min_order_amount: String(target.minOrderAmount),
    visible_to: "approved_only",
    is_active: true
  });
  fake.state.policies.push({
    id: uuid(32, 1),
    product_id: target.productId,
    product_code: target.productCode,
    target_market: target.market,
    target_currency: target.currency,
    pricing_mode: "manual_fixed"
  });

  await assert.rejects(
    () => executeNpiMarketPrices({
      pool: fake.pool,
      mode: "full",
      now: NOW,
      expectedPayloadHash: PAYLOAD_HASH,
      expectedSourceEffectiveAt: SOURCE_EFFECTIVE_AT
    }),
    /partial, manual, or conflicting existing state/
  );
  const statements = fake.calls.map((call) => call.sql.trim());
  assert.equal(statements.at(-1), "rollback");
  assert.equal(statements.some((statement) => /npi-market-prices:insert-/i.test(statement)), false);
  assert.equal(fake.state.targetPrices.length, 1);
  assert.equal(fake.state.policies[0].pricing_mode, "manual_fixed");
});

test("full mode creates one exact 2,178-row set and a rerun is a verified no-op", async () => {
  const fixture = await createPlanningFixture();
  const fake = createFakePool(fixture);
  const first = await executeNpiMarketPrices({
    pool: fake.pool,
    mode: "full",
    now: NOW,
    expectedPayloadHash: PAYLOAD_HASH,
    expectedSourceEffectiveAt: SOURCE_EFFECTIVE_AT
  });

  assert.equal(first.state, "complete");
  assert.equal(first.changed, npiMarketPriceExpectations.targetPrices);
  assert.equal(first.committed, true);
  assert.equal(first.noOp, false);
  assert.equal(fake.state.targetPrices.length, 2178);
  assert.equal(fake.state.policies.length, 2178);
  assert.equal(fake.state.events.length, 2178);
  assert.equal(fake.state.audits.length, 2179);
  assert.equal(fake.state.run.status, "completed");
  assert.equal(fake.state.run.created_count, 2178);

  const insertMarkers = fake.calls
    .map((call) => call.sql)
    .filter((sql) => sql.includes("npi-market-prices:insert-target-prices"));
  assert.equal(insertMarkers.length, 1);
  assert.match(insertMarkers[0], /jsonb_to_recordset/i);
  assert.doesNotMatch(insertMarkers[0], /on conflict/i);
  const policyInsert = fake.calls
    .map((call) => call.sql)
    .find((sql) => sql.includes("npi-market-prices:insert-policies"));
  assert.match(policyInsert, /order by inserted\.product_id, inserted\.target_market/i);

  const writeCountBeforeRetry = fake.calls.filter((call) => /npi-market-prices:insert-/i.test(call.sql)).length;
  const second = await executeNpiMarketPrices({
    pool: fake.pool,
    mode: "full",
    now: NOW,
    expectedPayloadHash: PAYLOAD_HASH,
    expectedSourceEffectiveAt: SOURCE_EFFECTIVE_AT
  });
  const writeCountAfterRetry = fake.calls.filter((call) => /npi-market-prices:insert-/i.test(call.sql)).length;
  assert.equal(second.state, "complete");
  assert.equal(second.changed, 0);
  assert.equal(second.committed, false);
  assert.equal(second.noOp, true);
  assert.equal(writeCountAfterRetry, writeCountBeforeRetry);
});

test("script mode/apply guard is fail-closed and exposes no FX rate override input", () => {
  assert.equal(getNpiMarketPriceExecutionMode({}), "verify");
  assert.equal(getNpiMarketPriceExecutionMode({
    NPI_MARKET_PRICE_MODE: "full",
    NPI_MARKET_PRICE_APPLY: "true",
    NPI_FX_PAYLOAD_HASH: PAYLOAD_HASH,
    NPI_FX_SOURCE_EFFECTIVE_AT: SOURCE_EFFECTIVE_AT
  }), "full");
  assert.throws(
    () => getNpiMarketPriceExecutionMode({ NPI_MARKET_PRICE_MODE: "verify", NPI_MARKET_PRICE_APPLY: "true" }),
    /mode\/apply guard mismatch/
  );
  assert.throws(
    () => getNpiMarketPriceExecutionMode({ NPI_MARKET_PRICE_MODE: "full" }),
    /mode\/apply guard mismatch/
  );
  assert.throws(
    () => getNpiMarketPriceExecutionMode({ NPI_MARKET_PRICE_MODE: "full", NPI_MARKET_PRICE_APPLY: "true" }),
    /NPI_FX_PAYLOAD_HASH/
  );
  assert.throws(
    () => getNpiMarketPriceExecutionMode({
      NPI_MARKET_PRICE_MODE: "full",
      NPI_MARKET_PRICE_APPLY: "true",
      NPI_FX_PAYLOAD_HASH: PAYLOAD_HASH
    }),
    /NPI_FX_SOURCE_EFFECTIVE_AT/
  );
  assert.throws(
    () => getNpiMarketPriceExecutionMode({
      NPI_MARKET_PRICE_MODE: "full",
      NPI_MARKET_PRICE_APPLY: "true",
      NPI_FX_PAYLOAD_HASH: PAYLOAD_HASH,
      NPI_FX_SOURCE_EFFECTIVE_AT: "not-an-iso-date"
    }),
    /NPI_FX_SOURCE_EFFECTIVE_AT/
  );
  assert.throws(
    () => getNpiMarketPriceExecutionMode({ NPI_MARKET_PRICE_MODE: "canary", NPI_MARKET_PRICE_APPLY: "true" }),
    /must be verify or full/
  );

  const jobSource = readFileSync(join(process.cwd(), "src", "jobs", "npiMarketPrices.js"), "utf8");
  const scriptSource = readFileSync(join(process.cwd(), "src", "scripts", "publishNpiMarketPrices.js"), "utf8");
  assert.doesNotMatch(jobSource, /process\.env/);
  assert.doesNotMatch(`${jobSource}\n${scriptSource}`, /JPY_RATE|USD_RATE|TWD_RATE|EXCHANGE_RATE_API_KEY/);
  assert.doesNotMatch(scriptSource, /process\.env\.(?:JPY|USD|TWD|FX)/);
});
