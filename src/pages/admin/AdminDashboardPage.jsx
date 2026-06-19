import { FileText, Handshake, Tags } from 'lucide-react'
import { AdminLink, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiResource } from './adminApiPageUtils'

export function AdminDashboardPage() {
  const { data, error, status } = useAdminApiResource((api, token) => api.getDashboard(token), [])
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const inquiries = data?.inquiries || {}
  const buyers = data?.buyers || {}
  const products = data?.products || {}

  return <>
    <AdminPageHeader
      title="Admin Dashboard"
      description="Live staging admin summary from server-side role-verified API."
      actions={<><AdminLink to="/admin/inquiries">View Inquiries</AdminLink></>}
    />

    <section className="admin-grid compact">
      <article className="admin-stat-card"><Handshake size={20} /><span>Pending Buyers</span><strong>{buyers.pending ?? 0}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>Requested Inquiries</span><strong>{inquiries.requested ?? 0}</strong></article>
      <article className="admin-stat-card"><Tags size={20} /><span>Visible Products</span><strong>{products.visible ?? 0}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>Manual Follow-up</span><strong>{data?.manualFollowUp?.count ?? 0}</strong></article>
    </section>

    <section className="admin-card">
      <h2>Inquiry Status</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>{['requested', 'checking', 'quoted', 'confirmed', 'cancelled'].map((item) => <tr key={item}><td><AdminStatus status={item} /></td><td>{inquiries[item] ?? 0}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
