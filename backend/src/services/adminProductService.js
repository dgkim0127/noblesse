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

function parseProductFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    visible: parseBooleanLike(filters.visible, "visible"),
    category: parseOptionalString(filters.category, { maxLength: 80 }),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

const productWriteFields = [
  "code",
  "nameKo",
  "nameEn",
  "nameJa",
  "categoryKey",
  "material",
  "colors",
  "sizes",
  "moqDefault",
  "leadTime",
  "origin",
  "imageSet",
  "imageAlt",
  "isVisible",
  "isExportAvailable",
  "isNew",
  "isBest",
  "sortOrder",
  "descriptionKo",
  "descriptionEn",
  "descriptionJa"
];

function parseStringArray(value, fieldName) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw validationError(`${fieldName} must be an array`);
  return value.map((item) => parseOptionalString(String(item), { maxLength: 80 })).filter(Boolean);
}

function parseObject(value, fieldName) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`${fieldName} must be an object`);
  }
  return value;
}

function parseInteger(value, fieldName, { min = 0 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseProductBody(body = {}, { partial = false } = {}) {
  const safeBody = rejectUnknownFields(body, productWriteFields);
  const parsed = {
    code: partial ? parseOptionalString(safeBody.code, { maxLength: 80 }) : parseRequiredString(safeBody.code, { fieldName: "code", maxLength: 80 }),
    nameKo: parseOptionalString(safeBody.nameKo, { maxLength: 200 }),
    nameEn: partial ? parseOptionalString(safeBody.nameEn, { maxLength: 200 }) : parseRequiredString(safeBody.nameEn, { fieldName: "nameEn", maxLength: 200 }),
    nameJa: parseOptionalString(safeBody.nameJa, { maxLength: 200 }),
    categoryKey: parseOptionalString(safeBody.categoryKey, { maxLength: 80 }),
    material: parseOptionalString(safeBody.material, { maxLength: 160 }),
    colors: parseStringArray(safeBody.colors, "colors"),
    sizes: parseStringArray(safeBody.sizes, "sizes"),
    moqDefault: parseInteger(safeBody.moqDefault, "moqDefault", { min: 1 }),
    leadTime: parseOptionalString(safeBody.leadTime, { maxLength: 160 }),
    origin: parseOptionalString(safeBody.origin, { maxLength: 20 }),
    imageSet: parseObject(safeBody.imageSet, "imageSet"),
    imageAlt: parseObject(safeBody.imageAlt, "imageAlt"),
    isVisible: parseBooleanLike(safeBody.isVisible, "isVisible"),
    isExportAvailable: parseBooleanLike(safeBody.isExportAvailable, "isExportAvailable"),
    isNew: parseBooleanLike(safeBody.isNew, "isNew"),
    isBest: parseBooleanLike(safeBody.isBest, "isBest"),
    sortOrder: parseInteger(safeBody.sortOrder, "sortOrder"),
    descriptionKo: parseOptionalString(safeBody.descriptionKo, { maxLength: 2000 }),
    descriptionEn: parseOptionalString(safeBody.descriptionEn, { maxLength: 2000 }),
    descriptionJa: parseOptionalString(safeBody.descriptionJa, { maxLength: 2000 })
  };

  if (!partial) {
    parsed.colors = parsed.colors || [];
    parsed.sizes = parsed.sizes || [];
    parsed.moqDefault = parsed.moqDefault || 1;
    parsed.origin = parsed.origin || "KR";
    parsed.imageSet = parsed.imageSet || {};
    parsed.imageAlt = parsed.imageAlt || {};
    parsed.isVisible = parsed.isVisible ?? false;
    parsed.isExportAvailable = parsed.isExportAvailable ?? true;
    parsed.isNew = parsed.isNew ?? false;
    parsed.isBest = parsed.isBest ?? false;
    parsed.sortOrder = parsed.sortOrder || 0;
  }

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

export function createAdminProductService({ queries }) {
  return {
    async listProducts(filters = {}, adminViewer) {
      const parsed = parseProductFilters(filters);
      const products = await queries.listProducts(parsed, { adminViewer });
      return {
        products: slicePageRows(products, parsed),
        meta: createPaginationMeta(parsed, undefined, products.length)
      };
    },

    async createProduct(body = {}, adminViewer) {
      const parsed = parseProductBody(body);
      const result = await queries.createProduct(parsed, adminViewer);
      if (result?.conflict) {
        throw conflict("Product code already exists");
      }
      if (result?.missingCategory) {
        throw validationError("Unknown categoryKey");
      }
      return result;
    },

    async updateProduct(productId, body = {}, adminViewer) {
      const id = validateUuid(productId, "productId");
      const parsed = parseProductBody(body, { partial: true });
      const result = await queries.updateProduct(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Product not found");
      }
      if (result.missingCategory) {
        throw validationError("Unknown categoryKey");
      }
      return result;
    },

    async updateProductVisibility(productId, body = {}, adminViewer) {
      const id = validateUuid(productId, "productId");
      const safeBody = rejectUnknownFields(body, ["isVisible"]);
      const isVisible = parseBooleanLike(safeBody.isVisible, "isVisible");
      if (isVisible === undefined) {
        throw validationError("isVisible is required");
      }

      const result = await queries.updateProductVisibility(id, isVisible, adminViewer);
      if (!result) {
        throw notFound("Product not found");
      }
      return result;
    }
  };
}
