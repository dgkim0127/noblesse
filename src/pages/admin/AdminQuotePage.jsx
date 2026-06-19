import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const quoteStatuses = ['draft', 'sent', 'accepted', 'cancelled']

export function AdminQuotePage() {
  const { quoteId } = useParams()
  const [refreshKey, setRefreshKey] = useState(0)
  const [message, setMessage] = useState('')
  const [savingStatus, setSavingStatus] = useState('')
  const { data, error, status } = useAdminApiResource((api, token) => api.getQuote(quoteId, token), [quoteId, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const quote = data?.quote
  const items = data?.items || []

  if (!quote) {
    return <>
      <AdminPageHeader eyebrow="Admin API" title="Quote not found" description="The selected quote could not be loaded." />
      <AdminLink to="/admin/quotes">Back to Quotes</AdminLink>
    </>
  }

  const updateStatus = async (nextStatus) => {
    setSavingStatus(nextStatus)
    setMessage('')
    try {
      await mutate((api, token) => api.updateQuoteStatus(quote.id, nextStatus, token))
      setMessage(`Quote status updated to ${nextStatus}.`)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to update quote status.')
    } finally {
      setSavingStatus('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title={`Admin Quote / ${quote.inquiryNumber || quote.id}`}
      description="Review quote draft values generated from an inquiry snapshot."
      actions={<><AdminLink to="/admin/quotes">Back to Quotes</AdminLink><AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>Back to Inquiry</AdminLink></>}
    />
    <AdminPreviewNote>Quote status changes are available for admin tracking. External sending and price editing remain manual until a separate production workflow is approved.</AdminPreviewNote>
    <section className="admin-card">
      <h2>Quote Status</h2>
      <p>Changing quote status is a protected admin API write and creates an audit log entry.</p>
      <div className="admin-actions">
        {quoteStatuses.map((status) => <button
          disabled={savingStatus === status || quote.status === status}
          key={status}
          onClick={() => updateStatus(status)}
          type="button"
        >
          {quote.status === status ? `${status} current` : `Set ${status}`}
        </button>)}
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
    </section>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Quote Info</h2>
        <dl className="admin-definition-list">
          <dt>Inquiry</dt><dd>{quote.inquiryNumber || quote.inquiryId}</dd>
          <dt>Buyer</dt><dd>{quote.companyName || '-'}</dd>
          <dt>Currency</dt><dd>{quote.currency}</dd>
          <dt>Status</dt><dd>{quote.status}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Quote Conditions</h2>
        <dl className="admin-definition-list">
          <dt>Lead Time</dt><dd>{quote.leadTime || '-'}</dd>
          <dt>Shipping Note</dt><dd>{quote.shippingNote || '-'}</dd>
          <dt>Requested Total</dt><dd><AdminMoney value={quote.requestedTotal || 0} currency={quote.currency} /></dd>
          <dt>Confirmed Total</dt><dd><AdminMoney value={quote.confirmedTotal || 0} currency={quote.currency} /></dd>
        </dl>
      </article>
    </section>

    <section className="admin-card admin-quote-editor">
      <h2>Admin Quote Items</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Requested Quantity</th><th>Confirmed Quantity</th><th>Requested priceSnapshot</th><th>Confirmed Unit Price</th><th>Confirmed Subtotal</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td>{item.productCode}</td>
            <td>{item.requestedQuantity}</td>
            <td>{item.confirmedQuantity}</td>
            <td><AdminMoney value={item.requestedPriceSnapshot || 0} currency={quote.currency} /></td>
            <td><AdminMoney value={item.confirmedUnitPrice || 0} currency={quote.currency} /></td>
            <td><AdminMoney value={item.confirmedSubtotal || 0} currency={quote.currency} /></td>
          </tr>)}</tbody>
        </table>
        {items.length === 0 && <p className="admin-empty">No quote items found.</p>}
      </div>
      <h2>Internal Memo</h2>
      <label>Admin Memo<textarea readOnly value={quote.adminMemo || ''} /></label>
    </section>
  </>
}
