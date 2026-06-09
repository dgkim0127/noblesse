import { useCallback, useMemo, useState } from 'react'
import {
  buildInquiryRows,
  buildInquirySnapshot,
  getApprovedBuyerPrice,
  getDefaultOption,
  getInquiries,
  getBuyerAccessFeatures,
  getPriceForBuyer,
  getProducts,
  getViewerProfile,
  isApprovedBuyer,
  isAdmin,
  isGuestViewer,
  isPendingBuyer,
  isSameInquiryItem,
  normalizeQuantity,
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

export function CommerceProvider({ children }) {
  const [viewerState, setViewerStateValue] = useState(getInitialViewerState)
  const [products] = useState(() => getProducts())
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState(() => getInquiries())
  const buyer = getViewerProfile(viewerState)
  const isApproved = isApprovedBuyer(buyer)
  const isPending = isPendingBuyer(buyer)
  const isGuest = isGuestViewer(viewerState)
  const isAdminViewer = isAdmin(buyer)
  const buyerAccess = getBuyerAccessFeatures(viewerState, buyer)

  const getPrice = useCallback((productId) => getPriceForBuyer(productId, buyer, isApproved), [buyer, isApproved])

  const approvedPrice = useCallback((productId) => (
    getApprovedBuyerPrice(productId, buyer?.assignedMarket, buyer?.discountRate, isApproved)
  ), [buyer?.assignedMarket, buyer?.discountRate, isApproved])

  const inquiryRows = useMemo(() => buildInquiryRows(inquiryItems, products, buyer, isApproved), [buyer, inquiryItems, isApproved, products])
  const estimatedTotal = inquiryRows.reduce((sum, row) => sum + row.subtotal, 0)
  const totalQuantity = inquiryRows.reduce((sum, row) => sum + row.quantity, 0)

  const setViewerState = useCallback((nextViewerState) => {
    const safeState = viewerStates.has(nextViewerState) ? nextViewerState : 'guest'
    setViewerStateValue(safeState)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(viewerStateStorageKey, safeState)
    }
  }, [])

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
    viewerState,
  }}>{children}</CommerceContext.Provider>
}
