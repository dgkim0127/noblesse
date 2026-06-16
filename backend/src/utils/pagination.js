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
    nextCursor: null
  };
}

export function createPaginationMeta(pagination, requestId) {
  return {
    limit: pagination.limit,
    nextCursor: pagination.nextCursor,
    requestId
  };
}
