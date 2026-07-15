import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('product operations use dedicated list and editor workflows', () => {
  const list = read('src/pages/admin/AdminProductsPage.jsx')
  const editor = read('src/pages/admin/AdminProductEditorPage.jsx')
  const styles = read('src/styles/admin-console.css')

  assert.match(list, /\/admin\/products\/new/)
  assert.doesNotMatch(list, /\/admin\/catalog\/new/)
  assert.match(list, /bulkUpdateProducts/)
  assert.match(list, /duplicateProduct/)
  for (const locale of ["'kr'", "'en'", "'jp'", "'zh-TW'"]) assert.match(editor, new RegExp(locale))
  assert.match(editor, /AdminSaveBar/)
  assert.match(editor, /getReadiness/)
  assert.match(editor, /prices\.write/)
  assert.match(editor, /admin-product-live-preview/)
  assert.match(editor, /previewMode === 'desktop'/)
  assert.match(editor, /previewMode === 'mobile'/)
  assert.match(editor, /previewTranslation/)
  assert.match(editor, /previewImage/)
  assert.match(editor, /previewColors/)
  assert.match(editor, /previewPrice/)
  assert.match(styles, /\.admin-product-live-preview/)
  assert.match(styles, /\.admin-product-preview-content/)
})

test('quote workflow separates customer documents from internal notes and direct payment', () => {
  const adminQuote = read('src/pages/admin/AdminQuotePage.jsx')
  const buyerQuotes = read('src/pages/MyInquiriesPage.jsx')

  assert.match(adminQuote, /issueQuote/)
  assert.match(adminQuote, /새 버전 발행/)
  assert.match(adminQuote, /내부 메모/)
  assert.match(adminQuote, /고객 화면과 PDF에는 표시되지 않습니다/)
  assert.match(adminQuote, /quotes\.write/)
  assert.match(buyerQuotes, /decideInquiryQuote/)
  assert.match(buyerQuotes, /주문이나 결제를 만들지 않으며/)
  assert.doesNotMatch(adminQuote, /checkout|createOrder|paymentIntent/i)
})

test('admin console uses restrained neutral styling without gradients', () => {
  const styles = read('src/styles/admin-console.css')
  assert.doesNotMatch(styles, /linear-gradient|radial-gradient/)
  assert.match(styles, /#2a234f/i)
  assert.match(styles, /#ff8fa9/i)
  assert.match(styles, /@media \(max-width: 620px\)/)
})
