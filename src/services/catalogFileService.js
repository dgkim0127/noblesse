import { mockCatalogFiles } from '../data/catalog'

// Current implementation uses mock data. Future implementation may call Firebase, Supabase, or a server API.
export const getCatalogFiles = () => mockCatalogFiles

export const getVisibleCatalogFiles = ({ viewerState, buyer } = {}) => getCatalogFiles().filter((file) => {
  if (file.visibleTo === 'public') return true
  if (file.visibleTo !== 'approved_only') return false
  if (viewerState !== 'approved') return false
  if (file.market === 'GLOBAL') return true
  return file.market === buyer?.assignedMarket
})
