import { createHash } from "node:crypto";
import {
  FX_AUTO_CIRCUIT_BREAKER_BPS,
  FX_AUTO_UPDATE_THRESHOLD_BPS,
  FX_MAX_RATE_AGE_HOURS,
  FX_RATE_SCALE,
  isSnapshotFresh,
  toRateScaled
} from "../fx/fxMath.js";
import { calculateFxReference } from "../fx/fxAutoPriceEngine.js";
import { EXCHANGE_RATE_API_PROVIDER_ID } from "../fx/officialFxProvider.js";
import {
  loadPublicationPlan,
  publicationExpectations
} from "./npiPublication.js";

const TARGET_MARKETS = Object.freeze([
  Object.freeze({ market: "JP", currency: "JPY" }),
  Object.freeze({ market: "US", currency: "USD" }),
  Object.freeze({ market: "TW", currency: "TWD" })
]);

const REQUIRED_BUNDLE_CURRENCIES = Object.freeze(["KRW", "JPY", "USD", "TWD"]);
const JOB_NAME = "noblesse-npi-market-prices-20260811";
const JOB_USER_AGENT = "noblesse-npi-market-prices-job";
const EVENT_REASON = "Initial FX_AUTO price can be created";
const MAX_NUMERIC_14_2 = 999999999999.99;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const npiMarketPriceExpectations = Object.freeze({
  totalProducts: publicationExpectations.total,
  publishProducts: publicationExpectations.publish,
  holdProducts: publicationExpectations.hold,
  targetMarkets: TARGET_MARKETS.length,
  targetPrices: publicationExpectations.publish * TARGET_MARKETS.length,
  priceAudits: publicationExpectations.publish * TARGET_MARKETS.length,
  totalAudits: publicationExpectations.publish * TARGET_MARKETS.length + 1
});

function fail(message) {
  throw new Error(`NPI market price guard failed: ${message}`);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function asDate(value, label) {
  const date = new Date(value);
  if (value == null || Number.isNaN(date.getTime())) fail(`invalid ${label}`);
  return date;
}

function iso(value, label) {
  return asDate(value, label).toISOString();
}

function sameTimestamp(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return asDate(left, "timestamp").getTime() === asDate(right, "timestamp").getTime();
}

function asFiniteMoney(value, label, { nullable = false, positive = false } = {}) {
  if (value == null && nullable) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_NUMERIC_14_2) {
    fail(`invalid ${label}`);
  }
  if (positive && parsed <= 0) fail(`invalid ${label}`);
  return parsed;
}

function asPositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(`invalid ${label}`);
  return parsed;
}

function assertMoneyEqual(actual, expected, label) {
  if (expected == null) {
    if (actual != null) fail(`${label} mismatch`);
    return;
  }
  if (Number(actual) !== Number(expected)) fail(`${label} mismatch`);
}

function assertExactSet(actualValues, expectedValues, label) {
  const actual = [...actualValues].map(String).sort();
  const expected = [...expectedValues].map(String).sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail(`${label} set mismatch`);
  }
}

function assertPublicationPlan(plan) {
  if (!plan || plan.total !== npiMarketPriceExpectations.totalProducts) {
    fail("pinned publication plan total mismatch");
  }
  if (!/^[a-f0-9]{64}$/.test(plan.manifestSha256 || "")) {
    fail("pinned publication manifest hash is invalid");
  }
  if (
    !Array.isArray(plan.publish) ||
    !Array.isArray(plan.hold) ||
    plan.publish.length !== npiMarketPriceExpectations.publishProducts ||
    plan.hold.length !== npiMarketPriceExpectations.holdProducts
  ) {
    fail("pinned publication plan classification mismatch");
  }

  const codes = new Set();
  for (const item of [...plan.publish, ...plan.hold]) {
    if (!/^NPI-[A-F0-9]{10}$/.test(item?.code || "") || codes.has(item.code)) {
      fail("pinned publication plan code mismatch");
    }
    codes.add(item.code);
  }
  for (const item of plan.publish) {
    if (!Number.isInteger(item.wholesalePriceKrw) || item.wholesalePriceKrw <= 0) {
      fail(`invalid pinned KR price: ${item.code}`);
    }
  }
  return plan;
}

