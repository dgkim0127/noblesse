export const MARKETS = ["KR", "JP", "US", "TW", "GLOBAL"];

export const CURRENCIES = ["KRW", "JPY", "USD", "TWD"];

export const CURRENCY_BY_MARKET = {
  KR: "KRW",
  JP: "JPY",
  US: "USD",
  TW: "TWD",
  GLOBAL: "USD"
};

export const CURRENCY_MINOR_UNITS = {
  KRW: 0,
  JPY: 0,
  USD: 2,
  TWD: 2
};

export function validateMarketCurrencyPair(market, currency) {
  return Boolean(market && currency && CURRENCY_BY_MARKET[market] === currency);
}

export function getCurrencyMinorUnits(currency) {
  return CURRENCY_MINOR_UNITS[currency] ?? 2;
}
