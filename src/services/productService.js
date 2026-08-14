import { mockCategories, mockCollections, mockProducts } from '../data/catalog'

// Current implementation uses mock data. Future implementation may call Firebase, Supabase, or a server API.
export const getProducts = () => mockProducts

export const getVisibleProducts = () => mockProducts.filter((product) => product.isVisible)

export const getProductById = (productId) => mockProducts.find((product) => product.productId === productId) ?? null

export const getProductsByCategory = (categoryId) => getVisibleProducts().filter((product) => product.categoryId === categoryId)

export const getProductsByCollection = (collectionId) => getVisibleProducts().filter((product) => product.collectionIds.includes(collectionId))

export const getCategories = () => mockCategories

export const getCollections = () => mockCollections
