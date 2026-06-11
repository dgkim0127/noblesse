import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAdminBuyerById } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

export function AdminBuyerDetailPage() {
  const { buyerId } = useParams()
  const buyer = getAdminBuyerById(buyerId)
  const [status, setStatus] = useState(buyer?.status)

  if (!buyer) {
    return <>
      <AdminPageHeader title="Buyer not found" description="The selected preview member could not be found." />
      <AdminLink to="/admin/buyers">Back to Buyers</AdminLink>
    </>
  }

  return <>
    <AdminPageHeader title={buyer.companyName} description="Wholesale member profile, agreement summary, and review status preview." actions={<AdminLink to="/admin/buyers">Back to Buyers</AdminLink>} />
    <AdminPreviewNote>Agreement history is displayed from mock summary. Production should read accepted versions from buyer agreement records.</AdminPreviewNote>

    <section className="admin-card">
      <h2>Approval Checklist</h2>
      <div className="admin-check-grid">
        {['Company information reviewed', 'Contact channel reviewed', 'Market assigned', 'Agreement consent checked', 'Price access ready'].map((item) => <span className="admin-pill" key={item}>{item}</span>)}
      </div>
      <p className="admin-local-message">Production approval must validate admin role server-side before changing member access.</p>
    </section>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Company Profile</h2>
        <dl className="admin-definition-list">
          <dt>Company</dt><dd>{buyer.companyName}</dd>
          <dt>Contact</dt><dd>{buyer.contactName}</dd>
          <dt>Country</dt><dd>{buyer.country}</dd>
          <dt>Sales Channel</dt><dd>{buyer.salesChannel}</dd>
          <dt>Business Number</dt><dd>{buyer.businessNumber}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Access Setting</h2>
        <dl className="admin-definition-list">
          <dt>Assigned Market</dt><dd>{buyer.assignedMarket}</dd>
          <dt>Currency</dt><dd>{buyer.currency}</dd>
          <dt>Discount Rate</dt><dd>{buyer.discountRate}%</dd>
          <dt>Min Request Amount</dt><dd><AdminMoney value={buyer.minOrderAmount} currency={buyer.currency} /></dd>
          <dt>Status</dt><dd><AdminStatus status={status} /></dd>
        </dl>
        <div className="admin-actions"><button type="button" onClick={() => setStatus('approved')}>Approve Preview</button><button type="button" onClick={() => setStatus('pending')}>Set Pending</button><button type="button" onClick={() => setStatus('blocked')}>Block Preview</button></div>
      </article>
      <article className="admin-card">
        <h2>Contact Information</h2>
        <dl className="admin-definition-list">
          <dt>Email</dt><dd>{buyer.email}</dd>
          <dt>Phone</dt><dd>{buyer.phone}</dd>
          <dt>Messenger</dt><dd>{buyer.messengerType} / {buyer.messengerId}</dd>
          <dt>Language</dt><dd>{buyer.preferredLanguage}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Agreement Summary</h2>
        <ul className="admin-check-list">
          {buyer.agreementSummary.map((agreement) => <li key={agreement.key}><span>{agreement.key}</span><strong>{agreement.accepted ? 'Accepted' : 'Not accepted'}</strong><small>{agreement.version}</small></li>)}
        </ul>
      </article>
    </section>

    <section className="admin-card">
      <h2>Recent Inquiries</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Inquiry Number</th><th>Status</th><th>Total Quantity</th><th>Estimated Total</th><th>Action</th></tr></thead>
          <tbody>{buyer.recentInquiries.map((inquiry) => <tr key={inquiry.inquiryId}><td>{inquiry.inquiryId}</td><td><AdminStatus status={inquiry.status} /></td><td>{inquiry.totalQuantity}</td><td><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></td><td><AdminLink to={`/admin/inquiries/${inquiry.inquiryId}`}>View</AdminLink></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
