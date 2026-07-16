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
import { normalizeDetailContent } from "../utils/productDetailContent.js";
import { normalizeOptionGroups, syncLegacyOptionArrays } from "../utils/productOptions.js";
import { createAdminProductImageService } from "./adminProductImageService.js";

function parseProductFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    visible: parseBooleanLike(filters.visible, "visible"),
    category: parseOptionalString(filters.category, { maxLength: 80 }),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    completion: parseOptionalEnum(
      filters.completion,
      ["incomplete", "language", "image", "price", "category"],
      "completion"
    ),
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
  "nameZhTw",
  "categoryKey",
  "material",
  "colors",
  "sizes",
  "optionGroups",
  "moqDefault",
  "leadTime",
  "origin",
  "imageSet",
  "imageAlt",
  "taxonomy",
  "specs",
  "detailContent",
  "homePlacement",
  "badge",
  "isVisible",
  "isExportAvailable",
  "isNew",
  "isBest",
  "sortOrder",
  "descriptionKo",
  "descriptionEn",
  "descriptionJa",
  "descriptionZhTw"
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

function parseOptionalObject(value, fieldName) {
  if (value === undefined) return undefined;
  return parseObject(value, fieldName);
}

function parseOptionalBadge(value) {
  const badge = parseOptionalString(value, { maxLength: 40 });
  if (!badge) return badge;
  return badge.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
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
    nameEn: parseOptionalString(safeBody.nameEn, { maxLength: 200 }),
    nameJa: parseOptionalString(safeBody.nameJa, { maxLength: 200 }),
    nameZhTw: parseOptionalString(safeBody.nameZhTw, { maxLength: 200 }),
    categoryKey: parseOptionalString(safeBody.categoryKey, { maxLength: 80 }),
    material: parseOptionalString(safeBody.material, { maxLength: 160 }),
    colors: parseStringArray(safeBody.colors, "colors"),
    sizes: parseStringArray(safeBody.sizes, "sizes"),
    moqDefault: parseInteger(safeBody.moqDefault, "moqDefault", { min: 1 }),
    leadTime: parseOptionalString(safeBody.leadTime, { maxLength: 160 }),
    origin: parseOptionalString(safeBody.origin, { maxLength: 20 }),
    imageSet: parseObject(safeBody.imageSet, "imageSet"),
    imageAlt: parseObject(safeBody.imageAlt, "imageAlt"),
    taxonomy: parseOptionalObject(safeBody.taxonomy, "taxonomy"),
    specs: parseOptionalObject(safeBody.specs, "specs"),
    detailContent: normalizeDetailContent(safeBody.detailContent),
    optionGroups: normalizeOptionGroups(safeBody.optionGroups),
    homePlacement: parseOptionalObject(safeBody.homePlacement, "homePlacement"),
    badge: parseOptionalBadge(safeBody.badge),
    isVisible: parseBooleanLike(safeBody.isVisible, "isVisible"),
    isExportAvailable: parseBooleanLike(safeBody.isExportAvailable, "isExportAvailable"),
    isNew: parseBooleanLike(safeBody.isNew, "isNew"),
    isBest: parseBooleanLike(safeBody.isBest, "isBest"),
    sortOrder: parseInteger(safeBody.sortOrder, "sortOrder"),
    descriptionKo: parseOptionalString(safeBody.descriptionKo, { maxLength: 2000 }),
    descriptionEn: parseOptionalString(safeBody.descriptionEn, { maxLength: 2000 }),
    descriptionJa: parseOptionalString(safeBody.descriptionJa, { maxLength: 2000 }),
    descriptionZhTw: parseOptionalString(safeBody.descriptionZhTw, { maxLength: 2000 })
  };

  if (!partial) {
    if (![parsed.nameKo, parsed.nameEn, parsed.nameJa, parsed.nameZhTw].some(Boolean)) {
      throw validationError("At least one localized product name is required");
    }
    parsed.colors = parsed.colors || [];
    parsed.sizes = parsed.sizes || [];
    parsed.moqDefault = parsed.moqDefault || 1;
    parsed.origin = parsed.origin || "KR";
    parsed.imageSet = parsed.imageSet || {};
    parsed.imageAlt = parsed.imageAlt || {};
    parsed.taxonomy = parsed.taxonomy || {};
    parsed.specs = parsed.specs || {};
    parsed.detailContent = parsed.detailContent || {};
    parsed.optionGroups = parsed.optionGroups || [];
    parsed.homePlacement = parsed.homePlacement || {};
    parsed.isVisible = parsed.isVisible ?? false;
    parsed.isExportAvailable = parsed.isExportAvailable ?? true;
    parsed.isNew = parsed.isNew ?? false;
    parsed.isBest = parsed.isBest ?? false;
    parsed.sortOrder = parsed.sortOrder || 0;
  }

  if (parsed.optionGroups !== undefined) {
    const legacy = syncLegacyOptionArrays(parsed.optionGroups, {
      colors: parsed.colors || [],
      sizes: parsed.sizes || []
    });
    parsed.colors = legacy.colors;
    parsed.sizes = legacy.sizes;
  }

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

export function createAdminProductService({ queries, imageService }) {
  const images = imageService || createAdminProductImageService({ queries });
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
      if (parsed.isVisible) {
        throw validationError("Create the product as a draft, then publish it after images and prices are ready");
      }
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
      if (result.incomplete) {
        const error = validationError("Product is not ready to publish");
        error.details = { missing: result.missing };
        throw error;
      }
      return result;
    },

    async getProduct(productId, adminViewer) {
      const id = validateUuid(productId, "productId");
      const product = await queries.getProduct(id, { adminViewer });
      if (!product) throw notFound("Product not found");
      return { product };
    },

    async duplicateProduct(productId, body = {}, adminViewer) {
      const id = validateUuid(productId, "productId");
      const safeBody = rejectUnknownFields(body, ["code"]);
      const code = parseRequiredString(safeBody.code, { fieldName: "code", maxLength: 80 });
      const result = await queries.duplicateProduct(id, code, adminViewer);
      if (!result) throw notFound("Product not found");
      if (result.conflict) throw conflict("Product code already exists");
      return result;
    },

    async bulkUpdateProducts(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["ids", "action", "categoryKey"]);
      if (!Array.isArray(safeBody.ids) || safeBody.ids.length < 1 || safeBody.ids.length > 100) {
        throw validationError("ids must contain between 1 and 100 product IDs");
      }
      const ids = [...new Set(safeBody.ids.map((id) => validateUuid(id, "productId")))];
      const action = parseOptionalEnum(safeBody.action, ["publish", "unpublish", "setCategory"], "action");
      if (!action) throw validationError("action is required");
      const categoryKey = action === "setCategory"
        ? parseRequiredString(safeBody.categoryKey, { fieldName: "categoryKey", maxLength: 80 })
        : undefined;
      const result = await queries.bulkUpdateProducts({ ids, action, categoryKey }, adminViewer);
      if (result?.missingIds?.length) throw notFound("One or more products were not found");
      if (result?.missingCategory) throw validationError("Unknown categoryKey");
      if (result?.incomplete?.length) {
        const error = validationError("One or more products are not ready to publish");
        error.details = { products: result.incomplete };
        throw error;
      }
      return result;
    },

    async uploadProductImages(productId, uploadRequest = {}, adminViewer) {
      const id = validateUuid(productId, "productId");
      return images.uploadProductImages({
        productId: id,
        contentType: uploadRequest.contentType,
        body: uploadRequest.body,
        adminViewer
      });
    }
  };
}
