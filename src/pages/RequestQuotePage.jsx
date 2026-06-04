import { LockKeyhole, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

function QuoteLine({ row, currency }) {
  const thumbnailUrl = row.thumbnailUrl ?? row.product?.imageSet?.thumb

  return (
    <div className="quote-line" key={row.productId}>
      <div className={`quote-thumb tone-${row.tone}`}>
        <span className="jewel-shape" />
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={row.productName}
            loading="lazy"
            width="300"
            height="300"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        )}
      </div>
      <span>
        <strong>{row.productCode}</strong>
        <small>{row.productName} / {row.quantity} pcs</small>
      </span>
      <strong>{formatMoney(row.subtotal, currency)}</strong>
    </div>
  )
}

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  const isBlocked = viewerState === 'blocked'
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isBlocked ? 'Account review required.' : isPending ? 'Buyer Approval is pending.' : 'Request Buyer Access to use Request Quote.'}</h1><p>{isBlocked ? 'Contact Noblesse to review your Buyer profile before sending Request Quote.' : isPending ? 'Request Quote becomes available after approval. Prices and subtotals are hidden until then.' : 'Please request access or log in as an approved Buyer before sending an Inquiry.'}</p><Link to="/account">View Buyer Access</Link></div></main>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const [memo, setMemo] = useState('')
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>Add products to your Inquiry List first.</h1><Link to="/products">Explore Product List</Link></div></main>
  const submit = () => { const inquiry = submitRequestQuote(memo); if (inquiry) navigate(`/my-inquiries/${inquiry.inquiryId}`) }
  return <main className="content"><div className="page-title"><div><p>REQUEST QUOTE</p><h1>Review your inquiry</h1></div></div><section className="quote-panel"><Send size={24} /><h2>Send this selection to Noblesse</h2><div className="quote-section"><p>현재 단계는 최종 주문이 아닙니다. 관리자가 재고, 단가, 납기, 배송 조건을 확인한 뒤 최종 견적을 안내합니다.</p><p>This is not a final order. Our team will review product availability, price, lead time, and shipping conditions before sending a final quotation.</p></div><div className="quote-section"><h3>Buyer Information</h3><dl><dt>Company</dt><dd>{buyer.companyName}</dd><dt>Contact</dt><dd>{buyer.contactName}</dd><dt>Market</dt><dd>{buyer.assignedMarket}</dd><dt>Currency</dt><dd>{buyer.currency}</dd></dl></div><div className="quote-section"><h3>Inquiry Summary</h3><dl><dt>Products</dt><dd>{inquiryRows.length}</dd><dt>Total quantity</dt><dd>{totalQuantity}</dd><dt>Estimated total</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl></div>{inquiryRows.map((row) => <QuoteLine key={row.productId} row={row} currency={buyer.currency} />)}<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Request memo" /><button className="primary-action" type="button" onClick={submit}>Submit Request Quote</button></section></main>
}
