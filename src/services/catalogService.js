import { mockCategories, mockInquiries, mockProductPrices, mockProducts, mockUsers } from '../data/catalog'

const wait = (value) => Promise.resolve(value)

export const loadMockCatalog = () => wait({
  products: mockProducts,
  productPrices: mockProductPrices,
  categories: mockCategories,
})

export const loadMockBuyer = (state) => wait(mockUsers[state] ?? mockUsers.guest)

export const loadMockInquiries = () => wait(mockInquiries)
