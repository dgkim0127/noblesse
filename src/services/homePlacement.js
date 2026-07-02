const piercingCategoryIds = new Set([
  'piercing',
  'barbell',
  'labret',
  'nose-piercing',
  'belly-ring',
])

const steadyCollectionIds = new Set([
  'minimal-piercing-line',
  'premium-cubic-line',
])

function isVisibleProduct(product) {
  return Boolean(product) && product.isVisible !== false
}

function getSortOrder(product) {
  const sortOrder = Number(product?.sortOrder)
  return Number.isFinite(sortOrder) ? sortOrder : 0
}

function getTimestamp(product) {
  const value = product?.createdAt || product?.updatedAt
  const timestamp = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function getHomeSourceProducts({ products = [], mockProducts = [], dataMode = 'api' } = {}) {
  if (products.length > 0) return products
  return dataMode === 'mock' ? mockProducts : []
}

export function selectAllowedHomeProducts(products = []) {
  return products.filter((product) => (
    isVisibleProduct(product)
    && !/(14K|Titanium)/i.test(product.material ?? '')
    && !['14k-gold', 'titanium'].includes(product.categoryId)
  ))
}

export function selectNewArrivalProducts(products = [], limit = 12) {
  return selectAllowedHomeProducts(products)
    .map((product, index) => ({ index, product }))
    .sort((left, right) => (
      Number(Boolean(right.product.isNew)) - Number(Boolean(left.product.isNew))
      || getSortOrder(left.product) - getSortOrder(right.product)
      || getTimestamp(right.product) - getTimestamp(left.product)
      || left.index - right.index
    ))
    .slice(0, limit)
    .map(({ product }) => product)
}

export function selectWeeklyBestProducts(products = []) {
  return selectAllowedHomeProducts(products).filter((product) => Boolean(product.isBest))
}

export function isPiercingHomeProduct(product) {
  if (!isVisibleProduct(product)) return false
  if (piercingCategoryIds.has(product.categoryId)) return true
  return Array.isArray(product.collectionIds) && product.collectionIds.includes('piercing')
}

export function selectPiercingCatalogProducts(products = []) {
  return selectAllowedHomeProducts(products).filter(isPiercingHomeProduct)
}

export function selectSteadySelectionProducts(products = []) {
  return selectAllowedHomeProducts(products).filter((product) => (
    product.material?.includes('Silver')
    || product.collectionIds?.some((collectionId) => steadyCollectionIds.has(collectionId))
  ))
}
