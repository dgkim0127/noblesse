import { mockInquiries } from '../data/catalog'
import { getApprovedBuyerPrice, getPriceForBuyer } from './pricingService'

export const getInquiries = () => mockInquiries

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

// Current implementation uses mock data. Future implementation may call a server-side submitRequestQuote API.
export const buildInquiryRows = (inquiryItems, products, buyer, isApproved) => inquiryItems.map((item) => {
  const product = products.find((candidate) => candidate.productId === item.productId)
  const price = getPriceForBuyer(item.productId, buyer, isApproved)
  const priceSnapshot = getApprovedBuyerPrice(item.productId, buyer?.assignedMarket, buyer?.discountRate, isApproved)
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
    priceSnapshot,
    subtotal: priceSnapshot * item.quantity,
    tone: product.tone,
  } : null
}).filter(Boolean)

// Request Quote persistence must be server-validated before production. priceSnapshot is not the final confirmed quote.
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
    currency: buyer.currency,
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
