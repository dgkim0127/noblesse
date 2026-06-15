import { useLocation } from 'react-router-dom'

export const defaultLocale = 'kr'
export const supportedLocales = ['kr', 'en', 'jp', 'cn']

export const localeMeta = {
  kr: {
    code: 'KR',
    flag: '🇰🇷',
    brandName: '귀족',
    languageLabel: '피어싱 / Piercing / ピアス / 冲孔',
  },
  en: {
    code: 'EN',
    flag: '🇺🇸',
    brandName: 'Noblesse Piercing',
    languageLabel: 'Piercing / 피어싱 / ピアス / 冲孔',
  },
  jp: {
    code: 'JP',
    flag: '🇯🇵',
    brandName: '貴族ピアス',
    languageLabel: 'ピアス / Piercing / 피어싱 / 冲孔',
  },
  cn: {
    code: 'CN',
    flag: '🇨🇳',
    brandName: '高贵的穿孔',
    languageLabel: '冲孔 / Piercing / 피어싱 / ピアス',
  },
}

const splitPath = (path) => {
  const match = String(path).match(/^([^?#]*)(.*)$/)
  return { pathname: match?.[1] || '/', suffix: match?.[2] || '' }
}

export const hasLocalePrefix = (pathname) => {
  const firstSegment = String(pathname).split('/').filter(Boolean)[0]
  return supportedLocales.includes(firstSegment)
}

export const getLocaleFromPathname = (pathname) => {
  const firstSegment = String(pathname).split('/').filter(Boolean)[0]
  return supportedLocales.includes(firstSegment) ? firstSegment : defaultLocale
}

export const stripLocalePrefix = (pathname) => {
  const segments = String(pathname).split('/').filter(Boolean)
  if (!supportedLocales.includes(segments[0])) return pathname || '/'
  const stripped = `/${segments.slice(1).join('/')}`
  return stripped === '/' ? '/' : stripped.replace(/\/$/, '')
}

export const buildLocalizedPath = (targetPath, locale, forcePrefix = false) => {
  if (!targetPath || !String(targetPath).startsWith('/')) return targetPath

  const { pathname, suffix } = splitPath(targetPath)
  const cleanPath = stripLocalePrefix(pathname)
  const shouldPrefix = forcePrefix || locale !== defaultLocale
  const prefix = shouldPrefix ? `/${locale}` : ''
  const normalizedPath = cleanPath === '/' ? '' : cleanPath
  const localizedPath = `${prefix}${normalizedPath}` || '/'
  return `${localizedPath}${suffix}`
}

export function useLocalePath() {
  const location = useLocation()
  const locale = getLocaleFromPathname(location.pathname)
  const prefixActive = hasLocalePrefix(location.pathname)
  const toLocalePath = (path) => buildLocalizedPath(path, locale, prefixActive)
  const toLanguagePath = (nextLocale) => buildLocalizedPath(`${stripLocalePrefix(location.pathname)}${location.search}${location.hash}`, nextLocale, true)

  return {
    locale,
    localeMeta: localeMeta[locale],
    toLanguagePath,
    toLocalePath,
  }
}

export const getLocalizedProductName = (product, locale) => {
  if (locale === 'kr') return product.nameKo ?? product.nameEn
  if (locale === 'jp') return product.nameJa ?? product.nameEn ?? product.nameKo
  return product.nameEn ?? product.nameKo
}

export const getLocalizedProductDescription = (product, locale) => {
  if (locale === 'kr') return product.descriptionKo ?? product.descriptionEn ?? product.descriptionJa
  if (locale === 'jp') return product.descriptionJa ?? product.descriptionEn ?? product.descriptionKo
  if (locale === 'cn') return product.descriptionCn ?? product.descriptionEn ?? product.descriptionKo ?? product.descriptionJa
  return product.descriptionEn ?? product.descriptionKo ?? product.descriptionJa
}

export const getLocalizedProductAlt = (product, locale) => {
  if (locale === 'kr') return product.imageAlt?.ko ?? product.nameKo ?? product.nameEn
  if (locale === 'jp') return product.imageAlt?.ja ?? product.nameJa ?? product.nameEn
  return product.imageAlt?.en ?? product.nameEn ?? product.nameKo
}
