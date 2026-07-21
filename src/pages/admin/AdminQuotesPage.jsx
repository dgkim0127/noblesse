import { FilePlus2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatMoney } from '../../utils/commerce'
import { AdminEmptyState, AdminLink, AdminPageHeader, AdminPagination } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'

const pageSize = 20
const workflowStatuses = [
  ['', '전체'],
  ['received', '요청 접수'],
  ['picking', '상품 준비 중'],
  ['receipt_sent', 'SNS 영수증 발송'],
  ['payment_confirmed', '입금 확인'],
  ['shipped', '발송 완료'],
  ['completed', '거래 종료'],
  ['cancelled', '전체 취소'],
]

export function AdminQuotesPage() {
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
      title="견적"
      description="요청받은 상품을 준비하고 취소 품목, SNS 영수증, 입금, 발송 상태를 관리합니다."
      actions={<AdminLink className="primary-action" to="/admin/inquiries"><FilePlus2 size={17} />요청에서 피킹 시작</AdminLink>}
    />
    <div className="admin-section-tabs"><AdminLink to="/admin/inquiries">문의 요청</AdminLink><AdminLink className="is-active" to="/admin/quotes">견적서</AdminLink></div>

    <section className="admin-resource-index">
      <form className="admin-filter-bar admin-quote-filter" onSubmit={(event) => { event.preventDefault(); setOffset(0); setQuery(searchInput.trim()) }}>
        <label className="admin-search-field"><span>견적 검색</span><div><input placeholder="견적 번호, 문의 번호, 거래처" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button aria-label="검색" title="검색" type="submit"><Search size={17} /></button></div></label>
        <label><span>운영 단계</span><select value={workflowFilter} onChange={(event) => { setWorkflowFilter(event.target.value); setOffset(0) }}>{workflowStatuses.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select></label>
      </form>

      {quotes.length === 0 ? <AdminEmptyState title="조건에 맞는 견적이 없습니다." description="문의 요청을 열어 첫 견적 초안을 만들어보세요." action={<AdminLink className="primary-action" to="/admin/inquiries">문의 요청 보기</AdminLink>} /> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>견적 요청</th><th>거래처</th><th>운영 단계</th><th>준비 금액</th><th>유효기간</th><th>PDF</th><th>수정일</th></tr></thead>
          <tbody>{quotes.map((quote) => <tr key={quote.id}>
            <td data-label="견적"><AdminLink className="admin-product-name" to={`/admin/quotes/${quote.id}`}>{quote.quoteNumber || '초안'}</AdminLink><small>{quote.inquiryNumber}</small></td>
            <td data-label="거래처">{quote.companyName || '-'}</td>
            <td data-label="운영 단계"><span className={`admin-status ${quote.workflowStatus}`}>{workflowStatuses.find(([value]) => value === quote.workflowStatus)?.[1] || quote.workflowStatus}</span></td>
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
