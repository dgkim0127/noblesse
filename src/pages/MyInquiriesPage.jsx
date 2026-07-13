import { CheckCircle2, Download, FileText, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { downloadQuotePdf } from '../utils/quotePdf'

const statusLabel = { requested: 'Requested', checking: 'Checking', quoted: 'Quoted', accepted: 'Accepted', rejected: 'Rejected', cancelled: 'Cancelled' }
const statusTabs = ['all', 'requested', 'checking', 'quoted', 'accepted', 'rejected', 'cancelled']

function QuoteLines({ items, currency }) {
  return items.map((item) => <div className="quote-line inquiry-detail-line" key={`${item.productId}-${item.color}-${item.size}`}><div className="quote-thumb">{item.thumbnailUrl && <img alt={item.productName} height="300" loading="lazy" src={item.thumbnailUrl} width="300" />}</div><span><strong>{item.productCode} / {item.productName}</strong><small>{item.material} / {item.color} / {item.size} / MOQ {item.moq} / {item.quantity} pcs</small></span><strong>{formatMoney(item.subtotal, currency)}</strong></div>)
}

export function MyInquiriesPage() {
  const { inquiryId } = useParams()
  const { buyer, inquiries, isApproved, respondToQuote, viewerState } = useCommerce()
  const [statusFilter, setStatusFilter] = useState('all')
  const [pendingAction, setPendingAction] = useState('')
  const filtered = useMemo(() => statusFilter === 'all' ? inquiries : inquiries.filter((item) => item.status === statusFilter), [inquiries, statusFilter])
  if (!isApproved) return <main className="content"><div className="approval-page"><FileText size={25} /><h1>{viewerState === 'pending' ? 'Buyer Approval is pending.' : 'My Quotes is available after Buyer Approval.'}</h1><p>Request buyer access to view your quote history.</p></div></main>
  const selected = inquiries.find((item) => item.inquiryId === inquiryId)
  const respond = async (accepted) => {
    if (!selected) return
    setPendingAction(accepted ? 'accept' : 'reject')
    try { await respondToQuote(selected, accepted) } finally { setPendingAction('') }
  }
  if (selected) {
    const displayedItems = selected.quote?.items ?? selected.items
    const displayedTotal = selected.quote?.items?.reduce((sum, item) => sum + item.subtotal, 0) ?? selected.estimatedTotal
    return <main className="content"><Link className="back" to="/my-inquiries">My Quotes</Link><section className="inquiry-detail"><span className={`status status-${selected.status}`}>{statusLabel[selected.status]}</span><h1>{selected.inquiryId}</h1><p>{selected.buyerCompanyName} / {selected.buyerCountry} / {new Date(selected.createdAt).toLocaleDateString('en-US')}</p><dl className="inquiry-meta"><dt>Products</dt><dd>{selected.totalItems}</dd><dt>Total quantity</dt><dd>{selected.totalQuantity}</dd><dt>Currency</dt><dd>{selected.currency}</dd>{selected.quote?.leadTime && <><dt>Lead time</dt><dd>{selected.quote.leadTime}</dd></>}{selected.quote?.validUntil && <><dt>Valid until</dt><dd>{selected.quote.validUntil}</dd></>}</dl><QuoteLines currency={selected.currency} items={displayedItems} /><div className="quote-total"><span>{selected.quote ? 'Quoted total' : 'Estimated total'}</span><strong>{formatMoney(displayedTotal + Number(selected.quote?.shippingAmount ?? 0), selected.currency)}</strong></div>{selected.quote && <div className="official-quote"><h2>Official quotation</h2>{selected.quote.adminNote && <p>{selected.quote.adminNote}</p>}{selected.quote.terms && <p><strong>Terms:</strong> {selected.quote.terms}</p>}<div className="quote-actions"><button className="secondary-action" type="button" onClick={() => downloadQuotePdf(selected)}><Download size={16} />Download PDF</button>{selected.status === 'quoted' && <><button className="primary-action" disabled={pendingAction !== ''} type="button" onClick={() => respond(true)}><CheckCircle2 size={16} />{pendingAction === 'accept' ? 'Accepting...' : 'Accept quote'}</button><button className="secondary-action" disabled={pendingAction !== ''} type="button" onClick={() => respond(false)}><XCircle size={16} />Decline</button></>}</div>{selected.status === 'accepted' && <p className="quote-accepted">Your approval was received. Noblesse will contact you to arrange the next step. No payment is taken on this site.</p>}</div>}</section></main>
  }
  return <main className="content"><div className="page-title"><div><p>MY QUOTES</p><h1>Quote requests</h1></div></div><div className="status-tabs">{statusTabs.map((status) => <button className={statusFilter === status ? 'active' : ''} key={status} type="button" onClick={() => setStatusFilter(status)}>{status === 'all' ? 'All' : statusLabel[status]}</button>)}</div><div className="inquiries">{filtered.map((item) => <Link className="inquiry-card" key={item.inquiryId} to={`/my-inquiries/${item.inquiryId}`}><FileText size={20} /><div><strong>{item.inquiryId}</strong><span>{item.totalItems} items / {item.totalQuantity} pcs / {new Date(item.createdAt).toLocaleDateString('en-US')}</span></div><em className={`status status-${item.status}`}>{statusLabel[item.status]}</em><b>{formatMoney(item.quote?.items?.reduce((sum, quoteItem) => sum + quoteItem.subtotal, 0) ?? item.estimatedTotal, buyer.currency)}</b></Link>)}{filtered.length === 0 && <div className="empty">No quote requests yet.</div>}</div></main>
}
