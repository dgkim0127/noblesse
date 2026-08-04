import { Download, FileCheck2, ImageIcon, MoreHorizontal, PackageCheck, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
  AdminToast,
} from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy } from './adminCopy'
import { createAdminQuoteSampleItems, createAdminQuoteSampleQuote, isAdminQuoteSampleMode } from './adminQuoteSampleItems'
import { useAdminPosQuoteCopy } from './adminPosQuoteCopy'
import { getAdminQuoteDateLocale, useAdminQuoteWorkflowCopy } from './adminQuoteWorkflowCopy'

const legacyLockedStatuses = new Set(['accepted', 'rejected', 'cancelled'])
const lineEditableWorkflowStatuses = new Set(['received', 'picking'])
const workflowSteps = ['received', 'picking', 'finalized', 'published']
const cancellationReasonKeys = ['out_of_stock', 'quantity_shortage', 'quality_issue', 'discontinued', 'other']

function createIdempotencyKey(action, quoteId) {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${action}-${quoteId}-${suffix}`
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
    items: (items || []).map((item) => {
      const requested = Number(item.requestedQuantity || 0)
      const confirmed = Number(item.preparedQuantity ?? item.confirmedQuantity ?? requested)
      return {
        ...item,
        confirmedQuantity: String(confirmed),
        confirmedUnitPrice: String(item.requestedPriceSnapshot ?? item.confirmedUnitPrice ?? 0),
        fulfillmentStatus: item.fulfillmentStatus || deriveFulfillmentStatus(confirmed, requested),
        cancellationReason: item.cancellationReason || '',
        cancellationNote: item.cancellationNote || '',
        itemNote: item.itemNote || '',
      }
    }),
  }
}

function buildPosPayload(form, quoteId, version, action) {
  return {
    expectedVersion: Number(version || 1),
    idempotencyKey: createIdempotencyKey(action, quoteId),
    leadTime: form.leadTime,
    shippingNote: form.shippingNote,
    validUntil: form.validUntil || undefined,
    documentLocale: form.documentLocale,
    customerNote: form.customerNote,
    adminMemo: form.adminMemo,
    items: form.items.map((item) => ({
      id: item.id,
      preparedQuantity: Number(item.confirmedQuantity),
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

function orderDocuments(documents, currentDocumentId) {
  return [...documents].sort((left, right) => {
    if (left.id === currentDocumentId) return -1
    if (right.id === currentDocumentId) return 1
    return Number(right.revision || 0) - Number(left.revision || 0)
  })
}

function groupWorkflowHistory(history) {
  return history
    .filter((entry) => entry.eventType === 'workflow')
    .reduce((groups, entry) => {
      const status = entry.toStatus || entry.fromStatus || 'received'
      const previous = groups.at(-1)
      if (previous?.status === status) {
        previous.entries.push(entry)
        return groups
      }
      groups.push({ status, entries: [entry] })
      return groups
    }, [])
}

export function AdminQuotePage() {
  const { quoteId } = useParams()
  const [searchParams] = useSearchParams()
  const t = useAdminQuoteWorkflowCopy()
  const posT = useAdminPosQuoteCopy()
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
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [confirm, setConfirm] = useState(null)
  const { data, error, status } = useAdminApiResource((api, token) => api.getPosQuote(quoteId, token), [quoteId, refreshKey])
  const sampleMode = isAdminQuoteSampleMode(searchParams, globalThis.location?.hostname || '')
  const quote = useMemo(() => sampleMode ? createAdminQuoteSampleQuote(data?.quote) : data?.quote, [data?.quote, sampleMode])
  const sourceItems = useMemo(
    () => sampleMode ? createAdminQuoteSampleItems(data?.items || [], locale) : data?.items || [],
    [data?.items, locale, sampleMode],
  )

  useEffect(() => {
    if (status !== 'ready') return
    const next = quoteToForm(quote, sourceItems)
    initialFormRef.current = structuredClone(next)
    setForm(next)
    setDirty(false)
  }, [quote, sourceItems, status])

  useEffect(() => {
    if (!dirty || sampleMode) return undefined
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty, sampleMode])

  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  const documents = useMemo(() => sampleMode ? [] : data?.documents || [], [data?.documents, sampleMode])
  const history = useMemo(() => sampleMode ? [] : data?.history || [], [data?.history, sampleMode])
  const posState = sampleMode ? { version: 1 } : data?.pos?.state || { version: 1 }
  const workflowStatus = posState.publishedAt
    ? 'published'
    : posState.finalizedAt
      ? 'finalized'
      : Number(posState.version || 1) > 1 || posState.lastPreview
        ? 'picking'
        : 'received'
  const legacyLocked = legacyLockedStatuses.has(quote?.status)
  const canPersist = canWrite && !sampleMode
  const canEditDraft = canPersist || sampleMode
  const editable = canEditDraft && !legacyLocked && lineEditableWorkflowStatuses.has(workflowStatus)
  const supplyAmount = useMemo(() => (form?.items || []).reduce((sum, item) => {
    const quantity = Number(item.confirmedQuantity)
    const unitPrice = Number(item.confirmedUnitPrice)
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0)
  }, 0), [form?.items])
  const vatAmount = Math.round(supplyAmount * 0.1)
  const total = supplyAmount + vatAmount
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
  const finalizationBlocked = unresolvedCount > 0 || missingCancellationReasonCount > 0 || invalidPreparedQuantityCount > 0
  const localeOptions = Object.entries(t.documentLanguages)
  const cancellationReasons = cancellationReasonKeys.map((value) => [value, t.cancellationReasons[value]])
  const orderedDocuments = useMemo(() => orderDocuments(documents, quote?.currentDocumentId), [documents, quote?.currentDocumentId])
  const workflowHistoryGroups = useMemo(() => groupWorkflowHistory(history), [history])

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

  const handlePosError = (actionError, fallback) => (
    actionError?.status === 409 ? posT.conflict : actionError?.message || fallback
  )

  const saveDraft = async ({ quiet = false } = {}) => {
    if (!canPersist || !editable) return null
    setSaving(true)
    try {
      const result = await mutate((api, token) => api.savePosQuotePicking(
        quoteId,
        buildPosPayload(form, quoteId, posState.version, 'save-picking'),
        token,
      ))
      const nextQuote = result.data?.quote || quote
      const nextItems = result.data?.items || result.data?.quote?.items || form.items
      const next = quoteToForm(nextQuote, nextItems)
      initialFormRef.current = structuredClone(next)
      setForm(next)
      setDirty(false)
      setRefreshKey((current) => current + 1)
      if (!quiet) setToast({ message: posT.saved, tone: 'success' })
      return result
    } catch (saveError) {
      setToast({ message: handlePosError(saveError, posT.saveFailed), tone: 'error' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const finalizeQuote = async () => {
    setConfirm(null)
    if (!canPersist) return
    if (dirty) {
      setToast({ message: posT.saveBeforeFinalize, tone: 'error' })
      return
    }
    if (!form.validUntil) {
      setToast({ message: t.detail.validUntilRequired, tone: 'error' })
      return
    }
    if (finalizationBlocked) {
      setToast({ message: t.detail.invalidQuantityBody || posT.saveBeforeFinalize, tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await mutate((api, token) => api.finalizePosQuote(
        quoteId,
        buildPosPayload(form, quoteId, posState.version, 'finalize'),
        token,
      ))
      setToast({ message: posT.finalized, tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (finalizeError) {
      setToast({ message: handlePosError(finalizeError, posT.finalizeFailed), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const publishQuote = async () => {
    setConfirm(null)
    if (!canPersist) return
    setSaving(true)
    try {
      await mutate((api, token) => api.publishPosQuote(
        quoteId,
        {
          expectedVersion: Number(posState.version || 1),
          idempotencyKey: createIdempotencyKey('publish', quoteId),
        },
        token,
      ))
      setToast({ message: posT.published, tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (publishError) {
      setToast({ message: handlePosError(publishError, posT.publishFailed), tone: 'error' })
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

  const openFinalizeDialog = () => setConfirm({
    kind: 'finalize',
    title: posT.finalizeTitle,
    description: posT.finalizeDescription,
    confirmLabel: posT.finalizeButton,
    action: finalizeQuote,
  })

  const openPublishDialog = () => setConfirm({
    kind: 'publish',
    title: posT.publishTitle,
    description: posT.publishDescription,
    confirmLabel: posT.publishButton,
    action: publishQuote,
  })

  const activeStepIndex = workflowSteps.indexOf(workflowStatus)
  const currentDocument = orderedDocuments[0]?.id === quote.currentDocumentId
    ? orderedDocuments[0]
    : orderedDocuments.find((document) => document.id === quote.currentDocumentId) || orderedDocuments[0]
  const previousDocuments = orderedDocuments.filter((document) => document.id !== currentDocument?.id)

  return <>
    <AdminPageHeader
      eyebrow={t.detail.eyebrow}
      title={quote.quoteNumber || quote.inquiryNumber || t.detail.fallbackTitle}
      description={`${quote.companyName || t.detail.companyFallback} / ${quote.currency} / ${posT.workflow[workflowStatus] || workflowStatus}`}
      actions={<>
        <AdminLink to="/admin/quotes">{t.detail.list}</AdminLink>
        <details className="admin-quote-more-menu">
          <summary aria-label={t.detail.moreActions} title={t.detail.moreActions}><MoreHorizontal size={18} /></summary>
          <div>
            <AdminLink className="admin-quote-menu-link" to={`/admin/inquiries/${quote.inquiryId}`}>{t.detail.sourceRequest}</AdminLink>
          </div>
        </details>
      </>}
    />

    <section className="admin-quote-workflow" aria-label={t.detail.workflowAria}>
      {workflowSteps.map((step, index) => <div className={`${index <= activeStepIndex ? 'is-complete' : ''} ${step === workflowStatus ? 'is-current' : ''}`} key={step}>
        <span>{index + 1}</span><strong>{posT.workflow[step]}</strong>
      </div>)}
    </section>

    <details className="admin-quote-workflow-compact">
      <summary><strong>{`${Math.max(activeStepIndex + 1, 1)}/${workflowSteps.length} ${posT.workflow[workflowStatus] || workflowStatus}`}</strong><span>{t.detail.allStages}</span></summary>
      <ol>{workflowSteps.map((step, index) => <li className={step === workflowStatus ? 'is-current' : ''} key={step}><span>{index + 1}</span>{posT.workflow[step]}</li>)}</ol>
    </details>

    <div className="admin-quote-operation-notice">
      <AdminNotice tone="info">
        <strong>{posT.operationTitle}</strong>
        <p>{posT.operationDescription}</p>
      </AdminNotice>
    </div>
    {sampleMode && <AdminNotice tone="warning"><strong>{t.detail.sampleModeTitle}</strong><p>{t.detail.sampleModeBody}</p></AdminNotice>}
    {!canWrite && <AdminNotice><strong>{t.detail.readOnlyTitle}</strong><p>{t.detail.readOnlyBody}</p></AdminNotice>}
    {legacyLocked && <AdminNotice tone="warning"><strong>{t.detail.legacyTitle}</strong><p>{t.detail.legacyBody}</p></AdminNotice>}

    <details className="admin-quote-mobile-summary">
      <summary><strong>{posT.workflow[workflowStatus] || workflowStatus}</strong><span>{t.detail.requestedItems} {form.items.length} / {formatMoney(total, quote.currency)}</span></summary>
      <dl><dt>{t.detail.exceptions}</dt><dd>{exceptionItems.length}</dd><dt>{t.detail.pdfVersion}</dt><dd>{quote.currentRevision || '-'}</dd></dl>
    </details>

    <form className={`admin-quote-workspace${sampleMode ? ' is-sample-preview' : ''}`} onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
      <div className="admin-editor-main">
        <section className="admin-editor-section admin-picking-section">
          <div className="admin-section-heading"><div><h2>{t.detail.prepareTitle}</h2><p>{t.detail.prepareBody}</p></div>{editable && <button type="button" onClick={markAllReady}><PackageCheck size={17} />{t.detail.prepareAll}</button>}</div>
          <div className="admin-picking-list">
            {form.items.map((item) => {
              const requested = Number(item.requestedQuantity || 0)
              const prepared = Number(item.confirmedQuantity || 0)
              const cancelled = Math.max(requested - prepared, 0)
              const subtotal = prepared * Number(item.confirmedUnitPrice || 0)
              const optionSummary = formatSelectedProductOptions(item.selectedOptions, locale)
              const legacySummary = [
                item.color ? `${t.detail.colorLabel}: ${item.color}` : '',
                item.size ? `${t.detail.sizeLabel}: ${item.size}` : '',
              ].filter(Boolean)
              const options = optionSummary.length ? optionSummary : legacySummary
              const needsCancellationReason = ['partial', 'cancelled'].includes(item.fulfillmentStatus)
              return <article className={`admin-picking-item fulfillment-${item.fulfillmentStatus}`} key={item.id}>
                <div className="admin-picking-item-product">
                  <div className="admin-picking-product-image">{item.productImage?.url ? <img alt={item.productImage.altText || item.productName || item.productCode} loading="lazy" src={item.productImage.url} /> : <ImageIcon aria-hidden="true" size={22} />}</div>
                  <div className="admin-picking-identity">
                    <strong>{item.productName || item.productCode}</strong>
                    <code>{item.productCode}</code>
                    {options.length > 0 && <ul className="admin-picking-options">{options.map((option) => <li key={option}>{option}</li>)}</ul>}
                  </div>
                </div>
                <div className="admin-picking-quantity-panel">
                  <div className="admin-quantity-metrics">
                    <span><small>{t.detail.columns.requested}</small><strong>{requested}</strong></span>
                    <label><small>{t.detail.columns.prepared}</small><input aria-label={formatAdminCopy(t.detail.preparedQuantityAria, { code: item.productCode })} disabled={!editable} max={requested} min="0" type="number" value={item.confirmedQuantity} onChange={(event) => setPreparedQuantity(item.id, event.target.value)} /></label>
                    <span><small>{t.detail.columns.cancelled}</small><strong className={cancelled > 0 ? 'admin-cancelled-quantity' : ''}>{cancelled}</strong></span>
                  </div>
                  <div className="admin-picking-shortcuts"><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'ready')}>{t.detail.prepareItemAll}</button><button disabled={!editable} type="button" onClick={() => markItem(item.id, 'cancelled')}>{t.detail.outOfStock}</button></div>
                </div>
                <div className="admin-picking-result-panel">
                  <div className="admin-picking-result-heading"><small>{t.detail.columns.result}</small><span className={`admin-status ${item.fulfillmentStatus}`}>{t.fulfillment[item.fulfillmentStatus]}</span></div>
                  <div className="admin-picking-unit-price"><small>{t.detail.columns.unitPrice}</small><strong title={posT.unitPriceReadOnly}>{formatMoney(Number(item.confirmedUnitPrice || 0), quote.currency)}</strong></div>
                  <div className="admin-picking-subtotal"><small>{t.detail.columns.amount}</small><strong>{formatMoney(subtotal, quote.currency)}</strong></div>
                </div>
                {needsCancellationReason && <div className="admin-cancellation-fields">
                  <label><span>{t.detail.cancellationReasonLabel}</span><select aria-label={formatAdminCopy(t.detail.cancellationReasonAria, { code: item.productCode })} disabled={!editable} value={item.cancellationReason} onChange={(event) => setItemField(item.id, 'cancellationReason', event.target.value)}><option value="">{t.detail.selectReason}</option>{cancellationReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label><span>{t.detail.cancellationNoteLabel}</span><input aria-label={formatAdminCopy(t.detail.cancellationNoteAria, { code: item.productCode })} disabled={!editable} placeholder={t.detail.cancellationNotePlaceholder} value={item.cancellationNote} onChange={(event) => setItemField(item.id, 'cancellationNote', event.target.value)} /></label>
                </div>}
              </article>
            })}
          </div>
          {unresolvedCount > 0 && <AdminNotice tone="warning"><strong>{formatAdminCopy(t.detail.unresolvedTitle, { count: unresolvedCount })}</strong><p>{t.detail.unresolvedBody}</p></AdminNotice>}
          {missingCancellationReasonCount > 0 && <AdminNotice tone="warning"><strong>{formatAdminCopy(t.detail.missingReasonTitle, { count: missingCancellationReasonCount })}</strong><p>{t.detail.missingReasonBody}</p></AdminNotice>}
          {invalidPreparedQuantityCount > 0 && <AdminNotice tone="error"><strong>{formatAdminCopy(t.detail.invalidQuantityTitle, { count: invalidPreparedQuantityCount })}</strong><p>{t.detail.invalidQuantityBody}</p></AdminNotice>}
        </section>

        <section className="admin-editor-section admin-quote-document-section">
          <div className="admin-section-heading"><div><h2>{t.detail.documentsTitle}</h2><p>{t.detail.documentsBody}</p></div></div>
          <label className="admin-field admin-valid-until-field"><span>{t.detail.validUntil} <b>*</b></span><input disabled={!editable} type="date" value={form.validUntil} onChange={(event) => setField('validUntil', event.target.value)} /></label>
          {workflowStatus === 'finalized' && !currentDocument && <AdminNotice tone="info"><strong>{posT.internalHidden}</strong></AdminNotice>}
          {workflowStatus === 'published' && <AdminNotice tone="success"><strong>{posT.publishedNotice}</strong></AdminNotice>}
          {currentDocument && <div className="admin-current-document"><FileCheck2 size={20} /><span><small>{t.detail.currentDocument}</small><strong>{formatAdminCopy(t.detail.version, { revision: currentDocument.revision })}</strong><em>{t.documentLanguages[currentDocument.documentLocale] || currentDocument.documentLocale} · {new Date(currentDocument.issuedAt).toLocaleString(dateLocale)}</em></span><button aria-label={formatAdminCopy(t.detail.downloadAria, { revision: currentDocument.revision })} disabled={saving} title={t.detail.downloadTitle} type="button" onClick={() => downloadDocument(currentDocument)}><Download size={17} /></button></div>}
          {previousDocuments.length > 0 && <details className="admin-previous-documents"><summary>{formatAdminCopy(t.detail.previousDocuments, { count: previousDocuments.length })}</summary><div className="admin-document-list">{previousDocuments.map((document) => <div key={document.id}><FileCheck2 size={19} /><span><strong>{formatAdminCopy(t.detail.version, { revision: document.revision })}</strong><small>{t.documentLanguages[document.documentLocale] || document.documentLocale} · {new Date(document.issuedAt).toLocaleString(dateLocale)}</small></span><button aria-label={formatAdminCopy(t.detail.downloadAria, { revision: document.revision })} disabled={saving} title={t.detail.downloadTitle} type="button" onClick={() => downloadDocument(document)}><Download size={17} /></button></div>)}</div></details>}
          <details className="admin-quote-additional-settings">
            <summary><span><strong>{t.detail.additionalSettings}</strong><small>{t.detail.additionalSettingsBody}</small></span></summary>
            <div className="admin-form-grid">
              <label className="admin-field"><span>{t.detail.documentLanguage}</span><select disabled={!editable} value={form.documentLocale} onChange={(event) => setField('documentLocale', event.target.value)}>{localeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="admin-field"><span>{t.detail.leadTime}</span><input disabled={!editable} placeholder={t.detail.leadTimePlaceholder} value={form.leadTime} onChange={(event) => setField('leadTime', event.target.value)} /></label>
              <label className="admin-field admin-field-wide"><span>{t.detail.shippingTerms}</span><input disabled={!editable} placeholder={t.detail.shippingPlaceholder} value={form.shippingNote} onChange={(event) => setField('shippingNote', event.target.value)} /></label>
              <label className="admin-field admin-field-wide"><span>{t.detail.buyerNote}</span><textarea disabled={!editable} rows="3" value={form.customerNote} onChange={(event) => setField('customerNote', event.target.value)} /></label>
              <label className="admin-field admin-field-wide"><span>{t.detail.internalMemoTitle}</span><textarea disabled={!editable} rows="4" value={form.adminMemo} onChange={(event) => setField('adminMemo', event.target.value)} /></label>
            </div>
          </details>
        </section>

        {workflowHistoryGroups.length > 0 && <details className="admin-editor-section admin-quote-history-section">
          <summary><span><strong>{formatAdminCopy(t.detail.historyCount, { count: workflowHistoryGroups.reduce((sum, group) => sum + group.entries.length, 0) })}</strong><small>{t.detail.historyBody}</small></span></summary>
          <ol className="admin-status-history">{workflowHistoryGroups.map((group) => {
            const latest = group.entries.at(-1)
            return <li key={`${group.status}-${latest.id}`}><span>{posT.workflow[group.status] || t.workflow[group.status] || group.status}</span><time>{new Date(latest.createdAt).toLocaleString(dateLocale)}</time>{latest.note && <small>{latest.note}</small>}{group.entries.length > 1 && <details><summary>{formatAdminCopy(t.detail.historyEvents, { count: group.entries.length })}</summary><ul>{group.entries.map((entry) => <li key={entry.id}><time>{new Date(entry.createdAt).toLocaleString(dateLocale)}</time>{entry.note && <small>{entry.note}</small>}</li>)}</ul></details>}</li>
          })}</ol>
        </details>}

      </div>

      <aside className="admin-editor-summary admin-quote-desktop-summary">
        <h2>{t.detail.summaryTitle}</h2>
        <dl><dt>{t.detail.currentStage}</dt><dd>{posT.workflow[workflowStatus] || workflowStatus}</dd><dt>{t.detail.requestedItems}</dt><dd>{form.items.length}</dd><dt>{t.detail.exceptions}</dt><dd>{exceptionItems.length}</dd><dt>{posT.supplyAmount}</dt><dd>{formatMoney(supplyAmount, quote.currency)}</dd><dt>{posT.vatAmount}</dt><dd>{formatMoney(vatAmount, quote.currency)}</dd><dt>{posT.totalAmount}</dt><dd>{formatMoney(total, quote.currency)}</dd></dl>
      </aside>
    </form>

    {canPersist && !legacyLocked && (dirty || ['received', 'picking', 'finalized'].includes(workflowStatus)) && <div className="admin-quote-task-bar" role="region" aria-label={t.detail.saveBarAria}>
      <strong>{dirty ? t.detail.unsavedChanges : posT.workflow[workflowStatus] || workflowStatus}</strong>
      <div className="admin-actions">
        {dirty && editable && <button disabled={saving} type="button" onClick={discard}>{t.detail.discard}</button>}
        {dirty && editable
          ? <button className="primary-action" disabled={saving} type="button" onClick={() => saveDraft()}>{saving ? t.detail.saving : t.detail.saveResult}</button>
          : workflowStatus === 'finalized'
            ? <button className="primary-action admin-workflow-next" disabled={saving} type="button" onClick={openPublishDialog}><Send size={17} />{posT.publishButton}</button>
            : <button className="primary-action admin-workflow-next" disabled={saving || finalizationBlocked || !form.validUntil} type="button" onClick={openFinalizeDialog}><FileCheck2 size={17} />{posT.finalizeButton}</button>}
      </div>
    </div>}
    <AdminConfirmDialog busy={saving} busyLabel={t.detail.processing} cancelLabel={t.detail.cancel} confirmLabel={confirm?.confirmLabel} danger={confirm?.danger} description={confirm?.description} open={Boolean(confirm)} title={confirm?.title || ''} onCancel={() => !saving && setConfirm(null)} onConfirm={confirm?.action} />
    <AdminToast closeLabel={t.detail.closeToast} message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
