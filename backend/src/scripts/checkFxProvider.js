import { CURRENCIES } from "../config/pricing.js";
import {
  EXCHANGE_RATE_API_BASE_CURRENCY,
  EXCHANGE_RATE_API_PROVIDER_ID,
  fetchOfficialFxRates
} from "../fx/officialFxProvider.js";
import { FX_REQUIRED_CURRENCIES, createFxProviderResultLog } from "../fx/fxObservability.js";

export async function runFxProviderCheck({ env = process.env, fetchImpl = globalThis.fetch, now } = {}) {
  let providerRequestCount = 0;
  const countedFetch = async (...args) => {
    providerRequestCount += 1;
    return fetchImpl(...args);
  };

  const snapshot = await fetchOfficialFxRates({
    env,
    fetchImpl: countedFetch,
    now
  });

  const providerLog = createFxProviderResultLog(snapshot, {
    mode: "no_write",
    providerRequestCount,
    env,
    now,
    dbInitialized: false
  });

  return {
    event: providerLog.event,
    status: "completed",
    provider: EXCHANGE_RATE_API_PROVIDER_ID,
    mode: providerLog.mode,
    providerRequestCount,
    baseCurrency: EXCHANGE_RATE_API_BASE_CURRENCY,
    requiredCurrencies: [...FX_REQUIRED_CURRENCIES],
    sourceEffectiveAt: providerLog.sourceEffectiveAt,
    fetchedAt: providerLog.fetchedAt,
    sourceAgeSeconds: providerLog.sourceAgeSeconds,
    timestampValidation: providerLog.timestampValidation,
    completenessValidation: providerLog.completenessValidation,
    rateDirectionValidation: providerLog.rateDirectionValidation,
    supportedCurrencyValidation: FX_REQUIRED_CURRENCIES.every((currency) => CURRENCIES.includes(currency)) ? "passed" : "failed",
    jobName: providerLog.jobName,
    executionId: providerLog.executionId,
    dbInitialized: false,
    dbClientInitialized: false,
    dbQuery: false,
    snapshotWritten: false,
    idempotencyRowWritten: false,
    productMutation: false,
    priceMutation: false
  };
}

function sanitizeError(error) {
  return {
    status: "failed",
    category: error?.category || "provider_check_failed",
    retryable: Boolean(error?.retryable),
    statusCode: Number.isInteger(error?.status) ? error.status : null,
    providerRequestCount: Number.isInteger(error?.providerRequestCount) ? error.providerRequestCount : null
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFxProviderCheck()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(JSON.stringify(sanitizeError(error)));
      process.exitCode = 1;
    });
}
