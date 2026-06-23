import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createCatalogApi } from '../api/catalogApi'
import { createBuyerApi } from '../api/buyerApi'
import { createApiClient } from '../api/client'
import { getRuntimeConfig } from '../config/runtimeConfig'
import { getCurrentUserIdToken, getUserIdToken, isAuthConfigured, registerWithCredentials, signInWithCredentials, signOutCurrentUser, subscribeAuthState } from '../services/authService'
import {
  buildInquiryRows,
  buildInquirySnapshot,
  guestProfile,
  getDefaultOption,
  getBuyerAccessFeatures,
  getDiscountedPrice,
  getPriceForBuyer,
  getViewerStateFromProfile,
  isApprovedBuyer,
  isAdmin,
  isGuestViewer,
  isPendingBuyer,
  isSameInquiryItem,
  normalizeBuyerProfile,
  normalizeQuantity,
} from './commerceUtils'
import { adaptApiProducts } from '../services/apiProductAdapter'
import { CommerceContext } from './commerceStore'
import { getInquiryKey } from './inquiryKeys'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`
const viewerStates = new Set(['guest', 'pending', 'approved', 'admin'])

function upsertInquiry(inquiries, nextInquiry) {
  const nextKey = getInquiryKey(nextInquiry)
  if (!nextKey) return inquiries
  const found = inquiries.some((item) => getInquiryKey(item) === nextKey)
  return found
    ? inquiries.map((item) => getInquiryKey(item) === nextKey ? nextInquiry : item)
    : [nextInquiry, ...inquiries]
}

export function CommerceProvider({ children }) {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), [])
  const [viewerState, setViewerStateValue] = useState('guest')
  const [products, setProducts] = useState([])
  const [dataStatus, setDataStatus] = useState('loading')
  const [dataError, setDataError] = useState(null)
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState([])
  const inquiriesRef = useRef([])
  const [mockProfiles, setMockProfiles] = useState({ guest: guestProfile })
  const [apiProfile, setApiProfile] = useState(null)
  const [authStatus, setAuthStatus] = useState('signed-out')
  const [authError, setAuthError] = useState('')
  const [productPrices, setProductPrices] = useState([])
  const isMockMode = runtimeConfig.dataMode === 'mock' && runtimeConfig.isConfigured
  const normalizedApiProfile = normalizeBuyerProfile(apiProfile)
  const effectiveViewerState = isMockMode ? viewerState : getViewerStateFromProfile(normalizedApiProfile)
  const buyer = isMockMode ? (mockProfiles[effectiveViewerState] ?? mockProfiles.guest ?? guestProfile) : normalizedApiProfile
  const isApproved = isApprovedBuyer(buyer)
  const isPending = isPendingBuyer(buyer)
  const isGuest = isGuestViewer(effectiveViewerState)
  const isAdminViewer = isAdmin(buyer)
  const buyerAccess = getBuyerAccessFeatures(effectiveViewerState, buyer)

  useEffect(() => {
    inquiriesRef.current = inquiries
  }, [inquiries])

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

  useEffect(() => {
    if (isMockMode || !runtimeConfig.isConfigured) return undefined

    if (!isAuthConfigured()) {
      setApiProfile(null)
      setAuthStatus('config-missing')
      setAuthError('')
      return undefined
    }

    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    let isMounted = true

    const unsubscribe = subscribeAuthState(async (user) => {
      if (!isMounted) return
      if (!user) {
        setApiProfile(null)
        setProductPrices([])
        setInquiries([])
        setAuthStatus('signed-out')
        setAuthError('')
        return
      }

      setAuthStatus('checking')
      setAuthError('')

      try {
        const token = await getUserIdToken(user)
        const profile = normalizeBuyerProfile(await buyerApi.getCurrentBuyerProfile(token))
        const isApprovedProfile = isApprovedBuyer(profile)
        const [apiProductPrices, apiInquiries] = isApprovedProfile
          ? await Promise.all([
            buyerApi.getProductPrices(token),
            buyerApi.getInquiries({}, token),
          ])
          : [[], { data: { inquiries: [] } }]
        if (!isMounted) return
        setApiProfile(profile)
        setProductPrices(apiProductPrices)
        setInquiries(apiInquiries.data?.inquiries || [])
        setAuthStatus('authenticated')
      } catch (error) {
        if (!isMounted) return
        setApiProfile(null)
        setProductPrices([])
        setInquiries([])
        setAuthStatus('error')
        setAuthError(error?.message || 'Unable to verify buyer profile.')
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isMockMode, runtimeConfig])

  const getPrice = useCallback((productId) => getPriceForBuyer(productPrices, productId, buyer, isApproved), [buyer, isApproved, productPrices])

  const approvedPrice = useCallback((productId) => (
    getDiscountedPrice(getPriceForBuyer(productPrices, productId, buyer, isApproved), buyer?.discountRate)
  ), [buyer, isApproved, productPrices])

  const inquiryRows = useMemo(() => buildInquiryRows(inquiryItems, products, buyer, isApproved, productPrices), [buyer, inquiryItems, isApproved, productPrices, products])
  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const setViewerState = useCallback((nextViewerState) => {
    if (!isMockMode) return
    const safeState = viewerStates.has(nextViewerState) ? nextViewerState : 'guest'
    setViewerStateValue(safeState)
  }, [isMockMode])

  const signIn = useCallback(async ({ identifier, password, remember = true } = {}) => {
    if (isMockMode) {
      setViewerState('approved')
      return
    }

    setAuthStatus('checking')
    setAuthError('')

    try {
      await signInWithCredentials(identifier, password, { remember })
    } catch (error) {
      setAuthStatus(isAuthConfigured() ? 'error' : 'config-missing')
      setAuthError(error?.message || 'Unable to sign in.')
      throw error
    }
  }, [isMockMode, setViewerState])

  const registerBuyer = useCallback(async ({ email, password, profile, remember = true } = {}) => {
    if (isMockMode) {
      setViewerState('pending')
      return { status: 'pending' }
    }

    setAuthStatus('checking')
    setAuthError('')

    try {
      const credential = await registerWithCredentials(email, password, { remember })
      const token = await getUserIdToken(credential.user, true)
      const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
      const buyerApi = createBuyerApi(apiClient)
      const result = await buyerApi.registerBuyer(profile, token)
      const registeredProfile = result.data?.profile || null
      setApiProfile(registeredProfile)
      setProductPrices([])
      setInquiries([])
      setAuthStatus('authenticated')
      return registeredProfile
    } catch (error) {
      setAuthStatus(isAuthConfigured() ? 'error' : 'config-missing')
      setAuthError(error?.message || 'Unable to register buyer.')
      throw error
    }
  }, [isMockMode, runtimeConfig.apiBaseUrl, setViewerState])

  const signOut = useCallback(async () => {
    if (isMockMode) {
      setViewerState('guest')
      return
    }

    await signOutCurrentUser()
    setApiProfile(null)
    setProductPrices([])
    setInquiries([])
    setAuthStatus(isAuthConfigured() ? 'signed-out' : 'config-missing')
    setAuthError('')
  }, [isMockMode, setViewerState])

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

  const refreshInquiries = useCallback(async (filters = {}) => {
    if (isMockMode) {
      return inquiriesRef.current.filter((item) => !filters.status || item.status === filters.status)
    }
    if (!isApproved) return []

    const token = await getCurrentUserIdToken()
    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    const result = await buyerApi.getInquiries(filters, token)
    const nextInquiries = result.data?.inquiries || []
    setInquiries(nextInquiries)
    return nextInquiries
  }, [isApproved, isMockMode, runtimeConfig.apiBaseUrl])

  const loadInquiry = useCallback(async (inquiryId) => {
    if (isMockMode) {
      return inquiriesRef.current.find((item) => getInquiryKey(item) === inquiryId) || null
    }
    if (!isApproved || !inquiryId) return null

    const token = await getCurrentUserIdToken()
    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    const result = await buyerApi.getInquiry(inquiryId, token)
    const inquiry = result.data?.inquiry || null
    if (inquiry) {
      setInquiries((current) => upsertInquiry(current, inquiry))
    }
    return inquiry
  }, [isApproved, isMockMode, runtimeConfig.apiBaseUrl])

  const submitRequestQuote = async (requestMemo) => {
    if (!isMockMode) {
      if (!isApproved || inquiryRows.length === 0) return null
      const token = await getCurrentUserIdToken()
      const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
      const buyerApi = createBuyerApi(apiClient)
      const result = await buyerApi.createInquiry({
        requestMemo,
        items: inquiryRows.map((row) => ({
          productCode: row.productCode,
          color: row.color,
          size: row.size,
          quantity: row.quantity,
        })),
      }, token)
      const inquiry = result.data?.inquiry
      if (inquiry) {
        setInquiries((current) => upsertInquiry(current, inquiry))
        setInquiryItems([])
      }
      return inquiry || null
    }
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
    authError,
    authStatus,
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
    registerBuyer,
    loadInquiry,
    refreshInquiries,
    setViewerState,
    signIn,
    signOut,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    runtimeConfig,
    viewerState: effectiveViewerState,
  }}>{children}</CommerceContext.Provider>
}
