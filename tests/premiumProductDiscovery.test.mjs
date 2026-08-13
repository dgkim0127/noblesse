import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('src/pages/ProductsPage.jsx', 'utf8')
const card = readFileSync('src/components/CatalogCard.jsx', 'utf8')
const css = readFileSync('src/styles/product-catalog-premium.css', 'utf8')
const quickOptionCss = readFileSync('src/styles/catalog-quick-option.css', 'utf8')

test('product discovery keeps a compact summary and accessible filter drawer', () => {
  assert.match(page, /className="product-page-summary"/)
  assert.match(page, /role="dialog" aria-modal="true"/)
  assert.match(page, /className="product-filter-backdrop"/)
  assert.match(page, /className="product-filter-drawer-actions"/)
  assert.match(page, /removeSelectedFilterChip\(chip\)/)
  assert.doesNotMatch(page, /className="product-material-tabs"/)
  assert.match(css, /\.product-list-content \.product-page-head \{[\s\S]*?min-height: 0;/)
})

test('catalog cards use portrait media and request alternate photos only on fine-pointer interaction', () => {
  assert.match(card, /export function CatalogCard\(\{ product, priority = false \}\)/)
  assert.match(card, /productGalleryEntries\(product, productAlt\)/)
  assert.match(card, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/)
  assert.match(card, /shouldLoadAlternateImage && canShowAlternateImage/)
  assert.match(card, /loading=\{priority \? 'eager' : 'lazy'\}/)
  assert.match(card, /catalog-quick-action--favorite/)
  assert.match(card, /catalog-quick-action--inquiry/)
  assert.doesNotMatch(card, /className="add-inquiry"/)
  assert.match(css, /\.catalog-card \.catalog-media,[\s\S]*?aspect-ratio: 4 \/ 5;/)
})

test('catalog cards omit color summaries and avoid a false unregistered-price label', () => {
  assert.match(card, /const productMetadata = \[product\.material\]\.filter\(Boolean\)/)
  assert.doesNotMatch(card, /const localizedColor =/)
  assert.doesNotMatch(card, /가격 미등록/)
  assert.match(card, /가격 확인 중/)
})

test('catalog inquiry action opens a quick option sheet before adding', () => {
  assert.match(card, /<SlidersHorizontal size=\{17\}/)
  assert.match(card, /className="catalog-option-dialog"/)
  assert.match(card, /catalog-option-dialog-header\$\{canShowPrimaryImage/)
  assert.match(card, /getMissingRequiredProductOptions\(optionGroups, quickOptionSelection\)/)
  assert.match(card, /selectedOptions: selectedOptionPairs\(quickOptionSelection\)/)
  assert.match(card, /const added = addInquiryItem/)
  assert.match(card, /new CustomEvent\('noblesse:inquiry-item-added'/)
  assert.match(card, /quantity: quickQuantity/)
  assert.match(quickOptionCss, /catalog-option-group-in/)
  assert.match(quickOptionCss, /catalog-option-dialog-out/)
  assert.match(quickOptionCss, /\.catalog-option-dialog-header\.has-image/)
  assert.match(quickOptionCss, /catalog-quick-action-halo/)
  assert.match(quickOptionCss, /\.catalog-option-dialog \{[\s\S]*?width: min\(460px,/)
  assert.match(quickOptionCss, /@media \(max-width: 760px\)[\s\S]*?\.catalog-option-dialog \{[\s\S]*?width: 100%;/)
})

test('product grids keep four, three and two column storefront breakpoints', () => {
  assert.match(css, /\.product-list-content \.product-results \{[\s\S]*?repeat\(4,/)
  assert.match(css, /@media \(max-width: 1100px\)[\s\S]*?repeat\(3,/)
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?repeat\(2,/)
})

test('mobile discovery controls use compact visual button sizes', () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.product-list-content \.product-sort-button \{[\s\S]*?min-height: 32px;/)
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.product-list-content \.product-filter-trigger \{[\s\S]*?min-width: 64px;[\s\S]*?min-height: 32px;/)
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.product-list-content \.product-primary-tabs button \{[\s\S]*?min-height: 32px;/)
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.catalog-card \.catalog-quick-action \{[\s\S]*?width: 30px;[\s\S]*?height: 30px;/)
})
