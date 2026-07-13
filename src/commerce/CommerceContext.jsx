import { useCallback, useEffect, useMemo, useState } from 'react'
import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'
import { getCurrentBuyer, registerBuyer, signInBuyer, signOutBuyer } from '../services/authService'
import { loadCatalog, loadMarketPrices } from '../services/catalogService'
import { acceptPublishedQuote, createQuoteRequest, fetchAdminRequests, fetchBuyerRequests, markRequestChecking, publishQuoteRequest } from '../services/quoteService'
import { isSupabaseConfigured } from '../lib/supabase'
import { CommerceContext } from './commerceStore'

const makeReference = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`

const clampQuantity = (rawQuantity, moq) => {
  const safeMoq = Math.max(Number(moq) || 1, 1)
  const numeric = Number(rawQuantity)
  return Math.max(safeMoq, Math.ceil((Number.isFinite(numeric) ? numeric : safeMoq) / safeMoq) * safeMoq)
}

const localQuote = ({ buyer, rows, requestMemo, shippingCountry, contactName, contactEmail }) => ({
  inquiryId: makeReference(),
  requestId: null,
  buyerId: buyer.uid,
  buyerCompanyName: buyer.companyName,
  buyerCountry: shippingCountry || buyer.country,
  buyerLanguage: buyer.preferredLanguage,
  currency: buyer.currency,
  status: 'requested',
  totalItems: rows.length,
  totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
  estimatedTotal: rows.reduce((sum, row) => sum + row.subtotal, 0),
  requestMemo,
  contactName,
  contactEmail,
  items: rows.map((row) => ({
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
  quote: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export function CommerceProvider({ children }) {
  const [viewerState, setViewerStateValue] = useState(isSupabaseConfigured ? 'guest' : 'approved')
  const [authenticatedBuyer, setAuthenticatedBuyer] = useState(null)
  const [products, setProducts] = useState(mockProducts)
  const [prices, setPrices] = useState(mockProductPrices)
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState(mockInquiries)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [serviceError, setServiceError] = useState('')
  const buyer = authenticatedBuyer ?? mockUsers[viewerState]
  const isAdmin = buyer?.role === 'admin'
  const isApproved = Boolean(buyer?.status === 'approved' && (buyer?.role === 'buyer' || isAdmin))

  const refreshInquiries = useCallback(async (activeBuyer) => {
    if (!isSupabaseConfigured || !activeBuyer?.uid) return
    const loaded = activeBuyer.role === 'admin' ? await fetchAdminRequests() : await fetchBuyerRequests()
    setInquiries(loaded)
  }, [])

  useEffect(() => {
    let active = true
    loadCatalog().then((loaded) => active && setProducts(loaded)).catch((error) => active && setServiceError(error.message))
    if (!isSupabaseConfigured) return () => { active = false }
    getCurrentBuyer().then(async (profile) => {
      if (!active || !profile) return
      setAuthenticatedBuyer(profile)
      setViewerStateValue(profile.role === 'admin' ? 'admin' : profile.status)
      await refreshInquiries(profile)
    }).catch((error) => active && setServiceError(error.message)).finally(() => active && setIsLoading(false))
    return () => { active = false }
  }, [refreshInquiries])

  useEffect(() => {
    let active = true
    loadMarketPrices(buyer?.assignedMarket).then((loaded) => active && setPrices(loaded)).catch((error) => active && setServiceError(error.message))
    return () => { active = false }
  }, [buyer?.assignedMarket])

  const getPrice = useCallback((productId) => {
    if (!isApproved) return null
    return prices.find((price) => price.productId === productId && price.market === buyer.assignedMarket && price.isActive) ?? null
  }, [buyer, isApproved, prices])

  const approvedPrice = useCallback((productId) => {
    const price = getPrice(productId)
    return price ? Math.round(price.wholesalePrice * (1 - (buyer.discountRate || 0) / 100)) : null
  }, [buyer, getPrice])

  const inquiryRows = useMemo(() => inquiryItems.map((item) => {
    const product = products.find((candidate) => candidate.productId === item.productId)
    const price = getPrice(item.productId)
    const priceSnapshot = approvedPrice(item.productId)
    if (!product || !price || priceSnapshot === null) return null
    return {
      ...item,
      product,
      price,
      productCode: product.code,
      productName: product.nameEn,
      thumbnailUrl: product.imageSet?.thumb ?? '',
      imageAlt: product.imageAlt,
      material: product.material,
      color: item.color ?? product.colors[0] ?? '',
      size: item.size ?? product.sizes[0] ?? '',
      moq: price.moq,
      priceSnapshot,
      subtotal: priceSnapshot * item.quantity,
      tone: product.tone,
    }
  }).filter(Boolean), [approvedPrice, getPrice, inquiryItems, products])

  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const setViewerState = useCallback((nextState) => {
    if (isSupabaseConfigured) return
    setViewerStateValue(nextState)
  }, [])

  const addInquiryItem = (productId, option = {}, rawQuantity) => {
    if (!isApproved) return
    const price = getPrice(productId)
    const product = products.find((candidate) => candidate.productId === productId)
    if (!price || !product) return
    const selected = { color: option.color ?? product.colors[0] ?? '', size: option.size ?? product.sizes[0] ?? '' }
    const quantity = clampQuantity(rawQuantity, price.moq)
    setInquiryItems((current) => {
      const found = current.find((item) => item.productId === productId && item.color === selected.color && item.size === selected.size)
      return found
        ? current.map((item) => item === found ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, { productId, ...selected, quantity }]
    })
  }

  const updateInquiryQuantity = (productId, rawQuantity, option = {}) => {
    const moq = getPrice(productId)?.moq ?? 1
    setInquiryItems((current) => current.map((item) => item.productId === productId && (!option.color || item.color === option.color) && (!option.size || item.size === option.size)
      ? { ...item, quantity: clampQuantity(rawQuantity, moq) }
      : item))
  }

  const removeInquiryItem = (productId, option = {}) => setInquiryItems((current) => current.filter((item) => item.productId !== productId || (option.color && item.color !== option.color) || (option.size && item.size !== option.size)))
  const clearInquiryItems = () => setInquiryItems([])

  const submitRequestQuote = async (details) => {
    if (!isApproved || !inquiryRows.length) return null
    const payload = { buyer, rows: inquiryRows, ...details }
    try {
      const created = await createQuoteRequest(payload)
      const inquiry = created ?? localQuote(payload)
      setInquiries((current) => [inquiry, ...current])
      setInquiryItems([])
      return inquiry
    } catch (error) {
      setServiceError(error.message)
      throw error
    }
  }

  const publishQuote = async (request, draft) => {
    const fallback = {
      ...request,
      status: 'quoted',
      updatedAt: new Date().toISOString(),
      quote: { ...draft, status: 'published', publishedAt: new Date().toISOString() },
    }
    const updated = await publishQuoteRequest(request, draft) ?? fallback
    setInquiries((current) => current.map((item) => item.inquiryId === request.inquiryId ? updated : item))
    return updated
  }

  const markQuoteChecking = async (request) => {
    const fallback = { ...request, status: 'checking', updatedAt: new Date().toISOString() }
    const updated = await markRequestChecking(request.requestId) ?? fallback
    setInquiries((current) => current.map((item) => item.inquiryId === request.inquiryId ? updated : item))
    return updated
  }

  const respondToQuote = async (request, accepted) => {
    const fallback = { ...request, status: accepted ? 'accepted' : 'rejected', quote: { ...request.quote, status: accepted ? 'accepted' : 'rejected', acceptedAt: new Date().toISOString() } }
    const updated = await acceptPublishedQuote(request.requestId, accepted) ?? fallback
    setInquiries((current) => current.map((item) => item.inquiryId === request.inquiryId ? updated : item))
    return updated
  }

  const login = async (email, password) => {
    const profile = await signInBuyer(email, password)
    if (!profile) return
    setAuthenticatedBuyer(profile)
    setViewerStateValue(profile.role === 'admin' ? 'admin' : profile.status)
    await refreshInquiries(profile)
  }

  const register = async (input) => {
    const profile = await registerBuyer(input)
    if (!profile) return
    setAuthenticatedBuyer(profile)
    setViewerStateValue('pending')
  }

  const logout = async () => {
    await signOutBuyer()
    setAuthenticatedBuyer(null)
    setViewerStateValue('guest')
    setInquiries([])
  }

  return <CommerceContext.Provider value={{
    addInquiryItem, approvedPrice, buyer, clearInquiryItems, estimatedTotal, getPrice, inquiries, inquiryItems,
    inquiryRows, isAdmin, isApproved, isLoading, isSupabaseConfigured, login, logout, markQuoteChecking, products, publishQuote,
    refreshInquiries, register, removeInquiryItem, respondToQuote, serviceError, setViewerState, submitRequestQuote,
    totalQuantity, updateInquiryQuantity, viewerState,
  }}>{children}</CommerceContext.Provider>
}
