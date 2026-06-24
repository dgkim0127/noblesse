import { CURRENCIES, MARKETS, validateMarketCurrencyPair } from "../config/pricing.js";
import { parseManualFxPayload } from "../fx/manualFxProvider.js";
import { getCurrencyStep, isSnapshotFresh } from "../fx/fxMath.js";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  validateUuid,
  validationError
} from "../utils/validators.js";

const DRAFT_STATUSES = ["pending", "approved", "rejected", "expired", "stale"];

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

function parseDraftFilters(filters = {}) {
  return {
    status: parseOptionalEnum(filters.status, DRAFT_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    currency: parseOptionalEnum(filters.currency, CURRENCIES, "currency")
  };
}

function parseReviewBody(body = {}) {
  const thresholdBps = body.thresholdBps === undefined ? 200 : Number(body.thresholdBps);
  const maxRateAgeHours = body.maxRateAgeHours === undefined ? 72 : Number(body.maxRateAgeHours);
  if (!Number.isSafeInteger(thresholdBps) || thresholdBps < 1) {
    throw validationError("Invalid thresholdBps");
  }
  if (!Number.isSafeInteger(maxRateAgeHours) || maxRateAgeHours < 1) {
    throw validationError("Invalid maxRateAgeHours");
  }
  return { thresholdBps, maxRateAgeHours };
}

function parseRejectBody(body = {}) {
  return {
    reason: parseRequiredString(body.reason, { fieldName: "reason", maxLength: 500 })
  };
}

function parseFxToggleBody(body = {}) {
  const market = parseRequiredString(body.market, { fieldName: "market", maxLength: 12 });
  const currency = parseRequiredString(body.currency, { fieldName: "currency", maxLength: 3 });
  if (!MARKETS.includes(market) || !CURRENCIES.includes(currency) || !validateMarketCurrencyPair(market, currency)) {
    throw validationError("Invalid market/currency pair");
  }
  return { market, currency };
}

export function createAdminFxService({ queries, now = () => new Date() }) {
  return {
    async getStatus(_filters = {}, adminViewer) {
      const status = await queries.getFxStatus({ adminViewer });
      return {
        ...status,
        policy: {
          baseCurrency: "KRW",
          thresholdBps: 200,
          maxRateAgeHours: 72,
          schedule: {
            rateSnapshot: "10 9 * * 1-5 Asia/Seoul",
            review: "0 10 * * 1,3,5 Asia/Seoul"
          }
        }
      };
    },

    async listRates(filters = {}, adminViewer) {
      const rates = await queries.listFxRates(filters, { adminViewer });
      return {
        rates: rates.map((rate) => ({
          ...rate,
          isStale: !isSnapshotFresh(rate.fetchedAt || rate.createdAt, now()),
          step: getCurrencyStep(rate.quoteCurrency || rate.currency)
        }))
      };
    },

    async listReviewRuns(filters = {}, adminViewer) {
      return { reviewRuns: await queries.listFxReviewRuns(filters, { adminViewer }) };
    },

    async listDrafts(filters = {}, adminViewer) {
      return { drafts: await queries.listFxDrafts(parseDraftFilters(filters), { adminViewer }) };
    },

    async importRates(body = {}, adminViewer) {
      const snapshot = sanitizeRateImport(body);
      return queries.importFxRateSnapshots(snapshot, adminViewer);
    },

    async createReviewRun(body = {}, adminViewer) {
      return queries.createFxReviewRun(parseReviewBody(body), adminViewer);
    },

    async approveDraft(draftId, _body = {}, adminViewer) {
      return queries.approveFxDraft(validateUuid(draftId, "draftId"), adminViewer);
    },

    async rejectDraft(draftId, body = {}, adminViewer) {
      return queries.rejectFxDraft(validateUuid(draftId, "draftId"), parseRejectBody(body), adminViewer);
    },

    async enablePriceFx(priceId, body = {}, adminViewer) {
      return queries.setProductPriceFxManaged(validateUuid(priceId, "priceId"), true, parseFxToggleBody(body), adminViewer);
    },

    async disablePriceFx(priceId, body = {}, adminViewer) {
      return queries.setProductPriceFxManaged(validateUuid(priceId, "priceId"), false, parseFxToggleBody(body), adminViewer);
    }
  };
}