export function validateOfficialCompleteBundle(rows, { now = new Date() } = {}) {
  if (!Array.isArray(rows) || rows.length !== REQUIRED_BUNDLE_CURRENCIES.length) {
    fail("official FX bundle must contain exactly four rates");
  }
  const nowDate = asDate(now, "current time");
  const first = rows[0];
  if (!first || first.provider !== EXCHANGE_RATE_API_PROVIDER_ID) {
    fail("FX bundle is not from the official provider");
  }
  if (!/^[a-f0-9]{64}$/.test(first.payload_hash || "")) {
    fail("FX bundle payload hash is invalid");
  }
  const sourceEffectiveAt = iso(first.source_effective_at, "FX source effective time");
  if (!isSnapshotFresh(sourceEffectiveAt, nowDate, FX_MAX_RATE_AGE_HOURS)) {
    fail("official FX bundle is stale or future-dated");
  }

  const rates = {};
  const seenIds = new Set();
  for (const row of rows) {
    if (
      row.provider !== EXCHANGE_RATE_API_PROVIDER_ID ||
      row.base_currency !== "KRW" ||
      row.payload_hash !== first.payload_hash ||
      !sameTimestamp(row.source_effective_at, sourceEffectiveAt)
    ) {
      fail("official FX bundle metadata is mixed");
    }
    if (!hasText(row.id) || seenIds.has(String(row.id))) fail("FX bundle snapshot ID mismatch");
    seenIds.add(String(row.id));
    if (!REQUIRED_BUNDLE_CURRENCIES.includes(row.quote_currency) || rates[row.quote_currency]) {
      fail("official FX bundle currency set mismatch");
    }

    const fetchedAt = asDate(row.fetched_at, "FX fetched time");
    if (
      fetchedAt.getTime() < asDate(sourceEffectiveAt, "FX source effective time").getTime() ||
      fetchedAt.getTime() > nowDate.getTime() + MAX_CLOCK_SKEW_MS
    ) {
      fail("official FX bundle fetched time is invalid");
    }
    const krwPerUnit = Number(row.krw_per_unit);
    const rateScaled = Number(row.rate_scaled);
    if (!Number.isFinite(krwPerUnit) || krwPerUnit <= 0 || !Number.isSafeInteger(rateScaled) || rateScaled <= 0) {
      fail(`invalid official FX rate: ${row.quote_currency}`);
    }
    let recalculated;
    try {
      recalculated = toRateScaled(krwPerUnit);
    } catch {
      fail(`invalid official FX rate: ${row.quote_currency}`);
    }
    if (recalculated !== rateScaled) fail(`official FX scaled rate mismatch: ${row.quote_currency}`);
    if (row.quote_currency === "KRW" && (krwPerUnit !== 1 || rateScaled !== FX_RATE_SCALE)) {
      fail("official FX KRW base rate mismatch");
    }
    rates[row.quote_currency] = {
      id: String(row.id),
      currency: row.quote_currency,
      krwPerUnit,
      rateScaled,
      sourceEffectiveAt,
      fetchedAt: fetchedAt.toISOString()
    };
  }

  assertExactSet(Object.keys(rates), REQUIRED_BUNDLE_CURRENCIES, "official FX currency");
  return {
    provider: EXCHANGE_RATE_API_PROVIDER_ID,
    sourceEffectiveAt,
    payloadHash: first.payload_hash,
    rates
  };
}

export function validateNpiDatabaseSnapshot({ productRows, sourceRows, plan }) {
  assertPublicationPlan(plan);
  const expectedCodes = [...plan.publish.map((item) => item.code), ...plan.hold.map((item) => item.code)];
  assertExactSet(productRows.map((row) => row.code), expectedCodes, "database NPI product code");

  const productByCode = new Map();
  const productIds = new Set();
  for (const row of productRows) {
    if (!hasText(row.id) || productIds.has(String(row.id)) || productByCode.has(row.code)) {
      fail("database NPI product identity mismatch");
    }
    if (typeof row.is_visible !== "boolean") fail(`invalid visibility state: ${row.code}`);
    productIds.add(String(row.id));
    productByCode.set(row.code, row);
  }

  const sourceByProductId = new Map();
  for (const row of sourceRows) {
    if (!productIds.has(String(row.product_id)) || sourceByProductId.has(String(row.product_id))) {
      fail("database NPI KR source price set mismatch");
    }
    if (row.market !== "KR") fail("database NPI KR source market mismatch");
    sourceByProductId.set(String(row.product_id), row);
  }

  const sources = [];
  for (const desired of plan.publish) {
    const product = productByCode.get(desired.code);
    if (product.is_visible !== true) fail(`publish product is not visible: ${desired.code}`);
    const row = sourceByProductId.get(String(product.id));
    if (
      !row ||
      row.currency !== "KRW" ||
      row.visible_to !== "approved_only" ||
      row.is_active !== true
    ) {
      fail(`missing active KR/KRW source price: ${desired.code}`);
    }
    const wholesalePrice = asFiniteMoney(row.wholesale_price, `${desired.code} KR wholesale price`, { positive: true });
    if (wholesalePrice !== desired.wholesalePriceKrw) fail(`KR source price mismatch: ${desired.code}`);
    sources.push({
      productId: String(product.id),
      productCode: desired.code,
      sourcePriceId: String(row.id),
      wholesalePrice,
      retailPrice: asFiniteMoney(row.retail_price, `${desired.code} KR retail price`, { nullable: true }),
      moq: asPositiveInteger(row.moq, `${desired.code} KR MOQ`),
      minOrderAmount: asFiniteMoney(row.min_order_amount, `${desired.code} KR minimum order amount`, { nullable: true }),
      updatedAt: iso(row.updated_at, `${desired.code} KR source updated time`)
    });
  }

  for (const held of plan.hold) {
    const product = productByCode.get(held.code);
    if (product.is_visible !== false) fail(`held product is visible: ${held.code}`);
    const row = sourceByProductId.get(String(product.id));
    if (row?.is_active === true) fail(`held product has an active KR source price: ${held.code}`);
  }
  if (sources.length !== npiMarketPriceExpectations.publishProducts) {
    fail("active KR source price count mismatch");
  }
  return sources.sort((left, right) => left.productCode.localeCompare(right.productCode));
}

