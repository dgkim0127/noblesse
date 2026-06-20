import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export function AdminBuyerDetailPage() {
  const t = useAdminCopy()
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
      <AdminPageHeader title={t.buyers.notFound} description={t.buyers.notFoundDescription} />
      <AdminLink to="/admin/buyers">{t.buyers.backToBuyers}</AdminLink>
    </>
  }

  const updateStatus = async (nextStatus) => {
    setSaving(nextStatus)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerStatus(buyer.id, nextStatus, token))
      setMessage(formatAdminCopy(t.buyers.updated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.buyers.updateFailed)
    } finally {
      setSaving('')
    }
  }

  return <>
    <AdminPageHeader
      title={buyer.companyName || t.buyers.buyerAccount}
      description={t.buyers.detailDescription}
      actions={<AdminLink to="/admin/buyers">{t.buyers.backToBuyers}</AdminLink>}
    />
    <AdminPreviewNote>{t.buyers.detailNote}</AdminPreviewNote>

    <section className="admin-card">
      <h2>{t.buyers.approvalChecklist}</h2>
      <div className="admin-check-grid">
        {t.buyers.checklist.map((item) => <span className="admin-pill" key={item}>{item}</span>)}
      </div>
      {message && <p className="admin-inline-message">{message}</p>}
    </section>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>{t.buyers.companyProfile}</h2>
        <dl className="admin-definition-list">
          <dt>{t.fields.company}</dt><dd>{buyer.companyName || '-'}</dd>
          <dt>{t.fields.contact}</dt><dd>{buyer.contactName || '-'}</dd>
          <dt>{t.fields.country}</dt><dd>{buyer.country || '-'}</dd>
          <dt>{t.fields.salesChannel}</dt><dd>{buyer.salesChannel || '-'}</dd>
          <dt>{t.fields.businessNumber}</dt><dd>{buyer.businessNumber || '-'}</dd>
          <dt>{t.fields.created}</dt><dd>{formatDate(buyer.createdAt)}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.buyers.accessSetting}</h2>
        <dl className="admin-definition-list">
          <dt>{t.fields.assignedMarket}</dt><dd>{buyer.assignedMarket || '-'}</dd>
          <dt>{t.fields.currency}</dt><dd>{buyer.currency || '-'}</dd>
          <dt>{t.fields.discountRate}</dt><dd>{buyer.discountRate ?? 0}%</dd>
          <dt>{t.prices.minRequestAmount}</dt><dd><AdminMoney value={buyer.minOrderAmount || 0} currency={buyer.currency || 'USD'} /></dd>
          <dt>{t.common.status}</dt><dd><AdminStatus status={buyer.status} /></dd>
        </dl>
        <div className="admin-actions">
          {['pending', 'approved', 'blocked'].filter((item) => item !== buyer.status).map((nextStatus) => <button
            disabled={saving === nextStatus}
            key={nextStatus}
            onClick={() => updateStatus(nextStatus)}
            type="button"
          >
            {t.common.set} {getAdminStatusLabel(t, nextStatus)}
          </button>)}
        </div>
      </article>
      <article className="admin-card">
        <h2>{t.buyers.contactInformation}</h2>
        <dl className="admin-definition-list">
          <dt>{t.fields.email}</dt><dd>{buyer.email || '-'}</dd>
          <dt>{t.fields.phone}</dt><dd>{buyer.phone || '-'}</dd>
          <dt>{t.fields.messenger}</dt><dd>{buyer.messengerType || '-'} / {buyer.messengerId || '-'}</dd>
          <dt>{t.fields.language}</dt><dd>{buyer.preferredLanguage || '-'}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.buyers.agreementSummary}</h2>
        {agreements.length > 0 ? <ul className="admin-check-list">
          {agreements.map((agreement) => <li key={agreement.id}>
            <span>{agreement.agreementKey}</span>
            <strong>{agreement.accepted ? t.buyers.accepted : t.buyers.notAccepted}</strong>
            <small>{agreement.version} / {formatDate(agreement.acceptedAt || agreement.createdAt)}</small>
          </li>)}
        </ul> : <p className="admin-empty">{t.buyers.noAgreements}</p>}
      </article>
    </section>

    <section className="admin-card">
      <h2>{t.buyers.recentInquiries}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.inquiries.inquiryNumber}</th><th>{t.common.status}</th><th>{t.inquiries.totalItems}</th><th>{t.inquiries.totalQuantity}</th><th>{t.inquiries.estimatedTotal}</th><th>{t.fields.created}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{recentInquiries.map((inquiry) => <tr key={inquiry.id}>
            <td>{inquiry.inquiryNumber}</td>
            <td><AdminStatus status={inquiry.status} /></td>
            <td>{inquiry.totalItems}</td>
            <td>{inquiry.totalQuantity}</td>
            <td><AdminMoney value={inquiry.estimatedTotal || 0} currency={inquiry.currency || buyer.currency || 'USD'} /></td>
            <td>{formatDate(inquiry.createdAt)}</td>
            <td><AdminLink to={`/admin/inquiries/${inquiry.id}`}>{t.common.view}</AdminLink></td>
          </tr>)}</tbody>
        </table>
        {recentInquiries.length === 0 && <p className="admin-empty">{t.buyers.noRecentInquiries}</p>}
      </div>
    </section>
  </>
}
