import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  parseBooleanLike,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";
import { conflict, notFound } from "../utils/errors.js";

const categoryWriteFields = [
  "categoryId",
  "nameKo",
  "nameEn",
  "nameJa",
  "slug",
  "coverUrl",
  "isVisible",
  "sortOrder"
];

function parseInteger(value, fieldName, { min = 0 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseCategoryFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    visible: parseBooleanLike(filters.visible, "visible"),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

function parseCategoryBody(body = {}, { partial = false } = {}) {
  const safeBody = rejectUnknownFields(body, categoryWriteFields);
  const parsed = {
    categoryId: partial ? parseOptionalString(safeBody.categoryId, { maxLength: 80 }) : parseRequiredString(safeBody.categoryId, { fieldName: "categoryId", maxLength: 80 }),
    nameKo: parseOptionalString(safeBody.nameKo, { maxLength: 160 }),
    nameEn: partial ? parseOptionalString(safeBody.nameEn, { maxLength: 160 }) : parseRequiredString(safeBody.nameEn, { fieldName: "nameEn", maxLength: 160 }),
    nameJa: parseOptionalString(safeBody.nameJa, { maxLength: 160 }),
    slug: partial ? parseOptionalString(safeBody.slug, { maxLength: 120 }) : parseRequiredString(safeBody.slug, { fieldName: "slug", maxLength: 120 }),
    coverUrl: parseOptionalString(safeBody.coverUrl, { maxLength: 1000 }),
    isVisible: parseBooleanLike(safeBody.isVisible, "isVisible"),
    sortOrder: parseInteger(safeBody.sortOrder, "sortOrder")
  };

  if (partial && parsed.categoryId !== undefined) {
    throw validationError("categoryId cannot be changed");
  }
  if (!partial) {
    parsed.isVisible = parsed.isVisible ?? false;
    parsed.sortOrder = parsed.sortOrder || 0;
  }

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

export function createAdminCategoryService({ queries }) {
  return {
    async listCategories(filters = {}, adminViewer) {
      const parsed = parseCategoryFilters(filters);
      const categories = await queries.listCategories(parsed, adminViewer);
      return {
        categories: slicePageRows(categories, parsed),
        meta: createPaginationMeta(parsed, undefined, categories.length)
      };
    },

    async createCategory(body = {}, adminViewer) {
      const parsed = parseCategoryBody(body);
      const result = await queries.createCategory(parsed, adminViewer);
      if (result?.conflict) {
        throw conflict("Category already exists");
      }
      return result;
    },

    async updateCategory(categoryId, body = {}, adminViewer) {
      const id = validateUuid(categoryId, "categoryId");
      const parsed = parseCategoryBody(body, { partial: true });
      const result = await queries.updateCategory(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Category not found");
      }
      return result;
    }
  };
}