export function buildNpiMarketPriceTargets({ plan, sources, bundle }) {
  assertPublicationPlan(plan);
  const sourceByCode = new Map(sources.map((source) => [source.productCode, source]));
  assertExactSet(sourceByCode.keys(), plan.publish.map((item) => item.code), "NPI KR source code");

  const targets = [];
  for (const item of [...plan.publish].sort((left, right) => left.code.localeCompare(right.code))) {
    const source = sourceByCode.get(item.code);
    for (const targetSpec of TARGET_MARKETS) {
      const rate = bundle?.rates?.[targetSpec.currency];
      if (!rate) fail(`missing official FX rate: ${targetSpec.currency}`);
      const reference = calculateFxReference({
        policy: { targetCurrency: targetSpec.currency },
        sourcePrice: {
          wholesalePrice: source.wholesalePrice,
          retailPrice: source.retailPrice,
          minOrderAmount: source.minOrderAmount
        },
        rate
      });
      const wholesalePrice = asFiniteMoney(
        reference?.wholesalePrice,
        `${item.code} ${targetSpec.market} wholesale price`,
        { positive: true }
      );
      const retailPrice = asFiniteMoney(
        reference?.retailPrice,
        `${item.code} ${targetSpec.market} retail price`,
        { nullable: true }
      );
      const referenceMinOrderAmount = asFiniteMoney(
        reference?.minOrderAmount,
        `${item.code} ${targetSpec.market} minimum order amount`,
        { nullable: true }
      );
      targets.push({
        key: `${item.code}:${targetSpec.market}`,
        productId: source.productId,
        productCode: item.code,
        market: targetSpec.market,
        currency: targetSpec.currency,
        wholesalePrice,
        retailPrice,
        moq: source.moq,
        minOrderAmount: referenceMinOrderAmount ?? 0,
        referenceMinOrderAmount,
        sourcePriceId: source.sourcePriceId,
        sourcePriceUpdatedAt: source.updatedAt,
        rateSnapshotId: rate.id,
        rateScaled: rate.rateScaled
      });
    }
  }
  if (targets.length !== npiMarketPriceExpectations.targetPrices) {
    fail("exact 726 x 3 target count mismatch");
  }
  assertExactSet(
    targets.map((target) => target.key),
    plan.publish.flatMap((item) => TARGET_MARKETS.map((target) => `${item.code}:${target.market}`)),
    "NPI target price"
  );
  return targets;
}

export function buildNpiMarketPriceRunKey(plan, bundle) {
  assertPublicationPlan(plan);
  const digest = createHash("sha256")
    .update([
      plan.manifestSha256,
      bundle.provider,
      bundle.sourceEffectiveAt,
      bundle.payloadHash,
      plan.publish.map((item) => `${item.code}:${item.wholesalePriceKrw}`).join("|")
    ].join("\n"))
    .digest("hex");
  return `${JOB_NAME}:${digest}`;
}

function eventKey(runKey, target) {
  return `${runKey}:${target.productCode}:${target.market}`;
}

function normalizeFingerprint(row = {}) {
  return JSON.stringify({
    nonNpiPriceCount: Number(row.non_npi_price_count || 0),
    nonNpiPriceDigest: row.non_npi_price_digest || null,
    nonNpiPolicyCount: Number(row.non_npi_policy_count || 0),
    nonNpiPolicyDigest: row.non_npi_policy_digest || null,
    nonNpiEventCount: Number(row.non_npi_event_count || 0),
    nonNpiEventDigest: row.non_npi_event_digest || null,
    holdProductCount: Number(row.hold_product_count || 0),
    holdProductDigest: row.hold_product_digest || null,
    holdPriceCount: Number(row.hold_price_count || 0),
    holdPriceDigest: row.hold_price_digest || null,
    holdPolicyCount: Number(row.hold_policy_count || 0),
    holdPolicyDigest: row.hold_policy_digest || null,
    holdEventCount: Number(row.hold_event_count || 0),
    holdEventDigest: row.hold_event_digest || null
  });
}

async function queryNpiProducts(client) {
  return client.query(`
    /* npi-market-prices:npi-products */
    select p.id::text, p.code, p.is_visible
    from public.products p
    where p.code like 'NPI-%'
    order by p.code
    for update of p
  `);
}

async function queryNpiKrwPrices(client) {
  return client.query(`
    /* npi-market-prices:kr-source-prices */
    select
      pp.id::text,
      pp.product_id::text,
      p.code,
      pp.market,
      pp.currency,
      pp.wholesale_price::text,
      pp.retail_price::text,
      pp.moq,
      pp.min_order_amount::text,
      pp.visible_to,
      pp.is_active,
      pp.updated_at
    from public.product_prices pp
    join public.products p on p.id = pp.product_id
    where p.code like 'NPI-%'
      and pp.market = 'KR'
    order by p.code
    for update of pp
  `);
}

async function queryLatestOfficialBundle(client) {
  return client.query(`
    /* npi-market-prices:official-fx-bundle */
    with latest_bundle as (
      select provider, source_effective_at, payload_hash, max(created_at) as latest_created_at
      from public.fx_rate_snapshots
      where provider = 'exchange_rate_api'
        and base_currency = 'KRW'
      group by provider, source_effective_at, payload_hash
      having count(*) = 4
        and count(distinct quote_currency) = 4
        and bool_and(quote_currency in ('KRW', 'JPY', 'USD', 'TWD'))
      order by source_effective_at desc, max(created_at) desc
      limit 1
    )
    select
      snapshots.id::text,
      snapshots.provider,
      snapshots.base_currency,
      snapshots.quote_currency,
      snapshots.krw_per_unit::text,
      snapshots.rate_scaled::text,
      snapshots.source_effective_at,
      snapshots.fetched_at,
      snapshots.payload_hash
    from public.fx_rate_snapshots snapshots
    join latest_bundle bundle
      on bundle.provider = snapshots.provider
      and bundle.source_effective_at = snapshots.source_effective_at
      and bundle.payload_hash = snapshots.payload_hash
    order by snapshots.quote_currency
    for share of snapshots
  `);
}

