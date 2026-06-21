import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { adminCopy, adminLocales } from '../src/pages/admin/adminCopy.js'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('unified catalog entry route is exposed in locale and default admin trees', () => {
  const routes = readWorkspaceFile('src/App.jsx')
  const routeMatches = routes.match(/<Route path="catalog\/new" element=\{withAdminSuspense\(<AdminCatalogEntryPage \/>\)\} \/>/g) || []

  assert.equal(routeMatches.length, 2)
})

test('unified catalog entry form reuses existing admin API calls without upload guesses', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /api\.getCategories\(\{ limit: 200 \}, token\)/)
  assert.match(page, /api\.createCategory\(/)
  assert.match(page, /api\.getProducts\(\{ q: productCode, limit: 10 \}, token\)/)
  assert.match(page, /api\.createProduct\(/)
  assert.match(page, /api\.createPrice\(/)
  assert.match(page, /descriptionEn: productForm\.description\.trim\(\) \|\| undefined/)
  assert.match(page, /isExportAvailable: productForm\.isExportAvailable/)
  assert.doesNotMatch(page, /FormData|type="file"|upload/i)
})

test('unified catalog entry form is not a step switching wizard', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /catalog-entry-layout/)
  assert.match(page, /catalog-entry-summary-panel/)
  assert.doesNotMatch(page, /stepIndex|goNext|goPrevious|currentStep|admin-workflow/)
})

test('unified catalog entry handles validation, conflicts, and protected errors', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /if \(error\?\.status === 401 \|\| error\?\.code === 'UNAUTHORIZED'\) return 'unauthorized'/)
  assert.match(page, /if \(error\?\.status === 403 \|\| error\?\.code === 'FORBIDDEN'\) return 'forbidden'/)
  assert.match(page, /if \(error\?\.status === 409 \|\| error\?\.code === 'CONFLICT'\) return 'conflict'/)
  assert.match(page, /if \(error\?\.status >= 500 \|\| error\?\.code === 'INTERNAL_ERROR'\) return 'server'/)
  assert.match(page, /setFieldErrors\(\(current\) => \(\{ \.\.\.current, code: t\.validation\.productConflict \}\)\)/)
  assert.match(page, /productCodeInvalid/)
  assert.match(page, /parsePositiveMoney/)
  assert.match(page, /disabled=\{isSaving\}/)
  assert.match(page, /market: 'KR'/)
  assert.match(page, /currency: 'KRW'/)
})

test('unified catalog entry tracks partial saves and retry state', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /initialSaveStatus/)
  assert.match(page, /updateSaveStatus\('category', 'success'\)/)
  assert.match(page, /updateSaveStatus\('product', 'success'\)/)
  assert.match(page, /updateSaveStatus\('price', 'success'\)/)
  assert.match(page, /retryFailed/)
  assert.match(page, /beforeunload/)
})

test('products page exposes the unified catalog entry action', () => {
  const productsPage = readWorkspaceFile('src/pages/admin/AdminProductsPage.jsx')

  assert.match(productsPage, /to="\/admin\/catalog\/new"/)
  assert.match(productsPage, /t\.dashboard\.addProduct/)
})

test('unified catalog entry copy exists for every admin locale', () => {
  for (const locale of adminLocales) {
    const copy = adminCopy[locale].catalogEntry

    assert.ok(copy.title)
    assert.ok(copy.category.title)
    assert.ok(copy.product.title)
    assert.ok(copy.price.title)
    assert.ok(copy.confirm.title)
    assert.ok(copy.success.title)
    assert.ok(copy.errors.unauthorized)
    assert.ok(copy.errors.forbidden)
    assert.ok(copy.errors.server)
    assert.ok(copy.sections.categoryEyebrow)
    assert.ok(copy.saveStatus.error)
    assert.ok(copy.validation.productCodeInvalid)
    assert.ok(copy.validation.categoryNameConflict)
  }
})
