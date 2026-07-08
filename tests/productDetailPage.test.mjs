import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const readSource = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('product detail keeps Noblesse inquiry wording and avoids direct purchase CTA copy', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  assert.match(source, /Add to Inquiry List/)
  assert.match(source, /견적 리스트에 담기/)
  assert.match(source, /승인 후 가격 확인 가능/)
  assert.doesNotMatch(source, /Buy Now|Checkout|Payment|Order Now|Add to Cart|장바구니|바로 구매|결제/)
})

test('product detail gates buyer price and MOQ behind approved buyer or admin price book state', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  assert.match(source, /const canUseTradeTerms = Boolean\(isApproved && price && approvedAmount !== null\)/)
  assert.match(source, /const canViewAdminPrices = Boolean\(isAdmin && adminPriceBooks\.length > 0\)/)
  assert.match(source, /const visibleMoq = canUseTradeTerms \? price\.moq : canViewAdminPrices \? adminPriceBooks\[0\]\?\.moq : null/)
  assert.match(source, /!canViewAdminPrices && <Link className="pd-secondary-action"/)
})

test('product detail uses scoped pd layout and related products are selected from relevant product signals', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')
  const styles = readSource('src/App.css')

  assert.match(source, /className="content pd-page"/)
  assert.match(source, /const getRelatedProducts/)
  assert.match(source, /item\.productId !== product\.productId/)
  assert.match(source, /score \+= 8/)
  assert.doesNotMatch(source, /products\.slice\(0, 4\)/)
  assert.match(styles, /\.pd-hero/)
  assert.match(styles, /\.pd-mobile-action/)
})
