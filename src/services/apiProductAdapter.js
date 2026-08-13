import { createArchiveProductLocalization, shouldGenerateArchiveLocalization } from '../utils/archiveProductLocalization.js'
import { resolveApiImageSet } from '../utils/apiAssetUrl.js'

const toneByMaterial = [
  ['gold', 'gold'],
  ['opal', 'opal'],
  ['pearl', 'opal'],
  ['black', 'black'],
  ['cubic', 'opal'],
]

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

const legacyOptionLabelCorrections = {
  '오알': {
    kr: '오팔',
    en: 'Opal',
    jp: 'オパール',
    'zh-TW': '歐泊',
    cn: '歐泊',
  },
}

function normalizeLegacyColors(colors) {
  return normalizeStringArray(colors).map((color) => legacyOptionLabelCorrections[color]?.kr || color)
}

function normalizeImportedBarLengthSizes(specs) {
  const values = Array.isArray(specs?.optionHints?.barLengthsMm) ? specs.optionHints.barLengthsMm : []
  return [...new Set(values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 50)
    .map((value) => `${Number.isInteger(value) ? value : Number(value.toFixed(2))}mm`))]
}

function normalizeLegacyOptionGroups(value) {
  if (!Array.isArray(value)) return []

  return value.map((group) => ({
    ...group,
    values: Array.isArray(group?.values)
      ? group.values.map((option) => {
          const rawLabels = option?.labels && typeof option.labels === 'object' ? option.labels : {}
          const correction = legacyOptionLabelCorrections[rawLabels.kr]
          return correction ? { ...option, labels: { ...rawLabels, ...correction } } : option
        })
      : group?.values,
  }))
}

function inferTone(product) {
  const text = `${product?.material || ''} ${product?.nameEn || ''}`.toLowerCase()
  return toneByMaterial.find(([needle]) => text.includes(needle))?.[1] || 'silver'
}

export function adaptApiProduct(product, { apiBaseUrl } = {}) {
  const productId = product.code || product.productCode || product.id
  const nameKo = product.nameKo || product.nameEn || productId
  const archiveLocalization = shouldGenerateArchiveLocalization(product, productId)
    ? createArchiveProductLocalization(nameKo)
    : null
  const nameEn = archiveLocalization && (!product.nameEn || product.nameEn === nameKo || /\p{Script=Hangul}/u.test(product.nameEn))
    ? archiveLocalization.nameEn
    : product.nameEn || nameKo || productId
  const nameJa = archiveLocalization && (!product.nameJa || /\p{Script=Hangul}/u.test(product.nameJa))
    ? archiveLocalization.nameJa
    : product.nameJa || nameEn || nameKo || productId
  const sourceZhTw = product.nameZhTw || product.nameCn || ''
  const nameZhTw = archiveLocalization && (!sourceZhTw || sourceZhTw === nameKo || /\p{Script=Hangul}/u.test(sourceZhTw))
    ? archiveLocalization.nameZhTw
    : sourceZhTw || nameEn || nameKo || productId

  const hasHangul = (value) => /\p{Script=Hangul}/u.test(String(value || ''))
  const descriptionEn = archiveLocalization && (!product.descriptionEn || hasHangul(product.descriptionEn))
    ? archiveLocalization.descriptionEn
    : product.descriptionEn || product.descriptionKo || ''
  const descriptionJa = archiveLocalization && (!product.descriptionJa || hasHangul(product.descriptionJa))
    ? archiveLocalization.descriptionJa
    : product.descriptionJa || descriptionEn || product.descriptionKo || ''
  const sourceDescriptionZhTw = product.descriptionZhTw || product.descriptionCn || ''
  const descriptionZhTw = archiveLocalization && (!sourceDescriptionZhTw || hasHangul(sourceDescriptionZhTw))
    ? archiveLocalization.descriptionZhTw
    : sourceDescriptionZhTw || descriptionEn || product.descriptionKo || ''
  const productColors = normalizeLegacyColors(product.colors)
  const importedColors = normalizeLegacyColors(product.specs?.optionHints?.colors)
  const productSizes = normalizeStringArray(product.sizes)
  const importedBarLengthSizes = normalizeImportedBarLengthSizes(product.specs)

  return {
    productId,
    id: product.id,
    code: product.code || productId,
    nameKo,
    nameEn,
    nameJa,
    nameZhTw,
    nameCn: nameZhTw,
    categoryId: product.categoryId || 'uncategorized',
    categoryNameKo: product.categoryNameKo || '',
    categoryNameEn: product.categoryNameEn || '',
    categoryNameJa: product.categoryNameJa || '',
    categoryNameZhTw: product.categoryNameZhTw || product.categoryNameCn || '',
    categoryNameCn: product.categoryNameZhTw || product.categoryNameCn || '',
    collectionIds: normalizeStringArray(product.collectionIds),
    material: product.material || '',
    colors: productColors.length > 0 ? productColors : importedColors,
    sizes: productSizes.length > 0 ? productSizes : importedBarLengthSizes,
    optionGroups: normalizeLegacyOptionGroups(Array.isArray(product.optionGroups)
      ? product.optionGroups
      : product.option_groups),
    moqDefault: product.moqDefault || 1,
    leadTime: product.leadTime || '',
    origin: product.origin || '',
    imageSet: resolveApiImageSet(product.imageSet, apiBaseUrl),
    imageAlt: product.imageAlt || {},
    taxonomy: product.taxonomy || null,
    productGroup: product.taxonomy?.productGroup || product.productGroup || undefined,
    piercingType: product.taxonomy?.piercingType || product.piercingType || undefined,
    baseMaterial: product.taxonomy?.baseMaterial || product.baseMaterial || undefined,
    allSurgical: Boolean(product.taxonomy?.allSurgical ?? product.allSurgical),
    decorationMaterials: Array.isArray(product.taxonomy?.decorationMaterials) ? product.taxonomy.decorationMaterials : normalizeStringArray(product.decorationMaterials),
    structures: Array.isArray(product.taxonomy?.structures) ? product.taxonomy.structures : normalizeStringArray(product.structures),
    styles: Array.isArray(product.taxonomy?.styles) ? product.taxonomy.styles : normalizeStringArray(product.styles),
    shapes: Array.isArray(product.taxonomy?.shapes) ? product.taxonomy.shapes : normalizeStringArray(product.shapes),
    saleType: product.taxonomy?.saleType || product.saleType || undefined,
    specs: product.specs || {},
    detailContent: product.detailContent || {},
    homePlacement: product.homePlacement || {},
    badge: product.badge || '',
    isVisible: product.isVisible !== false,
    isExportAvailable: product.isExportAvailable !== false,
    isNew: Boolean(product.isNew),
    isBest: Boolean(product.isBest),
    sortOrder: product.sortOrder || 0,
    descriptionKo: product.descriptionKo || product.descriptionEn || '',
    descriptionEn,
    descriptionJa,
    descriptionZhTw,
    descriptionCn: descriptionZhTw,
    searchKeywords: normalizeStringArray(product.searchKeywords),
    createdAt: product.createdAt || null,
    updatedAt: product.updatedAt || null,
    tone: product.tone || inferTone(product),
  }
}

export function adaptApiProducts(products, options) {
  return Array.isArray(products) ? products.map((product) => adaptApiProduct(product, options)).filter((product) => product.productId) : []
}
