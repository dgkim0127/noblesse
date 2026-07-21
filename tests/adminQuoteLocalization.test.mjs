import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { getAdminCopy } from '../src/pages/admin/adminCopy.js'
import { getAdminQuoteDateLocale, getAdminQuoteWorkflowCopy } from '../src/pages/admin/adminQuoteWorkflowCopy.js'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('admin quote workflow copy resolves all supported locales and the legacy Chinese route', () => {
  assert.equal(getAdminQuoteWorkflowCopy('kr').detail.prepareTitle, '1. 상품 준비')
  assert.equal(getAdminQuoteWorkflowCopy('en').detail.prepareTitle, '1. Prepare items')
  assert.equal(getAdminQuoteWorkflowCopy('jp').detail.prepareTitle, '1. 商品準備')
  assert.equal(getAdminQuoteWorkflowCopy('zh-TW').detail.prepareTitle, '1. 商品備貨')
  assert.equal(getAdminQuoteWorkflowCopy('cn').detail.prepareTitle, '1. 商品備貨')

  assert.equal(getAdminQuoteDateLocale('kr'), 'ko-KR')
  assert.equal(getAdminQuoteDateLocale('en'), 'en-US')
  assert.equal(getAdminQuoteDateLocale('jp'), 'ja-JP')
  assert.equal(getAdminQuoteDateLocale('zh-TW'), 'zh-TW')
})

test('admin quote pages derive labels, option snapshots, and dates from the route locale', () => {
  const detail = read('src/pages/admin/AdminQuotePage.jsx')
  const list = read('src/pages/admin/AdminQuotesPage.jsx')

  assert.match(detail, /useAdminQuoteWorkflowCopy\(\)/)
  assert.match(list, /useAdminQuoteWorkflowCopy\(\)/)
  assert.match(detail, /formatSelectedProductOptions\(item\.selectedOptions, locale\)/)
  assert.match(detail, /toLocaleString\(dateLocale\)/)
  assert.match(list, /toLocaleDateString\(dateLocale\)/)
  assert.doesNotMatch(detail, /const workflowLabels =/)
  assert.doesNotMatch(list, /\['received', '요청 접수'\]/)
  assert.doesNotMatch(detail, /formatSelectedProductOptions\(item\.selectedOptions, form\.documentLocale\)/)
})

test('admin shell navigation derives visible labels from the route locale', () => {
  const shell = read('src/components/AdminShell.jsx')

  assert.equal(getAdminCopy('en').shell.nav.quotes, 'Quotes')
  assert.equal(getAdminCopy('jp').shell.nav.quotes, '見積もり')
  assert.equal(getAdminCopy('zh-TW').shell.nav.quotes, '報價')
  assert.match(shell, /t\.shell\.nav\?\.\[key\]/)
  assert.match(shell, /t\.shell\.groups\?\.operations/)
  assert.match(shell, /\{t\.shell\.brand\}/)
  assert.match(shell, /\{t\.shell\.backToCatalog\}/)
  assert.doesNotMatch(shell, /label: '(?:홈|상품|견적|고객|운영|분석)'/)
})

test('route loading fallbacks derive their messages from the active locale', () => {
  const app = read('src/App.jsx')

  assert.match(app, /const routeLoadingCopy =/)
  assert.match(app, /admin: 'Loading the admin workspace\.'/)
  assert.match(app, /const \{ locale \} = useLocalePath\(\)/)
  assert.match(app, /resolveLocaleCopy\(routeLoadingCopy, locale\)/)
  assert.match(app, /className="admin-page-loading" role="status">\{copy\.admin\}/)
  assert.match(app, /className="route-page-loading" role="status">\{copy\.store\}/)
})
