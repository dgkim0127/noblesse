import { useMemo, useState } from 'react'
import { BadgeCheck, Clock3, FilePenLine, Inbox } from 'lucide-react'
import { getMarketDisplay } from '../../config/currency.js'
import { useLocalePath } from '../../utils/locale.js'
import { AdminEmptyState, AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { createCandlestickBuckets, createMovingAverage, getCandlestickBucketSize } from './adminAnalyticsCandlestick.js'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

const quoteTrendSeries = [
  { color: '#9a7a2f', key: 'draft' },
  { color: '#2a234f', key: 'sent' },
  { color: '#2f7d5a', key: 'accepted' },
  { color: '#e06f8a', key: 'rejected' },
  { color: '#b54a5c', key: 'cancelled' },
]

const chartLocales = {
  kr: 'ko-KR',
  en: 'en-US',
  jp: 'ja-JP',
  'zh-TW': 'zh-TW',
}

function formatChartValue(value, locale) {
  return new Intl.NumberFormat(chartLocales[locale] || 'en-US', { maximumFractionDigits: 1 }).format(value)
}

function formatChartDate(date, locale) {
  if (!date) return ''
  return new Intl.DateTimeFormat(chartLocales[locale] || 'en-US', { day: 'numeric', month: 'numeric' }).format(new Date(`${date}T00:00:00+09:00`))
}

function getMaximum(rows = []) {
  return Math.max(1, ...rows.map((row) => Number(row.count || 0)))
}

function getChartPercentage(value, maximum) {
  return value > 0 ? Math.max(8, Math.round((value / maximum) * 100)) : 0
}

function AnalyticsBar({ maximum, tone, value }) {
  const width = getChartPercentage(value, maximum)
  return <span aria-hidden="true" className="admin-analytics-bar"><span className={`is-${tone}`} style={{ width: `${width}%` }} /></span>
}

function StatusColumnChart({ rows }) {
  const maximum = getMaximum(rows)

  return <div className="admin-analytics-column-chart" role="list">
    {rows.map((row) => {
      const height = getChartPercentage(row.count, maximum)
      return <div className="admin-analytics-column" key={row.status} role="listitem">
        <b>{row.count}</b>
        <span aria-hidden="true" className="admin-analytics-column-track">
          <span className={`admin-analytics-column-fill is-${row.status}${height === 0 ? ' is-zero' : ''}`} style={{ height: `${height}%` }} />
        </span>
        <AdminStatus status={row.status} />
      </div>
    })}
  </div>
}

function getCandlestickPosition(value, maximum) {
  return `${(Number(value || 0) / maximum) * 100}%`
}

function getMovingAveragePath(values, maximum) {
  if (values.length === 0) return ''

  return values.map((value, index) => {
    const x = ((index + 0.5) / values.length) * 100
    const y = 100 - ((value / maximum) * 100)
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
}

function QuoteStatusCandlestick({ data, locale, rangeDays, selectedStatus, t }) {
  const statusKeys = quoteTrendSeries.map((series) => series.key)
  const rows = createCandlestickBuckets(data, selectedStatus, statusKeys, getCandlestickBucketSize(rangeDays))
  const movingAverage3 = createMovingAverage(rows, 3)
  const movingAverage5 = createMovingAverage(rows, 5)
  const maximum = Math.max(1, ...rows.map((row) => row.high), ...movingAverage3, ...movingAverage5)
  const maximumVolume = Math.max(1, ...rows.map((row) => row.volume))
  const axisTicks = [maximum, maximum / 2, 0]
  const volumeTicks = [maximumVolume, 0]
  const labelInterval = Math.max(1, Math.ceil(rows.length / 5))

  return <figure aria-label={t.analytics.quoteTrendAria} className="admin-analytics-candlestick">
    <div aria-hidden="true" className="admin-analytics-candlestick-axis is-main">
      {axisTicks.map((value, index) => <span key={`${value}-${index}`} style={{ bottom: getCandlestickPosition(value, maximum) }}>{formatChartValue(value, locale)}</span>)}
    </div>
    <div className="admin-analytics-candlestick-plot">
      <div aria-hidden="true" className="admin-analytics-candlestick-grid">
        {axisTicks.map((value, index) => <span key={`${value}-${index}`} style={{ bottom: getCandlestickPosition(value, maximum) }} />)}
      </div>
      <svg aria-hidden="true" className="admin-analytics-candlestick-average" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path className="is-short" d={getMovingAveragePath(movingAverage3, maximum)} vectorEffect="non-scaling-stroke" />
        <path className="is-long" d={getMovingAveragePath(movingAverage5, maximum)} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="admin-analytics-candlestick-columns" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((row) => {
          const isUp = row.close > row.open
          const isDown = row.close < row.open
          const direction = isUp ? 'is-up' : isDown ? 'is-down' : 'is-flat'
          const startDate = formatChartDate(row.startDate, locale)
          const endDate = formatChartDate(row.endDate, locale)
          const dateLabel = startDate === endDate ? startDate : `${startDate}–${endDate}`
          const summary = `${dateLabel}: ${t.analytics.candlestickOpen} ${formatChartValue(row.open, locale)}, ${t.analytics.candlestickHigh} ${formatChartValue(row.high, locale)}, ${t.analytics.candlestickLow} ${formatChartValue(row.low, locale)}, ${t.analytics.candlestickClose} ${formatChartValue(row.close, locale)}, ${t.analytics.candlestickVolume} ${formatChartValue(row.volume, locale)}`
          const bodyBottom = Math.min(row.open, row.close)
          const bodyHeight = (Math.abs(row.close - row.open) / maximum) * 100

          return <div aria-label={summary} className={`admin-analytics-candle ${direction}${row.volume === 0 ? ' is-empty' : ''}`} key={`${row.startDate}-${row.endDate}`} role="img" tabIndex="0" title={summary}>
            <span aria-hidden="true" className="admin-analytics-candle-wick" style={{ bottom: getCandlestickPosition(row.low, maximum), height: getCandlestickPosition(row.high - row.low, maximum) }} />
            <span aria-hidden="true" className="admin-analytics-candle-body" style={{ '--admin-candle-bottom': getCandlestickPosition(bodyBottom, maximum), '--admin-candle-height': `${bodyHeight}%` }} />
          </div>
        })}
      </div>
    </div>
    <div aria-hidden="true" className="admin-analytics-candlestick-axis is-volume">
      {volumeTicks.map((value, index) => <span key={`${value}-${index}`} style={{ bottom: getCandlestickPosition(value, maximumVolume) }}>{formatChartValue(value, locale)}</span>)}
    </div>
    <div className="admin-analytics-candlestick-volume">
      <div className="admin-analytics-volume-columns" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((row) => <span aria-hidden="true" className={row.close >= row.open ? 'is-up' : 'is-down'} key={`${row.startDate}-${row.endDate}`} style={{ height: getCandlestickPosition(row.volume, maximumVolume) }} />)}
      </div>
    </div>
    <div aria-hidden="true" className="admin-analytics-candlestick-dates" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((row, index) => <span key={`${row.startDate}-${row.endDate}`}>{(index % labelInterval === 0 || index === rows.length - 1) ? formatChartDate(row.endDate, locale) : ''}</span>)}
    </div>
    <figcaption>
      <span className="is-short">MA3</span>
      <span className="is-long">MA5</span>
      <span className="is-volume">{t.analytics.candlestickVolume}</span>
    </figcaption>
  </figure>
}

