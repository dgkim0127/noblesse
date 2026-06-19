import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const statusOptions = ['requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function AdminInquiryDetailPage() {
  const { inquiryId } = useParams()
  const [memoDraft, setMemoDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [statusSaveState, setStatusSaveState] = useState('idle')
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, error, status } = useAdminApiResource((api, token) => api.getInquiry(inquiryId, token), [inquiryId, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

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
      setSaveMessage('Admin memo saved.')
      setRefreshKey((current) => current + 1)
    } catch (saveError) {
      setSaveStatus('idle')
      setSaveMessage(saveError?.message || 'Unable to save admin memo.')
    }
  }

  const updateStatus = async (nextStatus) => {
    if (statusSaveState === 'saving') return
    setStatusSaveState('saving')
    setSaveMessage('')
    try {
      await mutate((api, token) => api.updateInquiryStatus(inquiryId, nextStatus, token))
      setSaveMessage(`Inquiry status updated to ${nextStatus}.`)
      setRefreshKey((current) => current + 1)
    } catch (statusError) {
      setSaveMessage(statusError?.message || 'Unable to update inquiry status.')
    } finally {
      setStatusSaveState('idle')
    }
  }

  return <>
    <AdminPageHeader title={inquiry.inquiryNumber || inquiry.id || inquiryId} description="Live staging inquiry detail from the admin API." actions={<AdminLink to="/admin/inquiries">Back to Inquiries</AdminLink>} />

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Buyer Info</h2>
        <dl className="admin-definition-list">
          <dt>Company</dt><dd>{buyer.companyName || inquiry.companyName || '-'}</dd>
          <dt>Email</dt><dd>{buyer.email || inquiry.email || '-'}</dd>
          <dt>Country</dt><dd>{buyer.country || inquiry.country || '-'}</dd>
          <dt>Currency</dt><dd>{inquiry.currency}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Inquiry Status</h2>
        <AdminStatus status={inquiry.status} />
        <div className="admin-actions">
          {statusOptions.filter((item) => item !== inquiry.status).map((nextStatus) => <button
            disabled={statusSaveState === 'saving'}
            key={nextStatus}
            onClick={() => updateStatus(nextStatus)}
            type="button"
          >
            Set {nextStatus}
          </button>)}
        </div>
        <dl className="admin-definition-list">
          <dt>Total Items</dt><dd>{inquiry.totalItems}</dd>
          <dt>Total Quantity</dt><dd>{inquiry.totalQuantity}</dd>
          <dt>Estimated Total</dt><dd><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></dd>
        </dl>
      </article>
      <article className="admin-card wide-card">
        <h2>Admin Memo</h2>
        <textarea value={memoDraft || inquiry.adminMemo || ''} onChange={(event) => setMemoDraft(event.target.value)} />
        <div className="admin-actions"><button type="button" disabled={saveStatus === 'saving'} onClick={saveMemo}>{saveStatus === 'saving' ? 'Saving...' : 'Save Memo'}</button></div>
        {saveMessage && <p className="admin-local-message">{saveMessage}</p>}
      </article>
    </section>

    <section className="admin-card">
      <h2>Item Snapshot</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Color</th><th>Size</th><th>Quantity</th><th>MOQ</th><th>priceSnapshot</th><th>Subtotal</th></tr></thead>
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
