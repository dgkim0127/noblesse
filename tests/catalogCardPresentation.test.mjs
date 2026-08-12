import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const card = readFileSync('src/components/CatalogCard.jsx', 'utf8')
const page = readFileSync('src/pages/ProductsPage.jsx', 'utf8')
const taxonomy = readFileSync('src/data/productTaxonomy.js', 'utf8')

test('catalog cards hide internal product codes', () => {
  assert.doesNotMatch(card, /<small>\{product\.code\}<\/small>/)
})

test('catalog tabs remove duplicate combined decoration shortcuts', () => {
  assert.doesNotMatch(page, /\{ key: 'pearlAcrylic', param: 'decoration'/)
  assert.doesNotMatch(page, /\{ key: 'mirrorStone', param: 'decoration'/)
})

test('the ㄷ-shaped bar keeps the Korean shape symbol in every locale', () => {
  assert.doesNotMatch(page, /dBar: 'D/)
  assert.doesNotMatch(taxonomy, /d_bar: \{[^}]*'D/)
  assert.equal(page.match(/dBar: 'ㄷ'/g)?.length, 4)
  assert.equal(taxonomy.match(/d_bar: \{ kr: 'ㄷ', en: 'ㄷ', jp: 'ㄷ', cn: 'ㄷ' \}/g)?.length, 2)
})
