import { FileCheck2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

function QuoteEditor({ request, onPublish, publishing }) {
  const [shippingAmount, setShippingAmount] = useState(request.quote?.shippingAmount ?? 0)
  const [leadTime, setLeadTime] = useState(request.quote?.leadTime ?? '')
  const [validUntil, setValidUntil] = useState(request.quote?.validUntil ?? '')
  const [terms, setTerms] = useState(request.quote?.terms ?? '')
  const [adminNote, setAdminNote] = useState(request.quote?.adminNote ?? '')
  const [items, setItems] = useState(() => (request.quote?.items ?? request.items).map((item) => ({ ...item, unitPrice: item.unitPrice ?? item.priceSnapshot })))
  const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0) + Number(shippingAmount || 0)
  const updatePrice = (index, unitPrice) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: Number(unitPrice), subtotal: Number(unitPrice) * item.quantity } : item))
  return <section className="admin-quote-editor"><div className="admin-request-meta"><strong>{request.inquiryId}</strong><span>{request.buyerCompanyName} / {request.contactName} / {request.contactEmail}</span><span>Requested shipping: {request.buyerCountry}</span><span>{request.requestMemo || 'No buyer memo.'}</span></div><div className="admin-quote-items">{items.map((item, index) => <div className="admin-quote-item" key={`${item.productId}-${item.color}-${item.size}`}><span><strong>{item.productCode}</strong><small>{item.productName} / {item.color} / {item.size} / {item.quantity} pcs</small></span><label>Unit price<input min="0" step="0.01" type="number" value={item.unitPrice} onChange={(event) => updatePrice(index, event.target.value)} /></label><b>{formatMoney(item.subtotal, request.currency)}</b></div>)}</div><div className="admin-quote-fields"><label>Shipping amount<input min="0" step="0.01" type="number" value={shippingAmount} onChange={(event) => setShippingAmount(event.target.value)} /></label><label>Lead time<input value={leadTime} onChange={(event) => setLeadTime(event.target.value)} /></label><label>Valid until<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label><label>Terms<textarea value={terms} onChange={(event) => setTerms(event.target.value)} /></label><label>Buyer note<textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} /></label></div><div className="admin-quote-total"><span>Quoted total</span><strong>{formatMoney(total, request.currency)}</strong><button className="primary-action" disabled={publishing} type="button" onClick={() => onPublish({ items, shippingAmount: Number(shippingAmount || 0), leadTime, validUntil, terms, adminNote })}>{publishing ? 'Publishing...' : request.quote ? 'Update quotation' : 'Publish quotation'}</button></div></section>
}

export function AdminQuotesPage() {
  const { inquiries, isAdmin, markQuoteChecking, publishQuote } = useCommerce()
  const [selectedId, setSelectedId] = useState(inquiries[0]?.inquiryId ?? '')
  const [publishing, setPublishing] = useState(false)
  const activeId = selectedId || inquiries[0]?.inquiryId || ''
  const selected = useMemo(() => inquiries.find((item) => item.inquiryId === activeId), [activeId, inquiries])
  const submit = async (draft) => {
    if (!selected) return
    setPublishing(true)
    try { await publishQuote(selected, draft) } finally { setPublishing(false) }
  }
  const markChecking = async () => {
    if (!selected) return
    setPublishing(true)
    try { await markQuoteChecking(selected) } finally { setPublishing(false) }
  }
  if (!isAdmin) return <main className="content"><div className="approval-page"><ShieldCheck size={25} /><h1>Administrator access required</h1><p>Quote administration is available only to Noblesse administrators.</p></div></main>
  return <main className="content"><div className="page-title"><div><p>QUOTE ADMINISTRATION</p><h1>Issue official quotations</h1></div></div><section className="admin-quotes-layout"><aside className="admin-quote-list">{inquiries.map((request) => <button className={request.inquiryId === activeId ? 'active' : ''} key={request.inquiryId} type="button" onClick={() => setSelectedId(request.inquiryId)}><FileCheck2 size={17} /><span><strong>{request.inquiryId}</strong><small>{request.buyerCompanyName} / {request.status}</small></span></button>)}{!inquiries.length && <div className="empty">No quote requests.</div>}</aside>{selected && <div className="admin-editor-wrap">{selected.status === 'requested' && <button className="secondary-action" disabled={publishing} type="button" onClick={markChecking}>Mark as reviewing</button>}<QuoteEditor onPublish={submit} publishing={publishing} request={selected} /></div>}</section></main>
}