function CurrencyComparisonChart({ row, t }) {
  const maximum = Math.max(1, Number(row.requestedTotal || 0), Number(row.issuedTotal || 0))
  const series = [
    { count: row.requestCount, label: t.analytics.requestedAmount, tone: 'requested', value: row.requestedTotal },
    { count: row.issuedCount, label: t.analytics.issuedAmount, tone: 'issued', value: row.issuedTotal },
  ]

  return <article className="admin-analytics-currency-chart">
    <header>
      <strong>{row.currency}</strong>
      <span>{t.analytics.requestCount} {row.requestCount} / {t.analytics.issuedCount} {row.issuedCount}</span>
    </header>
    <div className="admin-analytics-currency-series">
      {series.map((item) => <div key={item.tone}>
        <div><span>{item.label}</span><strong><AdminMoney currency={row.currency} value={item.value} /></strong></div>
        <AnalyticsBar maximum={maximum} tone={item.tone} value={item.value} />
      </div>)}
    </div>
  </article>
}

export function AdminAnalyticsPage() {
  const t = useAdminCopy()
  const { locale } = useLocalePath()
  const [trendRange, setTrendRange] = useState(30)
  const [selectedQuoteStatus, setSelectedQuoteStatus] = useState('all')
  const { data, error, status } = useAdminApiResource((api, token) => api.getAnalytics(token), [])
  const trendData = useMemo(() => (data?.quotes?.trend?.points || []).slice(-trendRange), [data, trendRange])
  const trendTotal = useMemo(() => trendData.reduce((total, point) => {
    if (selectedQuoteStatus === 'all') return total + quoteTrendSeries.reduce((sum, series) => sum + Number(point[series.key] || 0), 0)
    return total + Number(point[selectedQuoteStatus] || 0)
  }, 0), [selectedQuoteStatus, trendData])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const overview = data?.overview || {}
  const inquiryStatuses = data?.inquiries?.statuses || []
  const markets = data?.markets || []
  const currencyTotals = data?.currencyTotals || []
  const marketMaximum = getMaximum(markets)
  const productRows = [
    { count: data?.products?.visible || 0, key: 'visible', label: t.analytics.visibleProducts, tone: 'visible' },
    { count: data?.products?.hidden || 0, key: 'hidden', label: t.analytics.hiddenProducts, tone: 'hidden' },
  ]
  const productMaximum = getMaximum(productRows)
  const periodOptions = [
    { days: 7, label: t.analytics.last7Days },
    { days: 30, label: t.analytics.last30Days },
    { days: 90, label: t.analytics.last90Days },
  ]
  const statusOptions = [{ color: '#2a234f', key: 'all' }, ...quoteTrendSeries]
  const metrics = [
    { key: 'open-inquiries', icon: Inbox, label: t.analytics.openInquiries, note: t.analytics.openInquiriesNote, value: overview.openInquiries || 0, to: '/admin/inquiries' },
    { key: 'draft-quotes', icon: FilePenLine, label: t.analytics.draftQuotes, note: t.analytics.draftQuotesNote, value: overview.draftQuotes || 0, to: '/admin/quotes' },
    { key: 'awaiting-buyer', icon: Clock3, label: t.analytics.awaitingBuyer, note: t.analytics.awaitingBuyerNote, value: overview.awaitingBuyer || 0, to: '/admin/quotes' },
    { key: 'accepted-quotes', icon: BadgeCheck, label: t.analytics.acceptedQuotes, note: t.analytics.acceptedQuotesNote, value: overview.acceptedQuotes || 0, to: '/admin/quotes' },
  ]
  return <>
    <AdminPageHeader title={t.analytics.title} description={t.analytics.description} />
    <div className="admin-analytics-freshness">
      <span>{t.analytics.note}</span>
      {data?.generatedAt && <time dateTime={data.generatedAt}>{t.analytics.generatedAt}: {new Date(data.generatedAt).toLocaleString()}</time>}
    </div>

    <section aria-label={t.analytics.keyMetrics} className="admin-analytics-kpis">
      {metrics.map(({ icon: Icon, key, label, note, to, value }) => <AdminLink className="admin-analytics-kpi" key={key} to={to}>
        <Icon aria-hidden="true" size={20} />
        <span><small>{label}</small><strong>{value}</strong><b>{note}</b></span>
      </AdminLink>)}
    </section>

    <div className="admin-analytics-main-grid">
      <section className="admin-analytics-section admin-analytics-trend">
        <header>
          <div><h2>{t.analytics.quoteFlow}</h2><p>{t.analytics.quoteFlowDescription}</p></div>
          <div className="admin-analytics-trend-summary"><small>{t.analytics.periodTransitions}</small><strong>{trendTotal}</strong></div>
        </header>
        <div className="admin-analytics-trend-toolbar">
          <div aria-label={t.analytics.trendRange} className="admin-analytics-period-control" role="group">
            {periodOptions.map((option) => <button aria-pressed={trendRange === option.days} key={option.days} onClick={() => setTrendRange(option.days)} type="button">{option.label}</button>)}
          </div>
          <div aria-label={t.analytics.selectedStatus} className="admin-analytics-status-controls" role="radiogroup">
            {statusOptions.map((series) => <button
              aria-checked={selectedQuoteStatus === series.key}
              key={series.key}
              onClick={() => setSelectedQuoteStatus(series.key)}
              role="radio"
              style={{ '--admin-series-color': series.color }}
              type="button"
            ><span aria-hidden="true" />{series.key === 'all' ? t.analytics.allStatuses : getAdminStatusLabel(t, series.key)}</button>)}
          </div>
        </div>
        <QuoteStatusCandlestick data={trendData} locale={locale} rangeDays={trendRange} selectedStatus={selectedQuoteStatus} t={t} />
        {trendTotal === 0 && <p className="admin-analytics-trend-empty">{t.analytics.noTrendActivity}</p>}
        <small className="admin-analytics-time-zone">{t.analytics.koreaBusinessDay}</small>
      </section>

      <section className="admin-analytics-section">
        <header><div><h2>{t.analytics.inquiryFlow}</h2><p>{t.analytics.inquiryFlowDescription}</p></div><strong>{data?.inquiries?.total || 0}</strong></header>
        <StatusColumnChart rows={inquiryStatuses} />
      </section>

      <section className="admin-analytics-section">
        <header><div><h2>{t.analytics.marketDistribution}</h2><p>{t.analytics.marketDistributionDescription}</p></div></header>
        {markets.length === 0 ? <AdminEmptyState title={t.analytics.noMarketData} /> : <div className="admin-analytics-breakdown">
          {markets.map((row) => {
            const market = getMarketDisplay(row.market)
            return <div className="admin-analytics-breakdown-row" key={row.market}>
              <div><span className="admin-analytics-market"><img alt="" src={market.flagSrc} />{market.label}</span><b>{row.count}</b></div>
              <AnalyticsBar maximum={marketMaximum} tone="market" value={row.count} />
            </div>
          })}
        </div>}
      </section>

      <section className="admin-analytics-section admin-analytics-operations">
        <header><div><h2>{t.analytics.buyerAndCatalog}</h2><p>{t.analytics.buyerAndCatalogDescription}</p></div></header>
        <div className="admin-analytics-pending"><span>{t.analytics.pendingBuyers}</span><strong>{overview.pendingBuyers || 0}</strong></div>
        <div className="admin-analytics-breakdown">
          {productRows.map((row) => <div className="admin-analytics-breakdown-row" key={row.key}>
            <div><span>{row.label}</span><b>{row.count}</b></div>
            <AnalyticsBar maximum={productMaximum} tone={row.tone} value={row.count} />
          </div>)}
        </div>
      </section>
    </div>

    <section className="admin-analytics-section admin-analytics-currency">
      <header><div><h2>{t.analytics.currencyTotals}</h2><p>{t.analytics.currencyTotalsDescription}</p></div></header>
      {currencyTotals.length === 0 ? <AdminEmptyState title={t.analytics.noCurrencyData} /> : <div className="admin-analytics-currency-grid">
        {currencyTotals.map((row) => <CurrencyComparisonChart key={row.currency} row={row} t={t} />)}
      </div>}
    </section>
  </>
}
