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
