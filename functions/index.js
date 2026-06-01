const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()

const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다.')
  return request.auth.uid
}

const requireAdmin = async (request) => {
  const uid = requireAuth(request)
  const snapshot = await db.doc(`users/${uid}`).get()
  if (!snapshot.exists || !['admin', 'super_admin'].includes(snapshot.data().role)) {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.')
  }
  return uid
}

exports.submitOrderRequest = onCall({ region: 'asia-northeast3' }, async (request) => {
  const uid = requireAuth(request)
  const userSnapshot = await db.doc(`users/${uid}`).get()
  const user = userSnapshot.data()
  if (!user || user.status !== 'approved') throw new HttpsError('permission-denied', '승인 회원만 주문할 수 있습니다.')
  if (!Array.isArray(request.data.items) || request.data.items.length === 0) throw new HttpsError('invalid-argument', '주문 상품이 없습니다.')

  const items = []
  for (const row of request.data.items) {
    const optionSnapshot = await db.doc(`productOptions/${row.optionId}`).get()
    const option = optionSnapshot.data()
    if (!option || !option.isVisible || option.stockStatus === 'sold_out') throw new HttpsError('failed-precondition', '주문할 수 없는 옵션이 포함되어 있습니다.')
    if (!Number.isInteger(row.quantity) || row.quantity < option.moq || row.quantity % option.moq !== 0) throw new HttpsError('invalid-argument', 'MOQ 배수에 맞지 않는 수량입니다.')
    const productSnapshot = await db.doc(`products/${option.productId}`).get()
    const product = productSnapshot.data()
    const price = Math.round(option.baseWholesalePrice * (1 - (user.discountRate ?? 0) / 100))
    items.push({ optionId: row.optionId, productId: option.productId, productCode: product.code, productName: product.name, optionLabel: option.label, price, quantity: row.quantity, subtotal: price * row.quantity })
  }

  const productTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  if (productTotal < user.minOrderAmount) throw new HttpsError('failed-precondition', '최소 주문금액을 충족하지 못했습니다.')
  const orderRef = db.collection('orders').doc()
  const orderNumber = `KZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderRef.id.slice(0, 5).toUpperCase()}`
  await orderRef.set({ orderNumber, userId: uid, companyName: user.companyName, buyerName: user.contactName, phone: user.phone, status: 'requested', items, totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), productTotal, finalAmount: productTotal, requestMemo: request.data.requestMemo ?? '', adminMemo: '', statusHistory: [{ status: 'requested', at: new Date() }], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  return { orderId: orderRef.id, orderNumber }
})

exports.approveMember = onCall({ region: 'asia-northeast3' }, async (request) => {
  await requireAdmin(request)
  const { uid, discountRate = 0, minOrderAmount = 300000 } = request.data
  await db.doc(`users/${uid}`).update({ status: 'approved', discountRate, minOrderAmount, updatedAt: FieldValue.serverTimestamp() })
  await db.doc(`memberApplications/${uid}`).update({ status: 'approved', updatedAt: FieldValue.serverTimestamp() })
  return { ok: true }
})

exports.updateOrderStatus = onCall({ region: 'asia-northeast3' }, async (request) => {
  await requireAdmin(request)
  const allowed = ['requested', 'checking', 'confirmed', 'preparing', 'shipped', 'cancelled']
  if (!allowed.includes(request.data.status)) throw new HttpsError('invalid-argument', '허용되지 않은 주문 상태입니다.')
  await db.doc(`orders/${request.data.orderId}`).update({ status: request.data.status, adminMemo: request.data.adminMemo ?? '', statusHistory: FieldValue.arrayUnion({ status: request.data.status, at: new Date() }), updatedAt: FieldValue.serverTimestamp() })
  return { ok: true }
})
