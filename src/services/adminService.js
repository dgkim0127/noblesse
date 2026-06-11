import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'

const blockedBuyer = {
  ...mockUsers.approved,
  uid: 'mock-blocked-buyer',
  email: 'blocked@example.us',
  companyName: 'LA Piercing Supply',
  contactName: 'Mina Clarke',
  country: 'US',
  preferredLanguage: 'en',
  phone: '+1-213-555-0188',
  messengerType: 'WhatsApp',
  messengerId: 'la-piercing-supply',
  salesChannel: 'studio_group',
  businessNumber: 'US-BLOCKED-001',
  status: 'blocked',
  assignedMarket: 'US',
  currency: 'USD',
  discountRate: 0,
  minOrderAmount: 250,
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  approvedAt: null,
  approvedBy: null,
}

const adminBuyers = [mockUsers.pending, mockUsers.approved, blockedBuyer]

const sum = (items, selector) => items.reduce((total, item) => total + selector(item), 0)

const getProduct = (productId) => mockProducts.find((product) => product.productId === productId)

const getBuyerForInquiry = (inquiry) => adminBuyers.find((buyer) => buyer.uid === inquiry.buyerId)

const getStatusCounts = () => mockInquiries.reduce((counts, inquiry) => ({
  ...counts,
  [inquiry.status]: (counts[inquiry.status] ?? 0) + 1,
}), {})

const buildTopRequestedProducts = () => {
  const productMap = new Map()
  mockInquiries.flatMap((inquiry) => inquiry.items).forEach((item) => {
    const current = productMap.get(item.productCode) ?? {
      productCode: item.productCode,
      productName: item.productName,
      totalQuantity: 0,
      estimatedTotal: 0,
    }
    productMap.set(item.productCode, {
      ...current,
      totalQuantity: current.totalQuantity + item.quantity,
      estimatedTotal: current.estimatedTotal + item.subtotal,
    })
  })

  return [...productMap.values()].sort((a, b) => b.totalQuantity - a.totalQuantity)
}

const buildMarketSummary = () => adminBuyers.reduce((markets, buyer) => {
  const key = buyer.assignedMarket || 'GLOBAL'
  const current = markets.get(key) ?? { market: key, buyerCount: 0, inquiryCount: 0, estimatedTotal: 0, currency: buyer.currency || 'USD' }
  const buyerInquiries = mockInquiries.filter((inquiry) => inquiry.buyerId === buyer.uid)
  markets.set(key, {
    ...current,
    buyerCount: current.buyerCount + 1,
    inquiryCount: current.inquiryCount + buyerInquiries.length,
    estimatedTotal: current.estimatedTotal + sum(buyerInquiries, (inquiry) => inquiry.estimatedTotal),
  })
  return markets
}, new Map())

export const getAdminDashboardSummary = () => {
  const statusCounts = getStatusCounts()
  const activeMarkets = new Set(mockProductPrices.filter((price) => price.isActive).map((price) => price.market))
  return {
    pendingBuyers: adminBuyers.filter((buyer) => buyer.status === 'pending').length,
    requestedInquiries: statusCounts.requested ?? 0,
    quotedInquiries: statusCounts.quoted ?? 0,
    confirmedInquiries: statusCounts.confirmed ?? 0,
    activePriceMarkets: activeMarkets.size,
    openRequestQuotes: mockInquiries.filter((inquiry) => ['requested', 'checking'].includes(inquiry.status)).length,
    draftAdminQuotes: mockInquiries.filter((inquiry) => inquiry.status !== 'cancelled').length,
    analyticsViewsReady: 7,
    estimatedRequestTotal: sum(mockInquiries, (inquiry) => inquiry.estimatedTotal),
    topRequestedProducts: buildTopRequestedProducts(),
    marketSummary: [...buildMarketSummary().values()],
    recentInquiries: [...mockInquiries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5),
  }
}

