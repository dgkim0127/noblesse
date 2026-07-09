import assert from 'node:assert/strict'
import test from 'node:test'
import { productMatchesTaxonomy } from '../src/data/productTaxonomy.js'
import { adaptApiProduct } from '../src/services/apiProductAdapter.js'
import {
  selectNewArrivalProducts,
  selectPiercingCatalogProducts,
  selectSteadySelectionProducts,
  selectWeeklyBestProducts,
} from '../src/services/homePlacement.js'
import { productMatchesCatalogSearch } from '../src/services/productSearch.js'

const seedApiProduct = {
  code: 'NB-4WAY-GREEN-CLOVER-BARBELL',
  nameKo: '4방 초록클로버 바벨',
  nameEn: '4-Way Green Clover Barbell',
  nameJa: '4方向グリーンクローバーバーベル',
  categoryId: 'barbell',
  categoryNameKo: '바벨',
  categoryNameEn: 'Barbell',
  material: null,
  colors: ['오알', '핑크', '골드'],
  taxonomy: {},
  homePlacement: {},
  isNew: true,
  isBest: false,
}

test('real seed product connects to public search and barbell taxonomy without false material matches', () => {
  const product = adaptApiProduct(seedApiProduct)

  for (const query of ['4방', '초록클로버', '클로버', '바벨', 'clover', 'barbell', '오알']) {
    assert.equal(productMatchesCatalogSearch(product, query), true, query)
  }

  assert.equal(productMatchesTaxonomy(product, { structures: ['barbell'] }), true)
  assert.equal(productMatchesTaxonomy(product, { baseMaterial: 'silver925' }), false)
  assert.equal(productMatchesTaxonomy(product, { baseMaterial: 'surgical' }), false)
  assert.equal(productMatchesCatalogSearch(product, 'surgical'), false)
})

test('real seed product appears only in derived home sections unless merchandising flags opt in', () => {
  const product = adaptApiProduct(seedApiProduct)

  assert.deepEqual(selectNewArrivalProducts([product]).map((item) => item.productId), [product.productId])
  assert.deepEqual(selectPiercingCatalogProducts([product]).map((item) => item.productId), [product.productId])
  assert.deepEqual(selectWeeklyBestProducts([product]), [])
  assert.deepEqual(selectSteadySelectionProducts([product]), [])
})
