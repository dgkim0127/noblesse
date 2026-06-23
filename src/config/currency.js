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

export function formatCurrency(value, currency = 'USD', { showCode = false } = {}) {
  const safeCurrency = supportedCurrencies.includes(currency) ? currency : 'USD'
  const minorUnits = currencyMinorUnits[safeCurrency] ?? 2
  const formatted = new Intl.NumberFormat(currencyLocale[safeCurrency] || 'en-US', {
    currency: safeCurrency,
    maximumFractionDigits: minorUnits,
    minimumFractionDigits: minorUnits,
    style: 'currency',
  }).format(Number(value) || 0)
  return showCode ? `${formatted} ${safeCurrency}` : formatted
}
