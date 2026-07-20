import { CheckCircle2, Download, FileText, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInquiryKey } from '../commerce/inquiryKeys'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'
import { formatSelectedProductOptions } from '../utils/productOptions'

const statusLabel = {
  requested: 'Quote Requested',
  checking: 'Checking',
  quoted: 'Quote Sent',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']
const pricePendingLabel = '가격 확인중'

const quoteCopy = {
  kr: { title: '공식 견적서', download: 'PDF 다운로드', accept: '견적 승인', reject: '견적 거절', validUntil: '유효기간', leadTime: '납기', shipping: '배송 조건', total: '견적 합계', note: '안내', decisionHelp: '견적 승인은 주문이나 결제를 만들지 않으며, 관리자 후속 처리 요청으로만 기록됩니다.', confirmAccept: '이 견적을 승인할까요?', confirmReject: '이 견적을 거절할까요?', confirm: '확인', cancel: '취소', reason: '메모 (선택)' },
  en: { title: 'Official quotation', download: 'Download PDF', accept: 'Accept quote', reject: 'Reject quote', validUntil: 'Valid until', leadTime: 'Lead time', shipping: 'Shipping terms', total: 'Quote total', note: 'Note', decisionHelp: 'Accepting this quote requests administrator follow-up. It does not create an order or payment.', confirmAccept: 'Accept this quote?', confirmReject: 'Reject this quote?', confirm: 'Confirm', cancel: 'Cancel', reason: 'Note (optional)' },
  jp: { title: '正式見積書', download: 'PDFダウンロード', accept: '見積を承認', reject: '見積を拒否', validUntil: '有効期限', leadTime: '納期', shipping: '配送条件', total: '見積合計', note: 'ご案内', decisionHelp: '見積承認は注文・決済を作成せず、管理者の後続対応依頼として記録されます。', confirmAccept: 'この見積を承認しますか？', confirmReject: 'この見積を拒否しますか？', confirm: '確認', cancel: 'キャンセル', reason: 'メモ（任意）' },
  'zh-TW': { title: '正式報價單', download: '下載 PDF', accept: '接受報價', reject: '拒絕報價', validUntil: '有效期限', leadTime: '交期', shipping: '運送條件', total: '報價合計', note: '說明', decisionHelp: '接受報價只會提出管理員後續處理需求，不會建立訂單或付款。', confirmAccept: '要接受這份報價嗎？', confirmReject: '要拒絕這份報價嗎？', confirm: '確認', cancel: '取消', reason: '備註（選填）' },
}

function triggerQuoteDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function hasUnavailablePrice(inquiry = {}) {
  return (inquiry.items || []).some((item) => item.priceUnavailable)
}

function formatInquiryMoney(value, currency, unavailable = false) {
  return unavailable ? pricePendingLabel : formatMoney(value || 0, currency)
}

function InquiryAccessNotice({ viewerState }) {
  return <main className="content">
    <div className="approval-page">
      <FileText size={25} />
      <h1>{viewerState === 'pending' ? 'Trade profile under review' : 'Inquiry history opens after buyer approval'}</h1>
      <p>{viewerState === 'pending'
        ? 'Submitted trade information is being reviewed.'
        : 'Send a trade inquiry first so Noblesse can review buyer access and trade terms.'}</p>
    </div>
  </main>
}

function InquiryStateNotice({ title, body, action }) {
  return <main className="content">
    <div className="approval-page">
      <FileText size={25} />
      <h1>{title}</h1>
      <p>{body}</p>
      {action}
    </div>
  </main>
}

export function MyInquiriesPage() {
  const { inquiryId } = useParams()
  const {
    authError,
    authStatus,
    buyer,
    dataError,
    dataStatus,
    inquiries,
    isApproved,
    loadInquiry,
    loadInquiryQuote,
    decideInquiryQuote,
    downloadInquiryQuoteDocument,
    refreshInquiries,
    viewerState,
  } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const quotationCopy = quoteCopy[locale] || quoteCopy.en
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshStatus, setRefreshStatus] = useState('idle')
  const [refreshError, setRefreshError] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailError, setDetailError] = useState('')
  const [issuedQuote, setIssuedQuote] = useState(null)
  const [quoteStatus, setQuoteStatus] = useState('idle')
  const [quoteError, setQuoteError] = useState('')
  const [decision, setDecision] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')
  const filteredInquiries = useMemo(
    () => statusFilter === 'all' ? inquiries : inquiries.filter((item) => item.status === statusFilter),
    [inquiries, statusFilter]
  )

  useEffect(() => {
    if (!isApproved || dataStatus !== 'ready' || authStatus !== 'authenticated' || inquiryId) return undefined

    let isMounted = true
    setRefreshStatus('loading')
    setRefreshError('')
    refreshInquiries({ status: statusFilter === 'all' ? '' : statusFilter })
      .then(() => {
        if (isMounted) setRefreshStatus('ready')
      })
      .catch((error) => {
        if (!isMounted) return
        setRefreshStatus('error')
        setRefreshError(error?.message || 'Unable to refresh inquiry history.')
      })

    return () => {
      isMounted = false
    }
  }, [authStatus, dataStatus, inquiryId, isApproved, refreshInquiries, statusFilter])

  useEffect(() => {
    if (!isApproved || dataStatus !== 'ready' || authStatus !== 'authenticated' || !inquiryId) {
      setSelectedInquiry(null)
      return undefined
    }

    let isMounted = true
    setDetailStatus('loading')
    setDetailError('')
    loadInquiry(inquiryId)
      .then((inquiry) => {
        if (!isMounted) return
        setSelectedInquiry(inquiry)
        setDetailStatus(inquiry ? 'ready' : 'not-found')
      })
      .catch((error) => {
        if (!isMounted) return
        setSelectedInquiry(null)
        setDetailStatus('error')
        setDetailError(error?.message || 'Unable to refresh inquiry detail.')
      })

    return () => {
      isMounted = false
    }
  }, [authStatus, dataStatus, inquiryId, isApproved, loadInquiry])

  useEffect(() => {
    if (!isApproved || dataStatus !== 'ready' || authStatus !== 'authenticated' || !inquiryId) {
      setIssuedQuote(null)
      setQuoteStatus('idle')
      return undefined
    }

    let isMounted = true
    setQuoteStatus('loading')
    setQuoteError('')
    loadInquiryQuote(inquiryId)
      .then((quote) => {
        if (!isMounted) return
        setIssuedQuote(quote)
        setQuoteStatus('ready')
      })
      .catch((error) => {
        if (!isMounted) return
        setQuoteStatus('error')
        setQuoteError(error?.message || 'Unable to load the issued quote.')
      })

    return () => {
      isMounted = false
    }
  }, [authStatus, dataStatus, inquiryId, isApproved, loadInquiryQuote])

  if (dataStatus === 'loading' || authStatus === 'checking') {
    return <InquiryStateNotice
      title="Loading inquiry history..."
      body="Buyer permissions and inquiry records are being verified through the backend API."
    />
  }

  if (dataStatus === 'error') {
    return <InquiryStateNotice
      title="Catalog API unavailable"
      body={dataError || 'Unable to load catalog data.'}
    />
  }

  if (authStatus === 'error') {
    return <InquiryStateNotice
      title="Buyer session unavailable"
      body={authError || 'Unable to load inquiry history.'}
      action={<Link className="secondary-action" to={toLocalePath('/login')}>Login</Link>}
    />
  }

  if (!isApproved) return <InquiryAccessNotice viewerState={viewerState} />

  const selected = selectedInquiry || (inquiryId
    ? inquiries.find((item) => getInquiryKey(item) === inquiryId)
    : null)

  if (inquiryId && detailStatus === 'loading' && !selected) {
    return <InquiryStateNotice
      title="Refreshing inquiry detail..."
      body="The latest inquiry status is being loaded from the backend API."
    />
  }

  if (inquiryId && detailStatus === 'error') {
    return <InquiryStateNotice
      title="Unable to refresh inquiry detail"
      body={detailError || 'The latest inquiry status could not be loaded.'}
      action={<Link className="secondary-action" to={toLocalePath('/my-inquiries')}>Back to inquiry history</Link>}
    />
  }

  if (inquiryId && !selected) {
    return <InquiryStateNotice
      title="Inquiry not found"
      body="The requested inquiry was not found for this approved buyer session."
      action={<Link className="secondary-action" to={toLocalePath('/my-inquiries')}>Back to inquiry history</Link>}
    />
  }

  if (selected) {
    const selectedKey = getInquiryKey(selected)
    const items = selected.items || []
    const selectedCurrency = selected.currency || buyer.currency
    const selectedHasUnavailablePrice = hasUnavailablePrice(selected)

    const downloadQuote = async () => {
      if (!issuedQuote?.id || !issuedQuote.documentId) return
      setQuoteStatus('loading')
      setQuoteError('')
      try {
        const blob = await downloadInquiryQuoteDocument({ quoteId: issuedQuote.id, documentId: issuedQuote.documentId })
        if (blob) triggerQuoteDownload(blob, `${issuedQuote.quoteNumber || 'quotation'}-v${issuedQuote.revision}.pdf`)
        setQuoteStatus('ready')
      } catch (error) {
        setQuoteStatus('error')
        setQuoteError(error?.message || 'Unable to download the quote PDF.')
      }
    }

    const submitDecision = async () => {
      if (!decision || !issuedQuote?.id || !issuedQuote.documentId) return
      setQuoteStatus('loading')
      setQuoteError('')
      try {
        const nextQuote = await decideInquiryQuote({ quoteId: issuedQuote.id, documentId: issuedQuote.documentId, decision, note: decisionNote })
        if (nextQuote) setIssuedQuote(nextQuote)
        setDecision(null)
        setDecisionNote('')
        setQuoteStatus('ready')
      } catch (error) {
        setQuoteStatus('error')
        setQuoteError(error?.message || 'Unable to save the quote decision.')
      }
    }

    return <main className="content">
      <Link className="back" to={toLocalePath('/my-inquiries')}>Inquiry history</Link>
      <section className="inquiry-detail">
        <span className={`status status-${selected.status}`}>{statusLabel[selected.status] || selected.status}</span>
        <h1>{selected.inquiryNumber || selectedKey}</h1>
        <p>{selected.buyerCompanyName || buyer.companyName} / {selected.buyerCountry || buyer.country || '-'} / {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('ko-KR') : '-'}</p>
        <dl className="inquiry-meta">
          <dt>Items</dt><dd>{selected.totalItems ?? items.length}</dd>
          <dt>Total Quantity</dt><dd>{selected.totalQuantity ?? 0}</dd>
          <dt>Estimated Total</dt><dd>{formatInquiryMoney(selected.estimatedTotal, selectedCurrency, selectedHasUnavailablePrice)}</dd>
        </dl>
        {items.map((item, index) => {
          const optionSummary = formatSelectedProductOptions(item.selectedOptions, locale)
          const legacySummary = [item.color, item.size].filter(Boolean)
          return <div className="quote-line inquiry-detail-line" key={item.id || `${item.productId || item.productCode}-${index}`}>
          {item.thumbnailUrl && <img className="quote-thumb" src={item.thumbnailUrl} alt={item.productName || item.productCode} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}
          <span>
            {item.productCode} / {item.productName}
            <small>{[item.material, ...(optionSummary.length ? optionSummary : legacySummary), `MOQ ${item.moq}`].filter(Boolean).join(' / ')}</small>
          </span>
          <strong>{formatInquiryMoney(item.subtotal, selectedCurrency, item.priceUnavailable)}</strong>
        </div>
        })}
        <div className="quote-total"><span>Estimated Total</span><strong>{formatInquiryMoney(selected.estimatedTotal, selectedCurrency, selectedHasUnavailablePrice)}</strong></div>
      </section>
      {quoteStatus === 'loading' && !issuedQuote && <p className="auth-notice" role="status">Loading issued quote...</p>}
      {quoteStatus === 'error' && <p className="auth-notice" role="alert">{quoteError}</p>}
      {issuedQuote && <section className="buyer-quote-document">
        <header><div><span>Version {issuedQuote.revision}</span><h2>{quotationCopy.title}</h2><p>{issuedQuote.quoteNumber}</p></div><span className={`status status-${issuedQuote.displayStatus || issuedQuote.status}`}>{issuedQuote.displayStatus || issuedQuote.status}</span></header>
        <dl className="buyer-quote-terms">
          <dt>{quotationCopy.validUntil}</dt><dd>{issuedQuote.validUntil ? new Date(`${String(issuedQuote.validUntil).slice(0, 10)}T00:00:00`).toLocaleDateString({ kr: 'ko-KR', en: 'en-US', jp: 'ja-JP', 'zh-TW': 'zh-TW' }[locale] || 'en-US') : '-'}</dd>
          <dt>{quotationCopy.leadTime}</dt><dd>{issuedQuote.snapshot?.leadTime || '-'}</dd>
          <dt>{quotationCopy.shipping}</dt><dd>{issuedQuote.snapshot?.shippingNote || '-'}</dd>
        </dl>
        <div className="buyer-quote-lines">{(issuedQuote.snapshot?.items || []).map((item, index) => {
          const optionSummary = formatSelectedProductOptions(item.selectedOptions, locale)
          const legacySummary = [item.color, item.size].filter(Boolean)
          return <div key={item.id || `${item.productCode}-${index}`}><span><strong>{item.productName || item.productCode}</strong><small>{[item.productCode, ...(optionSummary.length ? optionSummary : legacySummary)].filter(Boolean).join(' · ')}</small></span><span>{item.quantity}</span><span>{formatMoney(item.unitPrice, issuedQuote.snapshot.currency)}</span><strong>{formatMoney(item.subtotal, issuedQuote.snapshot.currency)}</strong></div>
        })}</div>
        <div className="buyer-quote-total"><span>{quotationCopy.total}</span><strong>{formatMoney(issuedQuote.snapshot?.total, issuedQuote.snapshot?.currency)}</strong></div>
        {issuedQuote.snapshot?.customerNote && <div className="buyer-quote-note"><strong>{quotationCopy.note}</strong><p>{issuedQuote.snapshot.customerNote}</p></div>}
        <div className="buyer-quote-actions"><button className="secondary-action" disabled={quoteStatus === 'loading'} type="button" onClick={downloadQuote}><Download size={17} />{quotationCopy.download}</button>{issuedQuote.status === 'sent' && !issuedQuote.isExpired && <><button className="primary-action" disabled={quoteStatus === 'loading'} type="button" onClick={() => setDecision('accepted')}><CheckCircle2 size={17} />{quotationCopy.accept}</button><button className="secondary-action" disabled={quoteStatus === 'loading'} type="button" onClick={() => setDecision('rejected')}><XCircle size={17} />{quotationCopy.reject}</button></>}</div>
        {issuedQuote.status === 'sent' && !issuedQuote.isExpired && <p className="buyer-quote-decision-help">{quotationCopy.decisionHelp}</p>}
      </section>}
      {decision && <div className="buyer-quote-dialog-backdrop" role="presentation"><section aria-modal="true" className="buyer-quote-dialog" role="dialog"><h2>{decision === 'accepted' ? quotationCopy.confirmAccept : quotationCopy.confirmReject}</h2><p>{quotationCopy.decisionHelp}</p><label><span>{quotationCopy.reason}</span><textarea rows="4" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} /></label><div><button className="secondary-action" type="button" onClick={() => setDecision(null)}>{quotationCopy.cancel}</button><button className="primary-action" disabled={quoteStatus === 'loading'} type="button" onClick={submitDecision}>{quotationCopy.confirm}</button></div></section></div>}
    </main>
  }

  return <main className="content">
    <div className="page-title"><div><p>My Inquiries</p><h1>Quote request history</h1></div></div>
    <div className="status-tabs">{statusTabs.map((status) => <button className={statusFilter === status ? 'active' : ''} key={status} type="button" onClick={() => setStatusFilter(status)}>{status === 'all' ? 'All' : statusLabel[status]}</button>)}</div>
    {refreshStatus === 'loading' && <p className="auth-notice" role="status">Refreshing inquiry history from the backend API...</p>}
    {refreshStatus === 'error' && <p className="auth-notice" role="alert">{refreshError}</p>}
    {filteredInquiries.length > 0
      ? <div className="inquiries">{filteredInquiries.map((item) => {
        const itemKey = getInquiryKey(item)
        return <Link className="inquiry-card" key={itemKey} to={toLocalePath(`/my-inquiries/${itemKey}`)}>
          <FileText size={20} />
          <div><strong>{item.inquiryNumber || itemKey}</strong><span>{item.totalItems ?? 0} items / {item.totalQuantity ?? 0} pcs / {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}</span></div>
          <em className={`status status-${item.status}`}>{statusLabel[item.status] || item.status}</em>
          <b>{formatInquiryMoney(item.estimatedTotal, item.currency || buyer.currency, hasUnavailablePrice(item))}</b>
        </Link>
      })}</div>
      : <section className="empty"><h2>No inquiry records found.</h2><p>Create a quote request from the Inquiry List after selecting approved buyer products.</p><Link className="secondary-action" to={toLocalePath('/products')}>Product List</Link></section>}
  </main>
}
