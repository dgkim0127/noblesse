import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin shell groups navigation and hides links by permission', () => {
  const shell = read('src/components/AdminShell.jsx')

  assert.match(shell, /adminNavigation/)
  for (const key of ['dashboard', 'products', 'quotes', 'buyers', 'operations', 'analytics']) {
    assert.match(shell, new RegExp(`key: '${key}'`))
  }
  assert.match(shell, /permissions\.some\(\(permission\) => hasPermission\(permission\)\)/)
  assert.match(shell, /\/admin\/operations/)
  assert.match(shell, /\/admin\/buyers/)
  assert.match(shell, /\/admin\/quotes/)
})

test('admin routes use permission gates for governance pages', () => {
  const app = read('src/App.jsx')

  assert.match(app, /AdminPermissionGate/)
  assert.match(app, /path="team".*admins\.read/s)
  assert.match(app, /path="audit".*audit\.read/s)
  assert.match(app, /path="catalog\/new".*LegacyAdminCatalogRedirect/s)
  assert.match(app, /path="products\/new".*catalog\.write/s)
})

test('admin api exposes access, buyer lifecycle, team, and audit methods', () => {
  const api = read('src/api/adminApi.js')

  for (const method of [
    'getMe',
    'updateBuyerVerification',
    'updateBuyerAccountStatus',
    'getAdmins',
    'updateAdminRole',
    'promoteUserToAdmin',
    'replacePermissionOverrides',
    'upsertPermissionOverride',
    'deletePermissionOverride',
    'getAuditLogs',
  ]) {
    assert.match(api, new RegExp(`async ${method}\\(`))
  }
})

test('admin access copy covers every locale', () => {
  const copy = read('src/pages/admin/adminCopy.js')

  for (const locale of ['kr', 'en', 'jp', 'cn']) {
    assert.match(copy, new RegExp(`${locale}: \\{[\\s\\S]*groups:`))
    assert.match(copy, new RegExp(`${locale}: \\{[\\s\\S]*team:`))
    assert.match(copy, new RegExp(`${locale}: \\{[\\s\\S]*audit:`))
  }
  assert.match(copy, /adminMemberManagementCopy/)
  assert.match(copy, /members: 'Members'/)
  assert.match(copy, /members: '회원'/)
})

test('admin dashboard prioritizes the daily operations queue', () => {
  const page = read('src/pages/admin/AdminDashboardPage.jsx')

  for (const contractField of ['workQueue', 'catalogHealth', 'tasks']) {
    assert.match(page, new RegExp(contractField))
  }
  assert.match(page, /hasPermission\(item\.permission\)/)
  assert.match(page, /hasPermission\('catalog\.write'\)/)
  assert.match(page, /오늘 할 일/)
  assert.match(page, /보완이 필요한 상품/)
})

test('admin team page protects owner-only role and override controls', () => {
  const page = read('src/pages/admin/AdminTeamPage.jsx')
  const api = read('src/api/adminApi.js')
  const catalog = read('src/constants/adminPermissionCatalog.js')

  assert.match(page, /admin\?\.adminRole === 'owner'/)
  assert.match(page, /hasPermission\('admins\.manage'\)/)
  assert.match(page, /delegableAdminPermissions/)
  assert.match(catalog, /'prices\.write'/)
  assert.match(page, /admin-permission-catalog/)
  assert.match(page, /highlightedPermissionKey = 'prices\.write'/)
  assert.match(page, /isPricePermission/)
  assert.doesNotMatch(catalog, /'admins\.manage'/)
  assert.doesNotMatch(catalog, /'settings\.manage'/)
  assert.match(catalog, /'admins\.read'/)
  assert.match(catalog, /'audit\.read'/)
  assert.match(catalog, /kr:/)
  assert.match(catalog, /en:/)
  assert.match(catalog, /jp:/)
  assert.match(catalog, /cn:/)
  assert.match(page, /disabled=\{!draft\.reason\.trim\(\)\}/)
  assert.match(page, /deletePermissionOverride/)
  assert.match(page, /ownerProtected/)
  assert.match(page, /value="owner"/)
  assert.match(page, /startRoleEdit\(row\)/)
  assert.match(page, /startOverrideEdit\(row/)
  assert.match(page, /AdminConfirmDialog/)
  assert.doesNotMatch(page, /window\.confirm/)
  assert.match(page, /promoteUserToAdmin/)
  assert.match(page, /promoteDraft/)
  assert.match(page, /upsertPermissionOverride/)
  assert.doesNotMatch(page, /replacePermissionOverrides\(userId, \[\{/)
  assert.match(api, /\/permission-overrides\/\$\{encodeURIComponent\(permissionKey\)\}/)
})

test('admin audit page renders target fields without raw snapshots', () => {
  const page = read('src/pages/admin/AdminAuditPage.jsx')

  assert.match(page, /entry\.entityType/)
  assert.match(page, /entry\.entityId/)
  assert.match(page, /entry\.changedFields/)
  assert.match(page, /entry\.actor\?\.role/)
  assert.match(page, /getAuditLogs\(params, token\)/)
  assert.doesNotMatch(page, /beforeSnapshot|afterSnapshot|raw snapshot/i)
})

test('admin buyer pages separate account and verification status', () => {
  const buyersPage = read('src/pages/admin/AdminBuyersPage.jsx')
  const detailPage = read('src/pages/admin/AdminBuyerDetailPage.jsx')

  assert.match(buyersPage, /verificationStatus/)
  assert.match(buyersPage, /accountStatus/)
  assert.match(buyersPage, /admin-buyer-list/)
  assert.match(buyersPage, /admin-buyer-card/)
  assert.match(buyersPage, /getBuyerCountry/)
  assert.match(buyersPage, /getBuyerLoginId/)
  assert.match(buyersPage, /getBuyerTitle/)
  assert.match(buyersPage, /admin-buyer-country/)
  assert.match(buyersPage, /admin-permission-note/)
  assert.match(buyersPage, /statusCounts/)
  assert.match(buyersPage, /admin-filter-count/)
  assert.match(buyersPage, /discountRate <= 0/)
  assert.match(buyersPage, /updateBuyerVerification/)
  assert.match(buyersPage, /updateBuyerAccountStatus/)
  assert.match(buyersPage, /hasPermission\('buyers\.review'\)/)
  assert.match(buyersPage, /hasPermission\('buyers\.suspend'\)/)
  assert.match(buyersPage, /hasPermission\('admins\.manage'\)/)
  assert.match(buyersPage, /promoteBuyerToOperator/)
  assert.match(buyersPage, /promoteUserToAdmin/)
  assert.match(detailPage, /verificationStatus/)
  assert.match(detailPage, /accountStatus/)
  assert.match(detailPage, /buyers\.sensitive\.read/)
  assert.match(detailPage, /Masked by permission/)
})

test('admin mock owner includes settings.manage permission', () => {
  const context = read('src/components/AdminAccessContext.jsx')

  assert.match(context, /settings\.manage/)
})
