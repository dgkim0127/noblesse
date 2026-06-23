export const MARKETS = ["KR", "JP", "US", "CN", "GLOBAL"];

export const CURRENCIES = ["KRW", "JPY", "USD", "CNY"];

export const CURRENCY_BY_MARKET = {
  KR: "KRW",
  JP: "JPY",
  US: "USD",
  CN: "CNY",
  GLOBAL: "USD"
};

export function validateMarketCurrencyPair(market, currency) {
  return Boolean(market && currency && CURRENCY_BY_MARKET[market] === currency);
}
