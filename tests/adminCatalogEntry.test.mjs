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
  const routeMatches = routes.match(/<Route path="catalog\/new" element=\{withAdminSuspense\(<AdminCatalogEntryPage \/>, 'catalog\.write'\)\} \/>/g) || []

  assert.equal(routeMatches.length, 2)
})

test('unified catalog entry form reuses existing admin API calls and backend image upload', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')
  const api = readWorkspaceFile('src/api/adminApi.js')

  assert.match(page, /api\.getCategories\(\{ limit: 200 \}, token\)/)
  assert.match(page, /api\.createCategory\(/)
  assert.match(page, /api\.getProducts\(\{ q: productCode, limit: 10 \}, token\)/)
  assert.match(page, /api\.createProduct\(/)
  assert.match(page, /api\.uploadProductImages\(productId, formData, token\)/)
  assert.match(page, /api\.createPrice\(/)
  assert.match(page, /descriptionEn: productForm\.description\.trim\(\) \|\| undefined/)
  assert.match(page, /isExportAvailable: productForm\.isExportAvailable/)
  assert.match(api, /async uploadProductImages\(productId, formData, token\)/)
  assert.match(api, /\/admin\/products\/\$\{encodeURIComponent\(productId\)\}\/images/)
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
  assert.match(page, /disabled=\{saveDisabled\}/)
  assert.match(page, /imageRequired/)
  assert.match(page, /allowedImageTypes/)
  assert.match(page, /detectImageMime/)
  assert.match(page, /market: 'KR'/)
  assert.match(page, /currency: 'KRW'/)
})

test('unified catalog entry tracks partial saves and retry state', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /initialSaveStatus/)
  assert.match(page, /updateSaveStatus\('category', 'success'\)/)
  assert.match(page, /updateSaveStatus\('product', 'success'\)/)
  assert.match(page, /updateSaveStatus\('images', 'success'\)/)
  assert.match(page, /updateSaveStatus\('price', 'success'\)/)
  assert.match(page, /retryFailed/)
  assert.match(page, /beforeunload/)
})

test('unified catalog entry image UI supports preview, primary, ordering, and cleanup', () => {
  const page = readWorkspaceFile('src/pages/admin/AdminCatalogEntryPage.jsx')

  assert.match(page, /type="file"/)
  assert.match(page, /onDrop=\{\(event\) =>/)
  assert.match(page, /URL\.createObjectURL\(file\)/)
  assert.match(page, /URL\.revokeObjectURL/)
  assert.match(page, /setPrimaryImage/)
  assert.match(page, /moveImage/)
  assert.match(page, /removeImage/)
  assert.match(page, /maxImageCount = 8/)
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
    assert.ok(copy.images.title)
    assert.ok(copy.images.setPrimary)
    assert.ok(copy.confirm.title)
    assert.ok(copy.confirm.images)
    assert.ok(copy.success.title)
    assert.ok(copy.errors.unauthorized)
    assert.ok(copy.errors.forbidden)
    assert.ok(copy.errors.tooLarge)
    assert.ok(copy.errors.unsupportedImage)
    assert.ok(copy.errors.server)
    assert.ok(copy.sections.categoryEyebrow)
    assert.ok(copy.sections.imageEyebrow)
    assert.ok(copy.saveStatus.error)
    assert.ok(copy.saveStatus.images)
    assert.ok(copy.validation.productCodeInvalid)
    assert.ok(copy.validation.categoryNameConflict)
    assert.ok(copy.validation.imageRequired)
  }
})
