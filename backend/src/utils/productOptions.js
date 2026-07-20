import { validationError } from "./validators.js";
import {
  BODY_JEWELRY_GAUGE_SYSTEM,
  createGaugeMeasurement,
  formatGaugeMeasurement,
  getGaugePairByGauge,
  isValidGaugeMeasurement,
  normalizeGaugeMeasurement
} from "./bodyJewelryGauge.js";

export const PRODUCT_OPTION_LOCALES = ["kr", "en", "jp", "zh-TW"];
export const PRODUCT_OPTION_GROUP_TYPES = ["text", "swatch"];

const optionIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const swatchPattern = /^#[0-9A-F]{6}$/i;

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseText(value, field, maxLength = 120) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw validationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw validationError(`${field} is too long`);
  return trimmed;
}

function parseId(value, field) {
  const id = parseText(value, field, 64);
  if (!optionIdPattern.test(id)) throw validationError(`Invalid ${field}`);
  return id;
}

function parseLabels(value, field) {
  if (value === undefined || value === null) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`${field} must be an object`);
  }
  return Object.fromEntries(
    PRODUCT_OPTION_LOCALES.map((locale) => [locale, parseText(value[locale], `${field}.${locale}`)])
  );
}

function parseBoolean(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value !== "boolean") throw validationError("Option boolean fields must be boolean values");
  return value;
}

function isGaugeGroupId(groupId) {
  return /^gauge(?:-\d+)?$/i.test(String(groupId || ""));
}

function isGaugeGroup(group = {}) {
  return isGaugeGroupId(group.id)
    || group.values?.some((value) => value?.measurement?.system === BODY_JEWELRY_GAUGE_SYSTEM);
}

function parseGaugeMeasurement(value, labels, field, groupId) {
  const raw = value.measurement;
  const usesGaugeMeasurement = isGaugeGroupId(groupId)
    || raw?.system === BODY_JEWELRY_GAUGE_SYSTEM;
  if (!usesGaugeMeasurement) return null;
  if (raw !== undefined && (!raw || typeof raw !== "object" || Array.isArray(raw))) {
    throw validationError(`${field}.measurement must be an object`);
  }
  const source = raw || {};
  const system = parseText(source.system || BODY_JEWELRY_GAUGE_SYSTEM, `${field}.measurement.system`, 40);
  if (system !== BODY_JEWELRY_GAUGE_SYSTEM) throw validationError(`Invalid ${field}.measurement.system`);
  const authority = parseText(source.authority || "gauge", `${field}.measurement.authority`, 8);
  if (!new Set(["mm", "gauge"]).has(authority)) throw validationError(`Invalid ${field}.measurement.authority`);
  const normalizedSource = { system, authority };
  if (Object.prototype.hasOwnProperty.call(source, "mm")) {
    normalizedSource.mm = parseText(source.mm, `${field}.measurement.mm`, 8);
  }
  if (Object.prototype.hasOwnProperty.call(source, "gauge")) {
    normalizedSource.gauge = parseText(source.gauge, `${field}.measurement.gauge`, 8);
  }
  return normalizeGaugeMeasurement(normalizedSource, firstLabel(labels));
}

function parseOptionValue(value, groupIndex, valueIndex, groupId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`optionGroups[${groupIndex}].values[${valueIndex}] must be an object`);
  }
  const field = `optionGroups[${groupIndex}].values[${valueIndex}]`;
  const swatch = parseText(value.swatch, `${field}.swatch`, 7);
  if (swatch && !swatchPattern.test(swatch)) throw validationError(`Invalid ${field}.swatch`);
  let labels = parseLabels(value.labels, `${field}.labels`);
  let measurement = parseGaugeMeasurement(value, labels, field, groupId);
  if (measurement && isValidGaugeMeasurement(measurement)) {
    measurement = createGaugeMeasurement(getGaugePairByGauge(measurement.gauge), measurement.authority);
    const label = formatGaugeMeasurement(measurement);
    labels = Object.fromEntries(PRODUCT_OPTION_LOCALES.map((locale) => [locale, label]));
  }
  return {
    id: parseId(value.id, `${field}.id`),
    active: parseBoolean(value.active, true),
    labels,
    swatch: swatch.toUpperCase(),
    imageId: parseText(value.imageId, `${field}.imageId`, 128),
    ...(measurement ? { measurement } : {})
  };
}
function normalizeLegacyKey(value, field) {
  const key = parseText(value, field, 16);
  if (!key) return "";
  if (!new Set(["color", "size"]).has(key)) throw validationError(`Invalid ${field}`);
  return key;
}

