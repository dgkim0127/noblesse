import { FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInquiryKey } from '../commerce/inquiryKeys'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

const statusLabel = {
  requested: 'Quote Requested',
  checking: 'Checking',
  quoted: 'Quote Sent',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']

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
    refreshInquiries,
    viewerState,
  } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshStatus, setRefreshStatus] = useState('idle')
  const [refreshError, setRefreshError] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailError, setDetailError] = useState('')
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

    return <main className="content">
      <Link className="back" to={toLocalePath('/my-inquiries')}>Inquiry history</Link>
      <section className="inquiry-detail">
        <span className={`status status-${selected.status}`}>{statusLabel[selected.status] || selected.status}</span>
        <h1>{selected.inquiryNumber || selectedKey}</h1>
        <p>{selected.buyerCompanyName || buyer.companyName} / {selected.buyerCountry || buyer.country || '-'} / {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('ko-KR') : '-'}</p>
        <dl className="inquiry-meta">
          <dt>Items</dt><dd>{selected.totalItems ?? items.length}</dd>
          <dt>Total Quantity</dt><dd>{selected.totalQuantity ?? 0}</dd>
          <dt>Estimated Total</dt><dd>{formatMoney(selected.estimatedTotal || 0, selectedCurrency)}</dd>
        </dl>
        {items.map((item) => <div className="quote-line inquiry-detail-line" key={`${item.productId || item.productCode}-${item.color}-${item.size}`}>
          {item.thumbnailUrl && <img className="quote-thumb" src={item.thumbnailUrl} alt={item.productName || item.productCode} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}
          <span>
            {item.productCode} / {item.productName}
            <small>{item.material} / {item.color} / {item.size} / MOQ {item.moq}</small>
          </span>
          <strong>{formatMoney(item.subtotal || 0, selectedCurrency)}</strong>
        </div>)}
        <div className="quote-total"><span>Estimated Total</span><strong>{formatMoney(selected.estimatedTotal || 0, selectedCurrency)}</strong></div>
      </section>
    </main>
  }

  return <main className="content">
    <div className="page-title"><div><p>My Inquiries</p><h1>Quote inquiry history</h1></div></div>
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
          <b>{formatMoney(item.estimatedTotal || 0, item.currency || buyer.currency)}</b>
        </Link>
      })}</div>
      : <section className="empty"><h2>No inquiry records found.</h2><p>Create a quote inquiry from the Inquiry List after selecting approved buyer products.</p><Link className="secondary-action" to={toLocalePath('/products')}>Product List</Link></section>}
  </main>
}
