import { useCallback, useMemo, useState } from 'react'
import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`

const normalizeQuantity = (rawQuantity, moq) => {
  const numeric = Number(rawQuantity)
  const safeMoq = Math.max(Number(moq) || 1, 1)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const getDefaultOption = (product, option = {}) => ({
  color: option.color ?? product?.colors?.[0] ?? '',
  size: option.size ?? product?.sizes?.[0] ?? '',
})

const isSameInquiryItem = (item, productId, option) => item.productId === productId && item.color === option.color && item.size === option.size

export function CommerceProvider({ children }) {
  const [viewerState, setViewerState] = useState('approved')
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState(mockInquiries)
  const buyer = mockUsers[viewerState]
  const isApproved = viewerState === 'approved'

  const getPrice = useCallback((productId) => {
    if (!isApproved) return null
    return mockProductPrices.find((price) => price.productId === productId && price.market === buyer.assignedMarket && price.isActive) ?? null
  }, [buyer.assignedMarket, isApproved])

  const approvedPrice = useCallback((productId) => {
    if (!isApproved) return null
    const price = getPrice(productId)
    return price ? Math.round(price.wholesalePrice * (1 - buyer.discountRate / 100)) : null
  }, [buyer.discountRate, getPrice, isApproved])

  const inquiryRows = useMemo(() => inquiryItems.map((item) => {
    const product = mockProducts.find((candidate) => candidate.productId === item.productId)
    const price = getPrice(item.productId)
    const priceSnapshot = approvedPrice(item.productId)
    const option = getDefaultOption(product, item)
    return product && price && priceSnapshot ? {
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
  }).filter(Boolean), [approvedPrice, getPrice, inquiryItems])

  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const addInquiryItem = (productId, option = {}, rawQuantity) => {
    if (!isApproved) return
    const product = mockProducts.find((candidate) => candidate.productId === productId)
    const price = getPrice(productId)
    if (!product || !price) return
    const selectedOption = getDefaultOption(product, option)
    const quantity = normalizeQuantity(rawQuantity, price.moq)
    setInquiryItems((current) => {
      const found = current.find((item) => isSameInquiryItem(item, productId, selectedOption))
      return found
        ? current.map((item) => isSameInquiryItem(item, productId, selectedOption) ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, { productId, color: selectedOption.color, size: selectedOption.size, quantity }]
    })
  }

  const updateInquiryQuantity = (productId, rawQuantity, option = {}) => {
    const product = mockProducts.find((candidate) => candidate.productId === productId)
    if (!product) return
    const selectedOption = getDefaultOption(product, option)
    const moq = getPrice(productId)?.moq ?? 1
    const quantity = normalizeQuantity(rawQuantity, moq)
    setInquiryItems((current) => current.map((item) => isSameInquiryItem(item, productId, selectedOption) ? { ...item, quantity } : item))
  }

  const removeInquiryItem = (productId, option = {}) => {
    const product = mockProducts.find((candidate) => candidate.productId === productId)
    if (!product) return
    const selectedOption = getDefaultOption(product, option)
    setInquiryItems((current) => current.filter((item) => !isSameInquiryItem(item, productId, selectedOption)))
  }

  const submitRequestQuote = (requestMemo) => {
    if (!isApproved || inquiryRows.length === 0) return null
    const inquiryId = formatInquiryId()
    const inquiry = {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setInquiries((current) => [inquiry, ...current])
    setInquiryItems([])
    return inquiry
  }

  return <CommerceContext.Provider value={{
    addInquiryItem,
    approvedPrice,
    buyer,
    estimatedTotal,
    getPrice,
    inquiries,
    inquiryItems,
    inquiryRows,
    isApproved,
    products: mockProducts,
    removeInquiryItem,
    setViewerState,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    viewerState,
  }}>{children}</CommerceContext.Provider>
}
