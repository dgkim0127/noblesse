import { mockUsers } from '../data/catalog'

// Current implementation uses mock data. Future implementation may call an auth provider and a database profile API.
export const getViewerProfile = (viewerState) => mockUsers[viewerState] ?? mockUsers.guest

export const isApprovedBuyer = (profile) => profile?.role === 'buyer' && profile?.status === 'approved'

export const isPendingBuyer = (profile) => profile?.role === 'buyer' && profile?.status === 'pending'

export const isAdmin = (profile) => profile?.role === 'admin'
