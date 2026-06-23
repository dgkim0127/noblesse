import { getDisplayCurrency, isValidMarketCurrencyPair, marketCurrency, supportedMarkets } from '../config/currency.js'

export const guestProfile = {
  uid: '',
  email: '',
  companyName: '',
  contactName: 'Guest Member',
  country: '',
  preferredLanguage: 'en',
  phone: '',
  messengerType: '',
  messengerId: '',
  salesChannel: '',
  businessNumber: '',
  role: null,
  status: null,
  legacyStatus: null,
  accountStatus: null,
  verificationStatus: null,
  assignedMarket: '',
  currency: 'USD',
  discountRate: 0,
  minOrderAmount: 0,
  createdAt: null,
  updatedAt: null,
  approvedAt: null,
  approvedBy: null,
}

const allowedMarkets = supportedMarkets

export const getDiscountedPrice = (price, discountRate) => {
  if (!price) return null
  return Math.round(price.wholesalePrice * (1 - (Number(discountRate) || 0) / 100))
}

const findExactPrice = (prices, matcher) => (prices || []).find((price) => (
  matcher(price)
  && price.visibleTo === 'approved_only'
  && price.isActive === true
)) ?? null

export const deriveLegacyBuyerStatus = (profile = {}) => {
  if (profile.accountStatus === 'blocked') return 'blocked'
  if (profile.verificationStatus === 'suspended') return 'blocked'
  if (profile.verificationStatus === 'approved') return 'approved'
  return 'pending'
}

export const getBuyerLifecycle = (profile = {}) => {
  const source = profile || {}
  const accountStatus = source.accountStatus || (source.status === 'blocked' ? 'blocked' : 'active')
  const verificationStatus = source.verificationStatus
    || (source.status === 'blocked' ? 'suspended' : source.status === 'approved' ? 'approved' : source.status === 'pending' ? 'pending' : 'draft')
  return { accountStatus, verificationStatus }
}

export const isApprovedBuyer = (profile) => {
  const { accountStatus, verificationStatus } = getBuyerLifecycle(profile)
  return profile?.role === 'buyer' && accountStatus === 'active' && verificationStatus === 'approved'
}

export const isPendingBuyer = (profile) => {
  const { accountStatus, verificationStatus } = getBuyerLifecycle(profile)
  return profile?.role === 'buyer' && accountStatus === 'active' && ['draft', 'pending'].includes(verificationStatus)
}

export const isBlockedBuyer = (profile) => {
  const { accountStatus } = getBuyerLifecycle(profile)
  return profile?.role === 'buyer' && accountStatus === 'blocked'
}

export const isRejectedBuyer = (profile) => {
  const { accountStatus, verificationStatus } = getBuyerLifecycle(profile)
  return profile?.role === 'buyer' && accountStatus === 'active' && verificationStatus === 'rejected'
}

export const isSuspendedBuyer = (profile) => {
  const { accountStatus, verificationStatus } = getBuyerLifecycle(profile)
  return profile?.role === 'buyer' && accountStatus === 'active' && verificationStatus === 'suspended'
}

export const isAdmin = (profile) => profile?.role === 'admin'

export const isGuestViewer = (viewerState) => viewerState === 'guest'

export const getViewerStateFromProfile = (profile) => {
  if (isAdmin(profile)) return 'admin'
  if (isBlockedBuyer(profile)) return 'blocked'
  if (isApprovedBuyer(profile)) return 'approved'
  if (isRejectedBuyer(profile)) return 'rejected'
  if (isSuspendedBuyer(profile)) return 'suspended'
  if (isPendingBuyer(profile)) return 'pending'
  return 'guest'
}

export const normalizeBuyerProfile = (profile) => {
  if (!profile) return guestProfile

  const lifecycle = getBuyerLifecycle(profile)
  const status = profile.status || deriveLegacyBuyerStatus(lifecycle)
  return {
    ...guestProfile,
    ...profile,
    uid: profile.uid || profile.userId || '',
    companyName: profile.companyName || '',
    contactName: profile.contactName || '',
    assignedMarket: profile.assignedMarket || '',
    currency: profile.currency || guestProfile.currency,
    role: profile.role || null,
    status,
    legacyStatus: profile.legacyStatus || status,
    accountStatus: lifecycle.accountStatus,
    verificationStatus: lifecycle.verificationStatus,
  }
}

export const getBuyerAccessFeatures = (viewerState, profile) => {
  const base = {
    canViewProducts: true,
    canViewPrices: false,
    canUseInquiryList: false,
    canRequestQuote: false,
    canViewMyInquiries: false,
  }

  if (viewerState === 'guest' || isPendingBuyer(profile)) return base

  if (isApprovedBuyer(profile)) {
    return {
      ...base,
      canViewPrices: true,
      canUseInquiryList: true,
      canRequestQuote: true,
      canViewMyInquiries: true,
    }
  }

  if (isAdmin(profile)) {
    return {
      ...base,
      canViewPrices: true,
      canUseInquiryList: true,
      canRequestQuote: true,
      canViewMyInquiries: true,
      canPreviewAdmin: true,
    }
  }

  return base
}

