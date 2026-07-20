import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createCatalogApi } from '../api/catalogApi'
import { createAdminApi } from '../api/adminApi'
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
  getAdminPriceBooksForProduct,
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
import { cloneHomeLayout, defaultHomeLayout, normalizeHomeLayout } from '../config/homeLayout'
import { clearInquiryDraft, loadInquiryDraft, saveInquiryDraft } from './inquiryDraftStorage'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`
const viewerStates = new Set(['guest', 'pending', 'approved', 'admin'])
const adminPricePageLimit = 100
const adminPricePageCap = 20

function upsertInquiry(inquiries, nextInquiry) {
  const nextKey = getInquiryKey(nextInquiry)
  if (!nextKey) return inquiries
  const found = inquiries.some((item) => getInquiryKey(item) === nextKey)
  return found
    ? inquiries.map((item) => getInquiryKey(item) === nextKey ? nextInquiry : item)
    : [nextInquiry, ...inquiries]
}

async function loadAdminProductPrices(adminApi, token) {
  const prices = []
  let offset = 0

  for (let page = 0; page < adminPricePageCap; page += 1) {
    const result = await adminApi.getPrices({
      active: true,
      limit: adminPricePageLimit,
      offset,
    }, token)
    const pagePrices = (result.data?.prices || []).map((price) => ({
      ...price,
      productId: price.productCode || price.productId,
      sourceProductId: price.productId,
    }))

    prices.push(...pagePrices)

    const nextOffset = result.meta?.nextOffset
    const parsedNextOffset = Number(nextOffset)
    if (nextOffset === null || nextOffset === undefined || pagePrices.length === 0 || !Number.isFinite(parsedNextOffset)) {
      break
    }
    offset = parsedNextOffset
  }

  return prices
}

async function loadAuthenticatedCommerceState({ apiBaseUrl, token }) {
  const apiClient = createApiClient({ baseUrl: apiBaseUrl })
  const adminApi = createAdminApi(apiClient)
  const buyerApi = createBuyerApi(apiClient)
  const profile = normalizeBuyerProfile(await buyerApi.getCurrentBuyerProfile(token))
  const isApprovedProfile = isApprovedBuyer(profile)
  const isAdminProfile = isAdmin(profile)
  let prices = []
  let inquiryResult = { data: { inquiries: [] } }

  if (isApprovedProfile) {
    try {
      prices = await buyerApi.getProductPrices(token)
    } catch {
      prices = []
    }
  } else if (isAdminProfile) {
    try {
      prices = await loadAdminProductPrices(adminApi, token)
    } catch {
      prices = []
    }
  }

  if (isApprovedProfile) {
    try {
      inquiryResult = await buyerApi.getInquiries({}, token)
    } catch {
      inquiryResult = { data: { inquiries: [] } }
    }
  }

  return {
    inquiries: inquiryResult.data?.inquiries || [],
    prices,
    profile,
  }
}

export function CommerceProvider({ children }) {
  const runtimeConfig = useMemo(() => getRuntimeConfig(), [])
  const [viewerState, setViewerStateValue] = useState('guest')
  const [products, setProducts] = useState([])
  const [homeShowcase, setHomeShowcase] = useState([])
  const [homeLayout, setHomeLayout] = useState(() => cloneHomeLayout(defaultHomeLayout))
  const [dataStatus, setDataStatus] = useState('loading')
  const [dataError, setDataError] = useState(null)
  const [inquiryItems, setInquiryItems] = useState([])
  const inquiryDraftHydratedForRef = useRef(null)
  const skipNextInquiryDraftPersistRef = useRef(false)
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
  const inquiryDraftBuyerId = isApproved ? buyer?.uid : null

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!inquiryDraftBuyerId) {
      inquiryDraftHydratedForRef.current = null
      skipNextInquiryDraftPersistRef.current = true
      setInquiryItems([])
      return
    }

    skipNextInquiryDraftPersistRef.current = true
    inquiryDraftHydratedForRef.current = inquiryDraftBuyerId
    setInquiryItems(loadInquiryDraft(window.sessionStorage, inquiryDraftBuyerId))
  }, [inquiryDraftBuyerId])

  useEffect(() => {
    if (typeof window === 'undefined' || !inquiryDraftBuyerId) return
    if (inquiryDraftHydratedForRef.current !== inquiryDraftBuyerId) return
    if (skipNextInquiryDraftPersistRef.current) {
      skipNextInquiryDraftPersistRef.current = false
      return
    }

    saveInquiryDraft(window.sessionStorage, inquiryDraftBuyerId, inquiryItems)
  }, [inquiryDraftBuyerId, inquiryItems])

  useEffect(() => {
    inquiriesRef.current = inquiries
  }, [inquiries])

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      if (!runtimeConfig.isConfigured) {
        if (!isMounted) return
        setProducts([])
        setHomeShowcase([])
        setHomeLayout(cloneHomeLayout(defaultHomeLayout))
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
        setHomeShowcase([])
        setHomeLayout(cloneHomeLayout(defaultHomeLayout))
        setInquiries(catalog.mockInquiries ?? [])
        setDataStatus('ready')
        setDataError(null)
        return
      }

      try {
        const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
        const catalogApi = createCatalogApi(apiClient)
        const [apiProducts, showcaseSlides, publishedHomeLayout] = await Promise.all([
          catalogApi.getCatalogProducts(),
          catalogApi.getHomeShowcase().catch(() => []),
          catalogApi.getHomeLayout().catch(() => null),
        ])
        if (!isMounted) return
        setMockProfiles({ guest: guestProfile })
        setProductPrices([])
        setProducts(adaptApiProducts(apiProducts))
        setHomeShowcase(showcaseSlides)
        setHomeLayout(normalizeHomeLayout(publishedHomeLayout))
        setInquiries([])
        setDataStatus('ready')
        setDataError(null)
      } catch (error) {
        if (!isMounted) return
        setProducts([])
        setHomeShowcase([])
        setHomeLayout(cloneHomeLayout(defaultHomeLayout))
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
        const nextState = await loadAuthenticatedCommerceState({
          apiBaseUrl: runtimeConfig.apiBaseUrl,
          token,
        })
        if (!isMounted) return
        setApiProfile(nextState.profile)
        setProductPrices(nextState.prices)
        setInquiries(nextState.inquiries)
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

  const getAdminPriceBooks = useCallback((productId) => (
    isAdminViewer ? getAdminPriceBooksForProduct(productPrices, productId) : []
  ), [isAdminViewer, productPrices])

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
      const credential = await signInWithCredentials(identifier, password, { remember, apiBaseUrl: runtimeConfig.apiBaseUrl })
      const token = await getUserIdToken(credential.user, true)
      const nextState = await loadAuthenticatedCommerceState({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        token,
      })
      setApiProfile(nextState.profile)
      setProductPrices(nextState.prices)
      setInquiries(nextState.inquiries)
      setAuthStatus('authenticated')
    } catch (error) {
      setAuthStatus(isAuthConfigured() ? 'error' : 'config-missing')
      setAuthError(error?.message || 'Unable to sign in.')
      throw error
    }
  }, [isMockMode, runtimeConfig.apiBaseUrl, setViewerState])

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

    if (typeof window !== 'undefined') {
      clearInquiryDraft(window.sessionStorage, buyer?.uid)
    }
    await signOutCurrentUser()
    setInquiryItems([])
    setApiProfile(null)
    setProductPrices([])
    setInquiries([])
    setAuthStatus(isAuthConfigured() ? 'signed-out' : 'config-missing')
    setAuthError('')
  }, [buyer?.uid, isMockMode, setViewerState])

  const addInquiryItem = (productId, option = {}, rawQuantity) => {
    if (!isApproved) return
    const product = products.find((candidate) => candidate.productId === productId)
    const price = getPrice(productId)
    if (!product) return

    const selectedOption = getDefaultOption(product, option)
    if (selectedOption.groups.some((group) => group.required && !selectedOption.selection[group.id])) return false
    const quantity = normalizeQuantity(rawQuantity, price?.moq ?? product.moqDefault ?? 1)
    setInquiryItems((current) => {
      const found = current.find((item) => isSameInquiryItem(item, productId, selectedOption))
      return found
        ? current.map((item) => isSameInquiryItem(item, productId, selectedOption) ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, {
            productId,
            color: selectedOption.color,
            size: selectedOption.size,
            selectedOptions: selectedOption.selectedOptionPairs,
            quantity,
          }]
    })
    return true
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

  const loadInquiryQuote = useCallback(async (inquiryId) => {
    if (isMockMode || !isApproved || !inquiryId) return null
    const token = await getCurrentUserIdToken()
    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    const result = await buyerApi.getInquiryQuote(inquiryId, token)
    return result.data?.quote || null
  }, [isApproved, isMockMode, runtimeConfig.apiBaseUrl])

  const decideInquiryQuote = useCallback(async ({ quoteId, documentId, decision, note = '' } = {}) => {
    if (isMockMode || !isApproved || !quoteId || !documentId) return null
    const token = await getCurrentUserIdToken()
    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    const result = await buyerApi.decideQuote(quoteId, { documentId, decision, note }, token)
    return result.data?.quote || null
  }, [isApproved, isMockMode, runtimeConfig.apiBaseUrl])

  const downloadInquiryQuoteDocument = useCallback(async ({ quoteId, documentId } = {}) => {
    if (isMockMode || !isApproved || !quoteId || !documentId) return null
    const token = await getCurrentUserIdToken()
    const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
    const buyerApi = createBuyerApi(apiClient)
    const result = await buyerApi.downloadQuoteDocument(quoteId, documentId, token)
    return result.data || null
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
          selectedOptions: row.selectedOptionPairs || [],
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

  const submitProductInquiry = async ({ productId, option = {}, quantity: rawQuantity, requestMemo = '' } = {}) => {
    const product = products.find((candidate) => candidate.productId === productId || candidate.code === productId)
    if (!isApproved || !product) return null
    const price = getPrice(product.productId)
    const selectedOption = getDefaultOption(product, option)
    if (selectedOption.groups.some((group) => group.required && !selectedOption.selection[group.id])) return null
    const quantity = normalizeQuantity(rawQuantity, price?.moq ?? product.moqDefault ?? 1)

    if (!isMockMode) {
      const token = await getCurrentUserIdToken()
      const apiClient = createApiClient({ baseUrl: runtimeConfig.apiBaseUrl })
      const buyerApi = createBuyerApi(apiClient)
      const result = await buyerApi.createInquiry({
        requestMemo,
        items: [{
          productCode: product.code,
          color: selectedOption.color,
          size: selectedOption.size,
          selectedOptions: selectedOption.selectedOptionPairs,
          quantity,
        }],
      }, token)
      const inquiry = result.data?.inquiry
      if (inquiry) {
        setInquiries((current) => upsertInquiry(current, inquiry))
      }
      return inquiry || null
    }

    const singleRow = buildInquiryRows(
      [{
        productId: product.productId,
        color: selectedOption.color,
        size: selectedOption.size,
        selectedOptions: selectedOption.selectedOptionPairs,
        quantity,
      }],
      products,
      buyer,
      isApproved,
      productPrices,
    )
    const inquiry = buildInquirySnapshot({
      inquiryRows: singleRow,
      buyer,
      requestMemo,
      inquiryId: formatInquiryId(),
    })
    if (inquiry) {
      setInquiries((current) => upsertInquiry(current, inquiry))
    }
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
    getAdminPriceBooks,
    homeShowcase,
    homeLayout,
    inquiries,
    inquiryItems,
    inquiryRows,
    isAdmin: isAdminViewer,
    isApproved,
    isGuest,
    isPending,
    productPrices,
    products,
    removeInquiryItem,
    registerBuyer,
    loadInquiry,
    loadInquiryQuote,
    decideInquiryQuote,
    downloadInquiryQuoteDocument,
    refreshInquiries,
    setViewerState,
    signIn,
    signOut,
    submitProductInquiry,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    runtimeConfig,
    viewerState: effectiveViewerState,
  }}>{children}</CommerceContext.Provider>
}
