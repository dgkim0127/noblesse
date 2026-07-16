import assert from "node:assert/strict";
import test from "node:test";
import {
  createLegacyOptionGroups,
  getOptionPublishIssues,
  normalizeOptionGroups,
  resolveSelectedOptions,
  syncLegacyOptionArrays
} from "../src/utils/productOptions.js";

const labels = (kr, en = kr, jp = kr, zhTw = kr) => ({ kr, en, jp, "zh-TW": zhTw });

function createOptionGroups() {
  return [
    {
      id: "color",
      type: "swatch",
      required: true,
      legacyKey: "color",
      labels: labels("색상", "Color", "カラー", "顏色"),
      values: [
        { id: "gold", active: true, labels: labels("골드", "Gold", "ゴールド", "金色"), swatch: "#D4AF37", imageId: "image-gold" },
        { id: "pink", active: true, labels: labels("핑크", "Pink", "ピンク", "粉紅"), swatch: "#FF8FA9", imageId: "" }
      ]
    },
    {
      id: "bar-length",
      type: "text",
      required: true,
      labels: labels("바 길이", "Bar length", "バーの長さ", "棒長"),
      values: [
        { id: "6mm", active: true, labels: labels("6mm"), swatch: "", imageId: "" },
        { id: "8mm", active: true, labels: labels("8mm"), swatch: "", imageId: "" }
      ]
    }
  ];
}

test("legacy colors and sizes become stable required option groups", () => {
  const first = createLegacyOptionGroups({ colors: ["Gold", "Pink"], sizes: ["6mm", "8mm"] });
  const second = createLegacyOptionGroups({ colors: ["Gold", "Pink"], sizes: ["6mm", "8mm"] });

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((group) => group.legacyKey), ["color", "size"]);
  assert.equal(first.every((group) => group.required), true);
  assert.deepEqual(syncLegacyOptionArrays(first), {
    colors: ["Gold", "Pink"],
    sizes: ["6mm", "8mm"]
  });
});

test("selected option IDs are validated and stored as localized snapshots", () => {
  const optionGroups = normalizeOptionGroups(createOptionGroups());
  const resolved = resolveSelectedOptions(
    { optionGroups },
    { selectedOptions: [{ groupId: "color", valueId: "gold" }, { groupId: "bar-length", valueId: "6mm" }] }
  );

  assert.equal(resolved.selectedOptions.length, 2);
  assert.deepEqual(resolved.selectedOptions[0].groupLabels, labels("색상", "Color", "カラー", "顏色"));
  assert.equal(resolved.selectedOptions[0].valueLabels.en, "Gold");
  assert.equal(resolved.selectedOptions[0].imageId, "image-gold");
  assert.equal(resolved.color, "골드");

  assert.throws(
    () => resolveSelectedOptions({ optionGroups }, { selectedOptions: [{ groupId: "color", valueId: "gold" }] }),
    /Required option is missing: bar-length/
  );
  assert.throws(
    () => resolveSelectedOptions({ optionGroups }, { selectedOptions: [{ groupId: "color", valueId: "missing" }, { groupId: "bar-length", valueId: "6mm" }] }),
    /Unavailable option value/
  );
});
test("option publication reports missing translations and gallery references", () => {
  const groups = createOptionGroups();
  groups[1].labels["zh-TW"] = "";

  assert.deepEqual(
    getOptionPublishIssues(groups, { gallery: [{ id: "other-image" }] }),
    [
      "optionGroups.color.values.gold.imageId",
      "optionGroups.bar-length.labels.zh-TW"
    ]
  );
});
