import assert from 'node:assert/strict'
import test from 'node:test'
import { getViewerStateFromProfile, guestProfile, normalizeBuyerProfile } from '../src/commerce/commerceUtils.js'

test('viewer state is derived from backend buyer/admin profile', () => {
  assert.equal(getViewerStateFromProfile({ role: 'admin', status: 'approved' }), 'admin')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'approved' }), 'approved')
  assert.equal(getViewerStateFromProfile({ role: 'buyer', status: 'pending' }), 'pending')
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
})
