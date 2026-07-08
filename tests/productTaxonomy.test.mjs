import assert from 'node:assert/strict'
import test from 'node:test'
import { mockProducts } from '../src/data/catalog.js'
import {
  countTaxonomyValue,
  dedupeProducts,
  getAppliedTaxonomyChips,
  getFiltersFromSearchParams,
  getTaxonomyBreadcrumb,
  getTaxonomyTitle,
  productMatchesTaxonomy,
} from '../src/data/productTaxonomy.js'

test('mock products keep a single product identity with additive taxonomy fields', () => {
  const product = mockProducts[0]

  assert.equal(product.productId, 'NB-001')
  assert.equal(product.taxonomy.productGroup, 'piercing')
  assert.equal(product.productGroup, product.taxonomy.productGroup)
  assert.ok(product.taxonomy.structures.includes('barbell'))
})

test('taxonomy filters apply AND across dimensions', () => {
  const matches = mockProducts.filter((product) => productMatchesTaxonomy(product, {
    baseMaterial: 'surgical',
    piercingType: 'ball',
    structures: ['barbell'],
  }))

  assert.ok(matches.length > 0)
  assert.ok(matches.every((product) => product.taxonomy.baseMaterial === 'surgical'))
  assert.ok(matches.every((product) => product.taxonomy.piercingType === 'ball'))
  assert.ok(matches.every((product) => product.taxonomy.structures.includes('barbell')))
})

test('taxonomy filters apply OR within the same dimension', () => {
  const matches = mockProducts.filter((product) => productMatchesTaxonomy(product, {
    shapes: ['butterfly', 'heart'],
  }))

  assert.ok(matches.length > 0)
  assert.ok(matches.every((product) => product.taxonomy.shapes.includes('butterfly') || product.taxonomy.shapes.includes('heart')))
})

test('taxonomy result dedupes by product id', () => {
  const duplicateRows = [mockProducts[0], mockProducts[0], mockProducts[1]]
  const deduped = dedupeProducts(duplicateRows)

  assert.equal(deduped.length, 2)
  assert.deepEqual(deduped.map((product) => product.productId), ['NB-001', 'NB-002'])
})

test('taxonomy URL state restores repeated query values and route basis', () => {
  const params = new URLSearchParams('shape=heart&shape=star&baseMaterial=surgical')
  const filters = getFiltersFromSearchParams(params, { piercingType: 'ball' })

  assert.deepEqual(filters.shapes, ['heart', 'star'])
  assert.equal(filters.baseMaterial, 'surgical')
  assert.equal(filters.piercingType, 'ball')
})

test('taxonomy breadcrumbs preserve entry basis while extra filters become chips', () => {
  const filters = getFiltersFromSearchParams(new URLSearchParams('baseMaterial=surgical'), { shape: 'butterfly', piercingType: 'ball' })
  const breadcrumbs = getTaxonomyBreadcrumb(filters, 'kr')
  const title = getTaxonomyTitle(filters, 'kr')
  const chips = getAppliedTaxonomyChips(filters, 'kr')

  assert.equal(breadcrumbs[1].label, '나비 아이템')
  assert.match(title, /볼 피어싱/)
  assert.ok(chips.some((chip) => chip.key === 'baseMaterial' && chip.value === 'surgical'))
})

test('taxonomy value counts are based on unique visible product results', () => {
  const count = countTaxonomyValue(mockProducts, { piercingType: 'ball' }, 'baseMaterial', 'surgical')

  assert.ok(count > 0)
})
