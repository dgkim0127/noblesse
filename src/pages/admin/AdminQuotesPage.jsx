import { useMemo, useState } from 'react'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

const statusTabs = ['all', 'draft', 'sent', 'accepted', 'cancelled']
const pageSize = 20

export function AdminQuotesPage() {
  const t = useAdminCopy()
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
  const apiState = shouldShowAdminApiState(requestStatus) ? <AdminApiState error={error} status={requestStatus} /> : null
  if (apiState) return apiState

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
      setMessage(t.quotes.draftCreated)
      setInquiryId('')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.quotes.createFailed)
    }
  }

  return <>
    <AdminPageHeader
      title={t.quotes.title}
      description={t.quotes.description}
    />
    <AdminPreviewNote>{t.quotes.note}</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createQuote}>
      <label className="admin-search">{t.quotes.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.quotes.searchPlaceholder} /></label>
      <label className="admin-search">{t.quotes.createFromInquiry}<input value={inquiryId} onChange={(event) => setInquiryId(event.target.value)} placeholder={t.quotes.createPlaceholder} /></label>
      <button className="primary-action" type="submit">{t.quotes.createDraft}</button>
      <div className="admin-filter-tabs">
        {statusTabs.map((tab) => <button className={status === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setStatus)(tab)}>{tab === 'all' ? t.common.all : getAdminStatusLabel(t, tab)}</button>)}
      </div>
    </form>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card admin-quote-list">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.quotes.inquiryNumber}</th>
              <th>{t.quotes.buyerCompany}</th>
              <th>{t.common.status}</th>
              <th>{t.fields.currency}</th>
              <th>{t.quotes.requestedTotal}</th>
              <th>{t.quotes.confirmedTotal}</th>
              <th>{t.quotes.leadTime}</th>
              <th>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => <tr key={quote.id}>
              <td>{quote.inquiryNumber}</td>
              <td>{quote.companyName || '-'}</td>
              <td>{getAdminStatusLabel(t, quote.status)}</td>
              <td>{quote.currency}</td>
              <td className="admin-quote-total"><AdminMoney value={quote.requestedTotal || 0} currency={quote.currency} /></td>
              <td className="admin-quote-total"><AdminMoney value={quote.confirmedTotal || 0} currency={quote.currency} /></td>
              <td>{quote.leadTime || '-'}</td>
              <td>
                <div className="admin-actions tight">
                  <AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>{t.quotes.viewInquiry}</AdminLink>
                  <AdminLink to={`/admin/quotes/${quote.id}`}>{t.quotes.openQuote}</AdminLink>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
        {quotes.length === 0 && <p className="admin-empty">{t.quotes.empty}</p>}
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
