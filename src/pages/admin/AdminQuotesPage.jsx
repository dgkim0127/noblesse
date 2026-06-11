import { buildAdminQuoteDraft, getAdminInquiries } from '../../services'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPreviewNote, AdminStatus } from './AdminPageParts'

export function AdminQuotesPage() {
  const quoteRows = getAdminInquiries().map((inquiry) => ({
    inquiry,
    draft: buildAdminQuoteDraft(inquiry),
  })).filter((row) => row.draft)

  return <>
    <AdminPageHeader
      title="Admin Quotes"
      description="Review preview quote drafts generated from Request Quote records."
    />
    <AdminPreviewNote>Admin Quote list is preview-only. Production quotes must be created and sent through trusted admin API/RPC.</AdminPreviewNote>

    <section className="admin-card admin-quote-list">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Inquiry Number</th>
              <th>Buyer Company</th>
              <th>Status</th>
              <th>Currency</th>
              <th>Requested Total</th>
              <th>Quote Draft Total</th>
              <th>Lead Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quoteRows.map(({ draft, inquiry }) => <tr key={inquiry.inquiryId}>
              <td>{inquiry.inquiryId}</td>
              <td>{inquiry.buyerCompanyName}</td>
              <td><AdminStatus status={inquiry.status} /></td>
              <td>{draft.currency}</td>
              <td className="admin-quote-total"><AdminMoney value={draft.requestedTotal} currency={draft.currency} /></td>
              <td className="admin-quote-total"><AdminMoney value={draft.confirmedTotal} currency={draft.currency} /></td>
              <td>{draft.leadTime}</td>
              <td>
                <div className="admin-actions tight">
                  <AdminLink to={`/admin/inquiries/${inquiry.inquiryId}`}>View Inquiry</AdminLink>
                  <AdminLink to={`/admin/quotes/${inquiry.inquiryId}`}>Open Quote Preview</AdminLink>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </>
}
