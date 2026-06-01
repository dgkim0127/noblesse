import { ALL_OPTION } from '../data/catalog'

export const formatWon = (value) =>
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)

export const formatYen = (value) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)

export const uniqueValues = (items, key) => [ALL_OPTION, ...new Set(items.map((item) => item[key]).filter(Boolean))]

export const normalizeQuantity = (value, moq) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return moq
  return Math.max(moq, Math.ceil(numeric / moq) * moq)
}

export const createOrderNumber = () =>
  `KZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-5)}`

export const getDiscountedPrice = (product, discount) => Math.round(product.wholesale * (1 - discount / 100))
