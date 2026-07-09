import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const readSource = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('product detail keeps Noblesse inquiry wording and avoids direct purchase CTA copy', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  assert.match(source, /Add to Inquiry List/)
  assert.match(source, /Request quote for this product/)
  assert.match(source, /이 상품으로 견적 요청/)
  assert.match(source, /商品詢價/)
  assert.doesNotMatch(source, /Buy Now|Checkout|Payment|Order Now|Add to Cart|장바구니|바로 구매|결제/)
})

test('product detail gates buyer price and MOQ behind approved buyer or admin price book state', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  assert.match(source, /const canUseTradeTerms = Boolean\(isApproved && price && approvedAmount !== null\)/)
  assert.match(source, /const canViewAdminPrices = Boolean\(isAdmin && adminPriceBooks\.length > 0\)/)
  assert.match(source, /const visibleMoq = canUseTradeTerms \? price\.moq : canViewAdminPrices \? adminPriceBooks\[0\]\?\.moq : null/)
  assert.match(source, /!canViewAdminPrices && <Link className="pd-secondary-action"/)
})

test('product detail can submit a direct product inquiry through the commerce helper', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')
  const commerce = readSource('src/commerce/CommerceContext.jsx')

  assert.match(source, /submitProductInquiry/)
  assert.match(source, /submitSelectedProductInquiry/)
  assert.match(source, /requestMemo: directMemo\.trim\(\)/)
  assert.match(source, /getInquiryRoutePath\(directInquiry\)/)
  assert.match(commerce, /const submitProductInquiry = async/)
  assert.match(commerce, /buyerApi\.createInquiry/)
  assert.match(commerce, /productCode: product\.code/)
})

test('product detail uses scoped pd layout and related products are selected from relevant product signals', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')
  const styles = readSource('src/App.css')

  assert.match(source, /className="content pd-page"/)
  assert.match(source, /className="pd-section-nav"/)
  assert.match(source, /id="pd-overview"/)
  assert.match(source, /id="pd-specification"/)
  assert.match(source, /const getRelatedProducts/)
  assert.match(source, /item\.productId !== product\.productId/)
  assert.match(source, /score \+= 8/)
  assert.doesNotMatch(source, /products\.slice\(0, 4\)/)
  assert.match(styles, /\.pd-hero/)
  assert.match(styles, /\.pd-editorial/)
  assert.match(styles, /\.pd-mobile-action/)
  assert.match(styles, /\.pd-direct-inquiry-form/)
})
