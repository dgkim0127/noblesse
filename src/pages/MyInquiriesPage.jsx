import { Download, FileText } from 'lucide-react'
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
  kr: { title: '상품 준비 현황', document: '준비 결과 견적서', download: 'PDF 다운로드', validUntil: '유효기간', leadTime: '납기', shipping: '배송 조건', total: '준비 상품 합계', note: '안내', requested: '요청', prepared: '준비', cancelled: '취소', externalPayment: '준비가 끝나면 영수증과 계좌 안내를 별도 SNS로 보내드립니다. 사이트에서는 주문이나 결제가 생성되지 않습니다.' },
  en: { title: 'Preparation status', document: 'Prepared-items quotation', download: 'Download PDF', validUntil: 'Valid until', leadTime: 'Lead time', shipping: 'Shipping terms', total: 'Prepared total', note: 'Note', requested: 'Requested', prepared: 'Prepared', cancelled: 'Cancelled', externalPayment: 'After preparation, Noblesse sends the receipt and bank-transfer instructions separately by SNS. No online order or payment is created.' },
  jp: { title: '商品準備状況', document: '準備結果見積書', download: 'PDFダウンロード', validUntil: '有効期限', leadTime: '納期', shipping: '配送条件', total: '準備商品合計', note: 'ご案内', requested: '依頼', prepared: '準備', cancelled: '取消', externalPayment: '準備完了後、領収書と振込案内を別途SNSでお送りします。サイト上では注文・決済は作成されません。' },
  'zh-TW': { title: '商品備貨狀態', document: '備貨結果報價單', download: '下載 PDF', validUntil: '有效期限', leadTime: '交期', shipping: '運送條件', total: '備貨合計', note: '說明', requested: '需求', prepared: '備妥', cancelled: '取消', externalPayment: '備貨完成後，我們會另行透過 SNS 傳送收據與銀行匯款說明。網站不會建立訂單或付款。' },
}

