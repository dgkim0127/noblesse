import assert from "node:assert/strict";
import test from "node:test";
import {
  getDetailContentPublishIssues,
  normalizeDetailContent
} from "../src/utils/productDetailContent.js";

const translated = (title, body = "") => ({
  kr: { title, body, caption: "", bullets: [] },
  en: { title, body, caption: "", bullets: [] },
  jp: { title, body, caption: "", bullets: [] },
  "zh-TW": { title, body, caption: "", bullets: [] }
});

test("detail content accepts only fixed safe block types and unique IDs", () => {
  const normalized = normalizeDetailContent({
    blocks: [
      { id: "features", type: "heading", translations: translated("상품 특징") },
      { id: "hero", type: "image", imageIds: ["image-1"], translations: translated("") }
    ]
  });

  assert.equal(normalized.blocks.length, 2);
  assert.equal(normalized.blocks[0].visible, true);
  assert.throws(
    () => normalizeDetailContent({ blocks: [{ id: "unsafe", type: "html", translations: {} }] }),
    /Invalid detailContent.blocks\[0\].type/
  );
  assert.throws(
    () => normalizeDetailContent({ blocks: [
      { id: "same", type: "divider", translations: {} },
      { id: "same", type: "divider", translations: {} }
    ] }),
    /Duplicate detail block id/
  );
});
test("detail publication blocks missing translations and deleted image references", () => {
  const detailContent = normalizeDetailContent({
    blocks: [{
      id: "wearing",
      type: "imageText",
      imageIds: ["deleted-image"],
      translations: {
        ...translated("착용과 크기", "착용 안내"),
        en: { title: "Wearing and size", body: "", caption: "", bullets: [] }
      }
    }]
  });

  assert.deepEqual(
    getDetailContentPublishIssues(detailContent, { gallery: [{ id: "image-1" }] }),
    [
      "detailContent.blocks.wearing.translations.en.body",
      "detailContent.blocks.wearing.imageIds.deleted-image"
    ]
  );
});
