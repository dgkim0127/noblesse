import { useCallback, useEffect, useMemo, useState } from 'react'
import { mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'
import {
  createUserWithEmailAndPassword,
  isAuthAvailable,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from '../services/authService'
import {
  createPendingBuyerProfile,
  getUserProfile,
  isUserServiceAvailable,
} from '../services/userService'
import { CommerceContext } from './commerceStore'

const formatInquiryId = () => `INQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-3)}`
const firebaseProfileEnabled = isAuthAvailable && isUserServiceAvailable

function deriveViewerState(authUser, profile) {
  if (!authUser || !profile) return 'guest'
  if (profile.status === 'blocked') return 'blocked'
  if (profile.role === 'admin') return 'admin'
  if (profile.role === 'buyer' && profile.status === 'approved') return 'approved'
  if (profile.role === 'buyer' && profile.status === 'pending') return 'pending'
  return 'guest'
}

function normalizeBuyer(profile, fallback) {
  if (!profile) return fallback
  return {
    ...mockUsers.guest,
    ...fallback,
    ...profile,
    discountRate: Number(profile.discountRate ?? fallback.discountRate ?? 0),
    minOrderAmount: Number(profile.minOrderAmount ?? fallback.minOrderAmount ?? 0),
  }
}

export function CommerceProvider({ children }) {
  const [mockViewerState, setMockViewerState] = useState('approved')
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseProfileEnabled)
  const [authError, setAuthError] = useState('')
  const [inquiryItems, setInquiryItems] = useState([])
  const [inquiries, setInquiries] = useState(mockInquiries)

  const firebaseViewerState = deriveViewerState(currentUser, userProfile)
  const viewerState = firebaseProfileEnabled ? firebaseViewerState : mockViewerState
  const fallbackBuyer = mockUsers[viewerState] ?? mockUsers.guest
  const buyer = firebaseProfileEnabled ? normalizeBuyer(userProfile, fallbackBuyer) : fallbackBuyer
  const isApproved = viewerState === 'approved'

  const refreshUserProfile = useCallback(async (uid = currentUser?.uid) => {
    if (!firebaseProfileEnabled || !uid) {
      return null
    }
    const profile = await getUserProfile(uid)
    setUserProfile(profile)
    return profile
  }, [currentUser?.uid])

  useEffect(() => {
    if (!firebaseProfileEnabled) {
      return undefined
    }

    return onAuthStateChanged(async (authUser) => {
      setAuthLoading(true)
      setAuthError('')
      try {
        setCurrentUser(authUser)
        if (authUser) {
          const profile = await getUserProfile(authUser.uid)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
      } catch (error) {
        setAuthError(error.message)
        setUserProfile(null)
      } finally {
        setAuthLoading(false)
      }
    })
  }, [])

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

  const login = async (email, password) => {
    setAuthError('')
    if (!firebaseProfileEnabled) {
      setMockViewerState('approved')
      return { viewerState: 'approved', profile: mockUsers.approved, user: null, mock: true }
    }

    setAuthLoading(true)
    try {
      const { user } = await signInWithEmailAndPassword(email, password)
      const profile = user ? await getUserProfile(user.uid) : null
      setCurrentUser(user)
      setUserProfile(profile)
      return { viewerState: deriveViewerState(user, profile), profile, user, mock: false }
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const registerBuyer = async (formData) => {
    setAuthError('')
    if (!firebaseProfileEnabled) {
      setMockViewerState('pending')
      return { viewerState: 'pending', profile: mockUsers.pending, user: null, mock: true }
    }

    setAuthLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(formData.email, formData.password)
      const profile = await createPendingBuyerProfile(user.uid, user.email, formData)
      setCurrentUser(user)
      setUserProfile(profile)
      return { viewerState: 'pending', profile, user, mock: false }
    } catch (error) {
      setAuthError(error.message)
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = async () => {
    setAuthError('')
    if (firebaseProfileEnabled) {
      await signOut()
      setCurrentUser(null)
      setUserProfile(null)
    }
    setMockViewerState('guest')
    setInquiryItems([])
  }

  return <CommerceContext.Provider value={{
    addInquiryItem,
    approvedPrice,
    authError,
    authLoading,
    buyer,
    currentUser,
    estimatedTotal,
    getPrice,
    inquiries,
    inquiryItems,
    inquiryRows,
    isApproved,
    login,
    logout,
    products: mockProducts,
    refreshUserProfile,
    registerBuyer,
    removeInquiryItem,
    setViewerState: setMockViewerState,
    submitRequestQuote,
    totalQuantity,
    updateInquiryQuantity,
    userProfile,
    viewerState,
  }}>{children}</CommerceContext.Provider>
}