async function queryInvariantFingerprint(client, holdCodes) {
  const result = await client.query(`
    /* npi-market-prices:invariant-fingerprint */
    with
    non_npi_prices as (
      select pp.* from public.product_prices pp
      join public.products p on p.id = pp.product_id
      where p.code not like 'NPI-%'
    ),
    non_npi_policies as (
      select ppp.* from public.product_price_policies ppp
      join public.products p on p.id = ppp.product_id
      where p.code not like 'NPI-%'
    ),
    non_npi_events as (
      select event.* from public.fx_auto_price_events event
      join public.products p on p.id = event.product_id
      where p.code not like 'NPI-%'
    ),
    held_products as (
      select p.* from public.products p where p.code = any($1::text[])
    ),
    held_prices as (
      select pp.* from public.product_prices pp
      join public.products p on p.id = pp.product_id
      where p.code = any($1::text[])
    ),
    held_policies as (
      select ppp.* from public.product_price_policies ppp
      join public.products p on p.id = ppp.product_id
      where p.code = any($1::text[])
    ),
    held_events as (
      select event.* from public.fx_auto_price_events event
      join public.products p on p.id = event.product_id
      where p.code = any($1::text[])
    )
    select
      (select count(*)::int from non_npi_prices) as non_npi_price_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from non_npi_prices row_data) as non_npi_price_digest,
      (select count(*)::int from non_npi_policies) as non_npi_policy_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from non_npi_policies row_data) as non_npi_policy_digest,
      (select count(*)::int from non_npi_events) as non_npi_event_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from non_npi_events row_data) as non_npi_event_digest,
      (select count(*)::int from held_products) as hold_product_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from held_products row_data) as hold_product_digest,
      (select count(*)::int from held_prices) as hold_price_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from held_prices row_data) as hold_price_digest,
      (select count(*)::int from held_policies) as hold_policy_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from held_policies row_data) as hold_policy_digest,
      (select count(*)::int from held_events) as hold_event_count,
      (select md5(coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb)::text) from held_events row_data) as hold_event_digest
  `, [holdCodes]);
  return normalizeFingerprint(result.rows[0]);
}

async function queryTargetPrices(client) {
  return client.query(`
    /* npi-market-prices:target-prices */
    select
      pp.id::text,
      pp.product_id::text,
      p.code as product_code,
      pp.market,
      pp.currency,
      pp.wholesale_price::text,
      pp.retail_price::text,
      pp.moq,
      pp.min_order_amount::text,
      pp.visible_to,
      pp.is_active,
      pp.updated_at
    from public.product_prices pp
    join public.products p on p.id = pp.product_id
    where p.code like 'NPI-%'
      and pp.market in ('JP', 'US', 'TW')
    order by p.code, pp.market
    for update of pp
  `);
}

async function queryTargetPolicies(client) {
  return client.query(`
    /* npi-market-prices:target-policies */
    select
      ppp.*,
      ppp.id::text,
      ppp.product_id::text,
      ppp.source_price_id::text,
      ppp.published_price_id::text,
      ppp.latest_reference_rate_snapshot_id::text,
      ppp.last_applied_rate_snapshot_id::text,
      p.code as product_code
    from public.product_price_policies ppp
    join public.products p on p.id = ppp.product_id
    where p.code like 'NPI-%'
      and ppp.target_market in ('JP', 'US', 'TW')
    order by p.code, ppp.target_market, ppp.target_currency
    for update of ppp
  `);
}

async function queryRunArtifacts(client, { runKey, expectedEventKeys }) {
  const runResult = await client.query(`
    /* npi-market-prices:run */
    select * from public.fx_auto_price_runs
    where idempotency_key = $1
    for update
  `, [runKey]);
  const runId = runResult.rows[0]?.id || null;
  const eventResult = await client.query(`
    /* npi-market-prices:events */
    select
      event.*,
      event.id::text,
      event.run_id::text,
      event.policy_id::text,
      event.product_id::text,
      event.rate_snapshot_id::text
    from public.fx_auto_price_events event
    where ($1::uuid is not null and event.run_id = $1::uuid)
       or event.event_key = any($2::text[])
    order by event.event_key
  `, [runId, expectedEventKeys]);
  const auditResult = await client.query(`
    /* npi-market-prices:audits */
    select * from public.audit_logs
    where request_id = $1
    order by created_at, id
  `, [runKey]);
  return { runRows: runResult.rows, eventRows: eventResult.rows, auditRows: auditResult.rows };
}

async function queryExistingState(client, targets, runKey) {
  const prices = await queryTargetPrices(client);
  const policies = await queryTargetPolicies(client);
  const artifacts = await queryRunArtifacts(client, {
    runKey,
    expectedEventKeys: targets.map((target) => eventKey(runKey, target))
  });
  return {
    priceRows: prices.rows,
    policyRows: policies.rows,
    ...artifacts
  };
}

function parseJson(value, label) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to the fail-closed error below.
    }
  }
  fail(`invalid ${label}`);
}

