import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { cloneHomeLayout, defaultHomeLayout, normalizeHomeLayout, selectConfiguredProducts } from '../src/config/homeLayout.js'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

test('home editor exposes protected draft and publish routes without replacing the showcase manager', () => {
  const app = read('src/App.jsx')
  const adminApi = read('src/api/adminApi.js')
  const catalogApi = read('src/api/catalogApi.js')

  assert.match(app, /path="home-editor"/)
  assert.match(app, /path="home-editor"[^\n]+catalog\.write/)
  assert.match(app, /path="home-showcase"/)
  assert.match(adminApi, /saveHomeLayoutDraft/)
  assert.match(adminApi, /publishHomeLayout/)
  assert.match(adminApi, /resetHomeLayoutDraft/)
  assert.match(catalogApi, /getHomeLayout/)
})

test('home editor uses the real home renderer and explicit save controls', () => {
  const editor = read('src/pages/admin/AdminHomeEditorPage.jsx')
  const home = read('src/pages/HomePage.jsx')
  const css = read('src/styles/admin-console.css')

  assert.match(editor, /<HomePage editorMode layoutOverride=\{draft\}/)
  assert.match(editor, /<AdminSaveBar/)
  assert.match(editor, /draggable=\{section\.id !== 'showcase'\}/)
  assert.match(editor, /고객 홈에 적용/)
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/)
  assert.match(home, /data-home-section-id/)
  assert.match(css, /grid-template-columns: 220px 330px minmax\(620px, 1fr\)/)
  assert.match(css, /\.admin-home-editor-inspector/)
})

test('home layout normalization keeps showcase first and locale values explicit', () => {
  const draft = cloneHomeLayout(defaultHomeLayout)
  draft.sections.reverse()
  draft.sections.find((section) => section.id === 'new-arrival').title['zh-TW'] = '台灣新品'
  const normalized = normalizeHomeLayout(draft)

  assert.equal(normalized.sections[0].id, 'showcase')
  assert.equal(normalized.sections.find((section) => section.id === 'new-arrival').title['zh-TW'], '台灣新品')
})

test('manual home product pins lead rule products without unrelated backfill', () => {
  const all = [
    { productId: 'A' },
    { productId: 'B' },
    { productId: 'C' },
  ]
  const selected = selectConfiguredProducts(all, [all[0]], {
    limit: 2,
    pinnedProductIds: ['C'],
    excludedProductIds: [],
  })

  assert.deepEqual(selected.map((product) => product.productId), ['C', 'A'])
})

test('home product candidates can defer their limit until section filters are applied', () => {
  const all = [
    { productId: 'A' },
    { productId: 'B' },
    { productId: 'C' },
  ]
  const selected = selectConfiguredProducts(all, all, {
    limit: 1,
    pinnedProductIds: [],
    excludedProductIds: [],
  }, { applyLimit: false })

  assert.deepEqual(selected.map((product) => product.productId), ['A', 'B', 'C'])
})
