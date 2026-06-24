const storageKey = 'noblesse.catalogFilterOptions.v1'
export const catalogFilterOptionsEvent = 'noblesse:catalog-filter-options'

const filterTypes = new Set(['categories', 'collections'])

const defaultState = {
  categories: [],
  collections: [],
}

const createId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeBoolean = (value, fallback = true) => (
  value === undefined || value === null ? fallback : Boolean(value)
)

export function normalizeCatalogFilterOption(input = {}) {
  const id = createId(input.id || input.key || input.slug || input.labelKo || input.labelEn)
  if (!id) return null

  return {
    id,
    labelKo: String(input.labelKo || input.labelEn || id).trim(),
    labelEn: String(input.labelEn || input.labelKo || id).trim(),
    labelJa: String(input.labelJa || input.labelEn || input.labelKo || id).trim(),
    labelCn: String(input.labelCn || input.labelEn || input.labelKo || id).trim(),
    isVisible: normalizeBoolean(input.isVisible, true),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
  }
}

function sanitizeOptions(options = []) {
  const seen = new Set()
  return options
    .map(normalizeCatalogFilterOption)
    .filter(Boolean)
    .filter((option) => {
      if (seen.has(option.id)) return false
      seen.add(option.id)
      return true
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.labelKo.localeCompare(b.labelKo))
}

export function sanitizeCatalogFilterOptions(input = {}) {
  return {
    categories: sanitizeOptions(input.categories),
    collections: sanitizeOptions(input.collections),
  }
}

export function loadCatalogFilterOptions() {
  if (typeof window === 'undefined') return defaultState
  try {
    return sanitizeCatalogFilterOptions(JSON.parse(window.localStorage.getItem(storageKey) || '{}'))
  } catch {
    return defaultState
  }
}

export function saveCatalogFilterOptions(nextOptions) {
  const sanitized = sanitizeCatalogFilterOptions(nextOptions)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, JSON.stringify(sanitized))
    window.dispatchEvent(new CustomEvent(catalogFilterOptionsEvent, { detail: sanitized }))
  }
  return sanitized
}

export function addCatalogFilterOption(type, input) {
  if (!filterTypes.has(type)) throw new Error('Unknown filter option type')
  const option = normalizeCatalogFilterOption(input)
  if (!option) throw new Error('Filter key is required')
  const current = loadCatalogFilterOptions()
  if (current[type].some((item) => item.id === option.id)) {
    throw new Error('Filter option already exists')
  }
  return saveCatalogFilterOptions({
    ...current,
    [type]: [...current[type], option],
  })
}

export function updateCatalogFilterOption(type, optionId, patch) {
  if (!filterTypes.has(type)) throw new Error('Unknown filter option type')
  const current = loadCatalogFilterOptions()
  return saveCatalogFilterOptions({
    ...current,
    [type]: current[type].map((option) => option.id === optionId
      ? normalizeCatalogFilterOption({ ...option, ...patch, id: option.id })
      : option),
  })
}

export function removeCatalogFilterOption(type, optionId) {
  if (!filterTypes.has(type)) throw new Error('Unknown filter option type')
  const current = loadCatalogFilterOptions()
  return saveCatalogFilterOptions({
    ...current,
    [type]: current[type].filter((option) => option.id !== optionId),
  })
}

export function subscribeCatalogFilterOptions(callback) {
  if (typeof window === 'undefined') return () => {}
  const handleChange = () => callback(loadCatalogFilterOptions())
  window.addEventListener(catalogFilterOptionsEvent, handleChange)
  window.addEventListener('storage', handleChange)
  return () => {
    window.removeEventListener(catalogFilterOptionsEvent, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}

export function getCatalogFilterOptionLabel(option, locale = 'kr') {
  if (!option) return ''
  if (locale === 'kr') return option.labelKo || option.labelEn || option.id
  if (locale === 'jp') return option.labelJa || option.labelEn || option.labelKo || option.id
  if (locale === 'cn') return option.labelCn || option.labelEn || option.labelKo || option.id
  return option.labelEn || option.labelKo || option.id
}
