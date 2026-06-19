import { useCallback, useEffect, useMemo, useState } from 'react'
import { createCatalogApi } from '../api/catalogApi'
import { createApiClient } from '../api/client'
import { getRuntimeConfig } from '../config/runtimeConfig'
import {
  buildInquiryRows,
  buildInquirySnapshot,
  guestProfile,
  getApprovedBuyerPrice,
  getDefaultOption,
  getBuyerAccessFeatures,
  getPriceForBuyer,
  isApprovedBuyer,
  isAdmin,
  isGuestViewer,
  isPendingBuyer,
  isSameInquiryItem,
  normalizeQuantity,
} from './commerceUtils'
import { adaptApiProducts } from '../services/apiProductAdapter'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`
const viewerStates = new Set(['guest', 'pending', 'approved', 'admin'])

export function CommerceProvider({ children }) {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), [])
  const [viewerState, setViewerStateValue] = useState('guest')
  const [products, setProducts] = useState([])
  const [dataStatus, setDataStatus] = useState('loading')
  const [dataError, setDataError] = useState(null)
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [mockProfiles, setMockProfiles] = useState({ guest: guestProfile })
  const [productPrices, setProductPrices] = useState([])
  const isMockMode = runtimeConfig.dataMode === 'mock' && runtimeConfig.isConfigured
  const effectiveViewerState = isMockMode ? viewerState : 'guest'
  const buyer = isMockMode ? (mockProfiles[effectiveViewerState] ?? mockProfiles.guest ?? guestProfile) : guestProfile
  const isApproved = isApprovedBuyer(buyer)
  const isPending = isPendingBuyer(buyer)
  const isGuest = isGuestViewer(effectiveViewerState)
  const isAdminViewer = isAdmin(buyer)
  const buyerAccess = getBuyerAccessFeatures(effectiveViewerState, buyer)

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      if (!runtimeConfig.isConfigured) {
        if (!isMounted) return
        setProducts([])
        setInquiries([])
        setDataStatus('error')
        setDataError(runtimeConfig.errors.join(' '))
        return
      }

      if (import.meta.env.DEV && runtimeConfig.dataMode === 'mock') {
        const catalog = await import('../data/catalog')
        if (!isMounted) return
        setMockProfiles(catalog.mockUsers ?? { guest: guestProfile })
        setProductPrices(catalog.mockProductPrices ?? [])
        setProducts(catalog.mockProducts ?? [])
        setInquiries(catalog.mockInquiries ?? [])
        setDataStatus('ready')
        setDataError(null)
        return
      }

      try {
        const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
        const catalogApi = createCatalogApi(apiClient)
        const apiProducts = await catalogApi.getCatalogProducts()
        if (!isMounted) return
        setMockProfiles({ guest: guestProfile })
        setProductPrices([])
        setProducts(adaptApiProducts(apiProducts))
        setInquiries([])
        setDataStatus('ready')
        setDataError(null)
      } catch (error) {
        if (!isMounted) return
        setProducts([])
        setInquiries([])
        setDataStatus('error')
        setDataError(error?.message || 'Catalog API is unavailable.')
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [runtimeConfig])

  const getPrice = useCallback((productId) => getPriceForBuyer(productPrices, productId, buyer, isApproved), [buyer, isApproved, productPrices])

  const approvedPrice = useCallback((productId) => (
    getApprovedBuyerPrice(productPrices, productId, buyer?.assignedMarket, buyer?.discountRate, isApproved)
  ), [buyer?.assignedMarket, buyer?.discountRate, isApproved, productPrices])

  const inquiryRows = useMemo(() => buildInquiryRows(inquiryItems, products, buyer, isApproved, productPrices), [buyer, inquiryItems, isApproved, productPrices, products])
  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const setViewerState = useCallback((nextViewerState) => {
    if (!isMockMode) return
    const safeState = viewerStates.has(nextViewerState) ? nextViewerState : 'guest'
    setViewerStateValue(safeState)
  }, [isMockMode])

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

  const submitRequestQuote = (requestMemo) => {
    if (!isMockMode) return null
    if (!isApproved || inquiryRows.length === 0) return null
    const inquiry = buildInquirySnapshot({
      inquiryRows,
      buyer,
      requestMemo,
      inquiryId: formatInquiryId(),
    })
    setInquiries((current) => [inquiry, ...current])
    setInquiryItems([])
    return inquiry
  }

  return <CommerceContext.Provider value={{
    addInquiryItem,
    approvedPrice,
    buyer,
    buyerAccess,
    dataError,
    dataMode: runtimeConfig.dataMode,
    dataStatus,
    estimatedTotal,
    getPrice,
    inquiries,
    inquiryItems,
    inquiryRows,
    isAdmin: isAdminViewer,
    isApproved,
    isGuest,
    isPending,
    products,
    removeInquiryItem,
    setViewerState,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    runtimeConfig,
    viewerState: effectiveViewerState,
  }}>{children}</CommerceContext.Provider>
}
