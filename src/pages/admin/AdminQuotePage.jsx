import { Ban, Banknote, Check, Download, FileCheck2, ImageIcon, PackageCheck, RotateCcw, Send, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { formatMoney } from '../../utils/commerce'
import { useLocalePath } from '../../utils/locale'
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
import { formatAdminCopy } from './adminCopy'
import { getAdminQuoteDateLocale, useAdminQuoteWorkflowCopy } from './adminQuoteWorkflowCopy'

const legacyLockedStatuses = new Set(['accepted', 'rejected', 'cancelled'])
const lineEditableWorkflowStatuses = new Set(['received', 'picking'])
const cancellableWorkflowStatuses = new Set(['received', 'picking', 'receipt_sent'])
const workflowSteps = ['received', 'picking', 'receipt_sent', 'payment_confirmed', 'shipped', 'completed']
const cancellationReasonKeys = ['out_of_stock', 'quantity_shortage', 'quality_issue', 'discontinued', 'other']
const nextWorkflowAction = {
  received: { status: 'picking', icon: PackageCheck },
  picking: { status: 'receipt_sent', icon: PackageCheck },
  receipt_sent: { status: 'payment_confirmed', icon: Banknote },
  payment_confirmed: { status: 'shipped', icon: Truck },
  shipped: { status: 'completed', icon: Check },
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
  const t = useAdminQuoteWorkflowCopy()
  const { locale } = useLocalePath()
  const dateLocale = getAdminQuoteDateLocale(locale)
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
  const localeOptions = Object.entries(t.documentLanguages)
  const cancellationReasons = cancellationReasonKeys.map((value) => [value, t.cancellationReasons[value]])

  if (apiState) return apiState
  if (!quote || !form) return <AdminEmptyState title={t.detail.notFound} action={<AdminLink to="/admin/quotes">{t.detail.quotesList}</AdminLink>} />

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
      if (!quiet) setToast({ message: t.detail.saved, tone: 'success' })
      return result
    } catch (saveError) {
      setToast({ message: saveError?.message || t.detail.saveFailed, tone: 'error' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const issueQuote = async () => {
    setConfirm(null)
    if (!form.validUntil) {
      setToast({ message: t.detail.validUntilRequired, tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await mutate((api, token) => api.updateQuote(quoteId, buildPayload(form), token))
      const issued = await mutate((api, token) => api.issueQuote(quoteId, token))
      setDirty(false)
      setToast({ message: formatAdminCopy(t.detail.issueSuccess, { revision: issued.data?.document?.revision || '' }), tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (issueError) {
      setToast({ message: issueError?.message || t.detail.issueFailed, tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const transitionWorkflow = async (targetStatus) => {
    if (targetStatus === 'receipt_sent' && dirty) {
      setToast({ message: t.detail.saveBeforeReceipt, tone: 'error' })
      return
    }
    if (targetStatus === 'cancelled' && !workflowNote.trim()) {
      setToast({ message: t.detail.cancellationNoteRequired, tone: 'error' })
      return
    }
    setSaving(true)
    try {
      if (dirty && editable) {
        await mutate((api, token) => api.updateQuote(quoteId, buildPayload(form), token))
      }
      await mutate((api, token) => api.updateQuoteWorkflow(quoteId, targetStatus, workflowNote.trim(), token))
      setDirty(false)
      setToast({ message: formatAdminCopy(t.detail.workflowChanged, { status: t.workflow[targetStatus] || targetStatus }), tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (workflowError) {
      setToast({ message: workflowError?.message || t.detail.workflowFailed, tone: 'error' })
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
      setToast({ message: downloadError?.message || t.detail.downloadFailed, tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    setForm(structuredClone(initialFormRef.current))
    setDirty(false)
  }

  const openIssueDialog = () => setConfirm({
    title: quote.currentDocumentId ? t.detail.issueNewTitle : t.detail.issueTitle,
    description: t.detail.issueDescription,
    confirmLabel: quote.currentDocumentId ? t.detail.reissue : t.detail.issue,
    action: issueQuote,
  })

  const nextAction = nextWorkflowAction[workflowStatus]
  const NextActionIcon = nextAction?.icon
  const activeStepIndex = workflowSteps.indexOf(workflowStatus)

  return <>
    <AdminPageHeader
      eyebrow={t.detail.eyebrow}
      title={quote.quoteNumber || quote.inquiryNumber || t.detail.fallbackTitle}
      description={`${quote.companyName || t.detail.companyFallback} / ${quote.currency} / ${t.workflow[workflowStatus] || workflowStatus}`}
      actions={<>
        <AdminLink to="/admin/quotes">{t.detail.list}</AdminLink>
        <AdminLink to={`/admin/inquiries/${quote.inquiryId}`}>{t.detail.sourceRequest}</AdminLink>
        {editable && <button className="primary-action" disabled={saving || publicationBlocked} type="button" onClick={openIssueDialog}><Send size={17} />{quote.currentDocumentId ? t.detail.pdfReissue : t.detail.pdfIssue}</button>}
      </>}
    />

    <section className="admin-quote-workflow" aria-label={t.detail.workflowAria}>
      {workflowSteps.map((step, index) => <div className={`${index <= activeStepIndex ? 'is-complete' : ''} ${step === workflowStatus ? 'is-current' : ''}`} key={step}>
        <span>{index + 1}</span><strong>{t.workflow[step]}</strong>
      </div>)}
      {workflowStatus === 'cancelled' && <div className="is-cancelled"><span><Ban size={15} /></span><strong>{t.workflow.cancelled}</strong></div>}
    </section>

    <AdminNotice tone="info">
      <strong>{t.detail.operationTitle}</strong>
      <p>{t.detail.operationBody}</p>
    </AdminNotice>
    {!canWrite && <AdminNotice><strong>{t.detail.readOnlyTitle}</strong><p>{t.detail.readOnlyBody}</p></AdminNotice>}
    {legacyLocked && <AdminNotice tone="warning"><strong>{t.detail.legacyTitle}</strong><p>{t.detail.legacyBody}</p></AdminNotice>}

    <form className="admin-quote-workspace" onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
      <div className="admin-editor-main">
        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>{t.detail.prepareTitle}</h2><p>{t.detail.prepareBody}</p></div>{editable && <button type="button" onClick={markAllReady}><PackageCheck size={17} />{t.detail.prepareAll}</button>}</div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-quote-items-table admin-picking-table">
              <thead><tr><th>{t.detail.columns.product}</th><th>{t.detail.columns.requested}</th><th>{t.detail.columns.prepared}</th><th>{t.detail.columns.cancelled}</th><th>{t.detail.columns.result}</th><th>{t.detail.columns.unitPrice}</th><th>{t.detail.columns.amount}</th></tr></thead>
              <tbody>{form.items.map((item) => {
                const requested = Number(item.requestedQuantity || 0)
                const prepared = Number(item.confirmedQuantity || 0)
                const cancelled = Math.max(requested - prepared, 0)
                const subtotal = prepared * Number(item.confirmedUnitPrice || 0)
                const optionSummary = formatSelectedProductOptions(item.selectedOptions, locale)
                const legacySummary = [item.color, item.size].filter(Boolean)
                const needsCancellationReason = ['partial', 'cancelled'].includes(item.fulfillmentStatus)
                return <tr className={`fulfillment-${item.fulfillmentStatus}`} key={item.id}>
                  <td data-label={t.detail.columns.product}><div className="admin-picking-product"><div className="admin-picking-product-image">{item.productImage?.url ? <img alt={item.productImage.altText || item.productName || item.productCode} loading="lazy" src={item.productImage.url} /> : <ImageIcon aria-hidden="true" size={22} />}</div><div><strong>{item.productName || item.productCode}</strong><small>{[item.productCode, ...(optionSummary.length ? optionSummary : legacySummary)].filter(Boolean).join(' / ')}</small></div></div></td>
                  <td data-label={t.detail.columns.requested}><strong>{requested}</strong></td>
                  <td data-label={t.detail.columns.prepared}><input aria-label={formatAdminCopy(t.detail.preparedQuantityAria, { code: item.productCode })} disabled={!editable} max={requested} min="0" type="number" value={item.confirmedQuantity} onChange={(event) => setPreparedQuantity(item.id, event.target.value)} /><div className="admin-picking-shortcuts"><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'ready')}>{t.detail.prepareItemAll}</button><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'cancelled')}>{t.detail.outOfStock}</button></div></td>
                  <td data-label={t.detail.columns.cancelled}><strong className={cancelled > 0 ? 'admin-cancelled-quantity' : ''}>{cancelled}</strong></td>
                  <td data-label={t.detail.columns.result}><span className={`admin-status ${item.fulfillmentStatus}`}>{t.fulfillment[item.fulfillmentStatus]}</span>{needsCancellationReason && <div className="admin-cancellation-fields"><select aria-label={formatAdminCopy(t.detail.cancellationReasonAria, { code: item.productCode })} disabled={!editable} value={item.cancellationReason} onChange={(event) => setItemField(item.id, 'cancellationReason', event.target.value)}><option value="">{t.detail.selectReason}</option>{cancellationReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label={formatAdminCopy(t.detail.cancellationNoteAria, { code: item.productCode })} disabled={!editable} placeholder={t.detail.cancellationNotePlaceholder} value={item.cancellationNote} onChange={(event) => setItemField(item.id, 'cancellationNote', event.target.value)} /></div>}</td>
                  <td data-label={t.detail.columns.unitPrice}><input aria-label={formatAdminCopy(t.detail.unitPriceAria, { code: item.productCode })} disabled={!editable || prepared === 0} min="0" step="0.01" type="number" value={item.confirmedUnitPrice} onChange={(event) => setItemField(item.id, 'confirmedUnitPrice', event.target.value)} /></td>
                  <td data-label={t.detail.columns.amount}><strong>{formatMoney(subtotal, quote.currency)}</strong></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          {unresolvedCount > 0 && <AdminNotice tone="warning"><strong>{formatAdminCopy(t.detail.unresolvedTitle, { count: unresolvedCount })}</strong><p>{t.detail.unresolvedBody}</p></AdminNotice>}
          {missingCancellationReasonCount > 0 && <AdminNotice tone="warning"><strong>{formatAdminCopy(t.detail.missingReasonTitle, { count: missingCancellationReasonCount })}</strong><p>{t.detail.missingReasonBody}</p></AdminNotice>}
          {invalidPreparedQuantityCount > 0 && <AdminNotice tone="error"><strong>{formatAdminCopy(t.detail.invalidQuantityTitle, { count: invalidPreparedQuantityCount })}</strong><p>{t.detail.invalidQuantityBody}</p></AdminNotice>}
        </section>

        {exceptionItems.length > 0 && <section className="admin-editor-section admin-quote-exceptions">
          <div className="admin-section-heading"><div><h2>{t.detail.exceptionsTitle}</h2><p>{t.detail.exceptionsBody}</p></div></div>
          <ul>{exceptionItems.map((item) => <li key={item.id}><span><strong>{item.productName || item.productCode}</strong><small>{item.productCode}</small></span><b>{formatAdminCopy(t.detail.exceptionCounts, { requested: item.requestedQuantity, prepared: item.confirmedQuantity, cancelled: Math.max(Number(item.requestedQuantity) - Number(item.confirmedQuantity), 0) })}</b><em>{cancellationReasons.find(([value]) => value === item.cancellationReason)?.[1] || t.detail.reasonMissing}{item.cancellationNote ? ` · ${item.cancellationNote}` : ''}</em></li>)}</ul>
        </section>}

        <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>{t.detail.resultTitle}</h2><p>{t.detail.resultBody}</p></div></div>
          <div className="admin-form-grid">
            <label className="admin-field"><span>{t.detail.validUntil} <b>*</b></span><input disabled={!editable} type="date" value={form.validUntil} onChange={(event) => setField('validUntil', event.target.value)} /></label>
            <label className="admin-field"><span>{t.detail.documentLanguage}</span><select disabled={!editable} value={form.documentLocale} onChange={(event) => setField('documentLocale', event.target.value)}>{localeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="admin-field"><span>{t.detail.leadTime}</span><input disabled={!editable} placeholder={t.detail.leadTimePlaceholder} value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
            <label className="admin-field"><span>{t.detail.shippingTerms}</span><input disabled={!editable} placeholder={t.detail.shippingPlaceholder} value={form.shippingNote} onChange={(event) => setField('shippingNote', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>{t.detail.buyerNote}</span><textarea disabled={!editable} rows="3" value={form.customerNote} onChange={(event) => setField('customerNote', event.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-section admin-internal-note-section">
          <div className="admin-section-heading"><div><h2>{t.detail.internalMemoTitle}</h2><p>{t.detail.internalMemoBody}</p></div></div>
          <label className="admin-field"><textarea disabled={!editable} rows="4" value={form.adminMemo} onChange={(event) => setField('adminMemo', event.target.value)} /></label>
        </section>

        {documents.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>{t.detail.documentsTitle}</h2><p>{t.detail.documentsBody}</p></div></div>
          <div className="admin-document-list">{documents.map((document) => <div key={document.id}><FileCheck2 size={19} /><span><strong>{formatAdminCopy(t.detail.version, { revision: document.revision })}</strong><small>{t.documentLanguages[document.documentLocale] || document.documentLocale} / {new Date(document.issuedAt).toLocaleString(dateLocale)}</small></span><button aria-label={formatAdminCopy(t.detail.downloadAria, { revision: document.revision })} disabled={saving} title={t.detail.downloadTitle} type="button" onClick={() => downloadDocument(document)}><Download size={17} /></button></div>)}</div>
        </section>}

        {history.length > 0 && <section className="admin-editor-section">
          <div className="admin-section-heading"><div><h2>{t.detail.historyTitle}</h2><p>{t.detail.historyBody}</p></div></div>
          <ol className="admin-status-history">{history.map((entry) => <li key={entry.id}><span>{entry.eventType === 'workflow' ? t.workflow[entry.toStatus] || entry.toStatus : entry.toStatus}</span><time>{new Date(entry.createdAt).toLocaleString(dateLocale)}</time>{entry.note && <small>{entry.note}</small>}</li>)}</ol>
        </section>}
      </div>

      <aside className="admin-editor-summary">
        <h2>{t.detail.summaryTitle}</h2>
        <dl><dt>{t.detail.currentStage}</dt><dd>{t.workflow[workflowStatus] || workflowStatus}</dd><dt>{t.detail.requestedItems}</dt><dd>{form.items.length}</dd><dt>{t.detail.exceptions}</dt><dd>{exceptionItems.length}</dd><dt>{t.detail.preparedTotal}</dt><dd>{formatMoney(total, quote.currency)}</dd><dt>{t.detail.pdfVersion}</dt><dd>{quote.currentRevision || '-'}</dd></dl>
        {editable && <button className="primary-action" disabled={!dirty || saving} type="submit">{saving ? t.detail.saving : t.detail.saveResult}</button>}
        {editable && <button disabled={saving || publicationBlocked} type="button" onClick={openIssueDialog}>{quote.currentDocumentId ? t.detail.issueNewVersion : t.detail.issueResult}</button>}
        {nextAction && canWrite && !legacyLocked && <button className="admin-workflow-next" disabled={saving || (nextAction.status === 'receipt_sent' && (dirty || !quote.currentDocumentId || publicationBlocked))} type="button" onClick={() => transitionWorkflow(nextAction.status)}><NextActionIcon size={17} />{t.nextActions[workflowStatus]}</button>}
        {workflowStatus === 'receipt_sent' && canWrite && !legacyLocked && <button disabled={saving} type="button" onClick={() => transitionWorkflow('picking')}><RotateCcw size={16} />{t.detail.revertPicking}</button>}
        {canWrite && cancellableWorkflowStatuses.has(workflowStatus) && !legacyLocked && <label className="admin-field admin-workflow-note"><span>{t.detail.workflowNote}</span><textarea rows="3" value={workflowNote} onChange={(event) => setWorkflowNote(event.target.value)} /></label>}
        {canWrite && cancellableWorkflowStatuses.has(workflowStatus) && !legacyLocked && <button className="admin-danger-text" disabled={saving} type="button" onClick={() => transitionWorkflow('cancelled')}><Ban size={16} />{t.detail.cancelAll}</button>}
      </aside>
    </form>

    <AdminSaveBar ariaLabel={t.detail.saveBarAria} dirtyLabel={t.detail.unsavedChanges} discardLabel={t.detail.discard} saveLabel={t.detail.save} savingLabel={t.detail.saving} visible={dirty && editable} saving={saving} onDiscard={discard} onSave={() => saveDraft()} />
    <AdminConfirmDialog busy={saving} busyLabel={t.detail.processing} cancelLabel={t.detail.cancel} confirmLabel={confirm?.confirmLabel} danger={confirm?.danger} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast closeLabel={t.detail.closeToast} message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
