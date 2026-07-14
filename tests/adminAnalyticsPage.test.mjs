import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createBoxPlotSummary, createStatusBoxPlotRows } from '../src/pages/admin/adminAnalyticsBoxPlot.js'

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
  assert.match(page, /QuoteStatusBoxPlot/)
  assert.match(page, /createStatusBoxPlotRows/)
  assert.doesNotMatch(page, /AreaChart|recharts/)
  assert.match(page, /trendRange/)
  assert.match(page, /visibleQuoteStatuses/)
  assert.match(page, /StatusColumnChart/)
  assert.match(page, /CurrencyComparisonChart/)
  assert.match(styles, /\.admin-analytics-kpis/)
  assert.match(styles, /\.admin-analytics-boxplot/)
  assert.match(styles, /\.admin-analytics-boxplot-whisker/)
  assert.match(styles, /\.admin-analytics-boxplot-median/)
  assert.match(styles, /\.admin-analytics-period-control/)
  assert.match(styles, /\.admin-analytics-status-controls/)
  assert.match(styles, /\.admin-analytics-column-chart/)
  assert.match(styles, /\.admin-analytics-bar/)
  assert.match(styles, /\.admin-analytics-currency-chart/)
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.admin-analytics-main-grid/)
})

test('admin analytics calculates standard box plot statistics for daily status counts', () => {
  assert.deepEqual(createBoxPlotSummary([4, 1, 3, 2]), {
    minimum: 1,
    lowerQuartile: 1.75,
    median: 2.5,
    upperQuartile: 3.25,
    maximum: 4,
    total: 10,
  })
  assert.deepEqual(createBoxPlotSummary([]), {
    minimum: 0,
    lowerQuartile: 0,
    median: 0,
    upperQuartile: 0,
    maximum: 0,
    total: 0,
  })
})

test('admin analytics builds one box plot row per visible quote status', () => {
  const rows = createStatusBoxPlotRows([
    { draft: 0, sent: 2 },
    { draft: 1, sent: 0 },
  ], [
    { color: '#111', key: 'draft' },
    { color: '#222', key: 'sent' },
  ])

  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    color: '#111',
    key: 'draft',
    minimum: 0,
    lowerQuartile: 0.25,
    median: 0.5,
    upperQuartile: 0.75,
    maximum: 1,
    total: 1,
  })
  assert.equal(rows[1].maximum, 2)
  assert.equal(rows[1].total, 2)
})
