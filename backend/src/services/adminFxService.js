import { CURRENCIES, MARKETS, validateMarketCurrencyPair } from "../config/pricing.js";
import { getFxAutoThresholds } from "../fx/fxAutoPriceEngine.js";
import { FX_PRICING_MODES, assertPricingModeAllowed } from "../fx/fxAutoPricePolicy.js";
import { parseManualFxPayload } from "../fx/manualFxProvider.js";
import { getCurrencyStep, isSnapshotFresh } from "../fx/fxMath.js";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  validateUuid,
  validationError
} from "../utils/validators.js";

const POLICY_STATUSES = [
  "pending_rate",
  "active",
  "held_deadband",
  "updated",
  "created",
  "blocked_stale",
  "blocked_spike",
  "paused",
  "error"
];

function sanitizeRateImport(body = {}) {
  const payload = body.payload && typeof body.payload === "object" ? body.payload : body;
  return parseManualFxPayload({
    provider: parseOptionalString(payload.provider, { maxLength: 80 }) || "manual",
    baseCurrency: payload.baseCurrency || "KRW",
    rates: payload.rates,
    sourceEffectiveAt: payload.sourceEffectiveAt,
    fetchedAt: payload.fetchedAt
  });
}

function parsePolicyFilters(filters = {}) {
  return {
    status: parseOptionalEnum(filters.status, POLICY_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    currency: parseOptionalEnum(filters.currency, CURRENCIES, "currency"),
    mode: parseOptionalEnum(filters.mode, Object.values(FX_PRICING_MODES), "mode"),
    q: parseOptionalString(filters.q, { maxLength: 120 })
  };
}

function parseEvaluateBody(body = {}) {
  const thresholds = getFxAutoThresholds(body);
  for (const [key, value] of Object.entries(thresholds)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw validationError(`Invalid ${key}`);
    }
  }
  return thresholds;
}

function parseModeBody(body = {}, market) {
  const pricingMode = parseRequiredString(body.pricingMode, { fieldName: "pricingMode", maxLength: 40 });
  const currency = parseOptionalString(body.currency, { maxLength: 3 }) || (market === "JP" ? "JPY" : market === "CN" ? "CNY" : market === "KR" ? "KRW" : "USD");
  if (!MARKETS.includes(market) || !CURRENCIES.includes(currency) || !validateMarketCurrencyPair(market, currency)) {
    throw validationError("Invalid market/currency pair");
  }
  try {
    assertPricingModeAllowed({ market, currency, pricingMode });
  } catch (error) {
    throw validationError(error.message);
  }
  return {
    pricingMode,
    currency,
    keepPublishedPrice: body.keepPublishedPrice === true
  };
}

function parsePauseBody(body = {}) {
  return {
    reason: parseOptionalString(body.reason, { maxLength: 500 }) || "Paused by administrator"
  };
}

export function createAdminFxService({ queries, now = () => new Date() }) {
  return {
    async getStatus(_filters = {}, adminViewer) {
      const status = await queries.getFxStatus({ adminViewer });
      return {
        ...status,
        policy: {
          baseCurrency: "KRW",
          updateThresholdBps: 500,
          circuitBreakerBps: 1500,
          maxRateAgeHours: 72,
          autoMarkets: ["JP/JPY", "US/USD", "CN/CNY"],
          manualOnlyMarkets: ["KR/KRW", "GLOBAL/USD"],
          schedule: {
            rateSnapshotAndEvaluation: "10 9,13,17 * * 1-5 Asia/Seoul"
          }
        }
      };
    },

    async listRates(filters = {}, adminViewer) {
      const rates = await queries.listFxRates(filters, { adminViewer });
      return {
        rates: rates.map((rate) => ({
          ...rate,
          isStale: !isSnapshotFresh(rate.sourceEffectiveAt || rate.fetchedAt || rate.createdAt, now()),
          step: getCurrencyStep(rate.quoteCurrency || rate.currency)
        }))
      };
    },

    async listRuns(filters = {}, adminViewer) {
      return { runs: await queries.listFxAutoRuns(filters, { adminViewer }) };
    },

    async listPrices(filters = {}, adminViewer) {
      return { prices: await queries.listFxAutoPrices(parsePolicyFilters(filters), { adminViewer }) };
    },

    async listHistory(policyId, filters = {}, adminViewer) {
      return {
        events: await queries.listFxAutoHistory(validateUuid(policyId, "policyId"), filters, { adminViewer })
      };
    },

    async importRates(body = {}, adminViewer) {
      const snapshot = sanitizeRateImport(body);
      return queries.importFxRateSnapshotsAndEvaluate(snapshot, parseEvaluateBody(body), adminViewer);
    },

    async evaluateAll(body = {}, adminViewer) {
      return queries.evaluateFxAutoPrices(parseEvaluateBody(body), adminViewer);
    },

    async evaluateProduct(productId, body = {}, adminViewer) {
      return queries.evaluateFxAutoPricesForProduct(validateUuid(productId, "productId"), parseEvaluateBody(body), adminViewer);
    },

    async setProductMarketMode(productId, market, body = {}, adminViewer) {
      return queries.setProductMarketPricingMode(
        validateUuid(productId, "productId"),
        parseOptionalEnum(market, MARKETS, "market"),
        parseModeBody(body, market),
        adminViewer
      );
    },

    async pausePrice(policyId, body = {}, adminViewer) {
      return queries.pauseFxAutoPolicy(validateUuid(policyId, "policyId"), parsePauseBody(body), adminViewer);
    },

    async resumePrice(policyId, _body = {}, adminViewer) {
      return queries.resumeFxAutoPolicy(validateUuid(policyId, "policyId"), adminViewer);
    }
  };
}
