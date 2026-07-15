import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('product operations use dedicated list and editor workflows', () => {
  const list = read('src/pages/admin/AdminProductsPage.jsx')
  const editor = read('src/pages/admin/AdminProductEditorPage.jsx')
  const detail = read('src/pages/ProductDetailPage.jsx')
  const styles = read('src/styles/admin-console.css')

  assert.match(list, /\/admin\/products\/new/)
  assert.doesNotMatch(list, /\/admin\/catalog\/new/)
  assert.match(list, /bulkUpdateProducts/)
  assert.match(list, /duplicateProduct/)
  for (const locale of ["'kr'", "'en'", "'jp'", "'zh-TW'"]) assert.match(editor, new RegExp(locale))
  assert.match(editor, /AdminSaveBar/)
  assert.match(editor, /getReadiness/)
  assert.match(editor, /prices\.write/)
  assert.match(editor, /ProductDetailView/)
  assert.match(editor, /editor=\{editorBridge\}/)
  assert.match(editor, /admin-product-detail-canvas/)
  assert.match(editor, /admin-product-visual-toolbar/)
  assert.match(editor, /admin-product-settings-drawer/)
  assert.match(editor, /beginInline/)
  assert.match(editor, /cancelInline/)
  assert.match(editor, /renderPopover/)
  assert.match(editor, /disabled=\{!canWritePrices\}/)
  assert.doesNotMatch(editor, /<Check\b/)
  assert.match(editor, /previewMode === 'desktop'/)
  assert.match(editor, /previewMode === 'mobile'/)
  assert.match(editor, /previewImage/)
  assert.match(detail, /export function ProductDetailView/)
  assert.match(detail, /function ProductInlineEditor/)
  assert.match(detail, /event\.key === 'Escape'/)
  assert.match(detail, /event\.ctrlKey \|\| event\.metaKey/)
  assert.match(detail, /editor\.renderPopover\(field\)/)
  assert.match(styles, /\.admin-product-detail-canvas/)
  assert.match(styles, /\.admin-product-popover/)
  assert.match(styles, /\.admin-product-settings-drawer/)
})

test('visual product editor keeps the sidebar stable and popovers responsive', () => {
  const styles = read('src/styles/admin-console.css')

  assert.match(styles, /\.admin-console-shell[\s\S]*?align-items: start/)
  assert.match(styles, /html:has\(\.admin-console-shell\)[\s\S]*?overflow-x: clip/)
  assert.match(styles, /\.admin-console-sidebar[\s\S]*?align-self: start[\s\S]*?height: 100dvh[\s\S]*?position: sticky[\s\S]*?top: 0/)
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.admin-console-sidebar[\s\S]*?position: static/)
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*?\.admin-product-popover[\s\S]*?position: fixed/)
  assert.match(styles, /\.admin-product-detail-canvas\.is-mobile[\s\S]*?max-width: 390px/)
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
