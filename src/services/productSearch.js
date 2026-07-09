import { getProductTaxonomy } from '../data/productTaxonomy.js'

function normalizeQuery(query) {
  return String(query ?? '').trim().toLowerCase()
}

function flattenSearchValues(values = []) {
  return values.flatMap((value) => {
    if (value === undefined || value === null) return []
    if (Array.isArray(value)) return flattenSearchValues(value)
    if (typeof value === 'object') return flattenSearchValues(Object.values(value))
    return String(value)
  })
}

export function getProductSearchValues(product) {
  const taxonomy = getProductTaxonomy(product)

  return flattenSearchValues([
    product?.code,
    product?.productId,
    product?.nameKo,
    product?.nameEn,
    product?.nameJa,
    product?.nameCn,
    product?.categoryId,
    product?.categoryNameKo,
    product?.categoryNameEn,
    product?.categoryNameJa,
    product?.categoryNameCn,
    product?.material,
    product?.colors,
    product?.sizes,
    product?.badge,
    product?.searchKeywords,
    taxonomy.productGroup,
    taxonomy.piercingType,
    taxonomy.decorationMaterials,
    taxonomy.partType,
    taxonomy.structures,
    taxonomy.styles,
    taxonomy.shapes,
    taxonomy.saleType,
  ])
}

export function productMatchesCatalogSearch(product, query) {
  const normalized = normalizeQuery(query)
  if (!normalized) return true

  return getProductSearchValues(product).some((value) => value.toLowerCase().includes(normalized))
}
