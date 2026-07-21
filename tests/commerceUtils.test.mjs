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
  isApprovedBuyer,
  isQuoteEnabledBuyer,
  normalizeBuyerProfile,
  selectProductPrice,
} from '../src/commerce/commerceUtils.js'

test('viewer state is derived from backend buyer/admin profile', () => {
  assert.equal(getViewerStateFromProfile({ role: 'admin', status: 'approved' }), 'admin')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'approved' }), 'approved')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'pending' }), 'approved')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'approved', accountStatus: 'blocked', verificationStatus: 'approved' }), 'blocked')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'pending', accountStatus: 'active', verificationStatus: 'rejected' }), 'rejected')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'blocked', accountStatus: 'active', verificationStatus: 'suspended' }), 'suspended')
  assert.equal(getViewerStateFromProfile(null), 'guest')
})

test('active registered buyers can use quote features without manual approval', () => {
  for (const verificationStatus of ['draft', 'pending', 'approved']) {
    const profile = { role: 'buyer', accountStatus: 'active', verificationStatus }
    assert.equal(isQuoteEnabledBuyer(profile), true)
    assert.equal(isApprovedBuyer(profile), true)
  }
  for (const profile of [
    { role: 'buyer', accountStatus: 'active', verificationStatus: 'rejected' },
    { role: 'buyer', accountStatus: 'active', verificationStatus: 'suspended' },
    { role: 'buyer', accountStatus: 'blocked', verificationStatus: 'approved' },
    { role: null, accountStatus: 'active', verificationStatus: 'pending' },
  ]) {
    assert.equal(isQuoteEnabledBuyer(profile), false)
  }
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
    { productId: 'NB-001', market: 'TW', currency: 'TWD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58.2 },
  ]
  const selected = selectProductPrice({
    prices,
    productId: 'NB-001',
    locale: 'kr',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'approved', assignedMarket: 'JP', currency: 'TWD' },
  })

  assert.equal(selected.isAvailable, false)
  assert.equal(selected.price, null)
  assert.equal(selected.displayCurrency, 'TWD')
})

test('approved buyer exact market and currency price is available', () => {
  const selected = selectProductPrice({
    prices: [
      { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
      { productId: 'NB-001', market: 'TW', currency: 'TWD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58.2 },
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

test('active pending buyer exact market and currency price is available', () => {
  const selected = selectProductPrice({
    prices: [
      { productId: 'NB-001', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 12000 },
    ],
    productId: 'NB-001',
    locale: 'kr',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'pending', assignedMarket: 'KR', currency: 'KRW' },
  })

  assert.equal(selected.isAvailable, true)
  assert.equal(selected.price.wholesalePrice, 12000)
})

test('missing exact price is unavailable instead of using another market amount', () => {
  const selected = selectProductPrice({
    prices: [{ productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 10 }],
    productId: 'NB-001',
    locale: 'cn',
    viewer: { role: 'buyer', accountStatus: 'active', verificationStatus: 'approved', assignedMarket: 'TW', currency: 'TWD' },
  })

  assert.equal(selected.isAvailable, false)
  assert.equal(selected.price, null)
  assert.equal(selected.displayCurrency, 'TWD')
})

test('frontend discount calculation preserves currency minor units', () => {
  assert.equal(getDiscountedPrice({ wholesalePrice: 9.99, currency: 'USD' }, 10), 8.99)
  assert.equal(getDiscountedPrice({ wholesalePrice: 58.2, currency: 'TWD' }, 12), 51.22)
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
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'KR', preferredLanguage: 'kr', assignedMarket: 'US', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 },
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 1, market: 'TW', currency: 'TWD', priceSnapshot: 51.22, subtotal: 51.22 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot, null)
})

test('buildInquirySnapshot rejects mixed market rows', () => {
  const snapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 },
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 1, market: 'GLOBAL', currency: 'USD', priceSnapshot: 9.05, subtotal: 9.05 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot, null)
})

test('buildInquirySnapshot rejects empty rows or missing buyer market currency', () => {
  assert.equal(buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [],
    requestMemo: '',
  }), null)

  assert.equal(buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [{ productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 }],
    requestMemo: '',
  }), null)

  assert.equal(buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US' },
    inquiryId: 'INQ-001',
    inquiryRows: [{ productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 }],
    requestMemo: '',
  }), null)

  assert.equal(buildInquirySnapshot({
    buyer: null,
    inquiryId: 'INQ-001',
    inquiryRows: [{ productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 }],
    requestMemo: '',
  }), null)

  assert.equal(buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US', currency: 'TWD' },
    inquiryId: 'INQ-001',
    inquiryRows: [{ productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 8.99 }],
    requestMemo: '',
  }), null)
})

