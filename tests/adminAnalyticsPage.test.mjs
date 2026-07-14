import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin analytics uses the protected aggregate endpoint instead of sampled resource lists', () => {
  const page = read('src/pages/admin/AdminAnalyticsPage.jsx')

  assert.match(page, /api\.getAnalytics\(token\)/)
  assert.doesNotMatch(page, /getInquiries\(|getBuyers\(|getProducts\(/)
  assert.match(page, /data\?\.currencyTotals/)
  assert.match(page, /quotes\?\.trend\?\.points/)
  assert.match(page, /requestedTotal/)
  assert.match(page, /issuedTotal/)
  assert.doesNotMatch(page, /currency="USD"/)
})

test('admin analytics presents actionable quote flow and responsive operations sections', () => {
  const page = read('src/pages/admin/AdminAnalyticsPage.jsx')
  const styles = read('src/styles/admin-console.css')

  for (const contract of ['openInquiries', 'draftQuotes', 'awaitingBuyer', 'acceptedQuotes']) {
    assert.match(page, new RegExp(`analytics\\.${contract}`))
  }
  assert.match(page, /admin-analytics-main-grid/)
  assert.match(page, /admin-analytics-currency/)
  assert.match(page, /QuoteTrendChart/)
  assert.match(page, /AreaChart/)
  assert.match(page, /trendRange/)
  assert.match(page, /visibleQuoteStatuses/)
  assert.match(page, /StatusColumnChart/)
  assert.match(page, /CurrencyComparisonChart/)
  assert.match(styles, /\.admin-analytics-kpis/)
  assert.match(styles, /\.admin-analytics-trend-chart/)
  assert.match(styles, /\.admin-analytics-period-control/)
  assert.match(styles, /\.admin-analytics-status-controls/)
  assert.match(styles, /\.admin-analytics-column-chart/)
  assert.match(styles, /\.admin-analytics-bar/)
  assert.match(styles, /\.admin-analytics-currency-chart/)
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-analytics-main-grid/)
})
