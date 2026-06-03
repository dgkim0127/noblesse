import { LockKeyhole, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isPending ? 'Buyer Approval is pending.' : 'Request Buyer Access to use Request Quote.'}</h1><p>{isPending ? 'Request Quote becomes available after approval. Prices and subtotals are hidden until then.' : 'Please request access or log in as an approved Buyer before sending an Inquiry.'}</p><Link to="/account">View Buyer Access</Link></div></main>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const [memo, setMemo] = useState('')
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>Add products to your Inquiry List first.</h1><Link to="/products">Explore Product List</Link></div></main>
  const submit = () => { const inquiry = submitRequestQuote(memo); if (inquiry) navigate(`/my-inquiries/${inquiry.inquiryId}`) }
  return <main className="content"><div className="page-title"><div><p>REQUEST QUOTE</p><h1>Review your inquiry</h1></div></div><section className="quote-panel"><Send size={24} /><h2>Send this selection to Noblesse</h2><p>This is not a final order. Our team will review product availability, price, lead time, and shipping conditions before sending a final quotation.</p><div className="quote-section"><h3>Buyer Information</h3><dl><dt>Company</dt><dd>{buyer.companyName}</dd><dt>Contact</dt><dd>{buyer.contactName}</dd><dt>Market</dt><dd>{buyer.assignedMarket}</dd><dt>Currency</dt><dd>{buyer.currency}</dd></dl></div><div className="quote-section"><h3>Inquiry Summary</h3><dl><dt>Products</dt><dd>{inquiryRows.length}</dd><dt>Total quantity</dt><dd>{totalQuantity}</dd><dt>Estimated total</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl></div>{inquiryRows.map((row) => <div className="quote-line" key={row.productId}><span>{row.productCode} / {row.productName} / {row.quantity} pcs</span><strong>{formatMoney(row.subtotal, buyer.currency)}</strong></div>)}<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Request memo" /><button className="primary-action" type="button" onClick={submit}>Submit Request Quote</button></section></main>
}
