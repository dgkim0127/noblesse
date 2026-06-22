import { Activity, FileText, Handshake, ListChecks, Tags, UserCheck } from 'lucide-react'
import { Fragment } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminLink, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

export function AdminDashboardPage() {
  const t = useAdminCopy()
  const { admin, hasPermission } = useAdminAccess()
  const { data, error, status } = useAdminApiResource((api, token) => api.getDashboard(token), [])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const inquiries = data?.inquiries || {}
  const buyers = data?.buyers || {}
  const products = data?.products || {}
  const accountFunnel = data?.accountFunnel || {}
  const workQueue = data?.workQueue || {}
  const catalogHealth = data?.catalogHealth || {}
  const recentActivity = data?.recentActivity || {}
  const quickActions = [
    hasPermission('buyers.review') && <AdminLink key="buyers" to="/admin/buyers">{t.dashboard.reviewBuyers || 'Review buyers'}</AdminLink>,
    hasPermission('catalog.write') && <AdminLink key="catalog" className="primary-action" to="/admin/catalog/new">{t.dashboard.addProduct}</AdminLink>,
    hasPermission('inquiries.read') && <AdminLink key="inquiries" to="/admin/inquiries">{t.dashboard.viewInquiries}</AdminLink>,
    hasPermission('audit.read') && <AdminLink key="audit" to="/admin/audit">{t.dashboard.viewAudit || 'View audit log'}</AdminLink>,
  ].filter(Boolean)

  return <>
    <AdminPageHeader
      title={t.dashboard.title}
      description={t.dashboard.description}
      actions={<>{quickActions}</>}
    />

    <section className="admin-grid compact">
      <article className="admin-stat-card"><UserCheck size={20} /><span>{t.dashboard.currentRole || 'Current role'}</span><strong>{t.shell.roles?.[admin?.adminRole] || admin?.adminRole || '-'}</strong></article>
      <article className="admin-stat-card"><Handshake size={20} /><span>{t.dashboard.pendingBuyers}</span><strong>{buyers.pending ?? 0}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>{t.dashboard.requestedInquiries}</span><strong>{inquiries.requested ?? 0}</strong></article>
      <article className="admin-stat-card"><Tags size={20} /><span>{t.dashboard.visibleProducts}</span><strong>{products.visible ?? 0}</strong></article>
      <article className="admin-stat-card"><ListChecks size={20} /><span>{t.dashboard.manualFollowUp}</span><strong>{data?.manualFollowUp?.count ?? 0}</strong></article>
    </section>

    <section className="admin-grid two-column">
      <article className="admin-card">
        <h2>{t.dashboard.workQueue || 'Today work queue'}</h2>
        <dl className="admin-definition-list">
          <dt>{t.dashboard.buyerReviews || 'Buyer reviews'}</dt><dd>{workQueue.buyerReviews ?? 0}</dd>
          <dt>{t.dashboard.inquiryFollowUp || 'Inquiry follow-up'}</dt><dd>{workQueue.inquiryFollowUp ?? 0}</dd>
          <dt>{t.dashboard.quoteFollowUp || 'Quote follow-up'}</dt><dd>{workQueue.quoteFollowUp ?? 0}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.dashboard.accountFunnel || 'Buyer verification funnel'}</h2>
        <dl className="admin-definition-list">
          {['draft', 'pending', 'approved', 'rejected', 'suspended', 'blocked'].map((item) => <Fragment key={item}><dt>{getAdminStatusLabel(t, item)}</dt><dd>{accountFunnel[item] ?? 0}</dd></Fragment>)}
        </dl>
      </article>
    </section>

    <section className="admin-grid two-column">
      <article className="admin-card">
        <h2>{t.dashboard.catalogHealth || 'Catalog health'}</h2>
        <dl className="admin-definition-list">
          <dt>{t.dashboard.catalogReady || 'Ready'}</dt><dd>{catalogHealth.ready ?? 0}</dd>
          <dt>{t.dashboard.catalogNeedsReview || 'Needs review'}</dt><dd>{catalogHealth.needsReview ?? 0}</dd>
          <dt>{t.dashboard.catalogHidden || 'Hidden'}</dt><dd>{catalogHealth.hidden ?? 0}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.dashboard.recentActivity || 'Recent activity'}</h2>
        <div className="admin-empty">
          <Activity size={18} />
          <p>{recentActivity.label || t.dashboard.auditPending || 'Audit rows are available in the audit log.'}</p>
          {hasPermission('audit.read') && <AdminLink to="/admin/audit">{t.dashboard.viewAudit || 'View audit log'}</AdminLink>}
        </div>
      </article>
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
