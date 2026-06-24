export const MARKETS = ["KR", "JP", "US", "CN", "GLOBAL"];

export const CURRENCIES = ["KRW", "JPY", "USD", "CNY"];

export const CURRENCY_BY_MARKET = {
  KR: "KRW",
  JP: "JPY",
  US: "USD",
  CN: "CNY",
  GLOBAL: "USD"
};

export const CURRENCY_MINOR_UNITS = {
  KRW: 0,
  JPY: 0,
  USD: 2,
  CNY: 2
};

export function validateMarketCurrencyPair(market, currency) {
  return Boolean(market && currency && CURRENCY_BY_MARKET[market] === currency);
}

export function getCurrencyMinorUnits(currency) {
  return CURRENCY_MINOR_UNITS[currency] ?? 2;
}

export function validateMoneyPrecision(value, currency) {
  if (!CURRENCIES.includes(currency)) return false;
  const minorUnits = getCurrencyMinorUnits(currency);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return false;
    value = String(value);
  }
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized || /e/i.test(normalized) || !/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  const fraction = normalized.split(".")[1] || "";
  return fraction.length <= minorUnits;
}
