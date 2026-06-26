import { CURRENCIES } from "../config/pricing.js";
import {
  EXCHANGE_RATE_API_BASE_CURRENCY,
  EXCHANGE_RATE_API_PROVIDER_ID,
  fetchOfficialFxRates
} from "../fx/officialFxProvider.js";

const requiredCurrencies = ["KRW", "JPY", "USD", "CNY"];

export async function runFxProviderCheck({ env = process.env, fetchImpl = globalThis.fetch, now } = {}) {
  let externalRequestCount = 0;
  const countedFetch = async (...args) => {
    externalRequestCount += 1;
    return fetchImpl(...args);
  };

  const snapshot = await fetchOfficialFxRates({
    env,
    fetchImpl: countedFetch,
    now
  });

  const presentCurrencies = requiredCurrencies.filter((currency) => snapshot.rates?.[currency]);
  const rateDirectionValid = requiredCurrencies.every((currency) => {
    const rate = snapshot.rates?.[currency];
    return rate?.currency === currency && Number.isFinite(rate.krwPerUnit) && rate.krwPerUnit > 0;
  });

  return {
    status: "completed",
    provider: EXCHANGE_RATE_API_PROVIDER_ID,
    baseCurrency: EXCHANGE_RATE_API_BASE_CURRENCY,
    requiredCurrencies,
    presentCurrencies,
    sourceEffectiveAt: snapshot.sourceEffectiveAt,
    fetchedAt: snapshot.fetchedAt,
    timestampValidation: "passed",
    completenessValidation: presentCurrencies.length === requiredCurrencies.length ? "passed" : "failed",
    rateDirectionValidation: rateDirectionValid ? "passed" : "failed",
    supportedCurrencyValidation: requiredCurrencies.every((currency) => CURRENCIES.includes(currency)) ? "passed" : "failed",
    externalRequestCount,
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
    externalRequestCount: Number.isInteger(error?.externalRequestCount) ? error.externalRequestCount : null
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
