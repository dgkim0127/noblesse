import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { useLocalePath } from '../../utils/locale'
import { AdminLink, AdminMoney, AdminPageHeader, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

const statusOptions = ['requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function AdminInquiryDetailPage() {
  const t = useAdminCopy()
  const { inquiryId } = useParams()
  const navigate = useNavigate()
  const { toLocalePath } = useLocalePath()
  const { hasPermission } = useAdminAccess()
  const canManage = hasPermission('inquiries.manage')
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
  const hasUnavailablePrice = items.some((item) => item.priceUnavailable)

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

  const createQuoteDraft = async () => {
    if (saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveMessage('')
    try {
      const result = await mutate((api, token) => api.createQuote({ inquiryId }, token))
      const quoteId = result.data?.quote?.id
      if (!quoteId) throw new Error('생성된 견적 ID를 확인할 수 없습니다.')
      navigate(toLocalePath(`/admin/quotes/${quoteId}`))
    } catch (quoteError) {
      setSaveMessage(quoteError?.message || '견적 초안을 만들지 못했습니다.')
    } finally {
      setSaveStatus('idle')
    }
  }

  return <>
    <AdminPageHeader title={inquiry.inquiryNumber || inquiry.id || inquiryId} description={t.inquiries.detailDescription} actions={<><AdminLink to="/admin/inquiries">{t.inquiries.backToInquiries}</AdminLink>{hasPermission('quotes.write') && <button className="primary-action" disabled={saveStatus === 'saving'} type="button" onClick={createQuoteDraft}>견적 초안 만들기</button>}</>} />

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
          {canManage && statusOptions.filter((item) => item !== inquiry.status).map((nextStatus) => <button
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
          <dt>{t.inquiries.estimatedTotal}</dt><dd><AdminMoney unavailable={hasUnavailablePrice} value={inquiry.estimatedTotal} currency={inquiry.currency} /></dd>
        </dl>
      </article>
      <article className="admin-card wide-card">
        <h2>{t.inquiries.adminMemo}</h2>
        <textarea disabled={!canManage} value={memoDraft || inquiry.adminMemo || ''} onChange={(event) => setMemoDraft(event.target.value)} />
        {canManage && <div className="admin-actions"><button type="button" disabled={saveStatus === 'saving'} onClick={saveMemo}>{saveStatus === 'saving' ? t.common.saving : t.common.save}</button></div>}
        {saveMessage && <p className="admin-local-message">{saveMessage}</p>}
      </article>
    </section>

    <section className="admin-card">
      <h2>{t.inquiries.itemSnapshot}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.productName}</th><th>{t.fields.color}</th><th>{t.fields.size}</th><th>{t.fields.quantity}</th><th>{t.products.moq}</th><th>{t.inquiries.priceSnapshot}</th><th>{t.inquiries.subtotal}</th></tr></thead>
          <tbody>{items.map((item) => <tr key={`${item.id || item.productCode}-${item.color}-${item.size}`}>
            <td data-label={t.fields.productCode}>{item.productCode}</td>
            <td data-label={t.fields.productName}>{item.productName}</td>
            <td data-label={t.fields.color}>{item.color}</td>
            <td data-label={t.fields.size}>{item.size}</td>
            <td data-label={t.fields.quantity}>{item.quantity}</td>
            <td data-label={t.products.moq}>{item.moq}</td>
            <td data-label={t.inquiries.priceSnapshot}><AdminMoney unavailable={item.priceUnavailable} value={item.priceSnapshot} currency={inquiry.currency} /></td>
            <td data-label={t.inquiries.subtotal}><AdminMoney unavailable={item.priceUnavailable} value={item.subtotal} currency={inquiry.currency} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
