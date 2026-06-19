import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
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

const currenciesByMarket = {
  KR: "KRW",
  JP: "JPY",
  US: "USD",
  GLOBAL: "USD"
};

function parseMoney(value, fieldName, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${fieldName} is required`);
    return undefined;
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
    if (required) return currenciesByMarket[market] || "USD";
    return undefined;
  }
  if (!["KRW", "JPY", "USD"].includes(currency)) {
    throw validationError("Invalid currency");
  }
  return currency;
}

function parsePriceBody(body = {}, { partial = false } = {}) {
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

  const parsed = {
    productCode: partial ? undefined : parseRequiredString(safeBody.productCode, { fieldName: "productCode", maxLength: 80 }),
    market,
    currency: parseCurrency(safeBody.currency, market, { required: !partial }),
    wholesalePrice: parseMoney(safeBody.wholesalePrice, "wholesalePrice", { required: !partial }),
    retailPrice: parseMoney(safeBody.retailPrice, "retailPrice"),
    moq: parseInteger(safeBody.moq, "moq", { required: !partial, min: 1 }),
    minOrderAmount: parseMoney(safeBody.minOrderAmount, "minOrderAmount"),
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
      const parsed = parsePriceBody(body, { partial: true });
      const result = await queries.updatePrice(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Product price not found");
      }
      return result;
    }
  };
}
