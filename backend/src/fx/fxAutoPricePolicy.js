import { CURRENCY_BY_MARKET } from "../config/pricing.js";

export const FX_PRICING_MODES = {
  MANUAL_FIXED: "manual_fixed",
  FX_AUTO: "fx_auto"
};

export const FX_POLICY_STATUSES = [
  "pending_rate",
  "active",
  "held_deadband",
  "updated",
  "created",
  "blocked_stale",
  "blocked_spike",
  "paused",
  "error"
];

export const FX_AUTO_TARGET_MARKETS = ["JP", "US", "CN"];
export const FX_MANUAL_ONLY_MARKETS = ["KR", "GLOBAL"];

export function getMarketCurrency(market) {
  return CURRENCY_BY_MARKET[market] || null;
}

export function isFxAutoAllowed(market, currency = getMarketCurrency(market)) {
  return FX_AUTO_TARGET_MARKETS.includes(market) && getMarketCurrency(market) === currency;
}

export function getDefaultPricingMode({ market, hasManualAmount }) {
  if (market === "KR" || market === "GLOBAL") return FX_PRICING_MODES.MANUAL_FIXED;
  return hasManualAmount ? FX_PRICING_MODES.MANUAL_FIXED : FX_PRICING_MODES.FX_AUTO;
}

export function assertPricingModeAllowed({ market, currency, pricingMode }) {
  if (pricingMode === FX_PRICING_MODES.MANUAL_FIXED) return;
  if (pricingMode !== FX_PRICING_MODES.FX_AUTO || !isFxAutoAllowed(market, currency)) {
    throw new Error("FX_AUTO is only allowed for JP/JPY, US/USD, and CN/CNY");
  }
}
