import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { assertFxAutoPriceJobAllowed } from "../src/scripts/evaluateFxAutoPrices.js";
import { runFxProviderCheck } from "../src/scripts/checkFxProvider.js";

test("FX auto price job guard is fail-closed", () => {
  assert.throws(() => assertFxAutoPriceJobAllowed({}), /disabled/);
  assert.throws(() => assertFxAutoPriceJobAllowed({ ALLOW_FX_AUTO_PRICE_JOB: "TRUE" }), /disabled/);
  assert.doesNotThrow(() => assertFxAutoPriceJobAllowed({ ALLOW_FX_AUTO_PRICE_JOB: "true" }));
});

test("FX auto price job uses the service fixed-threshold contract", () => {
  const source = readFileSync(join(process.cwd(), "src", "scripts", "evaluateFxAutoPrices.js"), "utf8");

  assert.match(source, /service\.evaluateAll\(\{\}, \{/);
  assert.doesNotMatch(source, /FX_AUTO_UPDATE_THRESHOLD_BPS|FX_AUTO_CIRCUIT_BREAKER_BPS|FX_MAX_RATE_AGE_HOURS/);
  assert.doesNotMatch(source, /getFxAutoThresholds\(\{/);
});

test("FX rate fetch job supports only fixed provider wiring without URL credentials or threshold overrides", () => {
  const source = readFileSync(join(process.cwd(), "src", "scripts", "fetchFxRateSnapshots.js"), "utf8");
  const providerSource = readFileSync(join(process.cwd(), "src", "fx", "officialFxProvider.js"), "utf8");

  assert.match(source, /getFxProviderSnapshot\(\{/);
  assert.match(source, /provider/);
  assert.match(providerSource, /EXCHANGE_RATE_API_SECRET_ENV = "EXCHANGE_RATE_API_KEY"/);
  assert.match(providerSource, /EXCHANGE_RATE_API_ORIGIN = "https:\/\/v6\.exchangerate-api\.com"/);
  assert.match(providerSource, /EXCHANGE_RATE_API_PATH = `\/v6\/latest\/\$\{EXCHANGE_RATE_API_BASE_CURRENCY\}`/);
  assert.match(providerSource, /Authorization: `Bearer \$\{credential\}`/);
  assert.doesNotMatch(providerSource, /access_key=|app_id=|apikey=|api_key=/i);
  assert.doesNotMatch(providerSource, /new URL\([^)]*process\.env|FX_PROVIDER_URL|PROVIDER_URL|ENDPOINT_OVERRIDE/);
  assert.doesNotMatch(source, /FX_AUTO_UPDATE_THRESHOLD_BPS|FX_AUTO_CIRCUIT_BREAKER_BPS|FX_MAX_RATE_AGE_HOURS/);
});

test("FX provider check canary is no-write and returns sanitized validation metadata", async () => {
  const source = readFileSync(join(process.cwd(), "src", "scripts", "checkFxProvider.js"), "utf8");
  assert.doesNotMatch(source, /createPool|createAdminFxQueries|createAdminFxService|importProviderSnapshot|evaluateAll/);

  const now = new Date("2026-06-25T12:00:00.000Z");
  const sourceUnix = Math.floor(now.getTime() / 1000) - 60;
  const result = await runFxProviderCheck({
    env: { EXCHANGE_RATE_API_KEY: "test-key" },
    now: () => now,
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      headers: { get: () => null },
      async text() {
        return JSON.stringify({
          result: "success",
          time_last_update_unix: sourceUnix,
          time_last_update_utc: new Date(sourceUnix * 1000).toUTCString(),
          base_code: "KRW",
          conversion_rates: {
            KRW: 1,
            JPY: 150 / 1400,
            USD: 1 / 1400,
            CNY: 7 / 1400
          }
        });
      }
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.provider, "exchange_rate_api");
  assert.deepEqual(result.requiredCurrencies, ["KRW", "JPY", "USD", "CNY"]);
  assert.equal(result.timestampValidation, "passed");
  assert.equal(result.completenessValidation, "passed");
  assert.equal(result.rateDirectionValidation, "passed");
  assert.equal(result.externalRequestCount, 1);
  assert.equal(result.dbClientInitialized, false);
  assert.equal(result.dbQuery, false);
  assert.equal(result.snapshotWritten, false);
  assert.equal(result.idempotencyRowWritten, false);
  assert.equal(result.productMutation, false);
  assert.equal(result.priceMutation, false);
  assert.doesNotMatch(JSON.stringify(result), /test-key|Bearer|Authorization|conversion_rates/i);
});