const workflowCopy = {
  kr: { received: '요청 접수', picking: '상품 준비 중', receipt_sent: 'SNS 영수증 발송', payment_confirmed: '입금 확인', shipped: '발송 완료', completed: '거래 종료', cancelled: '전체 취소' },
  en: { received: 'Received', picking: 'Preparing items', receipt_sent: 'SNS receipt sent', payment_confirmed: 'Payment confirmed', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled' },
  jp: { received: '受付済み', picking: '商品準備中', receipt_sent: 'SNS領収書送信', payment_confirmed: '入金確認', shipped: '発送済み', completed: '取引終了', cancelled: '全体取消' },
  'zh-TW': { received: '已受理', picking: '備貨中', receipt_sent: '已傳送 SNS 收據', payment_confirmed: '已確認匯款', shipped: '已出貨', completed: '交易完成', cancelled: '全部取消' },
}

const cancellationCopy = {
  kr: { out_of_stock: '재고 없음', quantity_shortage: '수량 부족', quality_issue: '품질 확인 불가', discontinued: '취급 종료', other: '기타' },
  en: { out_of_stock: 'Out of stock', quantity_shortage: 'Quantity shortage', quality_issue: 'Quality issue', discontinued: 'Discontinued', other: 'Other' },
  jp: { out_of_stock: '在庫なし', quantity_shortage: '数量不足', quality_issue: '品質確認不可', discontinued: '取扱終了', other: 'その他' },
  'zh-TW': { out_of_stock: '缺貨', quantity_shortage: '數量不足', quality_issue: '品質問題', discontinued: '停止供應', other: '其他' },
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

    const livePreparationItems = issuedQuote?.items?.length
      ? issuedQuote.items
      : (issuedQuote?.snapshot?.items || []).map((item) => ({
        ...item,
        requestedQuantity: item.requestedQuantity ?? item.quantity,
        confirmedQuantity: item.quantity,
        cancelledQuantity: item.cancelledQuantity ?? 0,
        confirmedUnitPrice: item.unitPrice,
        confirmedSubtotal: item.subtotal,
        fulfillmentStatus: item.fulfillmentStatus || 'ready',
      }))
    const quoteCurrency = issuedQuote?.currency || issuedQuote?.snapshot?.currency || selectedCurrency
    const localizedWorkflow = workflowCopy[locale] || workflowCopy.en
    const localizedCancellation = cancellationCopy[locale] || cancellationCopy.en

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
        <header><div><span>{issuedQuote.revision ? `Version ${issuedQuote.revision}` : quotationCopy.title}</span><h2>{issuedQuote.documentId ? quotationCopy.document : quotationCopy.title}</h2><p>{issuedQuote.quoteNumber || selected.inquiryNumber}</p></div><span className={`status status-${issuedQuote.workflowStatus}`}>{localizedWorkflow[issuedQuote.workflowStatus] || issuedQuote.workflowStatus}</span></header>
        <ol className="buyer-quote-workflow" aria-label={quotationCopy.title}>{['received', 'picking', 'receipt_sent', 'payment_confirmed', 'shipped', 'completed'].map((step, index, steps) => {
          const currentIndex = steps.indexOf(issuedQuote.workflowStatus)
          return <li className={`${index <= currentIndex ? 'is-complete' : ''} ${step === issuedQuote.workflowStatus ? 'is-current' : ''}`} key={step}><span>{index + 1}</span><small>{localizedWorkflow[step]}</small></li>
        })}</ol>
        <div className="buyer-preparation-heading"><strong>{quotationCopy.title}</strong><span>{quotationCopy.requested} / {quotationCopy.prepared} / {quotationCopy.cancelled}</span></div>
        <div className="buyer-quote-lines buyer-preparation-lines">{livePreparationItems.map((item, index) => {
          const optionSummary = formatSelectedProductOptions(item.selectedOptions, locale)
          const legacySummary = [item.color, item.size].filter(Boolean)
          const cancelledQuantity = Number(item.cancelledQuantity ?? Math.max(Number(item.requestedQuantity || 0) - Number(item.confirmedQuantity || 0), 0))
          const cancellationReason = cancelledQuantity > 0 ? localizedCancellation[item.cancellationReason] || localizedCancellation.other : ''
          return <div className={`fulfillment-${item.fulfillmentStatus}`} key={item.id || `${item.productCode}-${index}`}>
            <span><strong>{item.productName || item.productCode}</strong><small>{[item.productCode, ...(optionSummary.length ? optionSummary : legacySummary)].filter(Boolean).join(' · ')}</small>{cancelledQuantity > 0 && <em>{[cancellationReason, item.cancellationNote].filter(Boolean).join(' · ')}</em>}</span>
            <span><small>{quotationCopy.requested}</small>{item.requestedQuantity ?? item.confirmedQuantity}</span>
            <span><small>{quotationCopy.prepared}</small>{item.confirmedQuantity ?? item.quantity}</span>
            <span className={cancelledQuantity > 0 ? 'is-cancelled' : ''}><small>{quotationCopy.cancelled}</small>{cancelledQuantity}</span>
            <strong>{formatMoney(item.confirmedSubtotal ?? item.subtotal, quoteCurrency)}</strong>
          </div>
        })}</div>
        <div className="buyer-quote-total"><span>{quotationCopy.total}</span><strong>{formatMoney(issuedQuote.confirmedTotal ?? issuedQuote.snapshot?.total, quoteCurrency)}</strong></div>
        {(issuedQuote.documentId || issuedQuote.validUntil || issuedQuote.leadTime || issuedQuote.shippingNote) && <dl className="buyer-quote-terms">
          <dt>{quotationCopy.validUntil}</dt><dd>{issuedQuote.validUntil ? new Date(`${String(issuedQuote.validUntil).slice(0, 10)}T00:00:00`).toLocaleDateString({ kr: 'ko-KR', en: 'en-US', jp: 'ja-JP', 'zh-TW': 'zh-TW' }[locale] || 'en-US') : '-'}</dd>
          <dt>{quotationCopy.leadTime}</dt><dd>{issuedQuote.leadTime || issuedQuote.snapshot?.leadTime || '-'}</dd>
          <dt>{quotationCopy.shipping}</dt><dd>{issuedQuote.shippingNote || issuedQuote.snapshot?.shippingNote || '-'}</dd>
        </dl>}
        {(issuedQuote.customerNote || issuedQuote.snapshot?.customerNote) && <div className="buyer-quote-note"><strong>{quotationCopy.note}</strong><p>{issuedQuote.customerNote || issuedQuote.snapshot.customerNote}</p></div>}
        <p className="buyer-quote-external-payment">{quotationCopy.externalPayment}</p>
        {issuedQuote.documentId && <div className="buyer-quote-actions"><button className="secondary-action" disabled={quoteStatus === 'loading'} type="button" onClick={downloadQuote}><Download size={17} />{quotationCopy.download}</button></div>}
      </section>}
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
