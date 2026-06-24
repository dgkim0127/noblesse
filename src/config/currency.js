export const supportedMarkets = ['KR', 'JP', 'US', 'CN', 'GLOBAL']

export const supportedCurrencies = ['KRW', 'JPY', 'USD', 'CNY']

export const marketCurrency = {
  KR: 'KRW',
  JP: 'JPY',
  US: 'USD',
  CN: 'CNY',
  GLOBAL: 'USD',
}

export const localeDefaultCurrency = {
  kr: 'KRW',
  jp: 'JPY',
  en: 'USD',
  cn: 'CNY',
}

export const currencyLocale = {
  KRW: 'ko-KR',
  JPY: 'ja-JP',
  USD: 'en-US',
  CNY: 'zh-CN',
}

export const currencyMinorUnits = {
  KRW: 0,
  JPY: 0,
  USD: 2,
  CNY: 2,
}

export const adminCurrencyDisplay = {
  KRW: { market: 'KR', symbol: '₩' },
  JPY: { market: 'JP', symbol: '¥' },
  USD: { market: 'US', symbol: '$' },
  CNY: { market: 'CN', symbol: '¥' },
}

export const marketDisplay = {
  KR: { flagSrc: '/flags/kr.svg', label: 'Korea' },
  JP: { flagSrc: '/flags/jp.svg', label: 'Japan' },
  US: { flagSrc: '/flags/us.svg', label: 'United States' },
  CN: { flagSrc: '/flags/cn.svg', label: 'China' },
  GLOBAL: { flagSrc: '/flags/global.svg', label: 'Global' },
}

export function getDisplayCurrency({ viewer, locale } = {}) {
  if (viewer?.currency && supportedCurrencies.includes(viewer.currency)) return viewer.currency
  if (viewer?.assignedMarket && marketCurrency[viewer.assignedMarket]) return marketCurrency[viewer.assignedMarket]
  return localeDefaultCurrency[locale] || localeDefaultCurrency.en
}

export function isValidMarketCurrencyPair(market, currency) {
  return Boolean(market && currency && marketCurrency[market] === currency)
}

export function getCurrencyInputStep(currency) {
  return currencyMinorUnits[currency] === 0 ? '1' : '0.01'
}

function parseCurrencyValue(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatCurrency(value, currency = 'USD', { showCode = false } = {}) {
  const safeCurrency = supportedCurrencies.includes(currency) ? currency : 'USD'
  const parsed = parseCurrencyValue(value)
  if (parsed === null) return null
  const minorUnits = currencyMinorUnits[safeCurrency] ?? 2
  const formatted = new Intl.NumberFormat(currencyLocale[safeCurrency] || 'en-US', {
    currency: safeCurrency,
    maximumFractionDigits: minorUnits,
    minimumFractionDigits: minorUnits,
    style: 'currency',
  }).format(parsed)
  return showCode ? `${formatted} ${safeCurrency}` : formatted
}

export function formatCurrencyAmount(value, currency = 'USD') {
  const safeCurrency = supportedCurrencies.includes(currency) ? currency : 'USD'
  const parsed = parseCurrencyValue(value)
  if (parsed === null) return null
  const minorUnits = currencyMinorUnits[safeCurrency] ?? 2
  return new Intl.NumberFormat(currencyLocale[safeCurrency] || 'en-US', {
    maximumFractionDigits: minorUnits,
    minimumFractionDigits: minorUnits,
  }).format(parsed)
}

export function formatAdminPriceBook(price) {
  const safeCurrency = supportedCurrencies.includes(price?.currency) ? price.currency : 'USD'
  const display = adminCurrencyDisplay[safeCurrency] || adminCurrencyDisplay.USD
  const market = price?.market || display.market
  const marketMeta = marketDisplay[market] || marketDisplay[display.market] || marketDisplay.GLOBAL
  return {
    amount: formatCurrencyAmount(price?.wholesalePrice, safeCurrency),
    currency: safeCurrency,
    flagLabel: marketMeta.label,
    flagSrc: marketMeta.flagSrc,
    market,
    symbol: display.symbol,
  }
}

export function getMarketDisplay(market) {
  return marketDisplay[market] || marketDisplay.GLOBAL
}

export function formatMarketLabel(market) {
  return getMarketDisplay(market).label
}
