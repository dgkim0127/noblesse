import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  parseBooleanLike,
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";
import { conflict, notFound } from "../utils/errors.js";

const bannerWriteFields = [
  "bannerId",
  "titleKo",
  "titleEn",
  "titleJa",
  "subtitleKo",
  "subtitleEn",
  "subtitleJa",
  "desktopImageUrl",
  "mobileImageUrl",
  "linkType",
  "linkValue",
  "isVisible",
  "sortOrder",
  "startsAt",
  "endsAt"
];

const linkTypes = ["path", "product", "collection", "url"];

function parseInteger(value, fieldName, { min = 0 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseOptionalDateText(value, fieldName) {
  const parsed = parseOptionalString(value, { maxLength: 80 });
  if (parsed === undefined) return undefined;
  if (Number.isNaN(Date.parse(parsed))) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseBannerFilters(filters = {}) {
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

function parseBannerBody(body = {}, { partial = false } = {}) {
  const safeBody = rejectUnknownFields(body, bannerWriteFields);
  const parsed = {
    bannerId: partial
      ? parseOptionalString(safeBody.bannerId, { maxLength: 80 })
      : parseRequiredString(safeBody.bannerId, { fieldName: "bannerId", maxLength: 80 }),
    titleKo: parseOptionalString(safeBody.titleKo, { maxLength: 160 }),
    titleEn: partial
      ? parseOptionalString(safeBody.titleEn, { maxLength: 160 })
      : parseRequiredString(safeBody.titleEn, { fieldName: "titleEn", maxLength: 160 }),
    titleJa: parseOptionalString(safeBody.titleJa, { maxLength: 160 }),
    subtitleKo: parseOptionalString(safeBody.subtitleKo, { maxLength: 240 }),
    subtitleEn: parseOptionalString(safeBody.subtitleEn, { maxLength: 240 }),
    subtitleJa: parseOptionalString(safeBody.subtitleJa, { maxLength: 240 }),
    desktopImageUrl: partial
      ? parseOptionalString(safeBody.desktopImageUrl, { maxLength: 1000 })
      : parseRequiredString(safeBody.desktopImageUrl, { fieldName: "desktopImageUrl", maxLength: 1000 }),
    mobileImageUrl: parseOptionalString(safeBody.mobileImageUrl, { maxLength: 1000 }),
    linkType: parseOptionalEnum(safeBody.linkType, linkTypes, "linkType"),
    linkValue: parseOptionalString(safeBody.linkValue, { maxLength: 1000 }),
    isVisible: parseBooleanLike(safeBody.isVisible, "isVisible"),
    sortOrder: parseInteger(safeBody.sortOrder, "sortOrder"),
    startsAt: parseOptionalDateText(safeBody.startsAt, "startsAt"),
    endsAt: parseOptionalDateText(safeBody.endsAt, "endsAt")
  };

  if (partial && parsed.bannerId !== undefined) {
    throw validationError("bannerId cannot be changed");
  }
  if (!partial) {
    parsed.linkType = parsed.linkType || "path";
    parsed.linkValue = parsed.linkValue || "/";
    parsed.isVisible = parsed.isVisible ?? false;
    parsed.sortOrder = parsed.sortOrder || 0;
  }

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

export function createAdminBannerService({ queries }) {
  return {
    async listBanners(filters = {}, adminViewer) {
      const parsed = parseBannerFilters(filters);
      const banners = await queries.listBanners(parsed, adminViewer);
      return {
        banners: slicePageRows(banners, parsed),
        meta: createPaginationMeta(parsed, undefined, banners.length)
      };
    },

    async createBanner(body = {}, adminViewer) {
      const parsed = parseBannerBody(body);
      const result = await queries.createBanner(parsed, adminViewer);
      if (result?.conflict) {
        throw conflict("Banner already exists");
      }
      return result;
    },

    async updateBanner(bannerId, body = {}, adminViewer) {
      const id = validateUuid(bannerId, "bannerId");
      const parsed = parseBannerBody(body, { partial: true });
      const result = await queries.updateBanner(id, parsed, adminViewer);
      if (!result) {
        throw notFound("Banner not found");
      }
      return result;
    }
  };
}
