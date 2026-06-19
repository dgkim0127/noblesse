import { useMemo, useState } from 'react'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const statusTabs = ['all', 'draft', 'sent', 'accepted', 'cancelled']
const pageSize = 20

export function AdminQuotesPage() {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [inquiryId, setInquiryId] = useState('')
  const [offset, setOffset] = useState(0)
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const filters = useMemo(() => ({
    status: status === 'all' ? '' : status,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, status])
  const { data, error, meta, status: requestStatus } = useAdminApiResource((api, token) => api.getQuotes(filters, token), [status, query, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={requestStatus} />
  if (loading) return loading

  const quotes = data?.quotes || []
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const createQuote = async (event) => {
    event.preventDefault()
    if (!inquiryId.trim()) return
    setMessage('')
    try {
      await mutate((api, token) => api.createQuote({ inquiryId: inquiryId.trim() }, token))
      setMessage('Quote draft created from inquiry snapshot.')
      setInquiryId('')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to create quote draft.')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Admin Quotes"
      description="Review quote drafts created from Request Quote records."
    />
    <AdminPreviewNote>Quote drafts are generated server-side from inquiry snapshots. Status tracking is available; external sending and direct price editing remain manual for this release.</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createQuote}>
      <label className="admin-search">Search quotes<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Inquiry number or buyer company" /></label>
      <label className="admin-search">Create from inquiry ID<input value={inquiryId} onChange={(event) => setInquiryId(event.target.value)} placeholder="Inquiry UUID" /></label>
      <button className="primary-action" type="submit">Create Draft</button>
      <div className="admin-filter-tabs">
        {statusTabs.map((tab) => <button className={status === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setStatus)(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
    </form>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card admin-quote-list">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Inquiry Number</th>
              <th>Buyer Company</th>
              <th>Status</th>
              <th>Currency</th>
              <th>Requested Total</th>
              <th>Confirmed Total</th>
              <th>Lead Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => <tr key={quote.id}>
              <td>{quote.inquiryNumber}</td>
              <td>{quote.companyName || '-'}</td>
              <td>{quote.status}</td>
              <td>{quote.currency}</td>
              <td className="admin-quote-total"><AdminMoney value={quote.requestedTotal || 0} currency={quote.currency} /></td>
              <td className="admin-quote-total"><AdminMoney value={quote.confirmedTotal || 0} currency={quote.currency} /></td>
              <td>{quote.leadTime || '-'}</td>
              <td>
                <div className="admin-actions tight">
                  <AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>View Inquiry</AdminLink>
                  <AdminLink to={`/admin/quotes/${quote.id}`}>Open Quote</AdminLink>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
        {quotes.length === 0 && <p className="admin-empty">No quote drafts found.</p>}
        <AdminPagination
          disabled={requestStatus === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>
  </>
}
