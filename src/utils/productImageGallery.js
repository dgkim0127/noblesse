const imageVariants = ['thumb', 'card', 'detail', 'zoom']

export const defaultImagePosition = Object.freeze({ x: 50, y: 50 })
export const minImageScale = 1
export const maxImageScale = 2.5

export function normalizeImagePosition(value) {
  const x = Number(value?.x)
  const y = Number(value?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...defaultImagePosition }
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  }
}

export function normalizeImageScale(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return minImageScale
  return Math.min(maxImageScale, Math.max(minImageScale, parsed))
}

export function imageSource(image, variant = 'detail') {
  const storedSource = image?.sources?.[variant]
  if (typeof storedSource === 'string') return storedSource
  return storedSource?.url
    || image?.[variant]
    || (variant === 'detail' ? image?.url : '')
    || image?.detail
    || image?.url
    || image?.card
    || image?.thumb
    || image?.zoom
    || ''
}

export function imagePresentationStyle(image) {
  const position = normalizeImagePosition(image?.position)
  const scale = normalizeImageScale(image?.scale)
  return {
    objectPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${position.x}% ${position.y}%`,
  }
}

export function productGalleryEntries(product, fallbackAlt = '') {
  const imageSet = product?.imageSet || {}
  const imageAlt = product?.imageAlt || {}
  const storedGallery = Array.isArray(imageSet.gallery) && imageSet.gallery.length > 0
    ? [...imageSet.gallery].sort((left, right) => Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0))
    : (imageSet.detail || imageSet.primary || imageSet.card || imageSet.thumb)
      ? [{
          id: 'primary',
          thumb: imageSet.thumb,
          card: imageSet.card,
          detail: imageSet.detail || imageSet.primary,
          zoom: imageSet.zoom,
          position: imageSet.position,
          scale: imageSet.scale,
        }]
      : []

  return storedGallery.map((image, index) => {
    const altEntry = imageAlt.gallery?.find?.((item) => item?.id && item.id === image?.id)
      || imageAlt.gallery?.[index]
      || {}
    return {
      ...image,
      id: image?.id || imageSource(image, 'detail') || `image-${index}`,
      thumbSrc: imageSource(image, 'thumb'),
      cardSrc: imageSource(image, 'card'),
      detailSrc: imageSource(image, 'detail'),
      zoomSrc: imageSource(image, 'zoom'),
      alt: altEntry.altText || image?.altText || (index === 0 ? imageAlt.default : '') || fallbackAlt,
      position: normalizeImagePosition(image?.position || (index === 0 ? imageSet.position : undefined)),
      scale: normalizeImageScale(image?.scale ?? (index === 0 ? imageSet.scale : undefined)),
      sortOrder: index,
      isPrimary: index === 0,
    }
  })
}

export function productDetailImageSlots(images = [], {
  includeOverview = true,
  includePrimaryInOverview = true,
  includeMaterial = true,
  reservedImageIds = [],
} = {}) {
  const emptySlots = { overview: null, material: null, specification: null, additional: [] }
  if (!Array.isArray(images) || !images.length) return emptySlots

  const reservedIds = new Set(reservedImageIds.map(String).filter(Boolean))
  const seenIds = new Set()
  const seenSources = new Set()
  const primaryId = String(images[0]?.id || '')
  const primarySource = images[0]?.detailSrc || images[0]?.cardSrc || ''
  if (primaryId) seenIds.add(primaryId)
  if (primarySource) seenSources.add(primarySource)
  images.forEach((image) => {
    if (!reservedIds.has(String(image?.id || ''))) return
    const source = image?.detailSrc || image?.cardSrc || ''
    if (source) seenSources.add(source)
  })
  const supportingImages = images.slice(1).filter((image) => {
    const id = String(image?.id || '')
    const source = image?.detailSrc || image?.cardSrc || ''
    if (!source || (id && reservedIds.has(id)) || (id && seenIds.has(id)) || seenSources.has(source)) return false
    if (id) seenIds.add(id)
    seenSources.add(source)
    return true
  })
  const primaryCanBeReused = includePrimaryInOverview
    && primarySource
    && (!primaryId || !reservedIds.has(primaryId))
  const overview = includeOverview
    ? primaryCanBeReused ? images[0] : supportingImages[0] || null
    : null
  if (!supportingImages.length && !overview) return emptySlots

  const sectionImages = includeOverview && overview !== images[0]
    ? supportingImages.slice(1)
    : supportingImages
  const material = includeMaterial && sectionImages.length >= 2 ? sectionImages[0] : null
  const specification = sectionImages.length >= 1 ? sectionImages[sectionImages.length - 1] : null
  const additionalStart = material ? 1 : 0
  const additionalEnd = specification ? sectionImages.length - 1 : sectionImages.length
  return {
    overview,
    material,
    specification,
    additional: sectionImages.slice(additionalStart, additionalEnd),
  }
}

export function productToImageDrafts(product) {
  return productGalleryEntries(product).map((image, index) => ({
    id: image.id,
    existingId: image.id || image.detailSrc,
    kind: 'existing',
    file: null,
    filename: image.filename || `상품 이미지 ${String(index + 1).padStart(2, '0')}`,
    previewUrl: image.detailSrc,
    thumbUrl: image.thumbSrc || image.detailSrc,
    sources: Object.fromEntries(imageVariants.map((variant) => [variant, imageSource(image, variant)])),
    altText: image.alt,
    position: normalizeImagePosition(image.position),
    scale: normalizeImageScale(image.scale),
  }))
}

export function imageDraftsToPreviewSet(images) {
  const gallery = images.map((image, index) => ({
    id: image.id,
    filename: image.filename,
    thumb: image.sources?.thumb || image.thumbUrl || image.previewUrl,
    card: image.sources?.card || image.previewUrl,
    detail: image.sources?.detail || image.previewUrl,
    zoom: image.sources?.zoom || image.previewUrl,
    url: image.sources?.detail || image.previewUrl,
    position: normalizeImagePosition(image.position),
    scale: normalizeImageScale(image.scale),
    sortOrder: index,
    isPrimary: index === 0,
  }))
  const primary = gallery[0]
  if (!primary) return { gallery: [] }
  return {
    thumb: primary.thumb,
    card: primary.card,
    detail: primary.detail,
    zoom: primary.zoom,
    primary: primary.detail,
    position: primary.position,
    scale: primary.scale,
    gallery,
  }
}
