import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

const statusLabel = { requested: 'Requested', checking: 'Checking', quoted: 'Quoted', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function MyInquiriesPage() {
  const { inquiryId } = useParams()
  const { buyer, inquiries, isApproved, viewerState } = useCommerce()
  const [statusFilter, setStatusFilter] = useState('all')
  const filteredInquiries = useMemo(() => statusFilter === 'all' ? inquiries : inquiries.filter((item) => item.status === statusFilter), [inquiries, statusFilter])
  if (!isApproved) return <main className="content"><div className="approval-page"><FileText size={25} /><h1>{viewerState === 'pending' ? 'Buyer Approval is pending.' : 'My Inquiries is available after Buyer Approval.'}</h1><p>{viewerState === 'pending' ? 'Your submitted profile is being reviewed.' : 'Request Buyer Access to view Inquiry history.'}</p></div></main>
  const selected = inquiries.find((item) => item.inquiryId === inquiryId)
  if (selected) return <main className="content"><Link className="back" to="/my-inquiries">My Inquiries</Link><section className="inquiry-detail"><span className={`status status-${selected.status}`}>{statusLabel[selected.status]}</span><h1>{selected.inquiryId}</h1><p>{selected.buyerCompanyName} / {selected.buyerCountry} / {new Date(selected.createdAt).toLocaleDateString('en-US')}</p><dl className="inquiry-meta"><dt>Products</dt><dd>{selected.totalItems}</dd><dt>Total quantity</dt><dd>{selected.totalQuantity}</dd><dt>Estimated total</dt><dd>{formatMoney(selected.estimatedTotal, selected.currency)}</dd></dl>{selected.items.map((item) => <div className="quote-line inquiry-detail-line" key={item.productId}>{item.thumbnailUrl && <img className="quote-thumb" src={item.thumbnailUrl} alt={item.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}<span>{item.productCode} / {item.productName}<small>{item.material} / {item.color} / {item.size} / MOQ {item.moq}</small></span><strong>{formatMoney(item.subtotal, selected.currency)}</strong></div>)}<div className="quote-total"><span>Estimated total</span><strong>{formatMoney(selected.estimatedTotal, selected.currency)}</strong></div></section></main>
  return <main className="content"><div className="page-title"><div><p>MY INQUIRIES</p><h1>Quote requests</h1></div></div><div className="status-tabs">{statusTabs.map((status) => <button className={statusFilter === status ? 'active' : ''} key={status} type="button" onClick={() => setStatusFilter(status)}>{status === 'all' ? 'All' : statusLabel[status]}</button>)}</div><div className="inquiries">{filteredInquiries.map((item) => <Link className="inquiry-card" key={item.inquiryId} to={`/my-inquiries/${item.inquiryId}`}><FileText size={20} /><div><strong>{item.inquiryId}</strong><span>{item.totalItems} items / {item.totalQuantity} pcs / {new Date(item.createdAt).toLocaleDateString('en-US')}</span></div><em className={`status status-${item.status}`}>{statusLabel[item.status]}</em><b>{formatMoney(item.estimatedTotal, buyer.currency)}</b></Link>)}</div></main>
}