function verifyCompleteState({ targets, runKey, bundle, manifestSha256, state }) {
  if (state.priceRows.length !== targets.length) fail("complete target price count mismatch");
  if (state.policyRows.length !== targets.length) fail("complete target policy count mismatch");
  if (state.runRows.length !== 1) fail("complete run count mismatch");
  if (state.eventRows.length !== targets.length) fail("complete event count mismatch");
  if (state.auditRows.length !== targets.length + 1) fail("complete audit count mismatch");

  const targetByKey = new Map(targets.map((target) => [target.key, target]));
  const priceByKey = new Map();
  for (const row of state.priceRows) {
    const key = `${row.product_code}:${row.market}`;
    const target = targetByKey.get(key);
    if (!target || priceByKey.has(key)) fail("complete target price set mismatch");
    if (
      String(row.product_id) !== target.productId ||
      row.currency !== target.currency ||
      row.visible_to !== "approved_only" ||
      row.is_active !== true ||
      Number(row.moq) !== target.moq
    ) {
      fail(`complete target price contract mismatch: ${key}`);
    }
    assertMoneyEqual(row.wholesale_price, target.wholesalePrice, `${key} wholesale price`);
    assertMoneyEqual(row.retail_price, target.retailPrice, `${key} retail price`);
    assertMoneyEqual(row.min_order_amount, target.minOrderAmount, `${key} minimum order amount`);
    priceByKey.set(key, row);
  }
  assertExactSet(priceByKey.keys(), targetByKey.keys(), "complete target price");

  const policyByKey = new Map();
  for (const row of state.policyRows) {
    const key = `${row.product_code}:${row.target_market}`;
    const target = targetByKey.get(key);
    const price = priceByKey.get(key);
    if (!target || !price || policyByKey.has(key)) fail("complete target policy set mismatch");
    if (
      String(row.product_id) !== target.productId ||
      row.target_currency !== target.currency ||
      row.pricing_mode !== "fx_auto" ||
      String(row.source_price_id) !== target.sourcePriceId ||
      String(row.published_price_id) !== String(price.id) ||
      row.status !== "created" ||
      String(row.latest_reference_rate_snapshot_id) !== target.rateSnapshotId ||
      String(row.last_applied_rate_snapshot_id) !== target.rateSnapshotId ||
      !sameTimestamp(row.latest_source_price_updated_at, target.sourcePriceUpdatedAt) ||
      !sameTimestamp(row.last_applied_source_price_updated_at, target.sourcePriceUpdatedAt) ||
      row.last_evaluated_at == null ||
      row.last_applied_at == null
    ) {
      fail(`complete FX_AUTO policy contract mismatch: ${key}`);
    }
    assertMoneyEqual(row.latest_reference_wholesale_price, target.wholesalePrice, `${key} policy wholesale reference`);
    assertMoneyEqual(row.latest_reference_retail_price, target.retailPrice, `${key} policy retail reference`);
    assertMoneyEqual(
      row.latest_reference_min_order_amount,
      target.referenceMinOrderAmount,
      `${key} policy minimum order reference`
    );
    policyByKey.set(key, row);
  }
  assertExactSet(policyByKey.keys(), targetByKey.keys(), "complete target policy");

  const run = state.runRows[0];
  if (
    run.idempotency_key !== runKey ||
    run.trigger_type !== "manual_recheck" ||
    run.provider !== bundle.provider ||
    !sameTimestamp(run.source_effective_at, bundle.sourceEffectiveAt) ||
    run.payload_hash !== bundle.payloadHash ||
    Number(run.update_threshold_bps) !== FX_AUTO_UPDATE_THRESHOLD_BPS ||
    Number(run.circuit_breaker_bps) !== FX_AUTO_CIRCUIT_BREAKER_BPS ||
    Number(run.max_rate_age_hours) !== FX_MAX_RATE_AGE_HOURS ||
    run.status !== "completed" ||
    Number(run.evaluated_count) !== targets.length ||
    Number(run.created_count) !== targets.length ||
    Number(run.updated_count) !== 0 ||
    Number(run.held_count) !== 0 ||
    Number(run.blocked_count) !== 0 ||
    Number(run.error_count) !== 0 ||
    run.completed_at == null
  ) {
    fail("complete FX_AUTO run contract mismatch");
  }

  const targetByEventKey = new Map(targets.map((target) => [eventKey(runKey, target), target]));
  const eventByKey = new Map();
  for (const row of state.eventRows) {
    const target = targetByEventKey.get(row.event_key);
    if (!target || eventByKey.has(row.event_key)) fail("complete FX_AUTO event set mismatch");
    const policy = policyByKey.get(target.key);
    if (
      String(row.run_id) !== String(run.id) ||
      String(row.policy_id) !== String(policy.id) ||
      String(row.product_id) !== target.productId ||
      row.target_market !== target.market ||
      row.target_currency !== target.currency ||
      row.pricing_mode !== "fx_auto" ||
      row.action !== "initial_created" ||
      row.previous_wholesale_price != null ||
      row.divergence_bps != null ||
      row.rate_change_bps != null ||
      String(row.rate_snapshot_id) !== target.rateSnapshotId ||
      !sameTimestamp(row.source_price_updated_at, target.sourcePriceUpdatedAt) ||
      row.reason !== EVENT_REASON
    ) {
      fail(`complete FX_AUTO event contract mismatch: ${target.key}`);
    }
    assertMoneyEqual(row.reference_wholesale_price, target.wholesalePrice, `${target.key} event reference`);
    assertMoneyEqual(row.applied_wholesale_price, target.wholesalePrice, `${target.key} event applied price`);
    eventByKey.set(row.event_key, row);
  }
  assertExactSet(eventByKey.keys(), targetByEventKey.keys(), "complete FX_AUTO event");

  const expectedPriceIds = new Set([...priceByKey.values()].map((row) => String(row.id)));
  const targetByAuditKey = new Map(targets.map((target) => [`${target.productCode}:${target.market}`, target]));
  const seenPriceAudits = new Set();
  let runAuditCount = 0;
  for (const row of state.auditRows) {
    if (
      row.request_id !== runKey ||
      row.actor_user_id != null ||
      row.actor_role !== "system" ||
      row.user_agent !== JOB_USER_AGENT
    ) {
      fail("complete audit actor contract mismatch");
    }
    if (row.action === "fx.auto.price.create") {
      if (
        row.target_table !== "product_prices" ||
        !expectedPriceIds.has(String(row.target_id)) ||
        seenPriceAudits.has(String(row.target_id)) ||
        row.before_snapshot != null
      ) {
        fail("complete price audit set mismatch");
      }
      const after = parseJson(row.after_snapshot, "price audit snapshot");
      const target = targetByAuditKey.get(`${after.productCode}:${after.market}`);
      if (
        !target ||
        after.manifestSha256 !== manifestSha256 ||
        after.payloadHash !== bundle.payloadHash ||
        after.currency !== target.currency ||
        after.sourcePriceId !== target.sourcePriceId ||
        after.rateSnapshotId !== target.rateSnapshotId
      ) {
        fail("complete price audit snapshot mismatch");
      }
      assertMoneyEqual(after.wholesalePrice, target.wholesalePrice, `${target.key} audit wholesale price`);
      seenPriceAudits.add(String(row.target_id));
    } else if (row.action === "fx.auto.run.completed") {
      runAuditCount += 1;
      if (row.target_table !== "fx_auto_price_runs" || String(row.target_id) !== String(run.id)) {
        fail("complete run audit target mismatch");
      }
      const after = parseJson(row.after_snapshot, "run audit snapshot");
      if (
        after.evaluated !== targets.length ||
        after.created !== targets.length ||
        after.updated !== 0 ||
        after.held !== 0 ||
        after.blocked !== 0 ||
        after.error !== 0
      ) {
        fail("complete run audit snapshot mismatch");
      }
    } else {
      fail("unexpected audit action in NPI market price run");
    }
  }
  if (seenPriceAudits.size !== targets.length || runAuditCount !== 1) {
    fail("complete audit set mismatch");
  }
}

