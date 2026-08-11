import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  loadPublicationPlan,
  publicationExpectations,
  validatePublicationManifest
} from "../src/jobs/npiPublication.js";

const manifestUrl = new URL("../src/data/piercing-import-manifest.json", import.meta.url);

test("publication manifest is pinned and classifies exactly 726 publish and 17 hold products", async () => {
  const plan = await loadPublicationPlan();

  assert.equal(plan.total, publicationExpectations.total);
  assert.equal(plan.publish.length, publicationExpectations.publish);
  assert.equal(plan.hold.length, publicationExpectations.hold);
  assert.equal(new Set([...plan.publish, ...plan.hold].map((item) => item.code)).size, 743);
  assert.deepEqual(
    [...new Set(plan.publish.map((item) => item.categoryKey))].sort(),
    ["earrings", "labret", "piercing", "piercing-ring"]
  );
  assert.equal(plan.publish.every((item) => Number.isInteger(item.wholesalePriceKrw) && item.wholesalePriceKrw > 0), true);
});

test("publication manifest validation fails closed if the pinned bytes change", async () => {
  const bytes = await readFile(manifestUrl);
  const parsed = JSON.parse(bytes.toString("utf8"));
  const tampered = Buffer.from(`${bytes.toString("utf8")} `, "utf8");

  assert.throws(
    () => validatePublicationManifest(parsed, tampered),
    /manifest SHA-256 mismatch/
  );
});
