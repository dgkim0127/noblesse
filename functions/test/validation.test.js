import assert from 'node:assert/strict'
import test from 'node:test'
import { amountFromMinor, assertImagePaths, assertWebpBuffer, parseMinorAmount } from '../lib/validation.js'

test('amounts are persisted as integer minor units', () => {
  assert.equal(parseMinorAmount('12500', 'KRW', 'price'), 12500)
  assert.equal(parseMinorAmount('12.50', 'USD', 'price'), 1250)
  assert.equal(amountFromMinor(1250, 'USD'), 12.5)
  assert.throws(() => parseMinorAmount('12.555', 'USD', 'price'))
})

test('publication rejects incomplete or unsafe WebP paths', () => {
  const productId = 'NB-001'
  const imagePaths = Object.fromEntries(['thumb', 'card', 'detail', 'zoom'].map((variant) => [
    variant,
    `noblesse/products/${productId}/${variant}/${variant}.webp`,
  ]))
  assert.doesNotThrow(() => assertImagePaths(productId, imagePaths))
  assert.throws(() => assertImagePaths(productId, { ...imagePaths, zoom: 'noblesse/other.webp' }))
})

test('image upload rejects non-WebP payloads', () => {
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(4)])
  assert.doesNotThrow(() => assertWebpBuffer(webp))
  assert.throws(() => assertWebpBuffer(Buffer.from('not-a-webp')))
})