export function classifyNpiMarketPriceState({ targets, runKey, bundle, manifestSha256, state }) {
  const artifactCount =
    state.priceRows.length +
    state.policyRows.length +
    state.runRows.length +
    state.eventRows.length +
    state.auditRows.length;
  if (artifactCount === 0) return "empty";
  try {
    verifyCompleteState({ targets, runKey, bundle, manifestSha256, state });
    return "complete";
  } catch (error) {
    const detail = error instanceof Error ? error.message.replace(/^NPI market price guard failed:\s*/, "") : "unknown conflict";
    fail(`partial, manual, or conflicting existing state: ${detail}`);
  }
}

async function insertTargetPrices(client, targets) {
  const payload = targets.map((target) => ({
    product_id: target.productId,
    market: target.market,
    currency: target.currency,
    wholesale_price: target.wholesalePrice,
    retail_price: target.retailPrice,
    moq: target.moq,
    min_order_amount: target.minOrderAmount
  }));
  const result = await client.query(`
    /* npi-market-prices:insert-target-prices */
    with input as (
      select * from jsonb_to_recordset($1::jsonb) as row_data(
        product_id uuid,
        market text,
        currency text,
        wholesale_price numeric(14,2),
        retail_price numeric(14,2),
        moq integer,
        min_order_amount numeric(14,2)
      )
    ),
    inserted as (
      insert into public.product_prices (
        product_id, market, currency, wholesale_price, retail_price,
        moq, min_order_amount, visible_to, is_active
      )
      select
        product_id, market, currency, wholesale_price, retail_price,
        moq, min_order_amount, 'approved_only', true
      from input
      order by product_id, market
      returning *
    )
    select
      id::text,
      product_id::text,
      market,
      currency,
      wholesale_price::text,
      retail_price::text,
      moq,
      min_order_amount::text,
      visible_to,
      is_active,
      updated_at
    from inserted
    order by product_id, market
  `, [JSON.stringify(payload)]);
  if (result.rows.length !== targets.length) fail("set-based target price insert count mismatch");
  return result.rows;
}

async function insertRun(client, { runKey, bundle, startedAt }) {
  const result = await client.query(`
    /* npi-market-prices:insert-run */
    insert into public.fx_auto_price_runs (
      trigger_type, provider, source_effective_at, payload_hash, idempotency_key,
      update_threshold_bps, circuit_breaker_bps, max_rate_age_hours,
      status, started_at
    )
    values ('manual_recheck', $1, $2, $3, $4, $5, $6, $7, 'running', $8)
    returning *
  `, [
    bundle.provider,
    bundle.sourceEffectiveAt,
    bundle.payloadHash,
    runKey,
    FX_AUTO_UPDATE_THRESHOLD_BPS,
    FX_AUTO_CIRCUIT_BREAKER_BPS,
    FX_MAX_RATE_AGE_HOURS,
    startedAt
  ]);
  if (result.rows.length !== 1) fail("FX_AUTO run insert mismatch");
  return result.rows[0];
}

async function insertPolicies(client, { targets, insertedPrices, appliedAt }) {
  const priceByKey = new Map(insertedPrices.map((row) => [`${row.product_id}:${row.market}`, row]));
  const payload = targets.map((target) => {
    const price = priceByKey.get(`${target.productId}:${target.market}`);
    if (!price) fail(`inserted price identity mismatch: ${target.key}`);
    return {
      product_id: target.productId,
      target_market: target.market,
      target_currency: target.currency,
      source_price_id: target.sourcePriceId,
      published_price_id: String(price.id),
      latest_reference_wholesale_price: target.wholesalePrice,
      latest_reference_retail_price: target.retailPrice,
      latest_reference_min_order_amount: target.referenceMinOrderAmount,
      rate_snapshot_id: target.rateSnapshotId,
      source_price_updated_at: target.sourcePriceUpdatedAt
    };
  });
  const result = await client.query(`
    /* npi-market-prices:insert-policies */
    with input as (
      select * from jsonb_to_recordset($1::jsonb) as row_data(
        product_id uuid,
        target_market text,
        target_currency text,
        source_price_id uuid,
        published_price_id uuid,
        latest_reference_wholesale_price numeric(14,2),
        latest_reference_retail_price numeric(14,2),
        latest_reference_min_order_amount numeric(14,2),
        rate_snapshot_id uuid,
        source_price_updated_at timestamptz
      )
    ),
    inserted as (
      insert into public.product_price_policies (
        product_id, target_market, target_currency, pricing_mode,
        source_price_id, published_price_id, status,
        latest_reference_wholesale_price, latest_reference_retail_price,
        latest_reference_min_order_amount,
        latest_reference_rate_snapshot_id, last_applied_rate_snapshot_id,
        latest_source_price_updated_at, last_applied_source_price_updated_at,
        last_evaluated_at, last_applied_at
      )
      select
        product_id, target_market, target_currency, 'fx_auto',
        source_price_id, published_price_id, 'created',
        latest_reference_wholesale_price, latest_reference_retail_price,
        latest_reference_min_order_amount,
        rate_snapshot_id, rate_snapshot_id,
        source_price_updated_at, source_price_updated_at,
        $2::timestamptz, $2::timestamptz
      from input
      order by product_id, target_market
      returning *
    )
    select
      inserted.*,
      inserted.id::text,
      inserted.product_id::text,
      inserted.source_price_id::text,
      inserted.published_price_id::text,
      inserted.latest_reference_rate_snapshot_id::text,
      inserted.last_applied_rate_snapshot_id::text
    from inserted
    order by inserted.product_id, inserted.target_market
  `, [JSON.stringify(payload), appliedAt]);
  if (result.rows.length !== targets.length) fail("set-based FX_AUTO policy insert count mismatch");
  return result.rows;
}

