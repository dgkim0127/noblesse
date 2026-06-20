import { useMemo, useState } from 'react'
import { AdminLink, AdminMoney, AdminPageHeader, AdminPagination, AdminStatus } from './AdminPageParts'
import { AdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']
const pageSize = 20

export function AdminInquiriesPage() {
  const t = useAdminCopy()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const filters = useMemo(() => ({
    status: status === 'all' ? '' : status,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, status])
  const { data, error, meta, status: requestStatus } = useAdminApiResource((api, token) => api.getInquiries(filters, token), [status, query, offset])
  const loading = <AdminApiState error={error} status={requestStatus} />
  const inquiries = data?.inquiries || []
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  return <>
    <AdminPageHeader title={t.inquiries.title} description={t.inquiries.description} />

    <div className="admin-toolbar">
      <label className="admin-search">{t.inquiries.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.inquiries.searchPlaceholder} /></label>
      <div className="admin-filter-tabs">
        {statusTabs.map((tab) => <button className={status === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setStatus)(tab)}>{tab === 'all' ? t.common.all : getAdminStatusLabel(t, tab)}</button>)}
      </div>
    </div>

    {loading || <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.inquiries.inquiryNumber}</th><th>{t.inquiries.buyerCompany}</th><th>{t.inquiries.market}</th><th>{t.inquiries.currency}</th><th>{t.common.status}</th><th>{t.inquiries.totalItems}</th><th>{t.inquiries.totalQuantity}</th><th>{t.inquiries.estimatedTotal}</th><th>{t.common.createdAt}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{inquiries.map((inquiry) => <tr key={inquiry.id || inquiry.inquiryId}>
            <td>{inquiry.inquiryNumber || inquiry.inquiryId}</td>
            <td>{inquiry.companyName || inquiry.buyerCompanyName || '-'}</td>
            <td>{inquiry.market}</td>
            <td>{inquiry.currency}</td>
            <td><AdminStatus status={inquiry.status} /></td>
            <td>{inquiry.totalItems}</td>
            <td>{inquiry.totalQuantity}</td>
            <td><AdminMoney value={inquiry.estimatedTotal} currency={inquiry.currency} /></td>
            <td>{inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
            <td><div className="admin-actions tight"><AdminLink to={`/admin/inquiries/${inquiry.id || inquiry.inquiryId}`}>{t.common.view}</AdminLink></div></td>
          </tr>)}</tbody>
        </table>
        <AdminPagination
          disabled={requestStatus === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>}
  </>
}
