import { Ban, Banknote, Check, Download, FileCheck2, PackageCheck, RotateCcw, Send, Truck } from 'lucide-react'
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

const legacyLockedStatuses = new Set(['accepted', 'rejected', 'cancelled'])
const lineEditableWorkflowStatuses = new Set(['received', 'picking'])
const cancellableWorkflowStatuses = new Set(['received', 'picking', 'receipt_sent'])
const workflowSteps = ['received', 'picking', 'receipt_sent', 'payment_confirmed', 'shipped', 'completed']
const workflowLabels = {
  received: '요청 접수',
  picking: '상품 준비 중',
  receipt_sent: 'SNS 영수증 발송',
  payment_confirmed: '입금 확인',
  shipped: '발송 완료',
  completed: '거래 종료',
  cancelled: '전체 취소',
}
const fulfillmentLabels = {
  pending: '미확인',
  ready: '준비 완료',
  partial: '일부 취소',
  cancelled: '전체 취소',
}
const cancellationReasons = [
  ['out_of_stock', '재고 없음'],
  ['quantity_shortage', '수량 부족'],
  ['quality_issue', '품질 확인 불가'],
  ['discontinued', '취급 종료'],
  ['other', '기타'],
]
const nextWorkflowAction = {
  received: { status: 'picking', label: '피킹 시작', icon: PackageCheck },
  picking: { status: 'receipt_sent', label: 'SNS 영수증 발송 완료', icon: Send },
  receipt_sent: { status: 'payment_confirmed', label: '입금 확인', icon: Banknote },
  payment_confirmed: { status: 'shipped', label: '발송 완료', icon: Truck },
  shipped: { status: 'completed', label: '거래 종료', icon: Check },
}

