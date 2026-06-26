import { CURRENCIES, MARKETS, validateMarketCurrencyPair } from "../config/pricing.js";
import { getFxAutoThresholds } from "../fx/fxAutoPriceEngine.js";
import { FX_PRICING_MODES, assertPricingModeAllowed } from "../fx/fxAutoPricePolicy.js";
import { parseManualFxPayload } from "../fx/manualFxProvider.js";
import { getCurrencyStep, isSnapshotFresh } from "../fx/fxMath.js";
import { validateMoneyPrecision } from "../utils/money.js";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";
import { notFound } from "../utils/errors.js";

const POLICY_STATUSES = [
  "pending_rate",
  "active",
  "held_deadband",
  "updated",
  "created",
  "needs_input",
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
  const forbidden = ["updateThresholdBps", "circuitBreakerBps", "maxRateAgeHours"];
  const bodyObject = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const override = forbidden.find((key) => Object.hasOwn(bodyObject, key));
  if (override) {
    throw validationError("FX automatic policy thresholds are fixed");
  }
  return getFxAutoThresholds();
}

function parseMoney(value, fieldName, { required = false, currency } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${fieldName} is required`);
    return undefined;
  }
  if (currency && !validateMoneyPrecision(value, currency)) {
    throw validationError(`Invalid ${fieldName} precision for ${currency}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseInteger(value, fieldName, { min = 1 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseModeBody(body = {}, market) {
  const safeBody = rejectUnknownFields(body, [
    "pricingMode",
    "currency",
    "keepPublishedPrice",
    "wholesalePrice",
    "retailPrice",
    "moq",
    "minOrderAmount",
    "isActive"
  ]);
  const pricingMode = parseRequiredString(safeBody.pricingMode, { fieldName: "pricingMode", maxLength: 40 });
  const currency = parseOptionalString(safeBody.currency, { maxLength: 3 }) || (market === "JP" ? "JPY" : market === "TW" ? "TWD" : market === "KR" ? "KRW" : "USD");
  if (!MARKETS.includes(market) || !CURRENCIES.includes(currency) || !validateMarketCurrencyPair(market, currency)) {
    throw validationError("Invalid market/currency pair");
  }
  try {
    assertPricingModeAllowed({ market, currency, pricingMode });
  } catch (error) {
    throw validationError(error.message);
  }
  const hasManualPrice = [
    "wholesalePrice",
    "retailPrice",
    "moq",
    "minOrderAmount",
    "isActive"
  ].some((field) => safeBody[field] !== undefined && safeBody[field] !== null && safeBody[field] !== "");
  const manualPrice = pricingMode === FX_PRICING_MODES.MANUAL_FIXED && hasManualPrice
    ? {
        wholesalePrice: parseMoney(safeBody.wholesalePrice, "wholesalePrice", { required: true, currency }),
        retailPrice: parseMoney(safeBody.retailPrice, "retailPrice", { currency }),
        moq: parseInteger(safeBody.moq, "moq") ?? 1,
        minOrderAmount: parseMoney(safeBody.minOrderAmount, "minOrderAmount", { currency }) ?? 0,
        isActive: safeBody.isActive !== false
      }
    : null;
  return {
    pricingMode,
    currency,
    keepPublishedPrice: safeBody.keepPublishedPrice === true,
    manualPrice
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
          autoMarkets: ["JP/JPY", "US/USD", "TW/TWD"],
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

    async importProviderSnapshot(snapshot, adminViewer) {
      return queries.importFxRateSnapshotsAndEvaluate(snapshot, getFxAutoThresholds(), adminViewer);
    },

    async evaluateAll(body = {}, adminViewer) {
      return queries.evaluateFxAutoPrices(parseEvaluateBody(body), adminViewer);
    },

    async evaluateProduct(productId, body = {}, adminViewer) {
      return queries.evaluateFxAutoPricesForProduct(validateUuid(productId, "productId"), parseEvaluateBody(body), adminViewer);
    },

    async setProductMarketMode(productId, market, body = {}, adminViewer) {
      const result = await queries.setProductMarketPricingMode(
        validateUuid(productId, "productId"),
        parseOptionalEnum(market, MARKETS, "market"),
        parseModeBody(body, market),
        adminViewer
      );
      if (result?.missingSourcePrice) throw validationError("KR/KRW source price is required for FX_AUTO");
      if (result?.manualPriceRequired) throw validationError("A manual price or keepPublishedPrice=true is required for MANUAL_FIXED");
      return result;
    },

    async pausePrice(policyId, body = {}, adminViewer) {
      const result = await queries.pauseFxAutoPolicy(validateUuid(policyId, "policyId"), parsePauseBody(body), adminViewer);
      if (!result?.policy) throw notFound("FX_AUTO policy not found");
      return result;
    },

    async resumePrice(policyId, _body = {}, adminViewer) {
      const result = await queries.resumeFxAutoPolicy(validateUuid(policyId, "policyId"), adminViewer);
      if (!result?.policy) throw notFound("FX_AUTO policy not found");
      return result;
    }
  };
}
