import { FilePlus2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatMoney } from '../../utils/commerce'
import { AdminEmptyState, AdminLink, AdminPageHeader, AdminPagination } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'

const pageSize = 20
const statuses = [
  ['', '전체'],
  ['draft', '초안'],
  ['sent', '발행됨'],
  ['accepted', '승인'],
  ['rejected', '거절'],
  ['expired', '만료'],
  ['cancelled', '취소'],
]

export function AdminQuotesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const filters = useMemo(() => ({ status: statusFilter, q: query, limit: pageSize, offset }), [offset, query, statusFilter])
  const resource = useAdminApiResource((api, token) => api.getQuotes(filters, token), [statusFilter, query, offset])
  const apiState = shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} status={resource.status} /> : null
  if (apiState) return apiState

  const quotes = resource.data?.quotes || []

  return <>
    <AdminPageHeader
      title="견적"
      description="문의에서 만든 견적 초안을 검토하고 공식 문서를 발행합니다."
      actions={<AdminLink className="primary-action" to="/admin/inquiries"><FilePlus2 size={17} />문의에서 초안 만들기</AdminLink>}
    />
    <div className="admin-section-tabs"><AdminLink to="/admin/inquiries">문의 요청</AdminLink><AdminLink className="is-active" to="/admin/quotes">견적서</AdminLink></div>

    <section className="admin-resource-index">
      <form className="admin-filter-bar admin-quote-filter" onSubmit={(event) => { event.preventDefault(); setOffset(0); setQuery(searchInput.trim()) }}>
        <label className="admin-search-field"><span>견적 검색</span><div><input placeholder="견적 번호, 문의 번호, 거래처" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button aria-label="검색" title="검색" type="submit"><Search size={17} /></button></div></label>
        <label><span>상태</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setOffset(0) }}>{statuses.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select></label>
      </form>

      {quotes.length === 0 ? <AdminEmptyState title="조건에 맞는 견적이 없습니다." description="문의 요청을 열어 첫 견적 초안을 만들어보세요." action={<AdminLink className="primary-action" to="/admin/inquiries">문의 요청 보기</AdminLink>} /> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>견적</th><th>거래처</th><th>상태</th><th>합계</th><th>유효기간</th><th>버전</th><th>수정일</th></tr></thead>
          <tbody>{quotes.map((quote) => <tr key={quote.id}>
            <td data-label="견적"><AdminLink className="admin-product-name" to={`/admin/quotes/${quote.id}`}>{quote.quoteNumber || '초안'}</AdminLink><small>{quote.inquiryNumber}</small></td>
            <td data-label="거래처">{quote.companyName || '-'}</td>
            <td data-label="상태"><span className={`admin-status ${quote.displayStatus || quote.status}`}>{statuses.find(([value]) => value === (quote.displayStatus || quote.status))?.[1] || quote.status}</span></td>
            <td data-label="합계"><strong>{formatMoney(quote.confirmedTotal, quote.currency)}</strong></td>
            <td data-label="유효기간">{quote.validUntil ? new Date(`${String(quote.validUntil).slice(0, 10)}T00:00:00`).toLocaleDateString('ko-KR') : '-'}</td>
            <td data-label="버전">{quote.currentRevision ? `v${quote.currentRevision}` : '-'}</td>
            <td data-label="수정일">{quote.updatedAt ? new Date(quote.updatedAt).toLocaleDateString('ko-KR') : '-'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <AdminPagination disabled={resource.status === 'loading'} meta={resource.meta} onNext={() => setOffset(Number(resource.meta?.nextOffset ?? offset + pageSize))} onPrevious={() => setOffset(Math.max(0, offset - pageSize))} />
    </section>
  </>
}
