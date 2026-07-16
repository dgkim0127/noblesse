import { validationError } from "./validators.js";
import { PRODUCT_OPTION_LOCALES } from "./productOptions.js";

export const PRODUCT_DETAIL_BLOCK_TYPES = [
  "heading",
  "text",
  "image",
  "imageText",
  "imageGrid",
  "specTable",
  "notice",
  "divider"
];

const blockIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseText(value, field, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw validationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw validationError(`${field} is too long`);
  return trimmed;
}

function parseStringList(value, field, { maxItems, maxLength }) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw validationError(`${field} must be an array`);
  if (value.length > maxItems) throw validationError(`${field} contains too many items`);
  return value.map((item, index) => parseText(item, `${field}[${index}]`, maxLength)).filter(Boolean);
}

function parseTranslations(value, field) {
  if (value === undefined || value === null) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`${field} must be an object`);
  }
  return Object.fromEntries(PRODUCT_OPTION_LOCALES.map((locale) => {
    const localized = value[locale] || {};
    if (!localized || typeof localized !== "object" || Array.isArray(localized)) {
      throw validationError(`${field}.${locale} must be an object`);
    }
    return [locale, {
      title: parseText(localized.title, `${field}.${locale}.title`, 200),
      body: parseText(localized.body, `${field}.${locale}.body`, 6000),
      caption: parseText(localized.caption, `${field}.${locale}.caption`, 500),
      bullets: parseStringList(localized.bullets, `${field}.${locale}.bullets`, { maxItems: 20, maxLength: 500 })
    }];
  }));
}

function normalizeBlock(block, index) {
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    throw validationError(`detailContent.blocks[${index}] must be an object`);
  }
  const field = `detailContent.blocks[${index}]`;
  const id = parseText(block.id, `${field}.id`, 64);
  if (!blockIdPattern.test(id)) throw validationError(`Invalid ${field}.id`);
  const type = parseText(block.type, `${field}.type`, 24);
  if (!PRODUCT_DETAIL_BLOCK_TYPES.includes(type)) throw validationError(`Invalid ${field}.type`);
  if (block.visible !== undefined && typeof block.visible !== "boolean") {
    throw validationError(`${field}.visible must be a boolean`);
  }
  const layout = parseText(block.layout, `${field}.layout`, 24);
  if (layout && !["imageLeft", "imageRight", "stacked"].includes(layout)) {
    throw validationError(`Invalid ${field}.layout`);
  }
  return {
    id,
    type,
    visible: block.visible !== false,
    layout: layout || "stacked",
    imageIds: parseStringList(block.imageIds, `${field}.imageIds`, { maxItems: 8, maxLength: 128 }),
    specKeys: parseStringList(block.specKeys, `${field}.specKeys`, { maxItems: 20, maxLength: 80 }),
    translations: parseTranslations(block.translations, `${field}.translations`)
  };
}

export function normalizeDetailContent(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError("detailContent must be an object");
  }
  if (value.blocks === undefined) return value;
  if (!Array.isArray(value.blocks)) throw validationError("detailContent.blocks must be an array");
  if (value.blocks.length > 30) throw validationError("detailContent.blocks may contain at most 30 blocks");
  const ids = new Set();
  const blocks = value.blocks.map((block, index) => {
    const normalized = normalizeBlock(block, index);
    if (ids.has(normalized.id)) throw validationError(`Duplicate detail block id: ${normalized.id}`);
    ids.add(normalized.id);
    return normalized;
  });
  return { ...value, blocks };
}

function imageIdSet(imageSet = {}) {
  return new Set(
    (Array.isArray(imageSet.gallery) ? imageSet.gallery : [])
      .map((image) => String(image?.id || "").trim())
      .filter(Boolean)
  );
}

function requireTranslatedField(block, key, issues) {
  const anyValue = PRODUCT_OPTION_LOCALES.some((locale) => {
    const value = block.translations?.[locale]?.[key];
    return Array.isArray(value) ? value.length > 0 : hasText(value);
  });
  if (!anyValue) return;
  for (const locale of PRODUCT_OPTION_LOCALES) {
    const value = block.translations?.[locale]?.[key];
    const complete = Array.isArray(value) ? value.length > 0 : hasText(value);
    if (!complete) issues.push(`detailContent.blocks.${block.id}.translations.${locale}.${key}`);
  }
}

export function getDetailContentPublishIssues(detailContent = {}, imageSet = {}) {
  const blocks = Array.isArray(detailContent.blocks) ? detailContent.blocks : [];
  const images = imageIdSet(imageSet);
  const issues = [];
  for (const block of blocks.filter((item) => item.visible !== false)) {
    if (block.type === "heading") requireTranslatedField(block, "title", issues);
    if (["text", "notice"].includes(block.type)) {
      requireTranslatedField(block, "title", issues);
      requireTranslatedField(block, "body", issues);
      requireTranslatedField(block, "bullets", issues);
    }
    if (block.type === "imageText") {
      requireTranslatedField(block, "title", issues);
      requireTranslatedField(block, "body", issues);
      requireTranslatedField(block, "caption", issues);
    }
    if (["image", "imageGrid"].includes(block.type)) requireTranslatedField(block, "caption", issues);
    if (["image", "imageText", "imageGrid"].includes(block.type) && block.imageIds.length === 0) {
      issues.push(`detailContent.blocks.${block.id}.imageIds`);
    }
    for (const imageId of block.imageIds || []) {
      if (!images.has(imageId)) issues.push(`detailContent.blocks.${block.id}.imageIds.${imageId}`);
    }
    if (block.type === "specTable" && (block.specKeys || []).length === 0) {
      issues.push(`detailContent.blocks.${block.id}.specKeys`);
    }
  }
  return issues;
}
