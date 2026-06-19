import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export function AdminBuyerDetailPage() {
  const { buyerId } = useParams()
  const [refreshKey, setRefreshKey] = useState(0)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const { data, error, status } = useAdminApiResource((api, token) => api.getBuyer(buyerId, token), [buyerId, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const buyer = data?.buyer
  const agreements = data?.agreements || []
  const recentInquiries = data?.recentInquiries || []

  if (!buyer) {
    return <>
      <AdminPageHeader eyebrow="Admin API" title="Buyer not found" description="The selected buyer account could not be loaded." />
      <AdminLink to="/admin/buyers">Back to Buyers</AdminLink>
    </>
  }

  const updateStatus = async (nextStatus) => {
    setSaving(nextStatus)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerStatus(buyer.id, nextStatus, token))
      setMessage(`Buyer status updated to ${nextStatus}.`)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to update buyer status.')
    } finally {
      setSaving('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title={buyer.companyName || 'Buyer account'}
      description="Review buyer profile, agreement records, recent inquiries, and approval status through the backend API."
      actions={<AdminLink to="/admin/buyers">Back to Buyers</AdminLink>}
    />
    <AdminPreviewNote>Buyer approval is enforced server-side. Frontend state and local storage do not grant admin access.</AdminPreviewNote>

    <section className="admin-card">
      <h2>Approval Checklist</h2>
      <div className="admin-check-grid">
        {['Company information reviewed', 'Contact channel reviewed', 'Market assigned', 'Agreement consent checked', 'Price access ready'].map((item) => <span className="admin-pill" key={item}>{item}</span>)}
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
    </section>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Company Profile</h2>
        <dl className="admin-definition-list">
          <dt>Company</dt><dd>{buyer.companyName || '-'}</dd>
          <dt>Contact</dt><dd>{buyer.contactName || '-'}</dd>
          <dt>Country</dt><dd>{buyer.country || '-'}</dd>
          <dt>Sales Channel</dt><dd>{buyer.salesChannel || '-'}</dd>
          <dt>Business Number</dt><dd>{buyer.businessNumber || '-'}</dd>
          <dt>Created</dt><dd>{formatDate(buyer.createdAt)}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Access Setting</h2>
        <dl className="admin-definition-list">
          <dt>Assigned Market</dt><dd>{buyer.assignedMarket || '-'}</dd>
          <dt>Currency</dt><dd>{buyer.currency || '-'}</dd>
          <dt>Discount Rate</dt><dd>{buyer.discountRate ?? 0}%</dd>
          <dt>Min Request Amount</dt><dd><AdminMoney value={buyer.minOrderAmount || 0} currency={buyer.currency || 'USD'} /></dd>
          <dt>Status</dt><dd><AdminStatus status={buyer.status} /></dd>
        </dl>
        <div className="admin-actions">
          {['pending', 'approved', 'blocked'].filter((item) => item !== buyer.status).map((nextStatus) => <button
            disabled={saving === nextStatus}
            key={nextStatus}
            onClick={() => updateStatus(nextStatus)}
            type="button"
          >
            Set {nextStatus}
          </button>)}
        </div>
      </article>
      <article className="admin-card">
        <h2>Contact Information</h2>
        <dl className="admin-definition-list">
          <dt>Email</dt><dd>{buyer.email || '-'}</dd>
          <dt>Phone</dt><dd>{buyer.phone || '-'}</dd>
          <dt>Messenger</dt><dd>{buyer.messengerType || '-'} / {buyer.messengerId || '-'}</dd>
          <dt>Language</dt><dd>{buyer.preferredLanguage || '-'}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Agreement Summary</h2>
        {agreements.length > 0 ? <ul className="admin-check-list">
          {agreements.map((agreement) => <li key={agreement.id}>
            <span>{agreement.agreementKey}</span>
            <strong>{agreement.accepted ? 'Accepted' : 'Not accepted'}</strong>
            <small>{agreement.version} / {formatDate(agreement.acceptedAt || agreement.createdAt)}</small>
          </li>)}
        </ul> : <p className="admin-empty">No agreement records found.</p>}
      </article>
    </section>

    <section className="admin-card">
      <h2>Recent Inquiries</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Inquiry Number</th><th>Status</th><th>Items</th><th>Total Quantity</th><th>Estimated Total</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>{recentInquiries.map((inquiry) => <tr key={inquiry.id}>
            <td>{inquiry.inquiryNumber}</td>
            <td><AdminStatus status={inquiry.status} /></td>
            <td>{inquiry.totalItems}</td>
            <td>{inquiry.totalQuantity}</td>
            <td><AdminMoney value={inquiry.estimatedTotal || 0} currency={inquiry.currency || buyer.currency || 'USD'} /></td>
            <td>{formatDate(inquiry.createdAt)}</td>
            <td><AdminLink to={`/admin/inquiries/${inquiry.id}`}>View</AdminLink></td>
          </tr>)}</tbody>
        </table>
        {recentInquiries.length === 0 && <p className="admin-empty">No recent inquiries found.</p>}
      </div>
    </section>
  </>
}
