import { useMemo, useState } from 'react'
import { formatCurrency, formatMarketLabel, getMarketDisplay, marketCurrency, supportedCurrencies, supportedMarkets } from '../../config/currency.js'
import { AdminConfirmDialog, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

const policyStatuses = ['pending_rate', 'active', 'held_deadband', 'updated', 'created', 'blocked_stale', 'blocked_spike', 'paused', 'error']

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatBps(value) {
  if (value === undefined || value === null || value === '') return '-'
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '-'
  return `${(parsed / 100).toFixed(2)}%`
}

function FxRateCard({ rate, t }) {
  const market = Object.keys(marketCurrency).find((key) => marketCurrency[key] === rate.quoteCurrency) || 'GLOBAL'
  const display = getMarketDisplay(market)
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
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pauseTarget, setPauseTarget] = useState(null)
  const [pauseReason, setPauseReason] = useState('')
  const [pauseBusy, setPauseBusy] = useState(false)
  const filters = useMemo(() => ({ status: statusFilter }), [statusFilter])
  const statusResource = useAdminApiResource((api, token) => api.getFxStatus(token), [refreshKey])
  const ratesResource = useAdminApiResource((api, token) => api.getFxRates(token), [refreshKey])
  const runsResource = useAdminApiResource((api, token) => api.getFxRuns(token), [refreshKey])
  const pricesResource = useAdminApiResource((api, token) => api.getFxPrices(filters, token), [statusFilter, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = [statusResource, ratesResource, runsResource, pricesResource]
    .map((resource) => shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} key={resource.status + resource.error} status={resource.status} /> : null)
    .find(Boolean)
  if (apiState) return apiState

  const rates = ratesResource.data?.rates || statusResource.data?.latestRates || []
  const runs = runsResource.data?.runs || []
  const prices = pricesResource.data?.prices || []
  const lastRun = statusResource.data?.lastRun || runs[0]
  const priceCounts = statusResource.data?.priceCounts || {}
  const policy = statusResource.data?.policy || {}

  const refresh = () => setRefreshKey((current) => current + 1)

  const evaluateAll = async () => {
    setMessage('')
    await mutate((api, token) => api.evaluateFxPrices({}, token))
    setMessage(t.fx.evaluated)
    refresh()
  }

  const requestPausePrice = (policyId) => {
    setPauseTarget(policyId)
    setPauseReason('')
  }

  const pausePrice = async () => {
    if (!pauseTarget || !pauseReason.trim()) return
    setPauseBusy(true)
    setMessage('')
    try {
      await mutate((api, token) => api.pauseFxPrice(pauseTarget, { reason: pauseReason.trim() }, token))
      setMessage(t.fx.paused)
      setPauseTarget(null)
      setPauseReason('')
      refresh()
    } finally {
      setPauseBusy(false)
    }
  }

  const resumePrice = async (policyId) => {
    setMessage('')
    await mutate((api, token) => api.resumeFxPrice(policyId, token))
    setMessage(t.fx.resumed)
    refresh()
  }

  return <>
    <AdminPageHeader title={t.fx.title} description={t.fx.description} />
    <AdminPreviewNote>{t.fx.note}</AdminPreviewNote>

    <section className="admin-fx-summary">
      <article className="admin-card">
        <p className="eyebrow">{t.fx.policy}</p>
        <h2>{t.fx.reviewTitle}</h2>
        <dl className="admin-fx-kpis">
          <div><dt>{t.fx.deadband}</dt><dd>{formatBps(policy.updateThresholdBps ?? 500)}</dd></div>
          <div><dt>{t.fx.breaker}</dt><dd>{formatBps(policy.circuitBreakerBps ?? 1500)}</dd></div>
          <div><dt>{t.fx.maxAge}</dt><dd>{policy.maxRateAgeHours ?? 72}h</dd></div>
          <div><dt>{t.fx.lastRun}</dt><dd>{formatDateTime(lastRun?.completedAt || lastRun?.createdAt)}</dd></div>
        </dl>
      </article>
      <article className="admin-card">
        <p className="eyebrow">{t.fx.schedule}</p>
        <h2>{t.fx.scheduleTitle}</h2>
        <p>{t.fx.autoRule}</p>
        <p>{policy.schedule?.rateSnapshotAndEvaluation || t.fx.snapshotSchedule}</p>
      </article>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <p className="eyebrow">{t.fx.currentRates}</p>
          <h2>{t.fx.ratesTitle}</h2>
        </div>
        <button type="button" onClick={evaluateAll}>{t.fx.evaluate}</button>
      </div>
      <div className="admin-fx-rates">
        {rates.length === 0 ? <p className="admin-empty">{t.fx.emptyRates}</p> : rates.map((rate) => <FxRateCard key={rate.id || rate.quoteCurrency} rate={rate} t={t} />)}
      </div>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <p className="eyebrow">{t.fx.prices}</p>
          <h2>{t.fx.pricesTitle}</h2>
        </div>
        <label className="admin-search">{t.common.status}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">{t.common.all}</option>
          {policyStatuses.map((status) => <option key={status} value={status}>{t.fx.statuses[status]}</option>)}
        </select></label>
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
      <div className="admin-fx-counts">
        {policyStatuses.map((status) => <span key={status}>{t.fx.statuses[status]}: {priceCounts[status] || 0}</span>)}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.market}</th><th>{t.fields.currency}</th><th>{t.fx.mode}</th><th>{t.fx.publishedPrice}</th><th>{t.fx.referencePrice}</th><th>{t.fx.divergence}</th><th>{t.fx.lastAutoUpdate}</th><th>{t.common.status}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{prices.map((price) => {
            const market = getMarketDisplay(price.targetMarket)
            return <tr key={price.id}>
              <td data-label={t.fields.productCode}>{price.productCode || price.productNameEn || price.productNameKo || '-'}</td>
              <td data-label={t.fields.market}><img alt={market.label} className="admin-market-flag" src={market.flagSrc} title={formatMarketLabel(price.targetMarket)} /></td>
              <td data-label={t.fields.currency}>{price.targetCurrency}</td>
              <td data-label={t.fx.mode}>{t.fx.modes[price.pricingMode] || price.pricingMode}</td>
              <td data-label={t.fx.publishedPrice}>{price.currentWholesalePrice == null ? '-' : formatCurrency(price.currentWholesalePrice, price.targetCurrency, { showCode: true })}</td>
              <td data-label={t.fx.referencePrice}>{price.latestReferenceWholesalePrice == null ? '-' : formatCurrency(price.latestReferenceWholesalePrice, price.targetCurrency, { showCode: true })}</td>
              <td data-label={t.fx.divergence}>{formatBps(price.divergenceBps)}</td>
              <td data-label={t.fx.lastAutoUpdate}>{formatDateTime(price.lastAppliedAt)}</td>
              <td data-label={t.common.status}>{t.fx.statuses[price.status] || price.status}</td>
              <td data-label={t.common.actions}>
                <div className="admin-actions tight">
                  {price.status === 'paused'
                    ? <button type="button" onClick={() => resumePrice(price.id)}>{t.fx.resume}</button>
                    : <button type="button" onClick={() => requestPausePrice(price.id)}>{t.fx.pause}</button>}
                </div>
              </td>
            </tr>
          })}</tbody>
        </table>
        {prices.length === 0 && <p className="admin-empty">{t.fx.emptyPrices}</p>}
      </div>
    </section>

    <section className="admin-card">
      <p className="eyebrow">{t.fx.marketCurrency}</p>
      <div className="admin-fx-market-list">
        {supportedMarkets.map((market) => {
          const display = getMarketDisplay(market)
          const currency = marketCurrency[market] || 'USD'
          return <span key={market}><img alt={display.label} className="admin-market-flag" src={display.flagSrc} /> {market}/{supportedCurrencies.includes(currency) ? currency : 'USD'}</span>
        })}
      </div>
    </section>
    <AdminConfirmDialog
      busy={pauseBusy}
      confirmDisabled={!pauseReason.trim()}
      confirmLabel={t.fx.pause}
      description={t.fx.pauseReason}
      open={Boolean(pauseTarget)}
      title={t.fx.pause}
      onCancel={() => {
        if (!pauseBusy) {
          setPauseTarget(null)
          setPauseReason('')
        }
      }}
      onConfirm={pausePrice}
    >
      <label className="admin-dialog-field">
        <span>{t.fx.pauseReason}</span>
        <textarea rows="3" value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} />
      </label>
    </AdminConfirmDialog>
  </>
}
