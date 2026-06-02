import { mockBanners, mockCatalogFiles, mockCategories, mockCollections, mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'

const wait = (value) => Promise.resolve(value)

export const loadMockCatalog = () => wait({
  products: mockProducts,
  productPrices: mockProductPrices,
  categories: mockCategories,
  collections: mockCollections,
  banners: mockBanners,
  catalogFiles: mockCatalogFiles,
})

export const loadMockBuyer = (state) => wait(mockUsers[state] ?? mockUsers.guest)

export const loadMockInquiries = () => wait(mockInquiries)