async function insertEvents(client, { targets, policies, run, runKey }) {
  const policyByKey = new Map(policies.map((row) => [`${row.product_id}:${row.target_market}`, row]));
  const payload = targets.map((target) => {
    const policy = policyByKey.get(`${target.productId}:${target.market}`);
    if (!policy) fail(`inserted policy identity mismatch: ${target.key}`);
    return {
      event_key: eventKey(runKey, target),
      policy_id: String(policy.id),
      product_id: target.productId,
      target_market: target.market,
      target_currency: target.currency,
      reference_wholesale_price: target.wholesalePrice,
      applied_wholesale_price: target.wholesalePrice,
      rate_snapshot_id: target.rateSnapshotId,
      source_price_updated_at: target.sourcePriceUpdatedAt
    };
  });
  const result = await client.query(`
    /* npi-market-prices:insert-events */
    with input as (
      select * from jsonb_to_recordset($1::jsonb) as row_data(
        event_key text,
        policy_id uuid,
        product_id uuid,
        target_market text,
        target_currency text,
        reference_wholesale_price numeric(14,2),
        applied_wholesale_price numeric(14,2),
        rate_snapshot_id uuid,
        source_price_updated_at timestamptz
      )
    )
    insert into public.fx_auto_price_events (
      event_key, run_id, policy_id, product_id,
      target_market, target_currency, pricing_mode, action,
      previous_wholesale_price, reference_wholesale_price, applied_wholesale_price,
      divergence_bps, rate_change_bps, rate_snapshot_id,
      source_price_updated_at, reason
    )
    select
      event_key, $2::uuid, policy_id, product_id,
      target_market, target_currency, 'fx_auto', 'initial_created',
      null, reference_wholesale_price, applied_wholesale_price,
      null, null, rate_snapshot_id,
      source_price_updated_at, $3
    from input
    order by product_id, target_market
    returning id::text, event_key
  `, [JSON.stringify(payload), run.id, EVENT_REASON]);
  if (result.rows.length !== targets.length) fail("set-based FX_AUTO event insert count mismatch");
}

function buildPriceAuditSnapshot(target) {
  return {
    productCode: target.productCode,
    market: target.market,
    currency: target.currency,
    wholesalePrice: target.wholesalePrice,
    retailPrice: target.retailPrice,
    moq: target.moq,
    minOrderAmount: target.minOrderAmount,
    sourcePriceId: target.sourcePriceId,
    rateSnapshotId: target.rateSnapshotId
  };
}

async function insertPriceAudits(client, { targets, insertedPrices, runKey, manifestSha256, payloadHash }) {
  const targetByProductMarket = new Map(targets.map((target) => [`${target.productId}:${target.market}`, target]));
  const payload = insertedPrices.map((row) => {
    const target = targetByProductMarket.get(`${row.product_id}:${row.market}`);
    if (!target) fail("inserted price audit target mismatch");
    return {
      target_id: String(row.id),
      after_snapshot: {
        ...buildPriceAuditSnapshot(target),
        manifestSha256,
        payloadHash
      }
    };
  });
  const result = await client.query(`
    /* npi-market-prices:insert-price-audits */
    insert into public.audit_logs (
      actor_user_id, actor_role, action, target_table, target_id,
      before_snapshot, after_snapshot, request_id, ip_address, user_agent
    )
    select
      null, 'system', 'fx.auto.price.create', 'product_prices', row_data.target_id,
      null, row_data.after_snapshot, $2, null, $3
    from jsonb_to_recordset($1::jsonb) as row_data(target_id text, after_snapshot jsonb)
    returning id::text
  `, [JSON.stringify(payload), runKey, JOB_USER_AGENT]);
  if (result.rows.length !== targets.length) fail("set-based price audit insert count mismatch");
}

async function completeRun(client, { runId, targetCount, completedAt }) {
  const result = await client.query(`
    /* npi-market-prices:complete-run */
    update public.fx_auto_price_runs
    set
      status = 'completed',
      evaluated_count = $2,
      created_count = $2,
      updated_count = 0,
      held_count = 0,
      blocked_count = 0,
      error_count = 0,
      completed_at = $3
    where id = $1
      and status = 'running'
    returning *
  `, [runId, targetCount, completedAt]);
  if (result.rows.length !== 1) fail("FX_AUTO run completion mismatch");
  return result.rows[0];
}

async function insertRunAudit(client, { run, runKey, targetCount }) {
  const afterSnapshot = {
    evaluated: targetCount,
    created: targetCount,
    updated: 0,
    held: 0,
    blocked: 0,
    error: 0
  };
  const result = await client.query(`
    /* npi-market-prices:insert-run-audit */
    insert into public.audit_logs (
      actor_user_id, actor_role, action, target_table, target_id,
      before_snapshot, after_snapshot, request_id, ip_address, user_agent
    )
    values (
      null, 'system', 'fx.auto.run.completed', 'fx_auto_price_runs', $1,
      null, $2::jsonb, $3, null, $4
    )
    returning id::text
  `, [String(run.id), JSON.stringify(afterSnapshot), runKey, JOB_USER_AGENT]);
  if (result.rows.length !== 1) fail("FX_AUTO run audit insert mismatch");
}

