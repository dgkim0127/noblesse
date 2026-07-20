import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createCandlestickBuckets, createMovingAverage, getCandlestickBucketSize } from '../src/pages/admin/adminAnalyticsCandlestick.js'

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
  assert.match(page, /QuoteStatusCandlestick/)
  assert.match(page, /createCandlestickBuckets/)
  assert.doesNotMatch(page, /AreaChart|recharts/)
  assert.match(page, /trendRange/)
  assert.match(page, /selectedQuoteStatus/)
  assert.match(page, /StatusColumnChart/)
  assert.match(page, /CurrencyComparisonChart/)
  assert.match(styles, /\.admin-analytics-kpis/)
  assert.match(styles, /\.admin-analytics-candlestick/)
  assert.match(styles, /\.admin-analytics-candle-wick/)
  assert.match(styles, /\.admin-analytics-candle-body/)
  assert.match(styles, /\.admin-analytics-candlestick-volume/)
  assert.match(styles, /\.admin-analytics-period-control/)
  assert.match(styles, /\.admin-analytics-status-controls/)
  assert.match(styles, /\.admin-analytics-column-chart/)
  assert.match(styles, /\.admin-analytics-bar/)
  assert.match(styles, /\.admin-analytics-currency-chart/)
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-analytics-main-grid/)
})

test('admin analytics chooses readable candlestick buckets for each range', () => {
  assert.equal(getCandlestickBucketSize(7), 2)
  assert.equal(getCandlestickBucketSize(30), 3)
  assert.equal(getCandlestickBucketSize(90), 7)
})

test('admin analytics builds OHLC and volume buckets from daily status counts', () => {
  const rows = createCandlestickBuckets([
    { date: '2026-07-09', draft: 0, sent: 1 },
    { date: '2026-07-10', draft: 2, sent: 0 },
    { date: '2026-07-11', draft: 1, sent: 1 },
  ], 'all', ['draft', 'sent'], 3)

  assert.deepEqual(rows, [{
    startDate: '2026-07-09',
    endDate: '2026-07-11',
    open: 1,
    high: 2,
    low: 1,
    close: 2,
    volume: 5,
  }])
})

test('admin analytics keeps latest candlestick buckets complete and calculates moving averages', () => {
  const rows = createCandlestickBuckets([
    { date: '2026-07-08', draft: 1 },
    { date: '2026-07-09', draft: 2 },
    { date: '2026-07-10', draft: 3 },
    { date: '2026-07-11', draft: 4 },
    { date: '2026-07-12', draft: 5 },
  ], 'draft', ['draft'], 2)

  assert.deepEqual(rows, [
    { startDate: '2026-07-08', endDate: '2026-07-08', open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { startDate: '2026-07-09', endDate: '2026-07-10', open: 2, high: 3, low: 2, close: 3, volume: 5 },
    { startDate: '2026-07-11', endDate: '2026-07-12', open: 4, high: 5, low: 4, close: 5, volume: 9 },
  ])
  assert.deepEqual(createMovingAverage(rows, 2), [1, 2, 4])
  assert.deepEqual(createMovingAverage([], 3), [])
})
