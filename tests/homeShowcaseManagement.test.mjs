import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync('src/App.jsx', 'utf8')
const adminApi = readFileSync('src/api/adminApi.js', 'utf8')
const catalogApi = readFileSync('src/api/catalogApi.js', 'utf8')
const commerce = readFileSync('src/commerce/CommerceContext.jsx', 'utf8')
const editor = readFileSync('src/pages/admin/AdminHomeShowcasePage.jsx', 'utf8')
const operations = readFileSync('src/pages/admin/AdminOperationsPage.jsx', 'utf8')

test('home showcase management has protected admin routes and public catalog loading', () => {
  assert.match(app, /AdminHomeShowcasePage/)
  assert.equal((app.match(/path="home-showcase"/g) || []).length, 2)
  assert.match(operations, /\/admin\/home-showcase/)
  assert.match(catalogApi, /\/catalog\/home-showcase/)
  assert.match(commerce, /catalogApi\.getHomeShowcase\(\)\.catch\(\(\) => \[\]\)/)
})

test('home showcase admin API supports create edit image ordering visibility and deletion', () => {
  for (const method of [
    'getHomeShowcase',
    'createHomeShowcaseSlide',
    'updateHomeShowcaseSlide',
    'uploadHomeShowcaseImage',
    'reorderHomeShowcase',
    'deleteHomeShowcaseSlide',
  ]) {
    assert.match(adminApi, new RegExp(`async ${method}\\(`))
  }
  assert.match(editor, /image\/jpeg,image\/png,image\/webp/)
  assert.match(editor, /api\.reorderHomeShowcase/)
  assert.match(editor, /api\.updateHomeShowcaseSlide\(slide\.id, \{ isActive:/)
  assert.match(editor, /languages = \[/)
  assert.match(editor, /'zh-TW'/)
})

test('home showcase editor previews localized content and publication readiness', () => {
  assert.match(editor, /previewMode/)
  assert.match(editor, /admin-showcase-live-preview/)
  assert.match(editor, /데스크톱 미리보기/)
  assert.match(editor, /모바일 미리보기/)
  assert.match(editor, /form\.title\[activeLanguage\]/)
  assert.match(editor, /completedTitleCount/)
  assert.match(editor, /공개 준비 상태/)
})
