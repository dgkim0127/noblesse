import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateDiscountedLineMinor,
  canReadBuyerProjection,
  hasApprovedBuyerAccess,
  hasNoblesseAdminClaim,
} from '../lib/policy.js'

test('unverified or unapproved buyers cannot access approved buyer pricing', () => {
  const approvedBuyer = { status: 'approved', assigned_market: 'JP', currency: 'JPY' }
  assert.equal(hasApprovedBuyerAccess({ email_verified: false }, approvedBuyer), false)
  assert.equal(hasApprovedBuyerAccess({ email_verified: true }, { ...approvedBuyer, status: 'pending' }), false)
  assert.equal(hasApprovedBuyerAccess({ email_verified: true }, approvedBuyer), true)
})

test('buyers cannot read another buyer projection and users cannot self-assign admin access', () => {
  assert.equal(canReadBuyerProjection('buyer-a', 'buyer-b'), false)
  assert.equal(canReadBuyerProjection('buyer-a', 'buyer-a'), true)
  assert.equal(hasNoblesseAdminClaim({ noblesseAdmin: false }), false)
  assert.equal(hasNoblesseAdminClaim({ noblesseAdmin: true }), true)
})

test('client supplied quote totals are ignored in favor of the server calculation', () => {
  const line = calculateDiscountedLineMinor({ wholesalePriceMinor: 1000, discountRate: 12.5, quantity: 24, clientTotal: 1 })
  assert.deepEqual(line, { unitPriceMinor: 875, subtotalMinor: 21000 })
})