export const getAdminBuyerApplications = () => adminBuyers.map((buyer) => ({
  ...buyer,
  requestedAt: buyer.createdAt,
  agreementSummary: [
    { key: 'terms_of_service', accepted: true, version: 'terms-v1.0' },
    { key: 'buyer_terms', accepted: true, version: 'buyer-terms-v1.0' },
    { key: 'privacy_collection_use', accepted: true, version: 'privacy-v1.0' },
    { key: 'marketing_updates', accepted: buyer.status !== 'blocked', version: 'marketing-v1.0' },
  ],
}))

export const getAdminBuyerById = (buyerId) => {
  const buyer = getAdminBuyerApplications().find((candidate) => candidate.uid === buyerId)
  if (!buyer) return null
  return {
    ...buyer,
    recentInquiries: mockInquiries.filter((inquiry) => inquiry.buyerId === buyer.uid),
  }
}

export const getAdminInquiries = () => mockInquiries.map((inquiry) => ({
  ...inquiry,
  buyer: getBuyerForInquiry(inquiry),
  market: getBuyerForInquiry(inquiry)?.assignedMarket ?? inquiry.buyerCountry,
}))

export const getAdminInquiryById = (inquiryId) => getAdminInquiries().find((inquiry) => inquiry.inquiryId === inquiryId) ?? null

export const getAdminProductSummary = () => mockProducts.map((product) => ({
  ...product,
  priceMarkets: mockProductPrices.filter((price) => price.productId === product.productId).map((price) => price.market),
}))

export const getAdminPriceSummary = () => mockProductPrices.map((price) => ({
  ...price,
  product: getProduct(price.productId),
}))

export const getAdminAnalyticsSummary = () => {
  const productRows = buildTopRequestedProducts()
  const marketRows = [...buildMarketSummary().values()]
  const categoryRows = productRows.map((row) => {
    const product = mockProducts.find((item) => item.code === row.productCode)
    return {
      categoryId: product?.categoryId ?? 'uncategorized',
      totalQuantity: row.totalQuantity,
      estimatedTotal: row.estimatedTotal,
    }
  })

  return {
    topRequestedProducts: productRows,
    topMarkets: marketRows,
    buyerInquirySummary: adminBuyers.map((buyer) => {
      const inquiries = mockInquiries.filter((inquiry) => inquiry.buyerId === buyer.uid)
      return {
        buyerId: buyer.uid,
        companyName: buyer.companyName,
        inquiryCount: inquiries.length,
        estimatedTotal: sum(inquiries, (inquiry) => inquiry.estimatedTotal),
      }
    }),
    categoryInquirySummary: categoryRows,
    monthlyInquiryTrend: [{ month: '2026-06', inquiryCount: mockInquiries.length, estimatedTotal: sum(mockInquiries, (inquiry) => inquiry.estimatedTotal) }],
    popularOptionCombinations: mockInquiries.flatMap((inquiry) => inquiry.items).map((item) => ({
      option: `${item.material} / ${item.color} / ${item.size}`,
      totalQuantity: item.quantity,
    })),
    quoteConversion: [{ month: '2026-06', requested: mockInquiries.length, quoted: getStatusCounts().quoted ?? 0, confirmed: getStatusCounts().confirmed ?? 0 }],
  }
}

export const buildAdminQuoteDraft = (inquiry) => {
  if (!inquiry) return null
  const items = inquiry.items.map((item) => ({
    productCode: item.productCode,
    productName: item.productName,
    requestedQuantity: item.quantity,
    confirmedQuantity: item.quantity,
    requestedPriceSnapshot: item.priceSnapshot,
    confirmedUnitPrice: item.priceSnapshot,
    confirmedSubtotal: item.quantity * item.priceSnapshot,
  }))

  return {
    inquiryId: inquiry.inquiryId,
    status: 'draft',
    currency: inquiry.currency,
    requestedTotal: inquiry.estimatedTotal,
    confirmedTotal: sum(items, (item) => item.confirmedSubtotal),
    leadTime: '7-14 business days after final review',
    shippingNote: 'Shipping condition will be confirmed by market and package volume.',
    adminMemo: 'Preview draft only. No message is sent.',
    items,
  }
}
