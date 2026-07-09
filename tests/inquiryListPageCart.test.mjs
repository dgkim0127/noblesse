import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('inquiry list keeps B2B wording while using a cart-style review layout', () => {
  const page = readWorkspaceFile('src/pages/InquiryListPage.jsx')
  const styles = readWorkspaceFile('src/App.css')

  assert.match(page, /ShoppingCart/)
  assert.match(page, /quote-cart-layout/)
  assert.match(page, /quote-cart-summary-card/)
  assert.match(page, /견적 리스트/)
  assert.match(page, /견적 요청하기/)
  assert.doesNotMatch(page, /장바구니/)
  assert.doesNotMatch(page, /구매하기/)
  assert.doesNotMatch(page, /결제/)

  assert.match(styles, /\.quote-cart-layout/)
  assert.match(styles, /\.quote-cart-item/)
  assert.match(styles, /\.quote-cart-summary-card/)
})

test('inquiry list provides localized labels for supported storefront locales', () => {
  const page = readWorkspaceFile('src/pages/InquiryListPage.jsx')

  assert.match(page, /kr: \{[\s\S]*title: '견적 리스트'/)
  assert.match(page, /en: \{[\s\S]*title: 'Inquiry List'/)
  assert.match(page, /jp: \{[\s\S]*title: '見積もりリスト'/)
  assert.match(page, /cn: \{[\s\S]*title: '詢價清單'/)
  assert.match(page, /getLocaleContentKey\(locale\)/)
})
