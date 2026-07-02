import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getHomeSourceProducts,
  selectNewArrivalProducts,
  selectPiercingCatalogProducts,
  selectSteadySelectionProducts,
  selectWeeklyBestProducts,
} from '../src/services/homePlacement.js'

const firstProduct = {
  productId: 'NB-4WAY-GREEN-CLOVER-BARBELL',
  categoryId: 'barbell',
  collectionIds: [],
  createdAt: '2026-06-30T00:00:00.000Z',
  isBest: false,
  isNew: true,
  isVisible: true,
  material: '',
  sortOrder: 0,
}

test('production home placement uses API products without mock backfill', () => {
  assert.deepEqual(getHomeSourceProducts({ products: [firstProduct], mockProducts: [{ productId: 'MOCK' }], dataMode: 'api' }), [firstProduct])
  assert.deepEqual(getHomeSourceProducts({ products: [], mockProducts: [{ productId: 'MOCK' }], dataMode: 'api' }), [])
  assert.deepEqual(getHomeSourceProducts({ products: [], mockProducts: [{ productId: 'MOCK' }], dataMode: 'mock' }), [{ productId: 'MOCK' }])
})

test('first barbell product appears only in derived catalog sections by default', () => {
  assert.equal(selectNewArrivalProducts([firstProduct])[0].productId, firstProduct.productId)
  assert.equal(selectPiercingCatalogProducts([firstProduct])[0].productId, firstProduct.productId)
  assert.equal(selectWeeklyBestProducts([firstProduct]).length, 0)
  assert.equal(selectSteadySelectionProducts([firstProduct]).length, 0)
})

test('weekly best requires explicit merchandising flag', () => {
  const weeklyProduct = { ...firstProduct, isBest: true, isNew: false }

  assert.equal(selectWeeklyBestProducts([weeklyProduct])[0].productId, firstProduct.productId)
})
