import { validationError } from "./errors.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

export function parsePagination(query = {}) {
  const requestedLimit = parseInteger(query.limit, "limit");
  const offset = parseInteger(query.offset, "offset") || 0;
  const limit = Math.min(requestedLimit || DEFAULT_LIMIT, MAX_LIMIT);

  return {
    limit,
    offset,
    dbLimit: limit + 1,
    nextCursor: null
  };
}

export function slicePageRows(rows = [], pagination) {
  return rows.slice(0, pagination.limit);
}

export function createPaginationMeta(pagination, requestId, rowCount = 0) {
  const hasMore = rowCount > pagination.limit;
  const nextOffset = hasMore ? pagination.offset + pagination.limit : null;
  return {
    limit: pagination.limit,
    offset: pagination.offset,
    nextCursor: nextOffset == null ? null : String(nextOffset),
    nextOffset,
    requestId
  };
}