function publicResult({ mode, plan, bundle, state, changed, committed, noOp, runId = null }) {
  return {
    mode,
    manifestSha256: plan.manifestSha256,
    totalProducts: plan.total,
    publishProducts: plan.publish.length,
    holdProducts: plan.hold.length,
    targetMarkets: TARGET_MARKETS.length,
    targetPrices: npiMarketPriceExpectations.targetPrices,
    provider: bundle.provider,
    sourceEffectiveAt: bundle.sourceEffectiveAt,
    payloadHash: bundle.payloadHash,
    state,
    changed,
    committed,
    noOp,
    runId
  };
}

export async function executeNpiMarketPrices({
  pool,
  mode = "verify",
  now = new Date(),
  expectedPayloadHash,
  expectedSourceEffectiveAt
} = {}) {
  if (!pool?.connect) fail("transactional database pool is required");
  if (!new Set(["verify", "full"]).has(mode)) fail("mode must be verify or full");
  const hasPayloadPin = expectedPayloadHash != null && expectedPayloadHash !== "";
  const hasSourcePin = expectedSourceEffectiveAt != null && expectedSourceEffectiveAt !== "";
  if (mode === "full" && (!hasPayloadPin || !hasSourcePin)) {
    fail("full mode requires the official FX payload hash and source effective time pins");
  }
  if (hasPayloadPin && !/^[a-f0-9]{64}$/.test(expectedPayloadHash)) {
    fail("expected official FX payload hash pin is invalid");
  }
  if (hasSourcePin && !ISO_TIMESTAMP_PATTERN.test(expectedSourceEffectiveAt)) {
    fail("expected official FX source effective time pin must be ISO-8601");
  }
  const expectedSourceIso = hasSourcePin
    ? iso(expectedSourceEffectiveAt, "expected official FX source effective time")
    : null;
  const plan = assertPublicationPlan(await loadPublicationPlan());
  const nowIso = iso(now, "job current time");
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("set transaction isolation level serializable");
    await client.query("select pg_advisory_xact_lock(hashtext('noblesse.fx_auto_price_evaluation'))");
    await client.query("select pg_advisory_xact_lock(hashtext('noblesse-npi-market-prices-20260811'))");

    const productResult = await queryNpiProducts(client);
    const sourceResult = await queryNpiKrwPrices(client);
    const sources = validateNpiDatabaseSnapshot({
      productRows: productResult.rows,
      sourceRows: sourceResult.rows,
      plan
    });
    const bundleResult = await queryLatestOfficialBundle(client);
    const bundle = validateOfficialCompleteBundle(bundleResult.rows, { now });
    if (
      (hasPayloadPin && bundle.payloadHash !== expectedPayloadHash) ||
      (expectedSourceIso && !sameTimestamp(bundle.sourceEffectiveAt, expectedSourceIso))
    ) {
      fail("validated official FX bundle does not match the pinned payload hash/source time");
    }
    const targets = buildNpiMarketPriceTargets({ plan, sources, bundle });
    const runKey = buildNpiMarketPriceRunKey(plan, bundle);
    const beforeFingerprint = await queryInvariantFingerprint(client, plan.hold.map((item) => item.code));
    const beforeState = await queryExistingState(client, targets, runKey);
    const state = classifyNpiMarketPriceState({
      targets,
      runKey,
      bundle,
      manifestSha256: plan.manifestSha256,
      state: beforeState
    });

    if (mode === "verify") {
      await client.query("rollback");
      return publicResult({ mode, plan, bundle, state, changed: 0, committed: false, noOp: state === "complete" });
    }
    if (state === "complete") {
      await client.query("rollback");
      return publicResult({ mode, plan, bundle, state, changed: 0, committed: false, noOp: true, runId: beforeState.runRows[0].id });
    }

    const insertedPrices = await insertTargetPrices(client, targets);
    const run = await insertRun(client, { runKey, bundle, startedAt: nowIso });
    const policies = await insertPolicies(client, { targets, insertedPrices, appliedAt: nowIso });
    await insertEvents(client, { targets, policies, run, runKey });
    await insertPriceAudits(client, {
      targets,
      insertedPrices,
      runKey,
      manifestSha256: plan.manifestSha256,
      payloadHash: bundle.payloadHash
    });
    const completedRun = await completeRun(client, {
      runId: run.id,
      targetCount: targets.length,
      completedAt: nowIso
    });
    await insertRunAudit(client, { run: completedRun, runKey, targetCount: targets.length });

    const afterState = await queryExistingState(client, targets, runKey);
    const afterClassification = classifyNpiMarketPriceState({
      targets,
      runKey,
      bundle,
      manifestSha256: plan.manifestSha256,
      state: afterState
    });
    if (afterClassification !== "complete") fail("post-insert state is not complete");
    const afterFingerprint = await queryInvariantFingerprint(client, plan.hold.map((item) => item.code));
    if (afterFingerprint !== beforeFingerprint) {
      fail("held or non-NPI data changed during the job");
    }

    await client.query("commit");
    return publicResult({
      mode,
      plan,
      bundle,
      state: "complete",
      changed: targets.length,
      committed: true,
      noOp: false,
      runId: completedRun.id
    });
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original fail-closed error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export const npiMarketPriceTargets = TARGET_MARKETS;
export const npiMarketPriceJobName = JOB_NAME;
