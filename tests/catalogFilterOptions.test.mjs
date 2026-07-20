import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  normalizeCatalogFilterOption,
  sanitizeCatalogFilterOptions,
} from '../src/services/catalogFilterOptions.js'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('catalog filter options normalize admin-created category and collection labels', () => {
  assert.deepEqual(normalizeCatalogFilterOption({
    id: 'Minimal Line',
    labelKo: '미니멀 라인',
    labelEn: 'Minimal Line',
    sortOrder: '10',
  }), {
    id: 'minimal-line',
    labelKo: '미니멀 라인',
    labelEn: 'Minimal Line',
    labelJa: 'Minimal Line',
    labelCn: 'Minimal Line',
    isVisible: true,
    sortOrder: 10,
  })
})

test('catalog filter options remove duplicate keys per option group', () => {
  const options = sanitizeCatalogFilterOptions({
    categories: [
      { id: 'barbell', labelKo: '바벨' },
      { id: 'barbell', labelKo: '중복 바벨' },
    ],
    collections: [
      { id: 'new-line', labelKo: '신규 라인', sortOrder: 20 },
      { id: 'best-line', labelKo: '베스트 라인', sortOrder: 10 },
    ],
  })

  assert.equal(options.categories.length, 1)
  assert.deepEqual(options.collections.map((item) => item.id), ['best-line', 'new-line'])
})

test('admin category page exposes category and collection filter option controls', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCategoriesPage.jsx')

  assert.match(page, /addCatalogFilterOption/)
  assert.match(page, /filterForm\.type/)
  assert.match(page, /value="collections"/)
  assert.match(page, /value="categories"/)
  assert.match(page, /쇼핑몰 필터 옵션/)
})

test('products page merges admin-managed filter options into visible filters', () => {
  const page = readWorkspaceFile('src/pages/ProductsPage.jsx')

  assert.match(page, /loadCatalogFilterOptions/)
  assert.match(page, /subscribeCatalogFilterOptions/)
  assert.match(page, /managedCategories/)
  assert.match(page, /managedCollections/)
  assert.match(page, /managedCategoryLabels\.get/)
  assert.match(page, /managedCollectionLabels\.get/)
})
