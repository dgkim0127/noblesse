import { useMemo, useState } from 'react'
import { getAdminInquiries } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function AdminInquiriesPage() {
  const inquiries = getAdminInquiries()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const filteredInquiries = useMemo(() => inquiries
    .filter((inquiry) => status === 'all' || inquiry.status === status)
    .filter((inquiry) => {
      const term = query.trim().toLowerCase()
      if (!term) return true
      return [inquiry.inquiryId, inquiry.buyerCompanyName, inquiry.market, inquiry.currency].some((value) => String(value).toLowerCase().includes(term))
    }), [inquiries, query, status])

  return <>
    <AdminPageHeader title="Inquiry Management" description="Manage Request Quote records from approved members in preview mode." />
    <AdminPreviewNote>Admin status controls are not connected to production data. Admin Quote is the final quotation basis after Noblesse review.</AdminPreviewNote>

    <div className="admin-toolbar">
      <label className="admin-search">Search inquiries<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Inquiry, company, market, or currency" /></label>
      <div className="admin-filter-tabs">
        {statusTabs.map((tab) => <button className={status === tab ? 'active' : ''} key={tab} type="button" onClick={() => setStatus(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
    </div>

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Inquiry Number</th><th>Buyer Company</th><th>Market</th><th>Currency</th><th>Status</th><th>Total Items</th><th>Total Quantity</th><th>Estimated Total</th><th>Created At</th><th>Actions</th></tr></thead>
          <tbody>{filteredInquiries.map((inquiry) => <tr key={inquiry.inquiryId}>
            <td>{inquiry.inquiryId}</td>
            <td>{inquiry.buyerCompanyName}</td>
            <td>{inquiry.market}</td>
            <td>{inquiry.currency}</td>
            <td><AdminStatus status={inquiry.status} /></td>
            <td>{inquiry.totalItems}</td>
            <td>{inquiry.totalQuantity}</td>
            <td><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></td>
            <td>{new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}</td>
            <td><div className="admin-actions tight"><AdminLink to={`/admin/inquiries/${inquiry.inquiryId}`}>View</AdminLink><AdminLink to={`/admin/quotes/${inquiry.inquiryId}`}>Create Quote</AdminLink></div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
