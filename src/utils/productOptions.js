import {
  BODY_JEWELRY_GAUGE_SYSTEM,
  createBodyJewelryGaugeMeasurement,
  formatBodyJewelryGaugeMeasurement,
  getBodyJewelryGaugePairByGauge,
  isValidBodyJewelryGaugeMeasurement,
  normalizeBodyJewelryGaugeMeasurement,
} from './bodyJewelryGauge.js'

export const productOptionLocales = ['kr', 'en', 'jp', 'zh-TW']

const optionGroupTypes = new Set(['text', 'swatch'])

const localeLabels = {
  kr: '한국어',
  en: 'English',
  jp: '日本語',
  'zh-TW': '繁體中文',
}

function gaugePresetValue(gauge) {
  const measurement = createBodyJewelryGaugeMeasurement(getBodyJewelryGaugePairByGauge(gauge))
  const label = formatBodyJewelryGaugeMeasurement(measurement)
  return {
    id: gauge.toLowerCase(),
    labels: Object.fromEntries(productOptionLocales.map((locale) => [locale, label])),
    measurement,
  }
}

const presetDefinitions = {
  color: {
    id: 'color',
    legacyKey: 'color',
    type: 'swatch',
    required: true,
    labels: { kr: '색상', en: 'Color', jp: 'カラー', 'zh-TW': '顏色' },
    values: [
      { id: 'gold', labels: { kr: '골드', en: 'Gold', jp: 'ゴールド', 'zh-TW': '金色' }, swatch: '#D4AF37' },
      { id: 'pink', labels: { kr: '핑크', en: 'Pink', jp: 'ピンク', 'zh-TW': '粉色' }, swatch: '#E7A6B6' },
      { id: 'silver', labels: { kr: '실버', en: 'Silver', jp: 'シルバー', 'zh-TW': '銀色' }, swatch: '#BFC3C7' },
    ],
  },
  barLength: {
    id: 'bar-length',
    type: 'text',
    required: true,
    labels: { kr: '바 길이', en: 'Bar length', jp: 'バーの長さ', 'zh-TW': '耳針長度' },
    values: ['4mm', '6mm', '8mm', '10mm'].map((label) => ({
      id: label.toLowerCase(),
      labels: Object.fromEntries(productOptionLocales.map((locale) => [locale, label])),
    })),
  },
  gauge: {
    id: 'gauge',
    type: 'text',
    required: true,
    labels: {
      kr: '바 두께 (게이지)',
      en: 'Bar thickness (gauge)',
      jp: 'バーの太さ（ゲージ）',
      'zh-TW': '耳針粗細（規格）',
    },
    values: ['16G', '18G', '20G'].map(gaugePresetValue),
  },
  ballSize: {
    id: 'ball-size',
    type: 'text',
    required: false,
    labels: { kr: '볼 크기', en: 'Ball size', jp: 'ボールサイズ', 'zh-TW': '珠頭尺寸' },
    values: ['3mm', '4mm', '5mm'].map((label) => ({
      id: label.toLowerCase(),
      labels: Object.fromEntries(productOptionLocales.map((locale) => [locale, label])),
    })),
  },
  custom: {
    id: 'custom',
    type: 'text',
    required: false,
    labels: { kr: '사용자 지정', en: 'Custom option', jp: 'カスタム', 'zh-TW': '自訂選項' },
    values: [],
  },
}

export const productOptionPresets = [
  ['color', '색상'],
  ['barLength', '바 길이'],
  ['gauge', '바 두께 (mm/G)'],
  ['ballSize', '볼 크기'],
  ['custom', '사용자 지정'],
]

