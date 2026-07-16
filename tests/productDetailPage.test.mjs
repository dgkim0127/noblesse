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
  assert.match(source, /const canRequestProductQuote = Boolean\(isApproved && product\)/)
  assert.match(source, /const canViewAdminPrices = Boolean\(isAdmin && adminPriceBooks\.length > 0\)/)
  assert.match(source, /const requestMoq = canUseTradeTerms \? price\.moq : product\?\.moqDefault \|\| 1/)
  assert.match(source, /const visibleMoq = canUseTradeTerms \? price\.moq : canRequestProductQuote \? requestMoq : canViewAdminPrices \? adminPriceBooks\[0\]\?\.moq : null/)
  assert.match(source, /!canViewAdminPrices && <Link className="pd-secondary-action"/)
})

test('shared product detail editor uses active locale values without storefront fallback', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  assert.match(source, /export function ProductDetailView/)
  assert.match(source, /const productName = editor \? editor\.values\.name/)
  assert.match(source, /const description = editor \? editor\.values\.summary/)
  assert.match(source, /value=\{productDetailContent\.headline \|\| \(editor \? '' : productName\)\}/)
  assert.match(source, /value=\{editor \? productDetailContent\.body : \(productDetailContent\.body \|\| description/)
  assert.match(source, /disabled=\{Boolean\(editor\)\}/)
  assert.match(source, /if \(editor\) return/)
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
  assert.match(source, /id="pd-material"/)
  assert.match(source, /const detailGalleryImages = galleryImages\.slice\(3\)/)
  assert.match(source, /const structureRows =/)
  assert.match(source, /const keyFacts =/)
  assert.match(source, /className="pd-key-facts"/)
  assert.match(source, /className="pd-material-care-grid"/)
  assert.match(source, /className="pd-shipping-note"/)
  assert.match(source, /const getRelatedProducts/)
  assert.match(source, /item\.productId !== product\.productId/)
  assert.match(source, /score \+= 8/)
  assert.doesNotMatch(source, /products\.slice\(0, 4\)/)
  assert.match(styles, /\.pd-hero/)
  assert.match(styles, /\.pd-editorial/)
  assert.match(styles, /\.pd-mobile-action/)
  assert.match(styles, /\.pd-direct-inquiry-form/)
  assert.match(styles, /\.pd-detail-gallery/)
  assert.match(styles, /\.pd-material-care-grid/)
  assert.match(styles, /\.pd-process-grid[\s\S]*?repeat\(3,/)
})

test('product detail exposes piercing-specific structure without fixed promotional filler', () => {
  const source = readSource('src/pages/ProductDetailPage.jsx')

  for (const field of ['gauge', 'barLength', 'postLength', 'innerDiameter', 'barThickness', 'stoneType', 'closureType', 'settingMethod', 'plating', 'finish']) {
    assert.match(source, new RegExp(`productSpecs\\.${field}`))
  }
  assert.match(source, /productTaxonomy\.wearingLocation/)
  assert.match(source, /productTaxonomy\.saleType/)
  assert.match(source, /productDetailContent\.wearingGuide/)
  assert.match(source, /productDetailContent\.materialInfo/)
  assert.match(source, /productDetailContent\.careGuide/)
  assert.match(source, /productDetailContent\.sizeGuide/)
  assert.doesNotMatch(source, /className="pd-assurance-strip"/)
  assert.doesNotMatch(source, /className="pd-buyer-points"/)
})
