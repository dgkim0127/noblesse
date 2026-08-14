import { onAuthStateChanged } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { mockCategories, mockCollections } from '../data/catalog'
import { auth, isHybridCommerceMode } from '../firebase'
import {
  buildInquiryRows,
  buildInquiryRowsFromApprovedPrices,
  buildInquirySnapshot,
  getApprovedBuyerPrice,
  getBuyerAccessFeatures,
  getDefaultOption,
  getHybridBuyerProfile,
  getHybridCatalog,
  getHybridInquiries,
  getInquiries,
  getPriceForBuyer,
  getProducts,
  getViewerProfile,
  isAdmin,
  isApprovedBuyer,
  isGuestViewer,
  isPendingBuyer,
  isSameInquiryItem,
  normalizeQuantity,
  signOutBuyer,
  submitHybridInquiry,
} from '../services'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`
const viewerStateStorageKey = 'noblesse.viewerState'
const viewerStates = new Set(['guest', 'pending', 'approved', 'admin'])

const getInitialViewerState = () => {
  if (typeof window === 'undefined') return 'approved'
  const savedState = window.localStorage.getItem(viewerStateStorageKey)
  return viewerStates.has(savedState) ? savedState : 'approved'
}

const getStateFromBuyer = (profile) => {
  if (!profile) return 'guest'
  if (profile.role === 'admin') return 'admin'
  if (profile.status === 'approved') return 'approved'
  return 'pending'
}

export function CommerceProvider({ children }) {
  const hybridMode = isHybridCommerceMode
  const [viewerState, setViewerStateValue] = useState(() => hybridMode ? 'guest' : getInitialViewerState())
  const [products, setProducts] = useState(() => hybridMode ? [] : getProducts())
  const [categories, setCategories] = useState(() => hybridMode ? [] : mockCategories)
  const [collections, setCollections] = useState(() => hybridMode ? [] : mockCollections)
  const [productPrices, setProductPrices] = useState([])
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState(() => hybridMode ? [] : getInquiries())
  const [buyer, setBuyer] = useState(() => hybridMode ? getViewerProfile('guest') : getViewerProfile(getInitialViewerState()))
  const [loading, setLoading] = useState(hybridMode)
  const [commerceError, setCommerceError] = useState('')
  const isApproved = isApprovedBuyer(buyer)
  const isPending = isPendingBuyer(buyer)
  const isGuest = isGuestViewer(viewerState)
  const isAdminViewer = isAdmin(buyer)
  const buyerAccess = getBuyerAccessFeatures(viewerState, buyer)

  const loadHybridSession = useCallback(async (user) => {
    if (!user) {
      setLoading(true)
      setCommerceError('')
      try {
        const catalogResponse = await getHybridCatalog()
        setBuyer(getViewerProfile('guest'))
        setViewerStateValue('guest')
        setProducts(catalogResponse.products ?? [])
        setCategories(catalogResponse.categories ?? [])
        setCollections(catalogResponse.collections ?? [])
        setProductPrices([])
        setInquiries([])
      } catch (error) {
        setCommerceError(error?.message || 'Noblesse catalog could not be loaded.')
        setProducts([])
        setCategories([])
        setCollections([])
        setProductPrices([])
        setInquiries([])
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    setCommerceError('')
    try {
      const [profileResponse, catalogResponse] = await Promise.all([
        getHybridBuyerProfile(),
        getHybridCatalog(),
      ])
      const nextBuyer = profileResponse.buyer ?? getViewerProfile('guest')
      setBuyer(nextBuyer)
      setViewerStateValue(getStateFromBuyer(nextBuyer))
      setProducts(catalogResponse.products ?? [])
      setCategories(catalogResponse.categories ?? [])
      setCollections(catalogResponse.collections ?? [])
      setProductPrices(catalogResponse.productPrices ?? [])
      if (nextBuyer.status === 'approved') {
        const inquiryResponse = await getHybridInquiries()
        setInquiries(inquiryResponse.inquiries ?? [])
      } else {
        setInquiries([])
      }
    } catch (error) {
      setCommerceError(error?.message || 'Noblesse 데이터를 불러오지 못했습니다.')
      setBuyer(getViewerProfile('guest'))
      setViewerStateValue('guest')
      setProducts([])
      setCategories([])
      setCollections([])
      setProductPrices([])
      setInquiries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hybridMode || !auth) return undefined
    return onAuthStateChanged(auth, (user) => { void loadHybridSession(user) })
  }, [hybridMode, loadHybridSession])

  const refreshCommerce = useCallback(async () => {
    if (!hybridMode || !auth?.currentUser) return
    await auth.currentUser.reload()
    await loadHybridSession(auth.currentUser)
  }, [hybridMode, loadHybridSession])

  const getPrice = useCallback((productId) => {
    if (hybridMode) return productPrices.find((price) => price.productId === productId && price.isActive) ?? null
    return getPriceForBuyer(productId, buyer, isApproved)
  }, [buyer, hybridMode, isApproved, productPrices])

  const approvedPrice = useCallback((productId) => {
    if (hybridMode) return getPrice(productId)?.approvedPrice ?? null
    return getApprovedBuyerPrice(productId, buyer?.assignedMarket, buyer?.discountRate, isApproved)
  }, [buyer?.assignedMarket, buyer?.discountRate, getPrice, hybridMode, isApproved])

  const inquiryRows = useMemo(() => (
    hybridMode
      ? buildInquiryRowsFromApprovedPrices(inquiryItems, products, getPrice)
      : buildInquiryRows(inquiryItems, products, buyer, isApproved)
  ), [buyer, getPrice, hybridMode, inquiryItems, isApproved, products])
  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const setViewerState = useCallback((nextViewerState) => {
    if (hybridMode) return
    const safeState = viewerStates.has(nextViewerState) ? nextViewerState : 'guest'
    setViewerStateValue(safeState)
    setBuyer(getViewerProfile(safeState))
    if (typeof window !== 'undefined') window.localStorage.setItem(viewerStateStorageKey, safeState)
  }, [hybridMode])

  const logout = useCallback(async () => {
    if (hybridMode) {
      await signOutBuyer()
      return
    }
    setViewerState('guest')
  }, [hybridMode, setViewerState])

  const addInquiryItem = (productId, option = {}, rawQuantity) => {
    if (!isApproved) return
    const product = products.find((candidate) => candidate.productId === productId)
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
    const product = products.find((candidate) => candidate.productId === productId)
    if (!product) return
    const selectedOption = getDefaultOption(product, option)
    const moq = getPrice(productId)?.moq ?? 1
    const quantity = normalizeQuantity(rawQuantity, moq)
    setInquiryItems((current) => current.map((item) => isSameInquiryItem(item, productId, selectedOption) ? { ...item, quantity } : item))
  }

  const removeInquiryItem = (productId, option = {}) => {
    const product = products.find((candidate) => candidate.productId === productId)
    if (!product) return
    const selectedOption = getDefaultOption(product, option)
    setInquiryItems((current) => current.filter((item) => !isSameInquiryItem(item, productId, selectedOption)))
  }

  const clearInquiryItems = () => setInquiryItems([])

  const submitRequestQuote = async (requestMemo) => {
    if (!isApproved || inquiryRows.length === 0) return null
    if (hybridMode) {
      const response = await submitHybridInquiry({ items: inquiryItems, requestMemo })
      const inquiry = response.inquiry
      setInquiries((current) => [inquiry, ...current.filter((item) => item.inquiryId !== inquiry.inquiryId)])
      setInquiryItems([])
      return inquiry
    }
    const inquiry = buildInquirySnapshot({ inquiryRows, buyer, requestMemo, inquiryId: formatInquiryId() })
    setInquiries((current) => [inquiry, ...current])
    setInquiryItems([])
    return inquiry
  }

  return <CommerceContext.Provider value={{
    addInquiryItem,
    approvedPrice,
    buyer,
    buyerAccess,
    categories,
    clearInquiryItems,
    commerceError,
    collections,
    estimatedTotal,
    getPrice,
    inquiries,
    inquiryItems,
    inquiryRows,
    isAdmin: isAdminViewer,
    isApproved,
    isGuest,
    isHybridMode: hybridMode,
    isPending,
    loading,
    logout,
    productPrices,
    products,
    refreshCommerce,
    removeInquiryItem,
    setViewerState,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    viewerState,
  }}>{children}</CommerceContext.Provider>
}
