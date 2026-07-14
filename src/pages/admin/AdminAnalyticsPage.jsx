import { BadgeCheck, Clock3, FilePenLine, Inbox } from 'lucide-react'
import { getMarketDisplay } from '../../config/currency.js'
import { AdminEmptyState, AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

function getMaximum(rows = []) {
  return Math.max(1, ...rows.map((row) => Number(row.count || 0)))
}

function AnalyticsBar({ count, maximum, tone }) {
  const width = count > 0 ? Math.max(5, Math.round((count / maximum) * 100)) : 0
  return <span aria-hidden="true" className="admin-analytics-bar"><span className={`is-${tone}`} style={{ width: `${width}%` }} /></span>
}

export function AdminAnalyticsPage() {
  const t = useAdminCopy()
  const { data, error, status } = useAdminApiResource((api, token) => api.getAnalytics(token), [])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const overview = data?.overview || {}
  const quoteStatuses = data?.quotes?.statuses || []
  const inquiryStatuses = data?.inquiries?.statuses || []
  const markets = data?.markets || []
  const currencyTotals = data?.currencyTotals || []
  const quoteMaximum = getMaximum(quoteStatuses)
  const inquiryMaximum = getMaximum(inquiryStatuses)
  const marketMaximum = getMaximum(markets)
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
      <section className="admin-analytics-section">
        <header><div><h2>{t.analytics.quoteFlow}</h2><p>{t.analytics.quoteFlowDescription}</p></div><strong>{data?.quotes?.total || 0}</strong></header>
        <div className="admin-analytics-breakdown">
          {quoteStatuses.map((row) => <div className="admin-analytics-breakdown-row" key={row.status}>
            <div><AdminStatus status={row.status} /><b>{row.count}</b></div>
            <AnalyticsBar count={row.count} maximum={quoteMaximum} tone={row.status} />
          </div>)}
        </div>
      </section>

      <section className="admin-analytics-section">
        <header><div><h2>{t.analytics.inquiryFlow}</h2><p>{t.analytics.inquiryFlowDescription}</p></div><strong>{data?.inquiries?.total || 0}</strong></header>
        <div className="admin-analytics-breakdown">
          {inquiryStatuses.map((row) => <div className="admin-analytics-breakdown-row" key={row.status}>
            <div><AdminStatus status={row.status} /><b>{row.count}</b></div>
            <AnalyticsBar count={row.count} maximum={inquiryMaximum} tone={row.status} />
          </div>)}
        </div>
      </section>

      <section className="admin-analytics-section">
        <header><div><h2>{t.analytics.marketDistribution}</h2><p>{t.analytics.marketDistributionDescription}</p></div></header>
        {markets.length === 0 ? <AdminEmptyState title={t.analytics.noMarketData} /> : <div className="admin-analytics-breakdown">
          {markets.map((row) => {
            const market = getMarketDisplay(row.market)
            return <div className="admin-analytics-breakdown-row" key={row.market}>
              <div><span className="admin-analytics-market"><img alt="" src={market.flagSrc} />{market.label}</span><b>{row.count}</b></div>
              <AnalyticsBar count={row.count} maximum={marketMaximum} tone="market" />
            </div>
          })}
        </div>}
      </section>

      <section className="admin-analytics-section admin-analytics-operations">
        <header><div><h2>{t.analytics.buyerAndCatalog}</h2><p>{t.analytics.buyerAndCatalogDescription}</p></div></header>
        <dl>
          <div><dt>{t.analytics.pendingBuyers}</dt><dd>{overview.pendingBuyers || 0}</dd></div>
          <div><dt>{t.analytics.visibleProducts}</dt><dd>{data?.products?.visible || 0}</dd></div>
          <div><dt>{t.analytics.hiddenProducts}</dt><dd>{data?.products?.hidden || 0}</dd></div>
        </dl>
      </section>
    </div>

    <section className="admin-analytics-section admin-analytics-currency">
      <header><div><h2>{t.analytics.currencyTotals}</h2><p>{t.analytics.currencyTotalsDescription}</p></div></header>
      {currencyTotals.length === 0 ? <AdminEmptyState title={t.analytics.noCurrencyData} /> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.currency}</th><th>{t.analytics.requestCount}</th><th>{t.analytics.requestedAmount}</th><th>{t.analytics.issuedCount}</th><th>{t.analytics.issuedAmount}</th></tr></thead>
          <tbody>{currencyTotals.map((row) => <tr key={row.currency}>
            <td data-label={t.fields.currency}><strong>{row.currency}</strong></td>
            <td data-label={t.analytics.requestCount}>{row.requestCount}</td>
            <td data-label={t.analytics.requestedAmount}><AdminMoney currency={row.currency} value={row.requestedTotal} /></td>
            <td data-label={t.analytics.issuedCount}>{row.issuedCount}</td>
            <td data-label={t.analytics.issuedAmount}><AdminMoney currency={row.currency} value={row.issuedTotal} /></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </>
}
