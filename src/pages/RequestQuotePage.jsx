import { LockKeyhole, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

function QuoteLine({ row, currency }) {
  return <div className="quote-line"><div className={`quote-thumb tone-${row.tone}`}>{row.thumbnailUrl && <img src={row.thumbnailUrl} alt={row.productName} height="300" loading="lazy" width="300" />}</div><span><strong>{row.productCode}</strong><small>{row.productName} / {row.color} / {row.size} / {row.quantity} pcs</small></span><strong>{formatMoney(row.subtotal, currency)}</strong></div>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!isApproved) return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{viewerState === 'pending' ? 'Buyer Approval is pending.' : 'Request Buyer Access to use Request Quote.'}</h1><p>Prices and quote requests unlock after your buyer profile is approved.</p><Link to="/account">View Buyer Access</Link></div></main>
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>Add products to your Inquiry List first.</h1><Link to="/products">Explore Product List</Link></div></main>
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const inquiry = await submitRequestQuote({
        requestMemo: form.get('requestMemo'),
        shippingCountry: form.get('shippingCountry'),
        contactName: form.get('contactName'),
        contactEmail: form.get('contactEmail'),
      })
      if (inquiry) navigate(`/my-inquiries/${inquiry.inquiryId}`)
    } catch (nextError) {
      setError(nextError.message || 'Unable to submit your quote request.')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="content"><div className="page-title"><div><p>REQUEST QUOTE</p><h1>Review your inquiry</h1></div></div><form className="quote-panel" onSubmit={submit}><Send size={24} /><h2>Send this selection to Noblesse</h2><div className="quote-section"><p>This is not a final order or payment request. Noblesse will review availability, price, lead time, and shipping conditions before publishing an official quotation.</p></div><div className="quote-section"><h3>Buyer and delivery contact</h3><div className="quote-contact-grid"><label>Company<input disabled value={buyer.companyName} /></label><label>Contact name<input defaultValue={buyer.contactName} name="contactName" required /></label><label>Contact email<input defaultValue={buyer.email} name="contactEmail" required type="email" /></label><label>Shipping country<input defaultValue={buyer.country} name="shippingCountry" required /></label></div></div><div className="quote-section"><h3>Inquiry summary</h3><dl><dt>Products</dt><dd>{inquiryRows.length}</dd><dt>Total quantity</dt><dd>{totalQuantity}</dd><dt>Estimated total</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl></div>{inquiryRows.map((row) => <QuoteLine currency={buyer.currency} key={`${row.productId}-${row.color}-${row.size}`} row={row} />)}<label className="quote-memo">Request memo<textarea name="requestMemo" placeholder="Stock, lead time, packing, or delivery requirements" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-action" disabled={submitting} type="submit">{submitting ? 'Submitting...' : 'Submit Request Quote'}</button></form></main>
}
