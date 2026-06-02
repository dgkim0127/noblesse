import { FileText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

const label = { requested: 'Quote Requested', checking: 'Checking', quoted: 'Quote Ready', confirmed: 'Confirmed', cancelled: 'Cancelled' }

export function MyInquiriesPage() {
  const { inquiryId } = useParams()
  const { buyer, inquiries, isApproved } = useCommerce()
  if (!isApproved) return <main className="content"><div className="approval-page"><FileText size={25} /><h1>My Inquiries is available after Buyer Approval.</h1></div></main>
  const selected = inquiries.find((item) => item.inquiryId === inquiryId)
  if (selected) return <main className="content"><Link className="back" to="/my-inquiries">My Inquiries</Link><section className="inquiry-detail"><span className="status">{label[selected.status]}</span><h1>{selected.inquiryId}</h1><p>{selected.buyerCompanyName} / {selected.buyerCountry}</p>{selected.items.map((item) => <div className="quote-line" key={item.productId}>{item.thumbnailUrl && <img className="quote-thumb" src={item.thumbnailUrl} alt={item.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}<span>{item.productName} / {item.quantity} pcs</span><strong>{formatMoney(item.subtotal, selected.currency)}</strong></div>)}<div className="quote-total"><span>Estimated total</span><strong>{formatMoney(selected.estimatedTotal, selected.currency)}</strong></div></section></main>
  return <main className="content"><div className="page-title"><div><p>MY INQUIRIES</p><h1>Quote requests</h1></div></div><div className="inquiries">{inquiries.map((item) => <Link className="inquiry-card" key={item.inquiryId} to={`/my-inquiries/${item.inquiryId}`}><FileText size={20} /><div><strong>{item.inquiryId}</strong><span>{item.totalItems} items / {item.totalQuantity} pcs</span></div><em>{label[item.status]}</em><b>{formatMoney(item.estimatedTotal, buyer.currency)}</b></Link>)}</div></main>
}
