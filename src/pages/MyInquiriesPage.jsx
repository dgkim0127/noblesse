import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

const statusLabel = {
  requested: '견적 문의 완료',
  checking: '확인 중',
  quoted: '견적 안내',
  confirmed: '확정',
  cancelled: '취소',
}
const statusTabs = ['all', 'requested', 'checking', 'quoted', 'confirmed', 'cancelled']

export function MyInquiriesPage() {
  const { inquiryId } = useParams()
  const { buyer, inquiries, isApproved, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [statusFilter, setStatusFilter] = useState('all')
  const filteredInquiries = useMemo(() => statusFilter === 'all' ? inquiries : inquiries.filter((item) => item.status === statusFilter), [inquiries, statusFilter])

  if (!isApproved) return <main className="content"><div className="approval-page"><FileText size={25} /><h1>{viewerState === 'pending' ? '회원 확인 중입니다.' : '견적 내역은 회원 확인 후 볼 수 있습니다.'}</h1><p>{viewerState === 'pending' ? '제출한 회원 정보가 검토 중입니다.' : '견적 문의 내역을 보려면 회원 신청을 진행해주세요.'}</p></div></main>

  const selected = inquiries.find((item) => item.inquiryId === inquiryId)
  if (selected) return <main className="content">
    <Link className="back" to={toLocalePath('/my-inquiries')}>견적 내역</Link>
    <section className="inquiry-detail">
      <span className={`status status-${selected.status}`}>{statusLabel[selected.status]}</span>
      <h1>{selected.inquiryId}</h1>
      <p>{selected.buyerCompanyName} / {selected.buyerCountry} / {new Date(selected.createdAt).toLocaleDateString('ko-KR')}</p>
      <dl className="inquiry-meta"><dt>상품 수</dt><dd>{selected.totalItems}</dd><dt>총 수량</dt><dd>{selected.totalQuantity}</dd><dt>예상 합계</dt><dd>{formatMoney(selected.estimatedTotal, selected.currency)}</dd></dl>
      {selected.items.map((item) => <div className="quote-line inquiry-detail-line" key={`${item.productId}-${item.color}-${item.size}`}>{item.thumbnailUrl && <img className="quote-thumb" src={item.thumbnailUrl} alt={item.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}<span>{item.productCode} / {item.productName}<small>{item.material} / {item.color} / {item.size} / MOQ {item.moq}</small></span><strong>{formatMoney(item.subtotal, selected.currency)}</strong></div>)}
      <div className="quote-total"><span>예상 합계</span><strong>{formatMoney(selected.estimatedTotal, selected.currency)}</strong></div>
    </section>
  </main>

  return <main className="content">
    <div className="page-title"><div><p>견적 내역</p><h1>견적 문의 내역</h1></div></div>
    <div className="status-tabs">{statusTabs.map((status) => <button className={statusFilter === status ? 'active' : ''} key={status} type="button" onClick={() => setStatusFilter(status)}>{status === 'all' ? '전체' : statusLabel[status]}</button>)}</div>
    <div className="inquiries">{filteredInquiries.map((item) => <Link className="inquiry-card" key={item.inquiryId} to={toLocalePath(`/my-inquiries/${item.inquiryId}`)}><FileText size={20} /><div><strong>{item.inquiryId}</strong><span>{item.totalItems}개 상품 / {item.totalQuantity} pcs / {new Date(item.createdAt).toLocaleDateString('ko-KR')}</span></div><em className={`status status-${item.status}`}>{statusLabel[item.status]}</em><b>{formatMoney(item.estimatedTotal, buyer.currency)}</b></Link>)}</div>
  </main>
}
