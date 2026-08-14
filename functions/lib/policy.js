export const hasNoblesseAdminClaim = (token) => token?.noblesseAdmin === true

export const hasApprovedBuyerAccess = (token, buyer) => (
  token?.email_verified === true
  && buyer?.status === 'approved'
  && Boolean(buyer.assigned_market)
  && Boolean(buyer.currency)
)

export const canReadBuyerProjection = (requestUid, ownerUid) => Boolean(requestUid) && requestUid === ownerUid

export const calculateDiscountedLineMinor = ({ wholesalePriceMinor, discountRate, quantity }) => {
  const unitPriceMinor = Math.round(Number(wholesalePriceMinor) * (100 - Number(discountRate || 0)) / 100)
  return { unitPriceMinor, subtotalMinor: unitPriceMinor * Number(quantity) }
}
