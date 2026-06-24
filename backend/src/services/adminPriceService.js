import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  CURRENCIES,
  CURRENCY_BY_MARKET,
  validateMarketCurrencyPair,
  validateMoneyPrecision
} from "../config/pricing.js";
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

function parseMoney(value, fieldName, { required = false, currency } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${fieldName} is required`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw validationError(`Invalid ${fieldName}`);
  }
  if (currency && !validateMoneyPrecision(parsed, currency)) {
    throw validationError(`Invalid ${fieldName} precision for ${currency}`);
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

export function createAdminPriceService({ queries }) {
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
      return result;
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
      return result;
    }
  };
}