export function normalizeOptionGroups(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw validationError("optionGroups must be an array");
  if (value.length > 6) throw validationError("optionGroups may contain at most 6 groups");

  const groupIds = new Set();
  return value.map((group, groupIndex) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw validationError(`optionGroups[${groupIndex}] must be an object`);
    }
    const field = `optionGroups[${groupIndex}]`;
    const id = parseId(group.id, `${field}.id`);
    if (groupIds.has(id)) throw validationError(`Duplicate option group id: ${id}`);
    groupIds.add(id);

    const type = parseText(group.type || "text", `${field}.type`, 16);
    if (!PRODUCT_OPTION_GROUP_TYPES.includes(type)) throw validationError(`Invalid ${field}.type`);
    if (!Array.isArray(group.values)) throw validationError(`${field}.values must be an array`);
    if (group.values.length > 20) throw validationError(`${field}.values may contain at most 20 values`);

    const valueIds = new Set();
    const values = group.values.map((item, valueIndex) => {
      const normalized = parseOptionValue(item, groupIndex, valueIndex, id);
      if (valueIds.has(normalized.id)) throw validationError(`Duplicate option value id: ${normalized.id}`);
      valueIds.add(normalized.id);
      return normalized;
    });
    if (values.filter((item) => item.active).length > 20) {
      throw validationError(`${field} may contain at most 20 active values`);
    }

    return {
      id,
      type,
      required: parseBoolean(group.required, false),
      legacyKey: normalizeLegacyKey(group.legacyKey, `${field}.legacyKey`),
      labels: parseLabels(group.labels, `${field}.labels`),
      values
    };
  });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function legacyValue(kind, value, index) {
  const text = String(value || "").trim();
  return {
    id: `legacy-${kind}-${stableHash(`${index}:${text}`)}`,
    active: true,
    labels: Object.fromEntries(PRODUCT_OPTION_LOCALES.map((locale) => [locale, text])),
    swatch: "",
    imageId: ""
  };
}

export function createLegacyOptionGroups({ colors = [], sizes = [] } = {}) {
  const groups = [];
  const safeColors = Array.isArray(colors) ? colors.map(String).map((item) => item.trim()).filter(Boolean) : [];
  const safeSizes = Array.isArray(sizes) ? sizes.map(String).map((item) => item.trim()).filter(Boolean) : [];
  if (safeColors.length > 0) {
    groups.push({
      id: "legacy-color",
      type: "swatch",
      required: true,
      legacyKey: "color",
      labels: { kr: "색상", en: "Color", jp: "カラー", "zh-TW": "顏色" },
      values: safeColors.slice(0, 20).map((item, index) => legacyValue("color", item, index))
    });
  }
  if (safeSizes.length > 0) {
    groups.push({
      id: "legacy-size",
      type: "text",
      required: true,
      legacyKey: "size",
      labels: { kr: "사이즈", en: "Size", jp: "サイズ", "zh-TW": "尺寸" },
      values: safeSizes.slice(0, 20).map((item, index) => legacyValue("size", item, index))
    });
  }
  return groups;
}

export function getEffectiveOptionGroups(product = {}) {
  const explicit = Array.isArray(product.optionGroups)
    ? product.optionGroups
    : Array.isArray(product.option_groups)
      ? product.option_groups
      : [];
  if (explicit.length > 0) return normalizeOptionGroups(explicit) || [];
  return createLegacyOptionGroups({ colors: product.colors, sizes: product.sizes });
}

function firstLabel(labels = {}) {
  for (const locale of PRODUCT_OPTION_LOCALES) {
    if (hasText(labels[locale])) return labels[locale].trim();
  }
  return "";
}

export function syncLegacyOptionArrays(optionGroups, { colors = [], sizes = [] } = {}) {
  const groups = Array.isArray(optionGroups) ? optionGroups : [];
  const colorGroup = groups.find((group) => group.legacyKey === "color");
  const sizeGroup = groups.find((group) => group.legacyKey === "size");
  return {
    colors: colorGroup
      ? colorGroup.values.filter((value) => value.active).map((value) => firstLabel(value.labels)).filter(Boolean)
      : colors,
    sizes: sizeGroup
      ? sizeGroup.values.filter((value) => value.active).map((value) => firstLabel(value.labels)).filter(Boolean)
      : sizes
  };
}

function galleryImageIds(imageSet = {}) {
  return new Set(
    (Array.isArray(imageSet.gallery) ? imageSet.gallery : [])
      .map((image) => String(image?.id || "").trim())
      .filter(Boolean)
  );
}

