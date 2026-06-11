import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { buildAdminQuoteDraft, getAdminInquiryById } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'

export function AdminQuotePage() {
  const { inquiryId } = useParams()
  const inquiry = getAdminInquiryById(inquiryId)
  const draft = buildAdminQuoteDraft(inquiry)
  const [message, setMessage] = useState('Draft preview is ready.')

  if (!inquiry || !draft) {
    return <>
      <AdminPageHeader title="Quote draft not found" description="The selected inquiry could not be converted into an Admin Quote preview." />
      <AdminLink to="/admin/inquiries">Back to Inquiries</AdminLink>
    </>
  }

  return <>
    <AdminPageHeader title={`Admin Quote Preview / ${draft.inquiryId}`} description="Review requested items and confirmed quote draft values before trusted production flow." actions={<><AdminLink to="/admin/quotes">Back to Quotes</AdminLink><AdminLink to={`/admin/inquiries/${inquiry.inquiryId}`}>Back to Inquiry</AdminLink></>} />
    <AdminPreviewNote>Admin Quote is the final quotation basis after Noblesse review. This preview does not create a final transaction.</AdminPreviewNote>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Inquiry Info</h2>
        <dl className="admin-definition-list">
          <dt>Inquiry</dt><dd>{inquiry.inquiryId}</dd>
          <dt>Buyer</dt><dd>{inquiry.buyerCompanyName}</dd>
          <dt>Currency</dt><dd>{draft.currency}</dd>
          <dt>Status</dt><dd>{draft.status}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Buyer Info</h2>
        <dl className="admin-definition-list">
          <dt>Company</dt><dd>{inquiry.buyerCompanyName}</dd>
          <dt>Country</dt><dd>{inquiry.buyerCountry}</dd>
          <dt>Language</dt><dd>{inquiry.buyerLanguage}</dd>
          <dt>Request Memo</dt><dd>{inquiry.requestMemo || 'No memo provided.'}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Quote Conditions</h2>
        <dl className="admin-definition-list">
          <dt>Lead Time</dt><dd>{draft.leadTime}</dd>
          <dt>Shipping Note</dt><dd>{draft.shippingNote}</dd>
          <dt>Currency</dt><dd>{draft.currency}</dd>
          <dt>Confirmed Total</dt><dd><AdminMoney value={draft.confirmedTotal} currency={draft.currency} /></dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Requested Snapshot</h2>
        <dl className="admin-definition-list">
          <dt>Requested Total</dt><dd><AdminMoney value={draft.requestedTotal} currency={draft.currency} /></dd>
          <dt>Total Items</dt><dd>{inquiry.totalItems}</dd>
          <dt>Total Quantity</dt><dd>{inquiry.totalQuantity}</dd>
          <dt>Snapshot Rule</dt><dd>priceSnapshot is a reference captured at Request Quote time.</dd>
        </dl>
      </article>
    </section>

    <section className="admin-card admin-quote-editor">
      <h2>Admin Quote Draft Items</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Requested Quantity</th><th>Confirmed Quantity</th><th>Requested priceSnapshot</th><th>Confirmed Unit Price</th><th>Confirmed Subtotal</th></tr></thead>
          <tbody>{draft.items.map((item) => <tr key={item.productCode}>
            <td>{item.productCode}</td>
            <td>{item.productName}</td>
            <td>{item.requestedQuantity}</td>
            <td>{item.confirmedQuantity}</td>
            <td><AdminMoney value={item.requestedPriceSnapshot} currency={draft.currency} /></td>
            <td><AdminMoney value={item.confirmedUnitPrice} currency={draft.currency} /></td>
            <td><AdminMoney value={item.confirmedSubtotal} currency={draft.currency} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <h2>Internal Memo</h2>
      <label>Admin Memo<textarea readOnly value={draft.adminMemo} /></label>
      <div className="admin-actions"><button type="button" onClick={() => setMessage('Draft preview saved locally.')}>Save Draft Preview</button><button type="button" onClick={() => setMessage('Send Quote preview complete. No message was sent.')}>Send Quote Preview</button></div>
      <p className="admin-local-message">{message}</p>
    </section>
  </>
}
