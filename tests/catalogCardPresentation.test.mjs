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
  for (const label of ["dBar: 'ㄷ 바'", "dBar: 'ㄷ Bar'", "dBar: 'ㄷバー'", "dBar: 'ㄷ形桿'"]) {
    assert.match(page, new RegExp(label))
  }
  assert.equal(taxonomy.match(/d_bar: \{ kr: 'ㄷ 바', en: 'ㄷ Bar', jp: 'ㄷバー', cn: 'ㄷ形桿' \}/g)?.length, 2)
})
