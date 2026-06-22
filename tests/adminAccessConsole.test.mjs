import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin shell groups navigation and hides links by permission', () => {
  const shell = read('src/components/AdminShell.jsx')

  assert.match(shell, /adminNavGroups/)
  assert.match(shell, /operations/)
  assert.match(shell, /governance/)
  assert.match(shell, /hasPermission\(item\.permission\)/)
  assert.match(shell, /\/admin\/team/)
  assert.match(shell, /\/admin\/audit/)
})

test('admin routes use permission gates for governance pages', () => {
  const app = read('src/App.jsx')

  assert.match(app, /AdminPermissionGate/)
  assert.match(app, /path="team".*admins\.read/s)
  assert.match(app, /path="audit".*audit\.read/s)
  assert.match(app, /path="catalog\/new".*catalog\.write/s)
})

test('admin api exposes access, buyer lifecycle, team, and audit methods', () => {
  const api = read('src/api/adminApi.js')

  for (const method of [
    'getMe',
    'updateBuyerVerification',
    'updateBuyerAccountStatus',
    'getAdmins',
    'updateAdminRole',
    'replacePermissionOverrides',
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
})
