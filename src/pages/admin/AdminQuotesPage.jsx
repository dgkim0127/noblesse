import { FilePlus2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatMoney } from '../../utils/commerce'
import { useLocalePath } from '../../utils/locale'
import { AdminEmptyState, AdminLink, AdminPageHeader, AdminPagination } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { getAdminQuoteDateLocale, useAdminQuoteWorkflowCopy } from './adminQuoteWorkflowCopy'

const pageSize = 20
const workflowStatuses = ['', 'received', 'picking', 'receipt_sent', 'payment_confirmed', 'shipped', 'completed', 'cancelled']

export function AdminQuotesPage() {
  const t = useAdminQuoteWorkflowCopy()
  const { locale } = useLocalePath()
  const dateLocale = getAdminQuoteDateLocale(locale)
  const [workflowFilter, setWorkflowFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const filters = useMemo(() => ({ workflowStatus: workflowFilter, q: query, limit: pageSize, offset }), [offset, query, workflowFilter])
  const resource = useAdminApiResource((api, token) => api.getQuotes(filters, token), [workflowFilter, query, offset])
  const apiState = shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} status={resource.status} /> : null
  if (apiState) return apiState

  const quotes = resource.data?.quotes || []

  return <>
    <AdminPageHeader
      title={t.list.title}
      description={t.list.description}
      actions={<AdminLink className="primary-action" to="/admin/inquiries"><FilePlus2 size={17} />{t.list.startPicking}</AdminLink>}
    />
    <div className="admin-section-tabs"><AdminLink to="/admin/inquiries">{t.list.inquiryRequests}</AdminLink><AdminLink className="is-active" to="/admin/quotes">{t.list.quotations}</AdminLink></div>

    <section className="admin-resource-index">
      <form className="admin-filter-bar admin-quote-filter" onSubmit={(event) => { event.preventDefault(); setOffset(0); setQuery(searchInput.trim()) }}>
        <label className="admin-search-field"><span>{t.list.searchLabel}</span><div><input placeholder={t.list.searchPlaceholder} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button aria-label={t.list.searchAria} title={t.list.searchAria} type="submit"><Search size={17} /></button></div></label>
        <label><span>{t.list.workflowStage}</span><select value={workflowFilter} onChange={(event) => { setWorkflowFilter(event.target.value); setOffset(0) }}>{workflowStatuses.map((value) => <option key={value || 'all'} value={value}>{value ? t.workflow[value] : t.list.all}</option>)}</select></label>
      </form>

      {quotes.length === 0 ? <AdminEmptyState title={t.list.emptyTitle} description={t.list.emptyDescription} action={<AdminLink className="primary-action" to="/admin/inquiries">{t.list.viewRequests}</AdminLink>} /> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.list.columns.request}</th><th>{t.list.columns.company}</th><th>{t.list.columns.stage}</th><th>{t.list.columns.preparedTotal}</th><th>{t.list.columns.validUntil}</th><th>{t.list.columns.pdf}</th><th>{t.list.columns.updatedAt}</th></tr></thead>
          <tbody>{quotes.map((quote) => <tr key={quote.id}>
            <td data-label={t.list.columns.request}><AdminLink className="admin-product-name" to={`/admin/quotes/${quote.id}`}>{quote.quoteNumber || t.list.draft}</AdminLink><small>{quote.inquiryNumber}</small></td>
            <td data-label={t.list.columns.company}>{quote.companyName || '-'}</td>
            <td data-label={t.list.columns.stage}><span className={`admin-status ${quote.workflowStatus}`}>{t.workflow[quote.workflowStatus] || quote.workflowStatus}</span></td>
            <td data-label={t.list.columns.preparedTotal}><strong>{formatMoney(quote.confirmedTotal, quote.currency)}</strong></td>
            <td data-label={t.list.columns.validUntil}>{quote.validUntil ? new Date(`${String(quote.validUntil).slice(0, 10)}T00:00:00`).toLocaleDateString(dateLocale) : '-'}</td>
            <td data-label={t.list.columns.pdf}>{quote.currentRevision ? `v${quote.currentRevision}` : '-'}</td>
            <td data-label={t.list.columns.updatedAt}>{quote.updatedAt ? new Date(quote.updatedAt).toLocaleDateString(dateLocale) : '-'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <AdminPagination disabled={resource.status === 'loading'} meta={resource.meta} onNext={() => setOffset(Number(resource.meta?.nextOffset ?? offset + pageSize))} onPrevious={() => setOffset(Math.max(0, offset - pageSize))} />
    </section>
  </>
}