function deriveFulfillmentStatus(confirmedQuantity, requestedQuantity) {
  const confirmed = Number(confirmedQuantity)
  const requested = Number(requestedQuantity)
  if (!Number.isFinite(confirmed)) return 'pending'
  if (confirmed <= 0) return 'cancelled'
  if (confirmed < requested) return 'partial'
  return 'ready'
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
      confirmedQuantity: String(item.confirmedQuantity ?? item.requestedQuantity ?? 0),
      confirmedUnitPrice: String(item.confirmedUnitPrice ?? item.requestedPriceSnapshot ?? 0),
      fulfillmentStatus: item.fulfillmentStatus || 'pending',
      cancellationReason: item.cancellationReason || '',
      cancellationNote: item.cancellationNote || '',
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
      fulfillmentStatus: item.fulfillmentStatus,
      cancellationReason: item.cancellationReason || undefined,
      cancellationNote: item.cancellationNote,
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
  const [workflowNote, setWorkflowNote] = useState('')
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [confirm, setConfirm] = useState(null)
  const { data, error, status } = useAdminApiResource((api, token) => api.getQuote(quoteId, token), [quoteId, refreshKey])

  useEffect(() => {
    if (status !== 'ready') return
    const next = quoteToForm(data?.quote, data?.items || [])
    initialFormRef.current = structuredClone(next)
    setForm(next)
    setWorkflowNote(data?.quote?.workflowNote || '')
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
  const workflowStatus = quote?.workflowStatus || 'received'
  const legacyLocked = legacyLockedStatuses.has(quote?.status)
  const editable = canWrite && !legacyLocked && lineEditableWorkflowStatuses.has(workflowStatus)
  const total = useMemo(() => (form?.items || []).reduce((sum, item) => {
    const quantity = Number(item.confirmedQuantity)
    const unitPrice = Number(item.confirmedUnitPrice)
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0)
  }, 0), [form?.items])
  const exceptionItems = useMemo(() => (form?.items || []).filter((item) => ['partial', 'cancelled'].includes(item.fulfillmentStatus)), [form?.items])
  const unresolvedCount = useMemo(() => (form?.items || []).filter((item) => item.fulfillmentStatus === 'pending').length, [form?.items])
  const missingCancellationReasonCount = useMemo(() => (form?.items || []).filter((item) => (
    ['partial', 'cancelled'].includes(item.fulfillmentStatus) && !item.cancellationReason
  )).length, [form?.items])
  const invalidPreparedQuantityCount = useMemo(() => (form?.items || []).filter((item) => {
    const prepared = Number(item.confirmedQuantity)
    const requested = Number(item.requestedQuantity)
    return !Number.isFinite(prepared) || prepared < 0 || prepared > requested
  }).length, [form?.items])
  const publicationBlocked = unresolvedCount > 0 || missingCancellationReasonCount > 0 || invalidPreparedQuantityCount > 0

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

  const setPreparedQuantity = (itemId, rawValue) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item
        const nextStatus = rawValue === '' ? 'pending' : deriveFulfillmentStatus(rawValue, item.requestedQuantity)
        const isShort = ['partial', 'cancelled'].includes(nextStatus)
        return {
          ...item,
          confirmedQuantity: rawValue,
          fulfillmentStatus: nextStatus,
          cancellationReason: isShort
            ? item.cancellationReason || (nextStatus === 'cancelled' ? 'out_of_stock' : 'quantity_shortage')
            : '',
          cancellationNote: isShort ? item.cancellationNote : '',
        }
      }),
    }))
    setDirty(true)
  }

  const markItem = (itemId, status) => {
    const item = form.items.find((candidate) => candidate.id === itemId)
    if (!item) return
    setPreparedQuantity(itemId, status === 'ready' ? String(item.requestedQuantity) : '0')
  }

  const markAllReady = () => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => ({
        ...item,
        confirmedQuantity: String(item.requestedQuantity),
        fulfillmentStatus: 'ready',
        cancellationReason: '',
        cancellationNote: '',
      })),
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
      setRefreshKey((current) => current + 1)
      if (!quiet) setToast({ message: '상품 준비 결과와 견적 초안을 저장했습니다.', tone: 'success' })
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
      setToast({ message: `준비 결과 PDF v${issued.data?.document?.revision || ''}를 발행했습니다.`, tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (issueError) {
      setToast({ message: issueError?.message || '견적서를 발행하지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const transitionWorkflow = async (targetStatus) => {
    if (targetStatus === 'receipt_sent' && dirty) {
      setToast({ message: '변경 내용을 저장하고 준비 결과 PDF를 다시 발행한 뒤 SNS 발송 완료로 변경해 주세요.', tone: 'error' })
      return
    }
    if (targetStatus === 'cancelled' && !workflowNote.trim()) {
      setToast({ message: '전체 취소 사유를 운영 메모에 입력해 주세요.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      if (dirty && editable) {
        await mutate((api, token) => api.updateQuote(quoteId, buildPayload(form), token))
      }
      await mutate((api, token) => api.updateQuoteWorkflow(quoteId, targetStatus, workflowNote.trim(), token))
      setDirty(false)
      setToast({ message: `운영 상태를 '${workflowLabels[targetStatus]}'로 변경했습니다.`, tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (workflowError) {
      setToast({ message: workflowError?.message || '운영 상태를 변경하지 못했습니다.', tone: 'error' })
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
    title: quote.currentDocumentId ? '새 버전으로 발행할까요?' : '준비 결과 견적서를 발행할까요?',
    description: '원 요청 수량과 준비·취소 수량을 함께 표시한 PDF가 생성됩니다. 발행 후에도 SNS 영수증 발송 완료 전까지 다시 피킹하고 재발행할 수 있습니다.',
    confirmLabel: quote.currentDocumentId ? '재발행' : '발행',
    action: issueQuote,
  })

  const nextAction = nextWorkflowAction[workflowStatus]
  const NextActionIcon = nextAction?.icon
  const activeStepIndex = workflowSteps.indexOf(workflowStatus)

  return <>
    <AdminPageHeader
      eyebrow="견적 피킹"
      title={quote.quoteNumber || quote.inquiryNumber || '견적 요청'}
      description={`${quote.companyName || '거래처'} / ${quote.currency} / ${workflowLabels[workflowStatus] || workflowStatus}`}
      actions={<>
        <AdminLink to="/admin/quotes">목록</AdminLink>
        <AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>원본 요청</AdminLink>
        {editable && <button className="primary-action" disabled={saving || publicationBlocked} type="button" onClick={openIssueDialog}><Send size={17} />{quote.currentDocumentId ? 'PDF 재발행' : 'PDF 발행'}</button>}
      </>}
    />

    <section className="admin-quote-workflow" aria-label="견적 처리 단계">
      {workflowSteps.map((step, index) => <div className={`${index <= activeStepIndex ? 'is-complete' : ''} ${step === workflowStatus ? 'is-current' : ''}`} key={step}>
        <span>{index + 1}</span><strong>{workflowLabels[step]}</strong>
      </div>)}
      {workflowStatus === 'cancelled' && <div className="is-cancelled"><span><Ban size={15} /></span><strong>{workflowLabels.cancelled}</strong></div>}
    </section>

    <AdminNotice tone="info">
      <strong>로그인 구매자의 견적 요청을 매장에서 직접 준비하는 화면입니다.</strong>
      <p>사이트 결제는 없습니다. 준비 결과를 PDF로 남긴 뒤 별도 SNS로 영수증과 계좌 안내를 보내고, 입금 확인 후 발송 상태를 기록합니다.</p>
    </AdminNotice>
    {!canWrite && <AdminNotice><strong>조회 전용 견적입니다.</strong><p>상품 준비와 상태 변경에는 견적 작성 권한이 필요합니다.</p></AdminNotice>}
    {legacyLocked && <AdminNotice tone="warning"><strong>기존 방식으로 종료된 견적입니다.</strong><p>과거 기록은 그대로 보존되며 새 피킹 흐름으로 수정할 수 없습니다.</p></AdminNotice>}

    <form className="admin-quote-workspace" onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
      <div className="admin-editor-main">
        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>1. 상품 준비</h2><p>원 요청 수량은 바뀌지 않습니다. 실제로 챙긴 수량만 입력하면 취소 수량이 자동 계산됩니다.</p></div>{editable && <button type="button" onClick={markAllReady}><PackageCheck size={17} />모든 품목 준비</button>}</div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-quote-items-table admin-picking-table">
              <thead><tr><th>상품·옵션</th><th>요청</th><th>준비</th><th>취소</th><th>처리 결과</th><th>단가</th><th>금액</th></tr></thead>
              <tbody>{form.items.map((item) => {
                const requested = Number(item.requestedQuantity || 0)
                const prepared = Number(item.confirmedQuantity || 0)
                const cancelled = Math.max(requested - prepared, 0)
                const subtotal = prepared * Number(item.confirmedUnitPrice || 0)
                const optionSummary = formatSelectedProductOptions(item.selectedOptions, form.documentLocale)
                const legacySummary = [item.color, item.size].filter(Boolean)
                const needsCancellationReason = ['partial', 'cancelled'].includes(item.fulfillmentStatus)
                return <tr className={`fulfillment-${item.fulfillmentStatus}`} key={item.id}>
                  <td data-label="상품·옵션"><strong>{item.productName || item.productCode}</strong><small>{[item.productCode, ...(optionSummary.length ? optionSummary : legacySummary)].filter(Boolean).join(' / ')}</small></td>
                  <td data-label="요청"><strong>{requested}</strong></td>
                  <td data-label="준비"><input aria-label={`${item.productCode} 준비 수량`} disabled={!editable} max={requested} min="0" type="number" value={item.confirmedQuantity} onChange={(event) => setPreparedQuantity(item.id, event.target.value)} /><div className="admin-picking-shortcuts"><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'ready')}>전부 준비</button><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'cancelled')}>품절</button></div></td>
                  <td data-label="취소"><strong className={cancelled > 0 ? 'admin-cancelled-quantity' : ''}>{cancelled}</strong></td>
                  <td data-label="처리 결과"><span className={`admin-status ${item.fulfillmentStatus}`}>{fulfillmentLabels[item.fulfillmentStatus]}</span>{needsCancellationReason && <div className="admin-cancellation-fields"><select aria-label={`${item.productCode} 취소 사유`} disabled={!editable} value={item.cancellationReason} onChange={(event) => setItemField(item.id, 'cancellationReason', event.target.value)}><option value="">사유 선택</option>{cancellationReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label={`${item.productCode} 취소 메모`} disabled={!editable} placeholder="구매자에게 보일 추가 설명" value={item.cancellationNote} onChange={(event) => setItemField(item.id, 'cancellationNote', event.target.value)} /></div>}</td>
                  <td data-label="단가"><input aria-label={`${item.productCode} 단가`} disabled={!editable || prepared === 0} min="0" step="0.01" type="number" value={item.confirmedUnitPrice} onChange={(event) => setItemField(item.id, 'confirmedUnitPrice', event.target.value)} /></td>
                  <td data-label="금액"><strong>{formatMoney(subtotal, quote.currency)}</strong></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          {unresolvedCount > 0 && <AdminNotice tone="warning"><strong>아직 확인하지 않은 품목이 {unresolvedCount}개 있습니다.</strong><p>각 품목을 준비 완료, 일부 취소 또는 전체 취소로 정리해야 PDF를 발행할 수 있습니다.</p></AdminNotice>}
          {missingCancellationReasonCount > 0 && <AdminNotice tone="warning"><strong>취소 사유가 필요한 품목이 {missingCancellationReasonCount}개 있습니다.</strong><p>일부 또는 전체 취소 품목의 사유를 선택해야 준비 결과 PDF를 발행할 수 있습니다.</p></AdminNotice>}
          {invalidPreparedQuantityCount > 0 && <AdminNotice tone="error"><strong>준비 수량을 확인해야 하는 품목이 {invalidPreparedQuantityCount}개 있습니다.</strong><p>준비 수량은 0 이상이며 원 요청 수량을 넘을 수 없습니다.</p></AdminNotice>}
        </section>

        {exceptionItems.length > 0 && <section className="admin-editor-section admin-quote-exceptions">
          <div className="admin-section-heading"><div><h2>취소·수량 부족 품목</h2><p>원 견적 요청과 분리해 구매자에게 그대로 표시됩니다.</p></div></div>
          <ul>{exceptionItems.map((item) => <li key={item.id}><span><strong>{item.productName || item.productCode}</strong><small>{item.productCode}</small></span><b>요청 {item.requestedQuantity} / 준비 {item.confirmedQuantity} / 취소 {Math.max(Number(item.requestedQuantity) - Number(item.confirmedQuantity), 0)}</b><em>{cancellationReasons.find(([value]) => value === item.cancellationReason)?.[1] || '사유 미입력'}{item.cancellationNote ? ` · ${item.cancellationNote}` : ''}</em></li>)}</ul>
        </section>}

        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>2. 준비 결과 견적</h2><p>준비된 수량만 합산하고 취소 품목은 수량과 사유를 함께 문서에 남깁니다.</p></div></div>
          <div className="admin-form-grid">
            <label className="admin-field"><span>유효기간 <b>*</b></span><input disabled={!editable} type="date" value={form.validUntil} onChange={(event) => setField('validUntil', event.target.value)} /></label>
            <label className="admin-field"><span>문서 언어</span><select disabled={!editable} value={form.documentLocale} onChange={(event) => setField('documentLocale', event.target.value)}>{localeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="admin-field"><span>납기</span><input disabled={!editable} placeholder="영업일 기준 7-10일" value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
            <label className="admin-field"><span>배송 조건</span><input disabled={!editable} placeholder="택배 / 운임 별도" value={form.shippingNote} onChange={(event) => setField('shippingNote', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>구매자 안내</span><textarea disabled={!editable} rows="3" value={form.customerNote} onChange={(event) => setField('customerNote', event.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-section admin-internal-note-section">
          <div className="admin-section-heading"><div><h2>내부 메모</h2><p>관리자만 볼 수 있으며 구매자 화면과 PDF에는 표시되지 않습니다.</p></div></div>
          <label className="admin-field"><textarea disabled={!editable} rows="4" value={form.adminMemo} onChange={(event) => setField('adminMemo', event.target.value)} /></label>
        </section>

        {documents.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>발행 문서</h2><p>각 버전은 수정되지 않으며 당시의 준비·취소 결과를 보존합니다.</p></div></div>
          <div className="admin-document-list">{documents.map((document) => <div key={document.id}><FileCheck2 size={19} /><span><strong>버전 {document.revision}</strong><small>{document.documentLocale} / {new Date(document.issuedAt).toLocaleString('ko-KR')}</small></span><button aria-label={`버전 ${document.revision} PDF 내려받기`} disabled={saving} title="PDF 내려받기" type="button" onClick={() => downloadDocument(document)}><Download size={17} /></button></div>)}</div>
        </section>}

        {history.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>처리 이력</h2><p>문서 발행과 운영 상태 변경을 시간순으로 기록합니다.</p></div></div>
          <ol className="admin-status-history">{history.map((entry) => <li key={entry.id}><span>{entry.eventType === 'workflow' ? workflowLabels[entry.toStatus] || entry.toStatus : entry.toStatus}</span><time>{new Date(entry.createdAt).toLocaleString('ko-KR')}</time>{entry.note && <small>{entry.note}</small>}</li>)}</ol>
        </section>}
      </div>

      <aside className="admin-editor-summary">
        <h2>운영 요약</h2>
        <dl><dt>현재 단계</dt><dd>{workflowLabels[workflowStatus] || workflowStatus}</dd><dt>원 요청 품목</dt><dd>{form.items.length}</dd><dt>취소·부족</dt><dd>{exceptionItems.length}</dd><dt>준비 금액</dt><dd>{formatMoney(total, quote.currency)}</dd><dt>PDF 버전</dt><dd>{quote.currentRevision || '-'}</dd></dl>
        {editable && <button className="primary-action" disabled={!dirty || saving} type="submit">{saving ? '저장 중...' : '준비 결과 저장'}</button>}
        {editable && <button disabled={saving || publicationBlocked} type="button" onClick={openIssueDialog}>{quote.currentDocumentId ? 'PDF 새 버전 발행' : '준비 결과 PDF 발행'}</button>}
        {nextAction && canWrite && !legacyLocked && <button className="admin-workflow-next" disabled={saving || (nextAction.status === 'receipt_sent' && (dirty || !quote.currentDocumentId || publicationBlocked))} type="button" onClick={() => transitionWorkflow(nextAction.status)}><NextActionIcon size={17} />{nextAction.label}</button>}
        {workflowStatus === 'receipt_sent' && canWrite && !legacyLocked && <button disabled={saving} type="button" onClick={() => transitionWorkflow('picking')}><RotateCcw size={16} />피킹으로 되돌리기</button>}
        {canWrite && cancellableWorkflowStatuses.has(workflowStatus) && !legacyLocked && <label className="admin-field admin-workflow-note"><span>운영 메모 / 전체 취소 사유</span><textarea rows="3" value={workflowNote} onChange={(event) => setWorkflowNote(event.target.value)} /></label>}
        {canWrite && cancellableWorkflowStatuses.has(workflowStatus) && !legacyLocked && <button className="admin-danger-text" disabled={saving} type="button" onClick={() => transitionWorkflow('cancelled')}><Ban size={16} />견적 전체 취소</button>}
      </aside>
    </form>

    <AdminSaveBar visible={dirty && editable} saving={saving} onDiscard={discard} onSave={() => saveDraft()} />
    <AdminConfirmDialog busy={saving} confirmLabel={confirm?.confirmLabel} danger={confirm?.danger} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