export function getOptionPublishIssues(optionGroups, imageSet = {}) {
  const groups = Array.isArray(optionGroups) ? optionGroups : [];
  const imageIds = galleryImageIds(imageSet);
  const issues = [];
  for (const group of groups) {
    for (const locale of PRODUCT_OPTION_LOCALES) {
      if (!hasText(group.labels?.[locale])) issues.push(`optionGroups.${group.id}.labels.${locale}`);
    }
    const activeValues = (group.values || []).filter((value) => value.active);
    if (activeValues.length === 0) issues.push(`optionGroups.${group.id}.values`);
    for (const value of activeValues) {
      for (const locale of PRODUCT_OPTION_LOCALES) {
        if (!hasText(value.labels?.[locale])) {
          issues.push(`optionGroups.${group.id}.values.${value.id}.labels.${locale}`);
        }
      }
      if (isGaugeGroup(group) && !isValidGaugeMeasurement(value.measurement)) {
        issues.push(`optionGroups.${group.id}.values.${value.id}.measurement`);
      }
      if (value.imageId && !imageIds.has(value.imageId)) {
        issues.push(`optionGroups.${group.id}.values.${value.id}.imageId`);
      }
    }
  }
  return issues;
}

function parseSelections(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw validationError("selectedOptions must be an array");
  if (value.length > 6) throw validationError("selectedOptions may contain at most 6 values");
  const groupIds = new Set();
  return value.map((selection, index) => {
    if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
      throw validationError(`selectedOptions[${index}] must be an object`);
    }
    const groupId = parseId(selection.groupId, `selectedOptions[${index}].groupId`);
    const valueId = parseId(selection.valueId, `selectedOptions[${index}].valueId`);
    if (groupIds.has(groupId)) throw validationError(`Duplicate selected option group: ${groupId}`);
    groupIds.add(groupId);
    return { groupId, valueId };
  });
}

function matchLegacySelection(group, label) {
  if (!hasText(label)) return null;
  const target = label.trim().toLocaleLowerCase();
  return group.values.find((value) =>
    PRODUCT_OPTION_LOCALES.some((locale) => String(value.labels?.[locale] || "").trim().toLocaleLowerCase() === target)
  ) || null;
}

export function resolveSelectedOptions(product, selectionInput = {}) {
  const groups = getEffectiveOptionGroups(product);
  const requested = parseSelections(selectionInput.selectedOptions);
  const selectedByGroup = new Map(requested.map((selection) => [selection.groupId, selection.valueId]));

  for (const group of groups) {
    if (selectedByGroup.has(group.id)) continue;
    const legacyLabel = group.legacyKey === "color" ? selectionInput.color : group.legacyKey === "size" ? selectionInput.size : "";
    const legacyValue = matchLegacySelection(group, legacyLabel);
    if (legacyValue) selectedByGroup.set(group.id, legacyValue.id);
  }

  const knownGroupIds = new Set(groups.map((group) => group.id));
  for (const groupId of selectedByGroup.keys()) {
    if (!knownGroupIds.has(groupId)) throw validationError(`Unknown option group: ${groupId}`);
  }

  const snapshots = [];
  for (const group of groups) {
    const valueId = selectedByGroup.get(group.id);
    if (!valueId) {
      if (group.required) throw validationError(`Required option is missing: ${group.id}`);
      continue;
    }
    const value = group.values.find((candidate) => candidate.id === valueId && candidate.active);
    if (!value) throw validationError(`Unavailable option value: ${group.id}.${valueId}`);
    if (isGaugeGroup(group) && !isValidGaugeMeasurement(value.measurement)) {
      throw validationError(`Invalid gauge option value: ${group.id}.${valueId}`);
    }
    snapshots.push({
      groupId: group.id,
      valueId: value.id,
      type: group.type,
      legacyKey: group.legacyKey || "",
      groupLabels: { ...group.labels },
      valueLabels: { ...value.labels },
      swatch: value.swatch || "",
      imageId: value.imageId || "",
      ...(value.measurement ? { measurement: { ...value.measurement } } : {})
    });
  }

  const colorSnapshot = snapshots.find((item) => item.legacyKey === "color");
  const sizeSnapshot = snapshots.find((item) => item.legacyKey === "size");
  return {
    selectedOptions: snapshots,
    color: colorSnapshot ? firstLabel(colorSnapshot.valueLabels) : parseText(selectionInput.color, "color", 80),
    size: sizeSnapshot ? firstLabel(sizeSnapshot.valueLabels) : parseText(selectionInput.size, "size", 80)
  };
}