export const getMarketPrice = (productPrices, productId, market, isApproved) => {
  if (!isApproved || !allowedMarkets.includes(market)) return null

  return findExactPrice(productPrices, (price) => (
    price.productId === productId
    && price.market === market
  ))
}

export const selectProductPrice = ({ prices, viewer, locale, productId } = {}) => {
  const isApproved = isApprovedBuyer(viewer) || isAdmin(viewer)
  const displayCurrency = getDisplayCurrency({ viewer, locale })

  if (!isApproved) {
    return {
      displayCurrency,
      isAvailable: false,
      price: null,
      reason: 'restricted',
    }
  }

  const scopedPrices = productId
    ? (prices || []).filter((price) => price.productId === productId)
    : (prices || [])
  const byCurrency = findExactPrice(
    [...scopedPrices].sort((left, right) => (left.market === viewer?.assignedMarket ? 0 : 1) - (right.market === viewer?.assignedMarket ? 0 : 1)),
    (price) => price.currency === displayCurrency
  )
  if (byCurrency) {
    return {
      displayCurrency: byCurrency.currency,
      isAvailable: true,
      price: byCurrency,
      reason: 'currency',
    }
  }

  const assignedMarket = viewer?.assignedMarket
  const assignedCurrency = marketCurrency[assignedMarket]
  if (assignedMarket && assignedCurrency) {
    const byMarket = findExactPrice(scopedPrices, (price) => (
      price.market === assignedMarket
      && isValidMarketCurrencyPair(price.market, price.currency)
    ))
    if (byMarket) {
      return {
        displayCurrency: byMarket.currency,
        isAvailable: true,
        price: byMarket,
        reason: 'market',
      }
    }
  }

  return {
    displayCurrency,
    isAvailable: false,
    price: null,
    reason: 'unavailable',
  }
}

export const getApprovedBuyerPrice = (productPrices, productId, market, discountRate, isApproved) => {
  const price = getMarketPrice(productPrices, productId, market, isApproved)
  return getDiscountedPrice(price, discountRate)
}

export const getPriceForBuyer = (productPrices, productId, buyer, _isApproved) => (
  selectProductPrice({ prices: productPrices, viewer: buyer, productId }).price
)

export const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

export const getDefaultOption = (product, option = {}) => ({
  color: option.color ?? product?.colors?.[0] ?? '',
  size: option.size ?? product?.sizes?.[0] ?? '',
})

export const getInquiryItemKey = (productId, option = {}) => `${productId}::${option.color ?? ''}::${option.size ?? ''}`

export const isSameInquiryItem = (item, productId, option = {}) => getInquiryItemKey(item.productId, item) === getInquiryItemKey(productId, option)

export const buildInquiryRows = (inquiryItems, products, buyer, isApproved, productPrices) => inquiryItems.map((item) => {
  const product = products.find((candidate) => candidate.productId === item.productId)
  const price = getPriceForBuyer(productPrices, item.productId, buyer, isApproved)
  const priceSnapshot = getDiscountedPrice(price, buyer?.discountRate)
  const option = getDefaultOption(product, item)

  return product && price && priceSnapshot !== null ? {
    ...item,
    product,
    price,
    productCode: product.code,
    productName: product.nameEn,
    thumbnailUrl: product.imageSet?.thumb ?? '',
    imageAlt: product.imageAlt,
    material: product.material,
    color: option.color,
    size: option.size,
    moq: price.moq,
    currency: price.currency,
    market: price.market,
    priceSnapshot,
    subtotal: priceSnapshot * item.quantity,
    tone: product.tone,
  } : null
}).filter(Boolean)

export const buildInquirySnapshot = ({ inquiryRows, buyer, requestMemo, inquiryId }) => {
  const now = new Date().toISOString()
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)
  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)

  return {
    inquiryId,
    buyerId: buyer.uid,
    buyerCompanyName: buyer.companyName,
    buyerCountry: buyer.country,
    buyerLanguage: buyer.preferredLanguage,
    currency: inquiryRows[0]?.currency || buyer.currency,
    status: 'requested',
    items: inquiryRows.map((row) => ({
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      thumbnailUrl: row.thumbnailUrl,
      material: row.material,
      color: row.color,
      size: row.size,
      moq: row.moq,
      quantity: row.quantity,
      priceSnapshot: row.priceSnapshot,
      subtotal: row.subtotal,
    })),
    totalItems: inquiryRows.length,
    totalQuantity,
    estimatedTotal,
    requestMemo,
    adminMemo: '',
    createdAt: now,
    updatedAt: now,
  }
}
