import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const filterTabs = ['all', 'pending', 'approved', 'blocked']
const pageSize = 20

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export function AdminBuyersPage() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingBuyerId, setSavingBuyerId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    status: filter === 'all' ? '' : filter,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [filter, offset, query])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getBuyers(filters, token), [filter, query, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const buyers = data?.buyers || []
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const updateStatus = async (buyerId, nextStatus) => {
    setSavingBuyerId(buyerId)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerStatus(buyerId, nextStatus, token))
      setMessage(`Buyer status updated to ${nextStatus}.`)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to update buyer status.')
    } finally {
      setSavingBuyerId('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Buyer Approval"
      description="Review B2B buyer accounts and update approval state through the trusted backend API."
    />
    <AdminPreviewNote>Buyer status changes are server-side admin actions. Frontend state does not grant admin access.</AdminPreviewNote>

    <div className="admin-toolbar">
      <label className="admin-search">Search buyers<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Company, contact, country, or market" /></label>
      <div className="admin-filter-tabs">
        {filterTabs.map((tab) => <button className={filter === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setFilter)(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Company Name</th><th>Contact Name</th><th>Email</th><th>Country</th><th>Language</th><th>Market</th><th>Currency</th><th>Status</th><th>Created At</th><th>Actions</th></tr></thead>
          <tbody>{buyers.map((buyer) => <tr key={buyer.id}>
            <td>{buyer.companyName || '-'}</td>
            <td>{buyer.contactName || '-'}</td>
            <td>{buyer.email || '-'}</td>
            <td>{buyer.country || '-'}</td>
            <td>{buyer.preferredLanguage || '-'}</td>
            <td>{buyer.assignedMarket || '-'}</td>
            <td>{buyer.currency || '-'}</td>
            <td><AdminStatus status={buyer.status} /></td>
            <td>{formatDate(buyer.createdAt)}</td>
            <td>
              <div className="admin-actions tight">
                {['pending', 'approved', 'blocked'].filter((item) => item !== buyer.status).map((nextStatus) => <button
                  disabled={savingBuyerId === buyer.id}
                  key={nextStatus}
                  type="button"
                  onClick={() => updateStatus(buyer.id, nextStatus)}
                >
                  Set {nextStatus}
                </button>)}
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {buyers.length === 0 && <p className="admin-empty">No buyers found.</p>}
        <AdminPagination
          disabled={status === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>
  </>
}
