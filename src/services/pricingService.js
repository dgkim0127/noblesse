import { mockProductPrices } from '../data/catalog'

const allowedMarkets = ['KR', 'JP', 'US', 'GLOBAL']

// Client-side price calculation is display-only. Future server-side validation must recalculate price, MOQ, discount, and totals before persistence.
export const getMarketPrice = (productId, market, isApproved) => {
  if (!isApproved || !allowedMarkets.includes(market)) return null

  return mockProductPrices.find((price) => (
    price.productId === productId
    && price.market === market
    && price.visibleTo === 'approved_only'
    && price.isActive === true
  )) ?? null
}

export const getApprovedBuyerPrice = (productId, market, discountRate, isApproved) => {
  const price = getMarketPrice(productId, market, isApproved)
  if (!price) return null

  return Math.round(price.wholesalePrice * (1 - (Number(discountRate) || 0) / 100))
}

export const getPriceForBuyer = (productId, buyer, isApproved) => getMarketPrice(productId, buyer?.assignedMarket, isApproved)
