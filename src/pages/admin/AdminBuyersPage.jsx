import { useMemo, useState } from 'react'
import { getAdminBuyerApplications } from '../../services'
import { AdminLink, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

const filterTabs = ['all', 'pending', 'approved', 'blocked']

export function AdminBuyersPage() {
  const buyers = getAdminBuyerApplications()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [previewStatus, setPreviewStatus] = useState({})
  const filteredBuyers = useMemo(() => buyers
    .filter((buyer) => filter === 'all' || (previewStatus[buyer.uid] ?? buyer.status) === filter)
    .filter((buyer) => {
      const term = query.trim().toLowerCase()
      if (!term) return true
      return [buyer.companyName, buyer.country, buyer.assignedMarket].some((value) => String(value).toLowerCase().includes(term))
    })
    .sort((a, b) => {
      const statusRank = { pending: 0, approved: 1, blocked: 2 }
      return (statusRank[previewStatus[a.uid] ?? a.status] ?? 9) - (statusRank[previewStatus[b.uid] ?? b.status] ?? 9)
    }), [buyers, filter, previewStatus, query])

  const setBuyerStatus = (buyerId, status) => setPreviewStatus((current) => ({ ...current, [buyerId]: status }))

  return <>
    <AdminPageHeader title="Buyer Approval" description="Preview wholesale member review, approval, and block status without writing to production data." />
    <AdminPreviewNote>Approve and Block controls update local preview state only. Production approval must use trusted Auth and server-side role validation.</AdminPreviewNote>

    <div className="admin-toolbar">
      <label className="admin-search">Search buyers<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, country, or market" /></label>
      <div className="admin-filter-tabs">
        {filterTabs.map((tab) => <button className={filter === tab ? 'active' : ''} key={tab} type="button" onClick={() => setFilter(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
    </div>

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Company Name</th><th>Contact Name</th><th>Country</th><th>Language</th><th>Market</th><th>Currency</th><th>Status</th><th>Requested At</th><th>Actions</th></tr></thead>
          <tbody>{filteredBuyers.map((buyer) => {
            const status = previewStatus[buyer.uid] ?? buyer.status
            return <tr key={buyer.uid}>
              <td>{buyer.companyName}</td>
              <td>{buyer.contactName}</td>
              <td>{buyer.country}</td>
              <td>{buyer.preferredLanguage}</td>
              <td>{buyer.assignedMarket}</td>
              <td>{buyer.currency}</td>
              <td><AdminStatus status={status} /></td>
              <td>{new Date(buyer.requestedAt).toLocaleDateString('ko-KR')}</td>
              <td><div className="admin-actions tight"><AdminLink to={`/admin/buyers/${buyer.uid}`}>View</AdminLink><button type="button" onClick={() => setBuyerStatus(buyer.uid, 'approved')}>Approve Preview</button><button type="button" onClick={() => setBuyerStatus(buyer.uid, 'blocked')}>Block Preview</button></div></td>
            </tr>
          })}</tbody>
        </table>
      </div>
    </section>
  </>
}
