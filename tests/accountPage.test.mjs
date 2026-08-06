import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('admin account page redirects to the admin workspace', () => {
  const page = readWorkspaceFile('src/pages/AccountPage.jsx')

  assert.match(page, /import \{ Link, Navigate \} from 'react-router-dom'/)
  assert.match(page, /if \(isAdmin\) return <Navigate replace to=\{toLocalePath\('\/admin'\)\} \/>/)
})

test('buyer account page is product-first and removes internal profile fields', () => {
  const page = readWorkspaceFile('src/pages/AccountPage.jsx')

  assert.match(page, /마이 노블레스/)
  assert.match(page, /최근 본 상품/)
  assert.match(page, /새로 들어온 상품/)
  assert.match(page, /recentProductViews/)
  assert.match(page, /refreshRecentProducts/)
  assert.match(page, /<CatalogCard key=\{product\.productId\} product=\{product\} \/>/)
  assert.doesNotMatch(page, /discountRate|minOrderAmount|buyerAccess|profileRows|viewerState/)
  assert.doesNotMatch(page, /사용 가능 기능|거래처 프로필 필드/)
})

test('buyer account page keeps four locales and responsive product grid', () => {
  const page = readWorkspaceFile('src/pages/AccountPage.jsx')
  const styles = readWorkspaceFile('src/App.css')

  assert.match(page, /kr:/)
  assert.match(page, /en:/)
  assert.match(page, /jp:/)
  assert.match(page, /'zh-TW':/)
  assert.match(page, /catalog-grid account-product-grid/)
  assert.match(styles, /\.catalog-grid,[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.catalog-grid,[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.catalog-grid,[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)
})
