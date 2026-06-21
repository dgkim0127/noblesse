import { FileText, Handshake, Tags } from 'lucide-react'
import { AdminLink, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

export function AdminDashboardPage() {
  const t = useAdminCopy()
  const { data, error, status } = useAdminApiResource((api, token) => api.getDashboard(token), [])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const inquiries = data?.inquiries || {}
  const buyers = data?.buyers || {}
  const products = data?.products || {}

  return <>
    <AdminPageHeader
      title={t.dashboard.title}
      description={t.dashboard.description}
      actions={<><AdminLink to="/admin/inquiries">{t.dashboard.viewInquiries}</AdminLink></>}
    />

    <section className="admin-grid compact">
      <article className="admin-stat-card"><Handshake size={20} /><span>{t.dashboard.pendingBuyers}</span><strong>{buyers.pending ?? 0}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>{t.dashboard.requestedInquiries}</span><strong>{inquiries.requested ?? 0}</strong></article>
      <article className="admin-stat-card"><Tags size={20} /><span>{t.dashboard.visibleProducts}</span><strong>{products.visible ?? 0}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>{t.dashboard.manualFollowUp}</span><strong>{data?.manualFollowUp?.count ?? 0}</strong></article>
    </section>

    <section className="admin-card">
      <h2>{t.dashboard.inquiryStatus}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.common.status}</th><th>{t.common.count}</th></tr></thead>
          <tbody>{['requested', 'checking', 'quoted', 'confirmed', 'cancelled'].map((item) => <tr key={item}><td><AdminStatus status={item} /></td><td>{inquiries[item] ?? 0}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
