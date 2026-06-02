import { Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitQuoteRequest } = useCommerce()
  const [memo, setMemo] = useState('')
  if (!isApproved || !inquiryRows.length) return <main className="content"><div className="approval-page"><h1>Add products to your Inquiry List first.</h1><Link to="/products">Explore Product List</Link></div></main>
  const submit = () => { const inquiry = submitQuoteRequest(memo); if (inquiry) navigate(`/my-inquiries/${inquiry.inquiryId}`) }
  return <main className="content"><div className="page-title"><div><p>REQUEST QUOTE</p><h1>Review your inquiry</h1></div></div><section className="quote-panel"><Send size={24} /><h2>Send this selection to Noblesse</h2><p>We will review availability, lead time, and the final quote for your market.</p>{inquiryRows.map((row) => <div className="quote-line" key={row.product.productId}><span>{row.product.nameEn} · {row.quantity} pcs</span><strong>{formatMoney(row.subtotal, buyer.currency)}</strong></div>)}<div className="quote-total"><span>Estimated total</span><strong>{formatMoney(estimatedTotal, buyer.currency)}</strong></div><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Add a message for the Noblesse team" /><button className="primary-action" type="button" onClick={submit}>Submit Request Quote</button></section></main>
}
