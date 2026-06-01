import { useMemo, useState } from 'react'
import {
  SALE_STATUS,
  defaultSettings,
  fallbackBuyers,
  fallbackOptions,
  fallbackOrders,
  fallbackProducts,
} from '../data/catalog'
import { submitOrderRequest as submitRemoteOrder } from '../services/catalogService'
import { createOrderNumber, getDiscountedPrice, normalizeQuantity } from '../utils/commerce'
import { CommerceContext } from './commerceStore'

export function CommerceProvider({ children }) {
  const [viewerMode, setViewerMode] = useState('member')
  const [products] = useState(fallbackProducts)
  const [options] = useState(fallbackOptions)
  const [orders, setOrders] = useState(fallbackOrders)
  const [cart, setCart] = useState([
    { productId: 'KZ-P-1004', optionId: 'OPT-P-1004-S', qty: 40 },
    { productId: 'KZ-H-2418', optionId: 'OPT-H-2418-W', qty: 24 },
  ])
  const [message, setMessage] = useState('')
  const settings = defaultSettings
  const demoBuyer = fallbackBuyers[0]
  const activeBuyer = viewerMode === 'member' ? demoBuyer : null
  const isApprovedMember = activeBuyer?.approvalStatus === 'approved'
  const adjustedRate = settings.exchangeRate * (1 + settings.exchangeAdjust / 100)

  const getProductOptions = (productId) => options.filter((option) => option.productId === productId)

  const cartRows = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId)
          const option = options.find((candidate) => candidate.id === item.optionId)
          if (!product || !option) return null
          const discounted = getDiscountedPrice({ wholesale: option.baseWholesalePrice }, activeBuyer?.discount ?? 0)
          const supply = discounted * item.qty
          const vat = product.vat ? Math.round(supply * 0.1) : 0
          return { ...item, product, option, discounted, supply, vat, total: supply + vat }
        })
        .filter(Boolean),
    [activeBuyer?.discount, cart, options, products],
  )

  const orderTotal = cartRows.reduce((sum, row) => sum + row.total, 0)
  const cartQuantity = cartRows.reduce((sum, row) => sum + row.qty, 0)
  const minOrderAmount = activeBuyer?.minOrder ?? 300000
  const minOrderGap = Math.max(0, minOrderAmount - orderTotal)
  const minOrderProgress = Math.min(100, Math.round((orderTotal / minOrderAmount) * 100))
  const canOrder = isApprovedMember && cartRows.length > 0 && minOrderGap === 0

  const addToCart = (productId, optionId) => {
    if (!isApprovedMember) {
      setMessage('승인 회원 로그인 후 장바구니를 이용할 수 있습니다.')
      return
    }
    const product = products.find((candidate) => candidate.id === productId)
    const option = options.find((candidate) => candidate.id === optionId) ?? getProductOptions(productId)[0]
    if (!product || !option || product.status !== SALE_STATUS || option.stockStatus === 'sold_out') return
    setCart((current) => {
      const found = current.find((item) => item.optionId === option.id)
      return found
        ? current.map((item) => (item.optionId === option.id ? { ...item, qty: item.qty + option.moq } : item))
        : [...current, { productId, optionId: option.id, qty: option.moq }]
    })
    setMessage(`${product.ko} 상품을 장바구니에 담았습니다.`)
  }

  const updateCartQty = (optionId, rawQty) => {
    const option = options.find((candidate) => candidate.id === optionId)
    setCart((current) =>
      current.map((item) => (item.optionId === optionId ? { ...item, qty: normalizeQuantity(rawQty, option?.moq ?? 1) } : item)),
    )
  }

  const removeFromCart = (optionId) => setCart((current) => current.filter((item) => item.optionId !== optionId))

  const submitOrder = async (requestMemo = '') => {
    if (!canOrder) throw new Error(`최소 주문금액까지 ${minOrderGap.toLocaleString('ko-KR')}원 남았습니다.`)
    const payload = { items: cartRows.map((row) => ({ optionId: row.option.id, quantity: row.qty })), requestMemo }
    let orderNumber
    try {
      const result = await submitRemoteOrder(payload)
      orderNumber = result.orderNumber
    } catch {
      orderNumber = createOrderNumber()
    }
    const order = {
      id: orderNumber,
      orderNumber,
      status: 'requested',
      createdAtLabel: new Date().toLocaleDateString('ko-KR'),
      totalQuantity: cartQuantity,
      finalAmount: orderTotal,
      items: cartRows.map((row) => ({
        productId: row.product.id,
        productName: row.product.ko,
        optionLabel: row.option.label,
        quantity: row.qty,
        subtotal: row.total,
      })),
    }
    setOrders((current) => [order, ...current])
    setCart([])
    setMessage(`주문 요청 ${orderNumber}이 접수되었습니다.`)
    return order
  }

  return (
    <CommerceContext.Provider
      value={{
        activeBuyer,
        adjustedRate,
        addToCart,
        canOrder,
        cartQuantity,
        cartRows,
        getProductOptions,
        isApprovedMember,
        message,
        minOrderGap,
        minOrderProgress,
        options,
        orderTotal,
        orders,
        products,
        removeFromCart,
        setMessage,
        setViewerMode,
        submitOrder,
        updateCartQty,
        viewerMode,
      }}
    >
      {children}
    </CommerceContext.Provider>
  )
}