function makeId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${value}`.slice(0, 64)
}

function cleanLabels(labels = {}) {
  return Object.fromEntries(productOptionLocales.map((locale) => [locale, String(labels?.[locale] || '')]))
}

function isGaugeGroupId(groupId) {
  return /^gauge(?:-\d+)?$/i.test(String(groupId || ''))
}

function normalizeValue(value = {}, index = 0, groupId = '') {
  let labels = cleanLabels(value.labels)
  const usesGaugeMeasurement = isGaugeGroupId(groupId) || value?.measurement?.system === BODY_JEWELRY_GAUGE_SYSTEM
  let measurement = usesGaugeMeasurement
    ? normalizeBodyJewelryGaugeMeasurement(value.measurement, firstLabel(labels))
    : null
  if (measurement && isValidBodyJewelryGaugeMeasurement(measurement)) {
    measurement = createBodyJewelryGaugeMeasurement(
      getBodyJewelryGaugePairByGauge(measurement.gauge),
      measurement.authority,
    )
    const label = formatBodyJewelryGaugeMeasurement(measurement)
    labels = Object.fromEntries(productOptionLocales.map((locale) => [locale, label]))
  }
  return {
    id: String(value.id || makeId(`value-${index + 1}`)).slice(0, 64),
    active: value.active !== false,
    labels,
    swatch: /^#[0-9a-f]{6}$/i.test(String(value.swatch || '')) ? String(value.swatch).toUpperCase() : '',
    imageId: String(value.imageId || ''),
    ...(measurement ? { measurement } : {}),
  }
}

export function normalizeProductOptionGroups(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).map((group, index) => {
    const id = String(group?.id || makeId(`group-${index + 1}`)).slice(0, 64)
    return {
      id,
      type: optionGroupTypes.has(group?.type) ? group.type : 'text',
      required: Boolean(group?.required),
      legacyKey: ['color', 'size'].includes(group?.legacyKey) ? group.legacyKey : '',
      labels: cleanLabels(group?.labels),
      values: Array.isArray(group?.values)
        ? group.values.slice(0, 20).map((item, valueIndex) => normalizeValue(item, valueIndex, id))
        : [],
    }
  })
}

export function isBodyJewelryGaugeGroup(group = {}) {
  return isGaugeGroupId(group.id)
    || group.values?.some((value) => value?.measurement?.system === BODY_JEWELRY_GAUGE_SYSTEM)
}

function stableHash(value) {
  let hash = 2166136261
  for (const character of String(value)) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function legacyValue(kind, value, index) {
  const label = String(value || '').trim()
  return normalizeValue({
    id: `legacy-${kind}-${stableHash(`${index}:${label}`)}`,
    labels: Object.fromEntries(productOptionLocales.map((locale) => [locale, label])),
  }, index)
}

export function createLegacyProductOptionGroups({ colors = [], sizes = [] } = {}) {
  const groups = []
  const safeColors = Array.isArray(colors) ? colors.map(String).map((item) => item.trim()).filter(Boolean) : []
  const safeSizes = Array.isArray(sizes) ? sizes.map(String).map((item) => item.trim()).filter(Boolean) : []
  if (safeColors.length) {
    groups.push({
      id: 'legacy-color',
      type: 'swatch',
      required: true,
      legacyKey: 'color',
      labels: { kr: '색상', en: 'Color', jp: 'カラー', 'zh-TW': '顏色' },
      values: safeColors.slice(0, 20).map((item, index) => legacyValue('color', item, index)),
    })
  }
  if (safeSizes.length) {
    groups.push({
      id: 'legacy-size',
      type: 'text',
      required: true,
      legacyKey: 'size',
      labels: { kr: '사이즈', en: 'Size', jp: 'サイズ', 'zh-TW': '尺寸' },
      values: safeSizes.slice(0, 20).map((item, index) => legacyValue('size', item, index)),
    })
  }
  return normalizeProductOptionGroups(groups)
}

export function getEffectiveProductOptionGroups(product = {}) {
  const explicit = Array.isArray(product.optionGroups)
    ? product.optionGroups
    : Array.isArray(product.option_groups)
      ? product.option_groups
      : []
  if (explicit.length) return normalizeProductOptionGroups(explicit)
  return createLegacyProductOptionGroups({ colors: product.colors, sizes: product.sizes })
}

export function createProductOptionPreset(presetKey, existingGroups = []) {
  const source = presetDefinitions[presetKey] || presetDefinitions.custom
  const usedIds = new Set(existingGroups.map((group) => group.id))
  let id = source.id
  let suffix = 2
  while (usedIds.has(id)) id = `${source.id}-${suffix++}`
  return normalizeProductOptionGroups([{ ...structuredClone(source), id }])[0]
}

export function createPiercingOptionTemplate() {
  return ['color', 'barLength', 'gauge', 'ballSize'].map((preset) => createProductOptionPreset(preset))
}

function firstLabel(labels = {}) {
  for (const locale of productOptionLocales) {
    const label = String(labels?.[locale] || '').trim()
    if (label) return label
  }
  return ''
}

export function syncLegacyProductOptions(optionGroups = []) {
  const groups = normalizeProductOptionGroups(optionGroups)
  const valuesFor = (legacyKey) => groups
    .find((group) => group.legacyKey === legacyKey)
    ?.values.filter((value) => value.active).map((value) => firstLabel(value.labels)).filter(Boolean) || []
  return { colors: valuesFor('color'), sizes: valuesFor('size') }
}

export function getLocalizedOptionLabel(labels = {}, locale = 'kr') {
  const normalizedLocale = locale === 'cn' ? 'zh-TW' : locale
  return String(labels?.[normalizedLocale] || labels?.en || labels?.kr || firstLabel(labels)).trim()
}

export function getProductOptionDraftIssues(optionGroups = [], images = []) {
  const groups = normalizeProductOptionGroups(optionGroups)
  const imageIds = new Set(images.map((image) => String(image?.id || image?.existingId || '')).filter(Boolean))
  const issues = []
  const groupIds = new Set()
  groups.forEach((group, groupIndex) => {
    if (groupIds.has(group.id)) issues.push(`${groupIndex + 1}번 옵션 그룹 ID 중복`)
    groupIds.add(group.id)
    productOptionLocales.forEach((locale) => {
      if (!group.labels[locale].trim()) issues.push(`${groupIndex + 1}번 옵션 ${localeLabels[locale]} 이름`)
    })
    const activeValues = group.values.filter((value) => value.active)
    if (!activeValues.length) issues.push(`${groupIndex + 1}번 옵션 값`)
    const valueIds = new Set()
    activeValues.forEach((value, valueIndex) => {
      if (valueIds.has(value.id)) issues.push(`${groupIndex + 1}번 옵션 값 ID 중복`)
      valueIds.add(value.id)
      productOptionLocales.forEach((locale) => {
        if (!value.labels[locale].trim()) issues.push(`${groupIndex + 1}번 옵션 ${valueIndex + 1}번 값 ${localeLabels[locale]} 이름`)
      })
      if (isBodyJewelryGaugeGroup(group) && !isValidBodyJewelryGaugeMeasurement(value.measurement)) {
        issues.push(`${groupIndex + 1}번 옵션 ${valueIndex + 1}번 값 mm/G 표준 규격`)
      }
      if (value.imageId && !imageIds.has(value.imageId)) issues.push(`${groupIndex + 1}번 옵션 ${valueIndex + 1}번 연결 이미지`)
    })
  })
  return [...new Set(issues)]
}

export function selectedOptionPairs(selection = {}) {
  return Object.entries(selection)
    .filter(([, valueId]) => valueId)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, valueId]) => ({ groupId, valueId }))
}

export function normalizeSelectedOptionPairs(value = []) {
  const seen = new Set()
  return (Array.isArray(value) ? value : [])
    .flatMap((item) => {
      const groupId = String(item?.groupId || '')
      const valueId = String(item?.valueId || '')
      if (!groupId || !valueId || seen.has(groupId)) return []
      seen.add(groupId)
      return [{ groupId, valueId }]
    })
    .sort((left, right) => left.groupId.localeCompare(right.groupId))
}

export function selectedOptionMap(value = []) {
  return Object.fromEntries(normalizeSelectedOptionPairs(value).map((item) => [item.groupId, item.valueId]))
}

export function productOptionCombinationKey(selection = {}) {
  const pairs = Array.isArray(selection) ? normalizeSelectedOptionPairs(selection) : selectedOptionPairs(selection)
  return pairs.map(({ groupId, valueId }) => `${groupId}:${valueId}`).join('|')
}

export function getSelectedOptionSnapshots(optionGroups = [], selection = {}) {
  return normalizeProductOptionGroups(optionGroups).flatMap((group) => {
    const value = group.values.find((candidate) => candidate.id === selection[group.id] && candidate.active)
    if (!value) return []
    return [{
      groupId: group.id,
      valueId: value.id,
      type: group.type,
      legacyKey: group.legacyKey || '',
      groupLabels: group.labels,
      valueLabels: value.labels,
      swatch: value.swatch,
      imageId: value.imageId,
      ...(value.measurement ? { measurement: value.measurement } : {}),
    }]
  })
}

export function getLegacySelectionFromSnapshots(snapshots = [], locale = 'kr') {
  const find = (legacyKey) => snapshots.find((item) => item.legacyKey === legacyKey)
  return {
    color: getLocalizedOptionLabel(find('color')?.valueLabels, locale),
    size: getLocalizedOptionLabel(find('size')?.valueLabels, locale),
  }
}

function findValueByLabel(group, label) {
  const target = String(label || '').trim().toLocaleLowerCase()
  if (!target) return null
  return group.values.find((value) => productOptionLocales.some((locale) => (
    String(value.labels?.[locale] || '').trim().toLocaleLowerCase() === target
  ))) || null
}

export function resolveProductOptionSelection(product = {}, option = {}, { defaultLegacy = true } = {}) {
  const groups = getEffectiveProductOptionGroups(product)
  const selection = selectedOptionMap(option.selectedOptionPairs || option.selectedOptions)

  groups.forEach((group) => {
    if (selection[group.id]) return
    const legacyLabel = group.legacyKey === 'color' ? option.color : group.legacyKey === 'size' ? option.size : ''
    const matched = findValueByLabel(group, legacyLabel)
    if (matched?.active) {
      selection[group.id] = matched.id
      return
    }
    if (defaultLegacy && group.id.startsWith('legacy-')) {
      const firstActive = group.values.find((value) => value.active)
      if (firstActive) selection[group.id] = firstActive.id
    }
  })

  const snapshots = getSelectedOptionSnapshots(groups, selection)
  const legacy = getLegacySelectionFromSnapshots(snapshots)
  return {
    groups,
    selection,
    selectedOptionPairs: selectedOptionPairs(selection),
    selectedOptions: snapshots,
    color: legacy.color || String(option.color || ''),
    size: legacy.size || String(option.size || ''),
  }
}

export function getMissingRequiredProductOptions(optionGroups = [], selection = {}) {
  return normalizeProductOptionGroups(optionGroups).filter((group) => (
    group.required
    && !group.values.some((value) => value.active && value.id === selection[group.id])
  ))
}

export function formatSelectedProductOptions(selectedOptions = [], locale = 'kr') {
  return (Array.isArray(selectedOptions) ? selectedOptions : []).flatMap((item) => {
    const group = getLocalizedOptionLabel(item?.groupLabels, locale)
    const value = getLocalizedOptionLabel(item?.valueLabels, locale)
    return group && value ? [`${group}: ${value}`] : []
  })
}
