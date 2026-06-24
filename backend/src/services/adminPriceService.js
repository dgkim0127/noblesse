import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  CURRENCIES,
  CURRENCY_BY_MARKET,
  validateMarketCurrencyPair
} from "../config/pricing.js";
import { FX_PRICING_MODES, assertPricingModeAllowed, getDefaultPricingMode } from "../fx/fxAutoPricePolicy.js";
import { validateMoneyPrecision } from "../utils/money.js";
import {
  MARKETS,
  parseBooleanLike,
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";
import { conflict, notFound } from "../utils/errors.js";

function parsePriceFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    active: parseBooleanLike(filters.active, "active"),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

const priceWriteFields = [
  "productCode",
  "market",
  "currency",
  "wholesalePrice",
  "retailPrice",
  "moq",
  "minOrderAmount",
  "isActive"
];

const priceBookFields = ["kr", "markets"];
const priceBookMarketFields = [
  "market",
  "currency",
  "pricingMode",
  "wholesalePrice",
  "retailPrice",
  "moq",
  "minOrderAmount",
  "isActive"
];

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

function parseInteger(value, fieldName, { required = false, min = 1 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${fieldName} is required`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseCurrency(value, market, { required = false } = {}) {
  const currency = parseOptionalString(value, { maxLength: 3 });
  if (!currency) {
    if (required) return CURRENCY_BY_MARKET[market] || "USD";
    return undefined;
  }
  if (!CURRENCIES.includes(currency)) {
    throw validationError("Invalid currency");
  }
  return currency;
}

function parsePriceBody(body = {}, { partial = false, existingCurrency } = {}) {
  const safeBody = rejectUnknownFields(body, priceWriteFields);
  const market = partial
    ? parseOptionalEnum(safeBody.market, MARKETS, "market")
    : parseOptionalEnum(safeBody.market, MARKETS, "market") || "GLOBAL";

  if (partial && safeBody.productCode !== undefined) {
    throw validationError("productCode cannot be changed");
  }
  if (partial && market !== undefined) {
    throw validationError("market cannot be changed");
  }
  if (partial && safeBody.currency !== undefined) {
    throw validationError("currency cannot be changed");
  }

  const currency = parseCurrency(safeBody.currency, market, { required: !partial });
  if (market && currency && !validateMarketCurrencyPair(market, currency)) {
    throw validationError("Invalid market/currency pair");
  }
  const moneyCurrency = partial ? existingCurrency : currency;

  const parsed = {
    productCode: partial ? undefined : parseRequiredString(safeBody.productCode, { fieldName: "productCode", maxLength: 80 }),
    market,
    currency,
    wholesalePrice: parseMoney(safeBody.wholesalePrice, "wholesalePrice", { required: !partial, currency: moneyCurrency }),
    retailPrice: parseMoney(safeBody.retailPrice, "retailPrice", { currency: moneyCurrency }),
    moq: parseInteger(safeBody.moq, "moq", { required: !partial, min: 1 }),
    minOrderAmount: parseMoney(safeBody.minOrderAmount, "minOrderAmount", { currency: moneyCurrency }),
    isActive: parseBooleanLike(safeBody.isActive, "isActive")
  };

  if (!partial) {
    parsed.minOrderAmount = parsed.minOrderAmount ?? 0;
    parsed.isActive = parsed.isActive ?? true;
  }

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

function parseBookPriceFields(input = {}, { market, currency, manualRequired = false } = {}) {
  const parsed = {
    wholesalePrice: parseMoney(input.wholesalePrice, "wholesalePrice", { required: manualRequired, currency }),
    retailPrice: parseMoney(input.retailPrice, "retailPrice", { currency }),
    moq: parseInteger(input.moq, "moq", { required: manualRequired, min: 1 }),
    minOrderAmount: parseMoney(input.minOrderAmount, "minOrderAmount", { currency }),
    isActive: parseBooleanLike(input.isActive, "isActive")
  };
  if (manualRequired) {
    parsed.moq = parsed.moq ?? 1;
    parsed.minOrderAmount = parsed.minOrderAmount ?? 0;
    parsed.isActive = parsed.isActive ?? true;
  }
  return Object.fromEntries(Object.entries({ market, currency, ...parsed }).filter(([, value]) => value !== undefined));
}

function parsePriceBookBody(body = {}) {
  const safeBody = rejectUnknownFields(body, priceBookFields);
  const krInput = rejectUnknownFields(safeBody.kr || {}, priceBookMarketFields);
  const kr = {
    pricingMode: FX_PRICING_MODES.MANUAL_FIXED,
    ...parseBookPriceFields(krInput, { market: "KR", currency: "KRW", manualRequired: true })
  };
  const marketInputs = Array.isArray(safeBody.markets) ? safeBody.markets : [];
  const markets = marketInputs.map((item) => {
    const input = rejectUnknownFields(item || {}, priceBookMarketFields);
    const market = parseOptionalEnum(input.market, MARKETS, "market");
    const currency = parseCurrency(input.currency, market, { required: true });
    if (!market || !currency || !validateMarketCurrencyPair(market, currency)) {
      throw validationError("Invalid market/currency pair");
    }
    const pricingMode = parseOptionalString(input.pricingMode, { maxLength: 40 })
      || getDefaultPricingMode({ market, hasManualAmount: input.wholesalePrice !== undefined && input.wholesalePrice !== "" });
    try {
      assertPricingModeAllowed({ market, currency, pricingMode });
    } catch (error) {
      throw validationError(error.message);
    }
    return {
      pricingMode,
      ...parseBookPriceFields(input, {
        market,
        currency,
        manualRequired: pricingMode === FX_PRICING_MODES.MANUAL_FIXED
      })
    };
  });
  const seen = new Set(["KR"]);
  for (const entry of markets) {
    if (seen.has(entry.market)) throw validationError("Duplicate market in price book");
    seen.add(entry.market);
  }
  return { kr, markets };
}

async function evaluateFxAutoAfterKrwChange(result, fxService, adminViewer) {
  if (!fxService?.evaluateProduct || result?.price?.market !== "KR" || result?.price?.currency !== "KRW") {
    return result;
  }
  try {
    const evaluation = await fxService.evaluateProduct(result.price.productId, {}, adminViewer);
    return { ...result, fxAutoEvaluation: evaluation.run || null };
  } catch (error) {
    return {
      ...result,
      fxAutoEvaluationError: {
        category: error?.code || error?.message || "FX_AUTO_EVALUATION_FAILED"
      }
    };
  }
}

export function createAdminPriceService({ queries, fxService = null }) {
  return {
    async listPrices(filters = {}, adminViewer) {
      const parsed = parsePriceFilters(filters);
      const prices = await queries.listPrices(parsed, { adminViewer });
      return {
        prices: slicePageRows(prices, parsed),
        meta: createPaginationMeta(parsed, undefined, prices.length)
      };
    },

    async createPrice(body = {}, adminViewer) {
      const parsed = parsePriceBody(body);
      const result = await queries.createPrice(parsed, adminViewer);
      if (result?.missingProduct) {
        throw validationError("Unknown productCode");
      }
      if (result?.conflict) {
        throw conflict("Product price already exists for this market");
      }
      return evaluateFxAutoAfterKrwChange(result, fxService, adminViewer);
    },

    async updatePrice(priceId, body = {}, adminViewer) {
      const id = validateUuid(priceId, "priceId");
      const existing = await queries.getPriceById?.(id, { adminViewer });
      if (!existing) {
        throw notFound("Product price not found");
      }
      const parsed = parsePriceBody(body, { partial: true, existingCurrency: existing.currency });
      const result = await queries.updatePrice(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Product price not found");
      }
      return evaluateFxAutoAfterKrwChange(result, fxService, adminViewer);
    },

    async setupProductPriceBooks(productId, body = {}, adminViewer) {
      const id = validateUuid(productId, "productId");
      const parsed = parsePriceBookBody(body);
      const result = await queries.setupProductPriceBooks(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Product not found");
      }
      if (result?.missingSourcePrice) {
        throw validationError("KR/KRW source price is required");
      }
      if (result?.conflict) {
        throw conflict("Product price book conflict");
      }
      if (fxService?.evaluateProduct && result?.autoPolicyCount > 0) {
        try {
          const evaluation = await fxService.evaluateProduct(id, {}, adminViewer);
          return { ...result, fxAutoEvaluation: evaluation.run || null };
        } catch (error) {
          return {
            ...result,
            fxAutoEvaluationError: {
              category: error?.code || error?.message || "FX_AUTO_EVALUATION_FAILED"
            }
          };
        }
      }
      return result;
    }
  };
}
