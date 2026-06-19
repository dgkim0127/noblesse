import { useMemo, useState } from 'react'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPagination, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiResource } from './adminApiPageUtils'

const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']
const pageSize = 20

export function AdminInquiriesPage() {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const filters = useMemo(() => ({
    status: status === 'all' ? '' : status,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, status])
  const { data, error, meta, status: requestStatus } = useAdminApiResource((api, token) => api.getInquiries(filters, token), [status, query, offset])
  const loading = <AdminApiState error={error} status={requestStatus} />
  const inquiries = data?.inquiries || []
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  return <>
    <AdminPageHeader title="Inquiry Management" description="Live staging Request Quote records from the admin API." />

    <div className="admin-toolbar">
      <label className="admin-search">Search inquiries<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Inquiry, company, market, or currency" /></label>
      <div className="admin-filter-tabs">
        {statusTabs.map((tab) => <button className={status === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setStatus)(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
    </div>

    {loading || <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Inquiry Number</th><th>Buyer Company</th><th>Market</th><th>Currency</th><th>Status</th><th>Total Items</th><th>Total Quantity</th><th>Estimated Total</th><th>Created At</th><th>Actions</th></tr></thead>
          <tbody>{inquiries.map((inquiry) => <tr key={inquiry.id || inquiry.inquiryId}>
            <td>{inquiry.inquiryNumber || inquiry.inquiryId}</td>
            <td>{inquiry.companyName || inquiry.buyerCompanyName || '-'}</td>
            <td>{inquiry.market}</td>
            <td>{inquiry.currency}</td>
            <td><AdminStatus status={inquiry.status} /></td>
            <td>{inquiry.totalItems}</td>
            <td>{inquiry.totalQuantity}</td>
            <td><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></td>
            <td>{inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
            <td><div className="admin-actions tight"><AdminLink to={`/admin/inquiries/${inquiry.id || inquiry.inquiryId}`}>View</AdminLink></div></td>
          </tr>)}</tbody>
        </table>
        <AdminPagination
          disabled={requestStatus === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>}
  </>
}
