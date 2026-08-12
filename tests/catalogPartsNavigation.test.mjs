import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('src/pages/ProductsPage.jsx', 'utf8')

test('the main catalog navigation treats archive bundles as parts instead of a duplicate bundle category', () => {
  assert.match(page, /all:\s*\[\s*\{ key: 'all', clear: true \},\s*\{ key: 'parts', param: 'group', value: 'parts' \}/)
  assert.doesNotMatch(page, /\{ key: 'bundleSale', param: 'saleType', value: 'bundle' \}/)
})

test('parts breadcrumb does not describe parts as piercing products', () => {
  assert.match(page, /taxonomyFilters\.productGroup === 'parts'[\s\S]*\? \[\{ label: breadcrumbCopy\.parts, to: '\/products\?group=parts' \}\][\s\S]*: \[/)
})

test('parts navigation hides the piercing stone-count sort', () => {
  assert.match(page, /const isPartsCatalog = taxonomyFilters\.productGroup === 'parts'/)
  assert.match(page, /filter\(\(option\) => !isPartsCatalog \|\| option\.value !== 'stone-count-low'\)/)
})
