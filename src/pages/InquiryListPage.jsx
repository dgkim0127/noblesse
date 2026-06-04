import { LockKeyhole, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

function AccessNotice({ viewerState }) {
  const isPending = viewerState === 'pending'
  const isBlocked = viewerState === 'blocked'
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isBlocked ? 'Account review required.' : isPending ? 'Buyer Approval is pending.' : 'Request Buyer Access to use Inquiry List.'}</h1><p>{isBlocked ? 'Contact Noblesse to review your Buyer profile before using Inquiry features.' : isPending ? 'Prices, subtotals, and Request Quote features will unlock after approval.' : 'Please request access or log in as an approved Buyer to see prices and create an Inquiry List.'}</p><Link to="/account">View Buyer Access</Link></div></main>
}

export function InquiryListPage() {
  const { buyer, estimatedTotal, inquiryRows, isApproved, removeInquiryItem, totalQuantity, updateInquiryQuantity, viewerState } = useCommerce()
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  return <main className="content"><div className="page-title"><div><p>INQUIRY LIST</p><h1>Selected piercing</h1></div><span>{inquiryRows.length} items / {totalQuantity} pcs</span></div><section className="inquiry-layout"><div className="inquiry-items">{inquiryRows.map((row) => <article className="inquiry-row" key={row.productId}><div className={`mini-image tone-${row.tone}`}><span className="jewel-shape" />{row.thumbnailUrl && <img src={row.thumbnailUrl} alt={row.imageAlt?.en ?? row.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}</div><div className="inquiry-product"><strong>{row.productName}</strong><span>{row.productCode}</span><small>{row.material} / {row.color} / {row.size}</small><small>MOQ {row.moq} / Approved Buyer Price {formatMoney(row.priceSnapshot, buyer.currency)}</small></div><div className="quantity"><button type="button" aria-label="Decrease quantity" onClick={() => updateInquiryQuantity(row.productId, row.quantity - row.moq)}><Minus size={14} /></button><input value={row.quantity} type="number" onChange={(event) => updateInquiryQuantity(row.productId, event.target.value)} /><button type="button" aria-label="Increase quantity" onClick={() => updateInquiryQuantity(row.productId, row.quantity + row.moq)}><Plus size={14} /></button></div><b>{formatMoney(row.subtotal, buyer.currency)}</b><button className="remove" type="button" aria-label="Remove item" onClick={() => removeInquiryItem(row.productId)}><Trash2 size={16} /></button></article>)}</div><aside className="inquiry-summary"><h2>Inquiry summary</h2><dl><dt>Products</dt><dd>{inquiryRows.length}</dd><dt>Total quantity</dt><dd>{totalQuantity}</dd><dt>Estimated total</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl><small>Final availability and pricing will be confirmed by Noblesse.</small><Link to={inquiryRows.length ? '/request-quote' : '/inquiry-list'} className={inquiryRows.length ? '' : 'disabled'}>Request Quote</Link></aside></section></main>
}
