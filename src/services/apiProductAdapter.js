const toneByMaterial = [
  ['gold', 'gold'],
  ['opal', 'opal'],
  ['pearl', 'opal'],
  ['black', 'black'],
  ['cubic', 'opal'],
]

function inferTone(product) {
  const text = `${product?.material || ''} ${product?.nameEn || ''}`.toLowerCase()
  return toneByMaterial.find(([needle]) => text.includes(needle))?.[1] || 'silver'
}

export function adaptApiProduct(product) {
  const productId = product.code || product.productCode || product.id

  return {
    productId,
    id: product.id,
    code: product.code || productId,
    nameKo: product.nameKo || product.nameEn || productId,
    nameEn: product.nameEn || product.nameKo || productId,
    nameJa: product.nameJa || product.nameEn || product.nameKo || productId,
    nameCn: product.nameCn || product.nameEn || product.nameKo || productId,
    categoryId: product.categoryId || 'uncategorized',
    categoryNameKo: product.categoryNameKo || '',
    categoryNameEn: product.categoryNameEn || '',
    collectionIds: Array.isArray(product.collectionIds) ? product.collectionIds : [],
    material: product.material || '',
    colors: Array.isArray(product.colors) ? product.colors : [],
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    moqDefault: product.moqDefault || 1,
    leadTime: product.leadTime || '',
    origin: product.origin || '',
    imageSet: product.imageSet || {},
    imageAlt: product.imageAlt || {},
    isVisible: product.isVisible !== false,
    isExportAvailable: product.isExportAvailable !== false,
    isNew: Boolean(product.isNew),
    isBest: Boolean(product.isBest),
    sortOrder: product.sortOrder || 0,
    descriptionKo: product.descriptionKo || product.descriptionEn || '',
    descriptionEn: product.descriptionEn || product.descriptionKo || '',
    descriptionJa: product.descriptionJa || product.descriptionEn || product.descriptionKo || '',
    descriptionCn: product.descriptionCn || product.descriptionEn || product.descriptionKo || '',
    createdAt: product.createdAt || null,
    updatedAt: product.updatedAt || null,
    tone: product.tone || inferTone(product),
  }
}

export function adaptApiProducts(products) {
  return Array.isArray(products) ? products.map(adaptApiProduct).filter((product) => product.productId) : []
}
