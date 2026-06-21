import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

const statusOptions = ['requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function AdminInquiryDetailPage() {
  const t = useAdminCopy()
  const { inquiryId } = useParams()
  const [memoDraft, setMemoDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [statusSaveState, setStatusSaveState] = useState('idle')
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, error, status } = useAdminApiResource((api, token) => api.getInquiry(inquiryId, token), [inquiryId, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const inquiry = data?.inquiry || {}
  const buyer = data?.buyer || {}
  const items = data?.items || inquiry.items || []

  const saveMemo = async () => {
    if (saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveMessage('')
    try {
      await mutate((api, token) => api.updateInquiryMemo(inquiryId, memoDraft, token))
      setSaveStatus('saved')
      setSaveMessage(t.inquiries.memoSaved)
      setRefreshKey((current) => current + 1)
    } catch (saveError) {
      setSaveStatus('idle')
      setSaveMessage(saveError?.message || t.inquiries.memoFailed)
    }
  }

  const updateStatus = async (nextStatus) => {
    if (statusSaveState === 'saving') return
    setStatusSaveState('saving')
    setSaveMessage('')
    try {
      await mutate((api, token) => api.updateInquiryStatus(inquiryId, nextStatus, token))
      setSaveMessage(formatAdminCopy(t.inquiries.statusUpdated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (statusError) {
      setSaveMessage(statusError?.message || t.inquiries.statusFailed)
    } finally {
      setStatusSaveState('idle')
    }
  }

  return <>
    <AdminPageHeader title={inquiry.inquiryNumber || inquiry.id || inquiryId} description={t.inquiries.detailDescription} actions={<AdminLink to="/admin/inquiries">{t.inquiries.backToInquiries}</AdminLink>} />

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>{t.inquiries.buyerInfo}</h2>
        <dl className="admin-definition-list">
          <dt>{t.fields.company}</dt><dd>{buyer.companyName || inquiry.companyName || '-'}</dd>
          <dt>{t.fields.email}</dt><dd>{buyer.email || inquiry.email || '-'}</dd>
          <dt>{t.fields.country}</dt><dd>{buyer.country || inquiry.country || '-'}</dd>
          <dt>{t.fields.currency}</dt><dd>{inquiry.currency}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>{t.inquiries.inquiryStatus}</h2>
        <AdminStatus status={inquiry.status} />
        <div className="admin-actions">
          {statusOptions.filter((item) => item !== inquiry.status).map((nextStatus) => <button
            disabled={statusSaveState === 'saving'}
            key={nextStatus}
            onClick={() => updateStatus(nextStatus)}
            type="button"
          >
            {t.common.set} {getAdminStatusLabel(t, nextStatus)}
          </button>)}
        </div>
        <dl className="admin-definition-list">
          <dt>{t.inquiries.totalItems}</dt><dd>{inquiry.totalItems}</dd>
          <dt>{t.inquiries.totalQuantity}</dt><dd>{inquiry.totalQuantity}</dd>
          <dt>{t.inquiries.estimatedTotal}</dt><dd><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></dd>
        </dl>
      </article>
      <article className="admin-card wide-card">
        <h2>{t.inquiries.adminMemo}</h2>
        <textarea value={memoDraft || inquiry.adminMemo || ''} onChange={(event) => setMemoDraft(event.target.value)} />
        <div className="admin-actions"><button type="button" disabled={saveStatus === 'saving'} onClick={saveMemo}>{saveStatus === 'saving' ? t.common.saving : t.common.save}</button></div>
        {saveMessage && <p className="admin-local-message">{saveMessage}</p>}
      </article>
    </section>

    <section className="admin-card">
      <h2>{t.inquiries.itemSnapshot}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.productName}</th><th>{t.fields.color}</th><th>{t.fields.size}</th><th>{t.fields.quantity}</th><th>{t.products.moq}</th><th>{t.inquiries.priceSnapshot}</th><th>{t.inquiries.subtotal}</th></tr></thead>
          <tbody>{items.map((item) => <tr key={`${item.id || item.productCode}-${item.color}-${item.size}`}>
            <td>{item.productCode}</td>
            <td>{item.productName}</td>
            <td>{item.color}</td>
            <td>{item.size}</td>
            <td>{item.quantity}</td>
            <td>{item.moq}</td>
            <td><AdminMoney value={item.priceSnapshot} currency={inquiry.currency} /></td>
            <td><AdminMoney value={item.subtotal} currency={inquiry.currency} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
