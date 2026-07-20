import { Download, FileCheck2, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { formatMoney } from '../../utils/commerce'
import { formatSelectedProductOptions } from '../../utils/productOptions'
import {
  AdminConfirmDialog,
  AdminEmptyState,
  AdminLink,
  AdminNotice,
  AdminPageHeader,
  AdminSaveBar,
  AdminToast,
} from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const localeOptions = [
  ['kr', '한국어'],
  ['en', 'English'],
  ['jp', '日本語'],
  ['zh-TW', '繁體中文'],
]
const lockedStatuses = new Set(['accepted', 'rejected', 'cancelled'])
const statusLabels = {
  draft: '초안',
  sent: '발행됨',
  accepted: '고객 승인',
  rejected: '고객 거절',
  cancelled: '취소',
  expired: '기간 만료',
}

function quoteToForm(quote, items) {
  return {
    leadTime: quote?.leadTime || '',
    shippingNote: quote?.shippingNote || '',
    validUntil: quote?.validUntil ? String(quote.validUntil).slice(0, 10) : '',
    documentLocale: quote?.documentLocale || 'en',
    customerNote: quote?.customerNote || '',
    adminMemo: quote?.adminMemo || '',
    items: (items || []).map((item) => ({
      ...item,
      confirmedQuantity: String(item.confirmedQuantity ?? item.requestedQuantity ?? 1),
      confirmedUnitPrice: String(item.confirmedUnitPrice ?? item.requestedPriceSnapshot ?? 0),
      itemNote: item.itemNote || '',
    })),
  }
}

function buildPayload(form) {
  return {
    leadTime: form.leadTime,
    shippingNote: form.shippingNote,
    validUntil: form.validUntil || undefined,
    documentLocale: form.documentLocale,
    customerNote: form.customerNote,
    adminMemo: form.adminMemo,
    items: form.items.map((item) => ({
      id: item.id,
      confirmedQuantity: Number(item.confirmedQuantity),
      confirmedUnitPrice: Number(item.confirmedUnitPrice),
      itemNote: item.itemNote,
    })),
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AdminQuotePage() {
  const { quoteId } = useParams()
  const { hasPermission } = useAdminAccess()
  const canWrite = hasPermission('quotes.write')
  const mutate = useAdminApiMutation()
  const initialFormRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [confirm, setConfirm] = useState(null)
  const { data, error, status } = useAdminApiResource((api, token) => api.getQuote(quoteId, token), [quoteId, refreshKey])

  useEffect(() => {
    if (status !== 'ready') return
    const next = quoteToForm(data?.quote, data?.items || [])
    initialFormRef.current = structuredClone(next)
    setForm(next)
    setDirty(false)
  }, [data, status])

  useEffect(() => {
    if (!dirty) return undefined
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  const quote = data?.quote
  const documents = data?.documents || []
  const history = data?.history || []
  const statusLocked = lockedStatuses.has(quote?.status)
  const editable = canWrite && !statusLocked
  const total = useMemo(() => (form?.items || []).reduce((sum, item) => {
    const quantity = Number(item.confirmedQuantity)
    const unitPrice = Number(item.confirmedUnitPrice)
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0)
  }, 0), [form?.items])

  if (apiState) return apiState
  if (!quote || !form) return <AdminEmptyState title="견적을 찾을 수 없습니다." action={<AdminLink to="/admin/quotes">견적 목록</AdminLink>} />

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setDirty(true)
  }

  const setItemField = (itemId, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item),
    }))
    setDirty(true)
  }

  const saveDraft = async ({ quiet = false } = {}) => {
    if (!editable) return null
    setSaving(true)
    try {
      const result = await mutate((api, token) => api.updateQuote(quoteId, buildPayload(form), token))
      const next = quoteToForm(result.data?.quote || quote, result.data?.items || form.items)
      initialFormRef.current = structuredClone(next)
      setForm(next)
      setDirty(false)
      if (!quiet) setToast({ message: '견적 초안을 저장했습니다.', tone: 'success' })
      return result
    } catch (saveError) {
      setToast({ message: saveError?.message || '견적을 저장하지 못했습니다.', tone: 'error' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const issueQuote = async () => {
    setConfirm(null)
    if (!form.validUntil) {
      setToast({ message: '견적 유효기간을 입력해 주세요.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await mutate((api, token) => api.updateQuote(quoteId, buildPayload(form), token))
      const issued = await mutate((api, token) => api.issueQuote(quoteId, token))
      setDirty(false)
      setToast({ message: `견적서 v${issued.data?.document?.revision || ''}을 발행했습니다.`, tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (issueError) {
      setToast({ message: issueError?.message || '견적서를 발행하지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const cancelQuote = async () => {
    setSaving(true)
    try {
      await mutate((api, token) => api.updateQuoteStatus(quoteId, 'cancelled', token))
      setConfirm(null)
      setToast({ message: '견적을 취소했습니다.', tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (cancelError) {
      setToast({ message: cancelError?.message || '견적을 취소하지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const downloadDocument = async (document) => {
    setSaving(true)
    try {
      const result = await mutate((api, token) => api.downloadQuoteDocument(quoteId, document.id, token))
      triggerBlobDownload(result.data, `${quote.quoteNumber || 'quotation'}-v${document.revision}.pdf`)
    } catch (downloadError) {
      setToast({ message: downloadError?.message || 'PDF를 내려받지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    setForm(structuredClone(initialFormRef.current))
    setDirty(false)
  }

  const openIssueDialog = () => setConfirm({
    title: quote.currentDocumentId ? '새 버전으로 재발행할까요?' : '공식 견적서를 발행할까요?',
    description: '현재 입력값으로 변경 불가능한 PDF 문서 버전을 만들고 고객 견적함에 공개합니다.',
    confirmLabel: quote.currentDocumentId ? '재발행' : '발행',
    action: issueQuote,
  })

  return <>
    <AdminPageHeader
      eyebrow="공식 견적"
      title={quote.quoteNumber || quote.inquiryNumber || '견적 초안'}
      description={`${quote.companyName || '거래처'} / ${quote.currency} / ${statusLabels[quote.displayStatus || quote.status] || quote.displayStatus || quote.status}`}
      actions={<>
        <AdminLink to="/admin/quotes">목록</AdminLink>
        <AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>원본 문의</AdminLink>
        {editable && <button className="primary-action" disabled={saving} type="button" onClick={openIssueDialog}><Send size={17} />{quote.currentDocumentId ? '재발행' : '발행'}</button>}
      </>}
    />

    {statusLocked && <AdminNotice tone={quote.status === 'accepted' ? 'info' : 'warning'}>
      <strong>{quote.status === 'accepted' ? '고객이 견적을 승인했습니다.' : quote.status === 'rejected' ? '고객이 견적을 거절했습니다.' : '취소된 견적입니다.'}</strong>
      <p>이 견적은 잠겨 있어 조건과 품목을 수정할 수 없습니다.</p>
    </AdminNotice>}
    {!canWrite && <AdminNotice><strong>조회 전용 견적입니다.</strong><p>수정과 발행에는 견적 작성 권한이 필요합니다.</p></AdminNotice>}
    {quote.isExpired && <AdminNotice tone="warning">
      <strong>유효기간이 지난 견적입니다.</strong>
      <p>고객은 이 문서를 승인하거나 거절할 수 없습니다. 조건을 확인하고 새 버전으로 재발행하세요.</p>
    </AdminNotice>}

    <form className="admin-quote-workspace" onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
      <div className="admin-editor-main">
        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>견적 조건</h2><p>고객 문서와 PDF에 표시되는 조건입니다.</p></div></div>
          <div className="admin-form-grid">
            <label className="admin-field"><span>유효기간 <b>*</b></span><input disabled={!editable} type="date" value={form.validUntil} onChange={(event) => setField('validUntil', event.target.value)} /></label>
            <label className="admin-field"><span>문서 언어</span><select disabled={!editable} value={form.documentLocale} onChange={(event) => setField('documentLocale', event.target.value)}>{localeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="admin-field"><span>납기</span><input disabled={!editable} placeholder="영업일 기준 7-10일" value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
            <label className="admin-field"><span>배송 조건</span><input disabled={!editable} placeholder="EXW / 운임 별도" value={form.shippingNote} onChange={(event) => setField('shippingNote', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>고객 안내</span><textarea disabled={!editable} rows="3" value={form.customerNote} onChange={(event) => setField('customerNote', event.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>견적 품목</h2><p>수량과 단가를 입력하면 합계는 서버에서 다시 계산됩니다.</p></div></div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-quote-items-table">
              <thead><tr><th>상품</th><th>요청 수량</th><th>견적 수량</th><th>단가</th><th>소계</th><th>품목 비고</th></tr></thead>
              <tbody>{form.items.map((item) => {
                const subtotal = Number(item.confirmedQuantity || 0) * Number(item.confirmedUnitPrice || 0)
                const optionSummary = formatSelectedProductOptions(item.selectedOptions, form.documentLocale)
                const legacySummary = [item.color, item.size].filter(Boolean)
                return <tr key={item.id}>
                  <td data-label="상품"><strong>{item.productName || item.productCode}</strong><small>{[item.productCode, ...(optionSummary.length ? optionSummary : legacySummary)].filter(Boolean).join(' / ')}</small></td>
                  <td data-label="요청 수량">{item.requestedQuantity}</td>
                  <td data-label="견적 수량"><input aria-label={`${item.productCode} 견적 수량`} disabled={!editable} min="1" type="number" value={item.confirmedQuantity} onChange={(event) => setItemField(item.id, 'confirmedQuantity', event.target.value)} /></td>
                  <td data-label="단가"><input aria-label={`${item.productCode} 단가`} disabled={!editable} min="0" step="0.01" type="number" value={item.confirmedUnitPrice} onChange={(event) => setItemField(item.id, 'confirmedUnitPrice', event.target.value)} /></td>
                  <td data-label="소계"><strong>{formatMoney(subtotal, quote.currency)}</strong></td>
                  <td data-label="품목 비고"><input aria-label={`${item.productCode} 품목 비고`} disabled={!editable} value={item.itemNote} onChange={(event) => setItemField(item.id, 'itemNote', event.target.value)} /></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </section>

        <section className="admin-editor-section admin-internal-note-section">
          <div className="admin-section-heading"><div><h2>내부 메모</h2><p>관리자만 볼 수 있으며 고객 화면과 PDF에는 표시되지 않습니다.</p></div></div>
          <label className="admin-field"><textarea disabled={!editable} rows="4" value={form.adminMemo} onChange={(event) => setField('adminMemo', event.target.value)} /></label>
        </section>

        {documents.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>발행 문서</h2><p>발행된 버전은 수정되지 않습니다.</p></div></div>
          <div className="admin-document-list">{documents.map((document) => <div key={document.id}>
            <FileCheck2 size={19} />
            <span><strong>버전 {document.revision}</strong><small>{document.documentLocale} / {new Date(document.issuedAt).toLocaleString('ko-KR')}</small></span>
            <button aria-label={`버전 ${document.revision} PDF 내려받기`} disabled={saving} title="PDF 내려받기" type="button" onClick={() => downloadDocument(document)}><Download size={17} /></button>
          </div>)}</div>
        </section>}

        {history.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>상태 이력</h2><p>발행과 고객 결정 기록입니다.</p></div></div>
          <ol className="admin-status-history">{history.map((entry) => <li key={entry.id}><span>{statusLabels[entry.toStatus] || entry.toStatus}</span><time>{new Date(entry.createdAt).toLocaleString('ko-KR')}</time>{entry.note && <small>{entry.note}</small>}</li>)}</ol>
        </section>}
      </div>

      <aside className="admin-editor-summary">
        <h2>견적 요약</h2>
        <dl><dt>상태</dt><dd>{statusLabels[quote.displayStatus || quote.status] || quote.displayStatus || quote.status}</dd><dt>통화</dt><dd>{quote.currency}</dd><dt>품목</dt><dd>{form.items.length}</dd><dt>합계</dt><dd>{formatMoney(total, quote.currency)}</dd><dt>최신 버전</dt><dd>{quote.currentRevision || '-'}</dd></dl>
        {editable && <button className="primary-action" disabled={!dirty || saving} type="submit">{saving ? '저장 중...' : '초안 저장'}</button>}
        {editable && <button disabled={saving} type="button" onClick={openIssueDialog}>{quote.currentDocumentId ? '새 버전 발행' : '견적 발행'}</button>}
        {editable && <button className="admin-danger-text" disabled={saving} type="button" onClick={() => setConfirm({ title: '견적을 취소할까요?', description: '고객은 더 이상 이 견적을 승인할 수 없습니다.', confirmLabel: '견적 취소', danger: true, action: cancelQuote })}>견적 취소</button>}
      </aside>
    </form>

    <AdminSaveBar visible={dirty && editable} saving={saving} onDiscard={discard} onSave={() => saveDraft()} />
    <AdminConfirmDialog busy={saving} confirmLabel={confirm?.confirmLabel} danger={confirm?.danger} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