test('buildInquirySnapshot sums same-currency cents without drift', () => {
  const snapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 3, market: 'US', currency: 'USD', priceSnapshot: 8.99, subtotal: 26.97 },
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 5, market: 'US', currency: 'USD', priceSnapshot: 1.81, subtotal: 9.05 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot.estimatedTotal, 36.02)
  assert.equal(snapshot.market, 'US')
  assert.equal(snapshot.currency, 'USD')
  assert.deepEqual(snapshot.items.map((item) => [item.market, item.currency]), [['US', 'USD'], ['US', 'USD']])
})

test('buildInquirySnapshot accepts GLOBAL USD and TW TWD rows for matching buyers', () => {
  const globalSnapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'GLOBAL', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'GLOBAL', currency: 'USD', priceSnapshot: 9.05, subtotal: 9.05 },
    ],
    requestMemo: '',
  })
  const cnSnapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-2', companyName: 'Buyer', country: 'TW', preferredLanguage: 'TW', assignedMarket: 'TW', currency: 'TWD' },
    inquiryId: 'INQ-002',
    inquiryRows: [
      { productId: 'NB-002', productCode: 'NB-002', productName: 'Two', material: 'Cubic', color: '', size: '', moq: 1, quantity: 1, market: 'TW', currency: 'TWD', priceSnapshot: 51.22, subtotal: 51.22 },
      { productId: 'NB-003', productCode: 'NB-003', productName: 'Three', material: 'Pearl', color: '', size: '', moq: 1, quantity: 1, market: 'TW', currency: 'TWD', priceSnapshot: 102.44, subtotal: 102.44 },
    ],
    requestMemo: '',
  })

  assert.equal(globalSnapshot.market, 'GLOBAL')
  assert.equal(globalSnapshot.currency, 'USD')
  assert.equal(cnSnapshot.market, 'TW')
  assert.equal(cnSnapshot.currency, 'TWD')
  assert.equal(cnSnapshot.estimatedTotal, 153.66)
})

test('buildInquirySnapshot rejects GLOBAL USD row for US buyer', () => {
  const snapshot = buildInquirySnapshot({
    buyer: { uid: 'buyer-1', companyName: 'Buyer', country: 'US', preferredLanguage: 'en', assignedMarket: 'US', currency: 'USD' },
    inquiryId: 'INQ-001',
    inquiryRows: [
      { productId: 'NB-001', productCode: 'NB-001', productName: 'One', material: 'Steel', color: '', size: '', moq: 1, quantity: 1, market: 'GLOBAL', currency: 'USD', priceSnapshot: 9.05, subtotal: 9.05 },
    ],
    requestMemo: '',
  })

  assert.equal(snapshot, null)
})

test('admin price books preserve US and GLOBAL USD as separate market rows', () => {
  const prices = [
    { productId: 'NB-001', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 10000 },
    { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
    { productId: 'NB-001', market: 'GLOBAL', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 9 },
    { productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 8 },
    { productId: 'NB-001', market: 'TW', currency: 'TWD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58 },
    { productId: 'NB-001', market: 'KR', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1 },
    { productId: 'NB-002', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 20000 },
  ]

  const books = getAdminMarketPriceBooksForProduct(prices, 'NB-001')

  assert.deepEqual(books.map((price) => price.currency), ['KRW', 'JPY', 'USD', 'TWD', 'USD'])
  assert.deepEqual(books.map((price) => price.market), ['KR', 'JP', 'US', 'TW', 'GLOBAL'])
  assert.deepEqual(getAdminPriceBooksForProduct(prices, 'NB-001').map((price) => price.market), ['KR', 'JP', 'US', 'TW', 'GLOBAL'])
})
