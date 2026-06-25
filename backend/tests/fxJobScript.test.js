import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { assertFxAutoPriceJobAllowed } from "../src/scripts/evaluateFxAutoPrices.js";

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
