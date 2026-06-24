import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInquiryRows,
  buildInquirySnapshot,
  getAdminMarketPriceBooksForProduct,
  getAdminPriceBooksForProduct,
  getDiscountedPrice,
  getViewerStateFromProfile,
  guestProfile,
  normalizeBuyerProfile,
  selectProductPrice,
} from '../src/commerce/commerceUtils.js'

test('viewer state is derived from backend buyer/admin profile', () => {
  assert.equal(getViewerStateFromProfile({ role: 'admin', status: 'approved' }), 'admin')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'approved' }), 'approved')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'pending' }), 'pending')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'approved', accountStatus: 'blocked', verificationStatus: 'approved' }), 'blocked')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'pending', accountStatus: 'active', verificationStatus: 'rejected' }), 'rejected')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'blocked', accountStatus: 'active', verificationStatus: 'suspended' }), 'suspended')
  assert.equal(getViewerStateFromProfile(null), 'guest')
})

test('buyer profile normalization keeps guest defaults and maps userId', () => {
  const profile = normalizeBuyerProfile({
    userId: 'user-1',
    companyName: 'Noblesse Partner',
    role: 'buyer',
    status: 'approved',
  })

  assert.equal(profile.uid, 'user-1')
  assert.equal(profile.companyName, 'Noblesse Partner')
  assert.equal(profile.currency, guestProfile.currency)
  assert.equal(profile.role, 'buyer')
  assert.equal(profile.status, 'approved')
  assert.equal(profile.accountStatus, 'active')
  assert.equal(profile.verificationStatus, 'approved')
})

test('approved buyer requires exact assigned market and currency price', () => {
  const prices = [
    { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
    { productId: 'NB-001', market: 'CN', currency: 'CNY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58.2 },
  ]
  const selected = selectProductPrice({
    prices,
    productId: 'NB-001',
    locale: 'kr',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'approved', assignedMarket: 'JP', currency: 'CNY' },
  })

  assert.equal(selected.isAvailable, false)
  assert.equal(selected.price, null)
  assert.equal(selected.displayCurrency, 'CNY')
})

test('approved buyer exact market and currency price is available', () => {
  const selected = selectProductPrice({
    prices: [
      { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
      { productId: 'NB-001', market: 'CN', currency: 'CNY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58.2 },
    ],
    productId: 'NB-001',
    locale: 'kr',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'approved', assignedMarket: 'JP', currency: 'JPY' },
  })

  assert.equal(selected.isAvailable, true)
  assert.equal(selected.price.market, 'JP')
  assert.equal(selected.price.currency, 'JPY')
  assert.equal(selected.reason, 'exact')
})

test('missing exact price is unavailable instead of using another market amount', () => {
  const selected = selectProductPrice({
    prices: [{ productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 10 }],
    productId: 'NB-001',
    locale: 'cn',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'approved', assignedMarket: 'CN', currency: 'CNY' },
  })

  assert.equal(selected.isAvailable, false)
  assert.equal(selected.price, null)
  assert.equal(selected.displayCurrency, 'CNY')
})

test('frontend discount calculation preserves currency minor units', () => {
  assert.equal(getDiscountedPrice({ wholesalePrice: 9.99, currency: 'USD' }, 10), 8.99)
  assert.equal(getDiscountedPrice({ wholesalePrice: 58.2, currency: 'CNY' }, 12), 51.22)
  assert.equal(getDiscountedPrice({ wholesalePrice: 12000, currency: 'KRW' }, 12), 10560)
  assert.equal(getDiscountedPrice({ wholesalePrice: 1200, currency: 'JPY' }, 12), 1056)
})

test('buildInquiryRows preserves subtotal cents', () => {
  const rows = buildInquiryRows(
    [{ productId: 'NB-001', quantity: 3 }],
    [{ productId: 'NB-001', code: 'NB-001', nameEn: 'Product', material: 'Surgical Steel', imageSet: {}, tone: 'pink' }],
    { assignedMarket: 'US', currency: 'USD', discountRate: 10, role: 'buyer', accountStatus: 'active', verificationStatus: 'approved' },
    true,
    [{ productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 9.99, moq: 1 }]
  )

  assert.equal(rows[0].priceSnapshot, 8.99)
  assert.equal(rows[0].subtotal, 26.97)
})

test('buildInquirySnapshot rejects mixed currency rows', () => {
  const snapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'KR', preferredLanguage: 'kr', currency: 'KRW' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 },
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 1, currency: 'CNY', priceSnapshot: 51.22, subtotal: 51.22 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot, null)
})

test('buildInquirySnapshot sums same-currency cents without drift', () => {
  const snapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 3, currency: 'USD', priceSnapshot: 8.99, subtotal: 26.97 },
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 5, currency: 'USD', priceSnapshot: 1.81, subtotal: 9.05 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot.estimatedTotal, 36.02)
  assert.equal(snapshot.currency, 'USD')
})

test('admin price books preserve US and GLOBAL USD as separate market rows', () => {
  const prices = [
    { productId: 'NB-001', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 10000 },
    { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
    { productId: 'NB-001', market: 'GLOBAL', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 9 },
    { productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 8 },
    { productId: 'NB-001', market: 'CN', currency: 'CNY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58 },
    { productId: 'NB-001', market: 'KR', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1 },
    { productId: 'NB-002', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 20000 },
  ]

  const books = getAdminMarketPriceBooksForProduct(prices, 'NB-001')

  assert.deepEqual(books.map((price) => price.currency), ['KRW', 'JPY', 'USD', 'CNY', 'USD'])
  assert.deepEqual(books.map((price) => price.market), ['KR', 'JP', 'US', 'CN', 'GLOBAL'])
  assert.deepEqual(getAdminPriceBooksForProduct(prices, 'NB-001').map((price) => price.market), ['KR', 'JP', 'US', 'CN', 'GLOBAL'])
})
