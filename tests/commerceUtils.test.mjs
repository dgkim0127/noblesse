import assert from 'node:assert/strict'
import test from 'node:test'
import { getAdminPriceBooksForProduct, getViewerStateFromProfile, guestProfile, normalizeBuyerProfile, selectProductPrice } from '../src/commerce/commerceUtils.js'

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

test('admin price books expose one row for KRW JPY USD and CNY', () => {
  const prices = [
    { productId: 'NB-001', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 10000 },
    { productId: 'NB-001', market: 'JP', currency: 'JPY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1200 },
    { productId: 'NB-001', market: 'GLOBAL', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 9 },
    { productId: 'NB-001', market: 'US', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 8 },
    { productId: 'NB-001', market: 'CN', currency: 'CNY', visibleTo: 'approved_only', isActive: true, wholesalePrice: 58 },
    { productId: 'NB-001', market: 'KR', currency: 'USD', visibleTo: 'approved_only', isActive: true, wholesalePrice: 1 },
    { productId: 'NB-002', market: 'KR', currency: 'KRW', visibleTo: 'approved_only', isActive: true, wholesalePrice: 20000 },
  ]

  const books = getAdminPriceBooksForProduct(prices, 'NB-001')

  assert.deepEqual(books.map((price) => price.currency), ['KRW', 'JPY', 'USD', 'CNY'])
  assert.deepEqual(books.map((price) => price.market), ['KR', 'JP', 'US', 'CN'])
})
