import { BarChart3, FileText, Handshake, Tags } from 'lucide-react'
import { getAdminDashboardSummary } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

export function AdminDashboardPage() {
  const summary = getAdminDashboardSummary()

  return <>
    <AdminPageHeader
      title="Admin Dashboard"
      description="Review member access, Request Quote activity, price preview coverage, and analytics signals from mock data."
      actions={<><AdminLink to="/admin/buyers">Review Buyers</AdminLink><AdminLink to="/admin/inquiries">View Inquiries</AdminLink></>}
    />
    <AdminPreviewNote>Production data will be loaded from PostgreSQL/Supabase through trusted API/RPC. This dashboard is mock preview only.</AdminPreviewNote>

    <section className="admin-grid">
      <article className="admin-stat-card"><Handshake size={20} /><span>Pending Buyers</span><strong>{summary.pendingBuyers}</strong></article>
      <article className="admin-stat-card"><FileText size={20} /><span>Requested Inquiries</span><strong>{summary.requestedInquiries}</strong></article>
      <article className="admin-stat-card"><Tags size={20} /><span>Quoted</span><strong>{summary.quotedInquiries}</strong></article>
      <article className="admin-stat-card"><BarChart3 size={20} /><span>Estimated Request Total</span><strong><AdminMoney value={summary.estimatedRequestTotal} currency="JPY" /></strong></article>
    </section>

    <section className="admin-layout two">
      <article className="admin-card">
        <h2>Top Requested Products</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product Code</th><th>Product Name</th><th>Quantity</th><th>Estimated Total</th></tr></thead>
            <tbody>{summary.topRequestedProducts.map((item) => <tr key={item.productCode}><td>{item.productCode}</td><td>{item.productName}</td><td>{item.totalQuantity}</td><td><AdminMoney value={item.estimatedTotal} currency="JPY" /></td></tr>)}</tbody>
          </table>
        </div>
      </article>

      <article className="admin-card">
        <h2>Recent Request Quote Preview</h2>
        <div className="admin-list">
          {summary.recentInquiries.map((inquiry) => <AdminLink className="admin-list-item" key={inquiry.inquiryId} to={`/admin/inquiries/${inquiry.inquiryId}`}>
            <span>{inquiry.inquiryId}</span>
            <strong>{inquiry.buyerCompanyName}</strong>
            <AdminStatus status={inquiry.status} />
          </AdminLink>)}
        </div>
      </article>
    </section>

    <section className="admin-card">
      <h2>Market Summary Preview</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Market</th><th>Buyer Count</th><th>Inquiry Count</th><th>Estimated Total</th></tr></thead>
          <tbody>{summary.marketSummary.map((market) => <tr key={market.market}><td>{market.market}</td><td>{market.buyerCount}</td><td>{market.inquiryCount}</td><td><AdminMoney value={market.estimatedTotal} currency={market.currency} /></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
