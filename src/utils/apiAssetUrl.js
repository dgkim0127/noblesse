const apiAssetPathPattern = /^\/api\//
const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i

export function resolveApiAssetUrl(value, apiBaseUrl) {
  if (typeof value !== 'string' || !value || absoluteUrlPattern.test(value) || value.startsWith('//')) {
    return value
  }
  if (!apiAssetPathPattern.test(value)) return value

  try {
    const apiUrl = new URL(apiBaseUrl)
    return new URL(value, apiUrl.origin).toString()
  } catch {
    return value
  }
}

function resolveImageEntry(entry, apiBaseUrl) {
  if (!entry || typeof entry !== 'object') return entry

  const sources = entry.sources && typeof entry.sources === 'object'
    ? Object.fromEntries(Object.entries(entry.sources).map(([key, source]) => [
        key,
        typeof source === 'string'
          ? resolveApiAssetUrl(source, apiBaseUrl)
          : source && typeof source === 'object'
            ? { ...source, url: resolveApiAssetUrl(source.url, apiBaseUrl) }
            : source,
      ]))
    : entry.sources

  return {
    ...entry,
    url: resolveApiAssetUrl(entry.url, apiBaseUrl),
    thumb: resolveApiAssetUrl(entry.thumb, apiBaseUrl),
    card: resolveApiAssetUrl(entry.card, apiBaseUrl),
    detail: resolveApiAssetUrl(entry.detail, apiBaseUrl),
    zoom: resolveApiAssetUrl(entry.zoom, apiBaseUrl),
    primary: resolveApiAssetUrl(entry.primary, apiBaseUrl),
    sources,
  }
}

export function resolveApiImageSet(imageSet, apiBaseUrl) {
  if (!imageSet || typeof imageSet !== 'object') return imageSet || {}

  return {
    ...resolveImageEntry(imageSet, apiBaseUrl),
    gallery: Array.isArray(imageSet.gallery)
      ? imageSet.gallery.map((entry) => resolveImageEntry(entry, apiBaseUrl))
      : imageSet.gallery,
  }
}

export function resolveApiShowcaseSlides(slides, apiBaseUrl) {
  if (!Array.isArray(slides)) return []

  return slides.map((slide) => ({
    ...slide,
    image: resolveApiAssetUrl(slide?.image, apiBaseUrl),
    imageSet: resolveApiImageSet(slide?.imageSet, apiBaseUrl),
  }))
}
