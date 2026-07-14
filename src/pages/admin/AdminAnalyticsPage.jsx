import { useMemo, useState } from 'react'
import { BadgeCheck, Clock3, FilePenLine, Inbox } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getMarketDisplay } from '../../config/currency.js'
import { useLocalePath } from '../../utils/locale.js'
import { AdminEmptyState, AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
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

function formatChartDate(date, locale, full = false) {
  const value = new Date(`${date}T00:00:00+09:00`)
  return new Intl.DateTimeFormat(chartLocales[locale] || 'en-US', full
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'numeric' }).format(value)
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

function QuoteTrendTooltip({ active, label, locale, payload, t }) {
  if (!active || !payload?.length || !label) return null

  return <div className="admin-analytics-trend-tooltip">
    <strong>{formatChartDate(label, locale, true)}</strong>
    {payload.map((item) => <div key={item.dataKey}>
      <span style={{ backgroundColor: item.stroke }} />
      <small>{getAdminStatusLabel(t, item.dataKey)}</small>
      <b>{item.value}</b>
    </div>)}
  </div>
}

function QuoteTrendChart({ data, locale, t, visibleStatuses }) {
  return <div aria-label={t.analytics.quoteTrendAria} className="admin-analytics-trend-chart" role="img">
    <ResponsiveContainer height="100%" width="100%">
      <AreaChart accessibilityLayer data={data} margin={{ bottom: 2, left: -8, right: 8, top: 10 }}>
        <CartesianGrid stroke="#e4e6eb" vertical={false} />
        <XAxis axisLine={false} dataKey="date" minTickGap={24} tick={{ fill: '#6d7080', fontSize: 11 }} tickFormatter={(value) => formatChartDate(value, locale)} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} domain={[0, (maximum) => Math.max(1, maximum)]} tick={{ fill: '#6d7080', fontSize: 11 }} tickLine={false} width={34} />
        <Tooltip content={<QuoteTrendTooltip locale={locale} t={t} />} cursor={{ stroke: '#c8cad2', strokeWidth: 1 }} />
        {quoteTrendSeries.filter((series) => visibleStatuses.has(series.key)).map((series) => <Area
          activeDot={{ r: 4, strokeWidth: 2 }}
          dataKey={series.key}
          dot={false}
          fill={series.color}
          fillOpacity={0.1}
          isAnimationActive={false}
          key={series.key}
          stroke={series.color}
          strokeWidth={2}
          type="monotone"
        />)}
      </AreaChart>
    </ResponsiveContainer>
  </div>
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
  const [visibleQuoteStatuses, setVisibleQuoteStatuses] = useState(() => new Set(quoteTrendSeries.map((series) => series.key)))
  const { data, error, status } = useAdminApiResource((api, token) => api.getAnalytics(token), [])
  const trendData = useMemo(() => (data?.quotes?.trend?.points || []).slice(-trendRange), [data, trendRange])
  const trendTotal = useMemo(() => trendData.reduce((total, point) => total + quoteTrendSeries.reduce((sum, series) => sum + Number(point[series.key] || 0), 0), 0), [trendData])
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
  const metrics = [
    { key: 'open-inquiries', icon: Inbox, label: t.analytics.openInquiries, note: t.analytics.openInquiriesNote, value: overview.openInquiries || 0, to: '/admin/inquiries' },
    { key: 'draft-quotes', icon: FilePenLine, label: t.analytics.draftQuotes, note: t.analytics.draftQuotesNote, value: overview.draftQuotes || 0, to: '/admin/quotes' },
    { key: 'awaiting-buyer', icon: Clock3, label: t.analytics.awaitingBuyer, note: t.analytics.awaitingBuyerNote, value: overview.awaitingBuyer || 0, to: '/admin/quotes' },
    { key: 'accepted-quotes', icon: BadgeCheck, label: t.analytics.acceptedQuotes, note: t.analytics.acceptedQuotesNote, value: overview.acceptedQuotes || 0, to: '/admin/quotes' },
  ]
  const toggleQuoteStatus = (statusKey) => {
    setVisibleQuoteStatuses((current) => {
      if (current.has(statusKey) && current.size === 1) return current
      const next = new Set(current)
      if (next.has(statusKey)) next.delete(statusKey)
      else next.add(statusKey)
      return next
    })
  }

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
          <div aria-label={t.analytics.visibleStatuses} className="admin-analytics-status-controls" role="group">
            {quoteTrendSeries.map((series) => <button
              aria-pressed={visibleQuoteStatuses.has(series.key)}
              key={series.key}
              onClick={() => toggleQuoteStatus(series.key)}
              style={{ '--admin-series-color': series.color }}
              type="button"
            ><span aria-hidden="true" />{getAdminStatusLabel(t, series.key)}</button>)}
          </div>
        </div>
        <QuoteTrendChart data={trendData} locale={locale} t={t} visibleStatuses={visibleQuoteStatuses} />
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
