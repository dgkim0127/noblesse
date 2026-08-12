import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('src/pages/ProductsPage.jsx', 'utf8')

test('catalog list renders a bounded first batch and progressively appends products', () => {
  assert.match(page, /const productListBatchSize = 24/)
  assert.match(page, /const visibleProducts = sortedProducts\.slice\(0, visibleProductCount\)/)
  assert.match(page, /visibleProducts\.map\(\(product\) => <CatalogCard/)
  assert.doesNotMatch(page, /sortedProducts\.map\(\(product\) => <CatalogCard/)
  assert.match(page, /new IntersectionObserver/)
  assert.match(page, /rootMargin: '800px 0px'/)
  assert.match(page, /loadMoreRef/)
})

test('catalog list resets the render window when route, filters, or sorting change', () => {
  assert.match(page, /searchParams\.toString\(\)/)
  assert.match(page, /setProductWindow\(\{ key: productWindowKey, count: productListBatchSize \}\)/)
})
