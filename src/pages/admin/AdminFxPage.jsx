import { useMemo, useState } from 'react'
import { formatCurrency, formatMarketLabel, getMarketDisplay, supportedCurrencies, supportedMarkets } from '../../config/currency.js'
import { AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

const draftStatuses = ['pending', 'approved', 'rejected', 'expired', 'stale']

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatBps(value) {
  const parsed = Number(value || 0)
  return `${(parsed / 100).toFixed(2)}%`
}

function FxRateCard({ rate, t }) {
  const display = getMarketDisplay(rate.quoteCurrency === 'KRW' ? 'KR' : rate.quoteCurrency === 'JPY' ? 'JP' : rate.quoteCurrency === 'CNY' ? 'CN' : 'US')
  return <article className={`admin-fx-rate ${rate.isStale ? 'stale' : ''}`}>
    <div>
      <img alt={display.label} className="admin-market-flag" src={display.flagSrc} />
      <strong>{rate.quoteCurrency}</strong>
    </div>
    <p>{rate.krwPerUnit} KRW</p>
    <span>{rate.isStale ? t.fx.stale : t.fx.fresh}</span>
  </article>
}

export function AdminFxPage() {
  const t = useAdminCopy()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const filters = useMemo(() => ({ status: statusFilter }), [statusFilter])
  const statusResource = useAdminApiResource((api, token) => api.getFxStatus(token), [refreshKey])
  const ratesResource = useAdminApiResource((api, token) => api.getFxRates(token), [refreshKey])
  const runsResource = useAdminApiResource((api, token) => api.getFxReviewRuns(token), [refreshKey])
  const draftsResource = useAdminApiResource((api, token) => api.getFxDrafts(filters, token), [statusFilter, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = [statusResource, ratesResource, runsResource, draftsResource]
    .map((resource) => shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} key={resource.status + resource.error} status={resource.status} /> : null)
    .find(Boolean)
  if (apiState) return apiState

  const rates = ratesResource.data?.rates || statusResource.data?.latestRates || []
  const runs = runsResource.data?.reviewRuns || []
  const drafts = draftsResource.data?.drafts || []
  const lastRun = statusResource.data?.lastReviewRun || runs[0]
  const pendingCount = statusResource.data?.draftCounts?.pending ?? drafts.filter((draft) => draft.status === 'pending').length

  const approveDraft = async (draftId) => {
    if (!window.confirm(t.fx.confirmApprove)) return
    setMessage('')
    await mutate((api, token) => api.approveFxDraft(draftId, token))
    setMessage(t.fx.approved)
    setRefreshKey((current) => current + 1)
  }

  const rejectDraft = async (draftId) => {
    const reason = window.prompt(t.fx.rejectReason)
    if (!reason?.trim()) return
    setMessage('')
    await mutate((api, token) => api.rejectFxDraft(draftId, reason.trim(), token))
    setMessage(t.fx.rejected)
    setRefreshKey((current) => current + 1)
  }

  return <>
    <AdminPageHeader title={t.fx.title} description={t.fx.description} />
    <AdminPreviewNote>{t.fx.note}</AdminPreviewNote>

    <section className="admin-fx-summary">
      <article className="admin-card">
        <p className="eyebrow">{t.fx.policy}</p>
        <h2>{t.fx.reviewTitle}</h2>
        <dl className="admin-fx-kpis">
          <div><dt>{t.fx.threshold}</dt><dd>2%</dd></div>
          <div><dt>{t.fx.maxAge}</dt><dd>72h</dd></div>
          <div><dt>{t.fx.pendingDrafts}</dt><dd>{pendingCount}</dd></div>
          <div><dt>{t.fx.lastReview}</dt><dd>{formatDateTime(lastRun?.completedAt || lastRun?.createdAt)}</dd></div>
        </dl>
      </article>
      <article className="admin-card">
        <p className="eyebrow">{t.fx.schedule}</p>
        <h2>{t.fx.scheduleTitle}</h2>
        <p>{t.fx.snapshotSchedule}</p>
        <p>{t.fx.reviewSchedule}</p>
      </article>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <p className="eyebrow">{t.fx.currentRates}</p>
          <h2>{t.fx.ratesTitle}</h2>
        </div>
      </div>
      <div className="admin-fx-rates">
        {rates.length === 0 ? <p className="admin-empty">{t.fx.emptyRates}</p> : rates.map((rate) => <FxRateCard key={rate.id || rate.quoteCurrency} rate={rate} t={t} />)}
      </div>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <p className="eyebrow">{t.fx.drafts}</p>
          <h2>{t.fx.draftsTitle}</h2>
        </div>
        <label className="admin-search">{t.common.status}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {draftStatuses.map((status) => <option key={status} value={status}>{t.fx.statuses[status]}</option>)}
        </select></label>
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.market}</th><th>{t.fields.currency}</th><th>{t.fx.currentPrice}</th><th>{t.fx.proposedPrice}</th><th>{t.fx.rateChange}</th><th>{t.common.status}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{drafts.map((draft) => {
            const market = getMarketDisplay(draft.targetMarket)
            return <tr key={draft.id}>
              <td>{draft.productCode || draft.productNameEn || draft.productNameKo || '-'}</td>
              <td><img alt={market.label} className="admin-market-flag" src={market.flagSrc} title={formatMarketLabel(draft.targetMarket)} /></td>
              <td>{draft.targetCurrency}</td>
              <td>{draft.currentAmount == null ? '-' : formatCurrency(draft.currentAmount, draft.targetCurrency, { showCode: true })}</td>
              <td>{formatCurrency(draft.proposedAmount, draft.targetCurrency, { showCode: true })}</td>
              <td>{formatBps(draft.rateChangeBps)}</td>
              <td>{t.fx.statuses[draft.status] || draft.status}</td>
              <td>
                <div className="admin-actions tight">
                  <button disabled={draft.status !== 'pending'} type="button" onClick={() => approveDraft(draft.id)}>{t.fx.approve}</button>
                  <button disabled={draft.status !== 'pending'} type="button" onClick={() => rejectDraft(draft.id)}>{t.fx.reject}</button>
                </div>
              </td>
            </tr>
          })}</tbody>
        </table>
        {drafts.length === 0 && <p className="admin-empty">{t.fx.emptyDrafts}</p>}
      </div>
    </section>

    <section className="admin-card">
      <p className="eyebrow">{t.fx.marketCurrency}</p>
      <div className="admin-fx-market-list">
        {supportedMarkets.map((market) => {
          const display = getMarketDisplay(market)
          const currency = market === 'KR' ? 'KRW' : market === 'JP' ? 'JPY' : market === 'CN' ? 'CNY' : 'USD'
          return <span key={market}><img alt={display.label} className="admin-market-flag" src={display.flagSrc} /> {market}/{supportedCurrencies.includes(currency) ? currency : 'USD'}</span>
        })}
      </div>
    </section>
  </>
}
