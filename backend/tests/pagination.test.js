import assert from "node:assert/strict";
import test from "node:test";
import { createPaginationMeta, parsePagination, slicePageRows } from "../src/utils/pagination.js";

test("parsePagination adds an internal lookahead limit", () => {
  const pagination = parsePagination({ limit: "2", offset: "4" });

  assert.equal(pagination.limit, 2);
  assert.equal(pagination.offset, 4);
  assert.equal(pagination.dbLimit, 3);
});

test("createPaginationMeta returns next offset when lookahead row exists", () => {
  const pagination = parsePagination({ limit: "2", offset: "4" });
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const meta = createPaginationMeta(pagination, "req-test", rows.length);

  assert.deepEqual(slicePageRows(rows, pagination), [{ id: 1 }, { id: 2 }]);
  assert.equal(meta.limit, 2);
  assert.equal(meta.offset, 4);
  assert.equal(meta.nextOffset, 6);
  assert.equal(meta.nextCursor, "6");
  assert.equal(meta.requestId, "req-test");
});

test("createPaginationMeta clears next offset when no lookahead row exists", () => {
  const pagination = parsePagination({ limit: "2", offset: "4" });
  const rows = [{ id: 1 }, { id: 2 }];
  const meta = createPaginationMeta(pagination, undefined, rows.length);

  assert.deepEqual(slicePageRows(rows, pagination), rows);
  assert.equal(meta.nextOffset, null);
  assert.equal(meta.nextCursor, null);
});
