import { useCallback, useMemo, useState } from 'react'
import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`

export function CommerceProvider({ children }) {
  const [viewerState, setViewerState] = useState('approved')
  const [inquiryItems, setInquiryItems] = useState([
    { productId: 'KZ-P-1004', quantity: 40 },
    { productId: 'KZ-H-2418', quantity: 24 },
  ])
  const [inquiries, setInquiries] = useState(mockInquiries)
  const buyer = mockUsers[viewerState]
  const isApproved = viewerState === 'approved'

  const getPrice = useCallback((productId) => {
    if (!isApproved) return null
    return mockProductPrices.find((price) => price.productId === productId && price.market === buyer.assignedMarket && price.isActive) ?? null
  }, [buyer.assignedMarket, isApproved])

  const approvedPrice = useCallback((productId) => {
    const price = getPrice(productId)
    return price ? Math.round(price.wholesalePrice * (1 - buyer.discountRate / 100)) : null
  }, [buyer.discountRate, getPrice])

  const inquiryRows = useMemo(() => inquiryItems.map((item) => {
    const product = mockProducts.find((candidate) => candidate.productId === item.productId)
    const price = getPrice(item.productId)
    const unitPrice = approvedPrice(item.productId)
    return product && price && unitPrice ? { ...item, product, price, unitPrice, subtotal: unitPrice * item.quantity } : null
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

  const submitQuoteRequest = (requestMemo) => {
    if (!isApproved || inquiryRows.length === 0) return null
    const inquiryId = formatInquiryId()
    const inquiry = {
      inquiryId,
      buyerId: buyer.uid,
      buyerCompanyName: buyer.companyName,
      buyerCountry: buyer.country,
      buyerLanguage: buyer.preferredLanguage,
      currency: buyer.currency,
      status: 'quote_requested',
      items: inquiryRows.map((row) => ({
        productId: row.product.productId,
        code: row.product.code,
        nameEn: row.product.nameEn,
        imageUrl: row.product.imageSet.card,
        market: buyer.assignedMarket,
        currency: buyer.currency,
        unitPrice: row.unitPrice,
        moq: row.price.moq,
        quantity: row.quantity,
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
    submitQuoteRequest,
    totalQuantity,
    updateInquiryQuantity,
    viewerState,
  }}>{children}</CommerceContext.Provider>
}
