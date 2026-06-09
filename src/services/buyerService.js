import { mockUsers } from '../data/catalog'

// Current implementation uses mock data. Future implementation may call an auth provider and a database profile API.
export const getViewerProfile = (viewerState) => mockUsers[viewerState] ?? mockUsers.guest

export const isApprovedBuyer = (profile) => profile?.role === 'buyer' && profile?.status === 'approved'

export const isPendingBuyer = (profile) => profile?.role === 'buyer' && profile?.status === 'pending'

export const isAdmin = (profile) => profile?.role === 'admin'

export const isGuestViewer = (viewerState) => viewerState === 'guest'

export const getBuyerAccessLabel = (viewerState, profile) => {
  if (viewerState === 'guest') return 'Guest Preview'
  if (isPendingBuyer(profile)) return 'Buyer Approval Pending'
  if (isApprovedBuyer(profile)) return 'Approved Buyer'
  if (isAdmin(profile)) return 'Admin Preview'
  return 'Guest Preview'
}

export const getBuyerAccessFeatures = (viewerState, profile) => {
  const base = {
    canViewProducts: true,
    canViewPrices: false,
    canUseInquiryList: false,
    canRequestQuote: false,
    canViewMyInquiries: false,
  }

  if (viewerState === 'guest' || isPendingBuyer(profile)) return base

  if (isApprovedBuyer(profile)) {
    return {
      ...base,
      canViewPrices: true,
      canUseInquiryList: true,
      canRequestQuote: true,
      canViewMyInquiries: true,
    }
  }

  if (isAdmin(profile)) {
    return {
      ...base,
      canViewPrices: true,
      canUseInquiryList: true,
      canRequestQuote: true,
      canViewMyInquiries: true,
      canPreviewAdmin: true,
    }
  }

  return base
}
