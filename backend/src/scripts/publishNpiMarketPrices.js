import { pathToFileURL } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { executeNpiMarketPrices } from "../jobs/npiMarketPrices.js";

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function getNpiMarketPriceExecutionConfig(env = process.env) {
  const mode = env.NPI_MARKET_PRICE_MODE || "verify";
  const apply = env.NPI_MARKET_PRICE_APPLY === "true";
  if (!new Set(["verify", "full"]).has(mode)) {
    throw new Error("NPI market price mode must be verify or full");
  }
  if ((mode === "verify" && apply) || (mode === "full" && !apply)) {
    throw new Error("NPI market price mode/apply guard mismatch");
  }
  const expectedPayloadHash = env.NPI_FX_PAYLOAD_HASH || null;
  const expectedSourceEffectiveAt = env.NPI_FX_SOURCE_EFFECTIVE_AT || null;
  if (mode === "full") {
    if (!/^[a-f0-9]{64}$/.test(expectedPayloadHash || "")) {
      throw new Error("NPI market price full mode requires a 64-hex NPI_FX_PAYLOAD_HASH pin");
    }
    const sourceDate = new Date(expectedSourceEffectiveAt || "");
    if (!ISO_TIMESTAMP_PATTERN.test(expectedSourceEffectiveAt || "") || Number.isNaN(sourceDate.getTime())) {
      throw new Error("NPI market price full mode requires an ISO NPI_FX_SOURCE_EFFECTIVE_AT pin");
    }
  }
  return { mode, expectedPayloadHash, expectedSourceEffectiveAt };
}

export function getNpiMarketPriceExecutionMode(env = process.env) {
  return getNpiMarketPriceExecutionConfig(env).mode;
}

export async function runNpiMarketPricePublication({ env = process.env, pool } = {}) {
  const config = getNpiMarketPriceExecutionConfig(env);
  const ownsPool = !pool;
  const effectivePool = pool || createPool(getEnv());
  if (!effectivePool) throw new Error("NPI market price database pool is unavailable");

  try {
    return await executeNpiMarketPrices({
      pool: effectivePool,
      mode: config.mode,
      expectedPayloadHash: config.expectedPayloadHash,
      expectedSourceEffectiveAt: config.expectedSourceEffectiveAt
    });
  } finally {
    if (ownsPool) await effectivePool.end();
  }
}

function isMainModule() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  runNpiMarketPricePublication()
    .then((result) => {
      console.log(JSON.stringify({ event: "npi_market_prices_complete", ...result }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        event: "npi_market_prices_failed",
        message: error instanceof Error ? error.message : "Unknown NPI market price failure"
      }));
      process.exitCode = 1;
    });
}
