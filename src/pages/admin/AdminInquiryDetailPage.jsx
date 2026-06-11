import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAdminInquiryById } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

export function AdminInquiryDetailPage() {
  const { inquiryId } = useParams()
  const inquiry = getAdminInquiryById(inquiryId)
  const [status, setStatus] = useState(inquiry?.status)

  if (!inquiry) {
    return <>
      <AdminPageHeader title="Inquiry not found" description="The selected Request Quote preview could not be found." />
      <AdminLink to="/admin/inquiries">Back to Inquiries</AdminLink>
    </>
  }

  return <>
    <AdminPageHeader title={inquiry.inquiryId} description="Inquiry detail and item snapshot preview." actions={<><AdminLink to="/admin/inquiries">Back to Inquiries</AdminLink><AdminLink className="primary-action" to={`/admin/quotes/${inquiry.inquiryId}`}>Create Admin Quote</AdminLink></>} />
    <AdminPreviewNote>priceSnapshot is the reference price captured when the Request Quote was submitted. Admin Quote is the final quotation basis after review.</AdminPreviewNote>

    <section className="admin-detail-grid">
      <article className="admin-card">
        <h2>Buyer Info</h2>
        <dl className="admin-definition-list">
          <dt>Company</dt><dd>{inquiry.buyerCompanyName}</dd>
          <dt>Country</dt><dd>{inquiry.buyerCountry}</dd>
          <dt>Language</dt><dd>{inquiry.buyerLanguage}</dd>
          <dt>Currency</dt><dd>{inquiry.currency}</dd>
        </dl>
      </article>
      <article className="admin-card">
        <h2>Inquiry Status</h2>
        <AdminStatus status={status} />
        <div className="admin-actions"><button type="button" onClick={() => setStatus('checking')}>Mark Checking Preview</button><button type="button" onClick={() => setStatus('cancelled')}>Cancel Preview</button></div>
      </article>
      <article className="admin-card wide-card">
        <h2>Request Memo</h2>
        <p>{inquiry.requestMemo || 'No memo provided.'}</p>
      </article>
    </section>

    <section className="admin-card">
      <h2>Item Snapshot</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Color</th><th>Size</th><th>Quantity</th><th>MOQ</th><th>priceSnapshot</th><th>Subtotal</th></tr></thead>
          <tbody>{inquiry.items.map((item) => <tr key={`${item.productId}-${item.color}-${item.size}`}>
            <td>{item.productCode}</td>
            <td>{item.productName}</td>
            <td>{item.color}</td>
            <td>{item.size}</td>
            <td>{item.quantity}</td>
            <td>{item.moq}</td>
            <td><AdminMoney value={item.priceSnapshot} currency={inquiry.currency} /></td>
            <td><AdminMoney value={item.subtotal} currency={inquiry.currency} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="admin-total-row"><span>Estimated Total</span><strong><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></strong></div>
    </section>
  </>
}
