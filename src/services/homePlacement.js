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
  const sortOrder = Number(product?.homePlacement?.sortPriority ?? product?.sortOrder)
  return Number.isFinite(sortOrder) ? sortOrder : 0
}

function hasExplicitPlacement(products = [], key) {
  return products.some((product) => product?.homePlacement?.[key] === true)
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
  const explicit = hasExplicitPlacement(products, 'showInNewArrivals')
  return selectAllowedHomeProducts(products)
    .filter((product) => (explicit ? product.homePlacement?.showInNewArrivals === true : true))
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
  const explicit = hasExplicitPlacement(products, 'showInWeeklyPick')
  return selectAllowedHomeProducts(products)
    .filter((product) => explicit ? product.homePlacement?.showInWeeklyPick === true : Boolean(product.isBest))
    .sort((left, right) => getSortOrder(left) - getSortOrder(right))
}

export function isPiercingHomeProduct(product) {
  if (!isVisibleProduct(product)) return false
  if (piercingCategoryIds.has(product.categoryId)) return true
  return Array.isArray(product.collectionIds) && product.collectionIds.includes('piercing')
}

export function selectPiercingCatalogProducts(products = []) {
  const explicit = hasExplicitPlacement(products, 'showInPiercing')
  return selectAllowedHomeProducts(products)
    .filter((product) => explicit ? product.homePlacement?.showInPiercing === true : isPiercingHomeProduct(product))
    .sort((left, right) => getSortOrder(left) - getSortOrder(right))
}

export function selectSteadySelectionProducts(products = []) {
  const explicit = hasExplicitPlacement(products, 'showInSteadySelection')
  return selectAllowedHomeProducts(products)
    .filter((product) => explicit
      ? product.homePlacement?.showInSteadySelection === true
      : product.material?.includes('Silver') || product.collectionIds?.some((collectionId) => steadyCollectionIds.has(collectionId)))
    .sort((left, right) => getSortOrder(left) - getSortOrder(right))
}
