import { useCallback, useMemo, useState } from 'react'
import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`

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
    return product && price && priceSnapshot ? {
      ...item,
      product,
      price,
      productCode: product.code,
      productName: product.nameEn,
      thumbnailUrl: product.imageSet?.thumb ?? '',
      imageAlt: product.imageAlt,
      material: product.material,
      color: product.colors[0] ?? '',
      size: product.sizes[0] ?? '',
      moq: price.moq,
      priceSnapshot,
      subtotal: priceSnapshot * item.quantity,
      tone: product.tone,
    } : null
  }).filter(Boolean), [approvedPrice, getPrice, inquiryItems])

  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const addInquiryItem = (productId) => {
    if (!isApproved) return
    const price = getPrice(productId)
    if (!price) return
    setInquiryItems((current) => {
      const found = current.find((item) => item.productId === productId)
      return found
        ? current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + price.moq } : item)
        : [...current, { productId, quantity: price.moq }]
    })
  }

  const updateInquiryQuantity = (productId, rawQuantity) => {
    const moq = getPrice(productId)?.moq ?? 1
    const numeric = Number(rawQuantity)
    const quantity = Math.max(moq, Math.ceil((Number.isFinite(numeric) ? numeric : moq) / moq) * moq)
    setInquiryItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity } : item))
  }

  const removeInquiryItem = (productId) => setInquiryItems((current) => current.filter((item) => item.productId !== productId))

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
