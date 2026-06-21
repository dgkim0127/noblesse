import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

const quoteStatuses = ['draft', 'sent', 'accepted', 'cancelled']

export function AdminQuotePage() {
  const t = useAdminCopy()
  const { quoteId } = useParams()
  const [refreshKey, setRefreshKey] = useState(0)
  const [message, setMessage] = useState('')
  const [savingStatus, setSavingStatus] = useState('')
  const { data, error, status } = useAdminApiResource((api, token) => api.getQuote(quoteId, token), [quoteId, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const quote = data?.quote
  const items = data?.items || []

  if (!quote) {
    return <>
      <AdminPageHeader title={t.quotes.notFound} description={t.quotes.notFoundDescription} />
      <AdminLink to="/admin/quotes">{t.quotes.backToQuotes}</AdminLink>
    </>
  }

  const updateStatus = async (nextStatus) => {
    setSavingStatus(nextStatus)
    setMessage('')
    try {
      await mutate((api, token) => api.updateQuoteStatus(quote.id, nextStatus, token))
      setMessage(formatAdminCopy(t.quotes.statusUpdated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.quotes.statusFailed)
    } finally {
      setSavingStatus('')
    }
  }

  return <>
    <AdminPageHeader
      title={`${t.quotes.detailTitle} / ${quote.inquiryNumber || quote.id}`}
      description={t.quotes.detailDescription}
      actions={<><AdminLink to="/admin/quotes">{t.quotes.backToQuotes}</AdminLink><AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>{t.quotes.backToInquiry}</AdminLink></>}
    />
    <AdminPreviewNote>{t.quotes.detailNote}</AdminPreviewNote>
    <section className="admin-card">
      <h2>{t.quotes.quoteStatus}</h2>
      <p>{t.quotes.statusHelp}</p>
      <div className="admin-actions">
        {quoteStatuses.map((status) => <button
          disabled={savingStatus === status || quote.status === status}
          key={status}
          onClick={() => updateStatus(status)}
          type="button"
        >
          {quote.status === status ? `${getAdminStatusLabel(t, status)} ${t.common.current}` : `${t.common.set} ${getAdminStatusLabel(t, status)}`}
        </button>)}
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
    </section>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>{t.quotes.quoteInfo}</h2>
        <dl className="admin-definition-list">
          <dt>{t.fields.inquiry}</dt><dd>{quote.inquiryNumber || quote.inquiryId}</dd>
          <dt>{t.fields.buyer}</dt><dd>{quote.companyName || '-'}</dd>
          <dt>{t.fields.currency}</dt><dd>{quote.currency}</dd>
          <dt>{t.common.status}</dt><dd>{getAdminStatusLabel(t, quote.status)}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.quotes.quoteConditions}</h2>
        <dl className="admin-definition-list">
          <dt>{t.quotes.leadTime}</dt><dd>{quote.leadTime || '-'}</dd>
          <dt>{t.quotes.shippingNote}</dt><dd>{quote.shippingNote || '-'}</dd>
          <dt>{t.quotes.requestedTotal}</dt><dd><AdminMoney value={quote.requestedTotal || 0} currency={quote.currency} /></dd>
          <dt>{t.quotes.confirmedTotal}</dt><dd><AdminMoney value={quote.confirmedTotal || 0} currency={quote.currency} /></dd>
        </dl>
      </article>
    </section>

    <section className="admin-card admin-quote-editor">
      <h2>{t.quotes.quoteItems}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.quotes.requestedQuantity}</th><th>{t.quotes.confirmedQuantity}</th><th>{t.quotes.requestedPriceSnapshot}</th><th>{t.quotes.confirmedUnitPrice}</th><th>{t.quotes.confirmedSubtotal}</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td>{item.productCode}</td>
            <td>{item.requestedQuantity}</td>
            <td>{item.confirmedQuantity}</td>
            <td><AdminMoney value={item.requestedPriceSnapshot || 0} currency={quote.currency} /></td>
            <td><AdminMoney value={item.confirmedUnitPrice || 0} currency={quote.currency} /></td>
            <td><AdminMoney value={item.confirmedSubtotal || 0} currency={quote.currency} /></td>
          </tr>)}</tbody>
        </table>
        {items.length === 0 && <p className="admin-empty">{t.quotes.noItems}</p>}
      </div>
      <h2>{t.quotes.internalMemo}</h2>
      <label>{t.inquiries.adminMemo}<textarea readOnly value={quote.adminMemo || ''} /></label>
    </section>
  </>
}
