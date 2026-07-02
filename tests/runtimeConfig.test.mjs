import assert from 'node:assert/strict'
import test from 'node:test'
import { getRuntimeConfig } from '../src/config/runtimeConfig.js'
import { adaptApiProduct, adaptApiProducts } from '../src/services/apiProductAdapter.js'

test('production defaults to API mode without mock fallback', () => {
  const config = getRuntimeConfig({ PROD: true, DEV: false })

  assert.equal(config.dataMode, 'api')
  assert.equal(config.apiBaseUrl, '/api')
  assert.equal(config.isConfigured, true)
})

test('production rejects explicit mock mode', () => {
  const config = getRuntimeConfig({
    DEV: false,
    PROD: true,
    VITE_NOBLESSE_DATA_MODE: 'mock',
  })

  assert.equal(config.isConfigured, false)
  assert.match(config.errors.join(' '), /Mock data mode/)
})

test('development can use explicit mock mode', () => {
  const config = getRuntimeConfig({
    DEV: true,
    PROD: false,
    VITE_NOBLESSE_DATA_MODE: 'mock',
  })

  assert.equal(config.dataMode, 'mock')
  assert.equal(config.isConfigured, true)
})

test('api product adapter preserves public catalog fields without protected prices', () => {
  const product = adaptApiProduct({
    id: 'uuid-1',
    code: 'NB-001',
    nameKo: '실버 바벨',
    nameEn: 'Silver Barbell',
    material: 'Surgical Steel',
    colors: ['Silver'],
    sizes: ['6mm'],
    moqDefault: 20,
    imageSet: { card: '/card.webp' },
    taxonomy: {
      productGroup: 'piercing',
      piercingType: 'ball',
      baseMaterial: 'surgical',
      structures: ['barbell'],
      shapes: ['clover'],
    },
    specs: { gauge: '16G', length: '6', unit: 'mm' },
    detailContent: { headline: 'Clover barbell', care: 'Keep dry' },
    homePlacement: { showInWeeklyPick: true, sortPriority: 1 },
    badge: 'NEW',
    isNew: true,
    price: 1000,
    priceSnapshot: 500,
    wholesalePrice: 500,
  })

  assert.equal(product.productId, 'NB-001')
  assert.equal(product.code, 'NB-001')
  assert.equal(product.isVisible, true)
  assert.equal(product.isNew, true)
  assert.equal(product.productGroup, 'piercing')
  assert.equal(product.piercingType, 'ball')
  assert.equal(product.baseMaterial, 'surgical')
  assert.deepEqual(product.structures, ['barbell'])
  assert.deepEqual(product.shapes, ['clover'])
  assert.equal(product.specs.gauge, '16G')
  assert.equal(product.detailContent.care, 'Keep dry')
  assert.equal(product.homePlacement.showInWeeklyPick, true)
  assert.equal(product.badge, 'NEW')
  assert.equal('price' in product, false)
  assert.equal('priceSnapshot' in product, false)
  assert.equal('wholesalePrice' in product, false)
})

test('api products adapter tolerates non-array responses', () => {
  assert.deepEqual(adaptApiProducts(null), [])
})
