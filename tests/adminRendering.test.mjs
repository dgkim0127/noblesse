import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

const adminRoutePages = [
  'src/pages/admin/AdminAnalyticsPage.jsx',
  'src/pages/admin/AdminBuyerDetailPage.jsx',
  'src/pages/admin/AdminBuyersPage.jsx',
  'src/pages/admin/AdminCatalogEntryPage.jsx',
  'src/pages/admin/AdminCategoriesPage.jsx',
  'src/pages/admin/AdminDashboardPage.jsx',
  'src/pages/admin/AdminInquiriesPage.jsx',
  'src/pages/admin/AdminInquiryDetailPage.jsx',
  'src/pages/admin/AdminPricesPage.jsx',
  'src/pages/admin/AdminProductsPage.jsx',
  'src/pages/admin/AdminQuotePage.jsx',
  'src/pages/admin/AdminQuotesPage.jsx',
]

test('admin shell keeps child routes mounted through the outlet', () => {
  const shell = readWorkspaceFile('src/components/AdminShell.jsx')
  const routes = readWorkspaceFile('src/App.jsx')

  assert.match(shell, /<section className="admin-main">\s*<Outlet \/>\s*<\/section>/)
  assert.match(routes, /<Route path="admin" element=\{<AdminRoute><AdminShell \/><\/AdminRoute>\}>/)
  assert.match(routes, /<Route index element=\{withAdminSuspense\(<AdminDashboardPage \/>\)\}/)
  assert.match(routes, /<Route path="catalog\/new" element=\{withAdminSuspense\(<AdminCatalogEntryPage \/>\)\}/)
})

test('admin API pages do not return a ready-state AdminApiState placeholder', () => {
  const stateUtils = readWorkspaceFile('src/pages/admin/adminApiPageUtils.jsx')
  assert.match(stateUtils, /shouldShowAdminApiState\(status\)/)
  assert.match(stateUtils, /status === 'loading' \|\| status === 'error'/)

  for (const page of adminRoutePages) {
    const source = readWorkspaceFile(page)
    assert.doesNotMatch(source, /const loading = <AdminApiState/)
    assert.doesNotMatch(source, /if \(loading\) return loading/)
    assert.match(source, /shouldShowAdminApiState/)
  }
})
