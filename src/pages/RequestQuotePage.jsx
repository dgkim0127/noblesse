import { LockKeyhole, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { getHybridGatewayErrorMessage } from '../services'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

function QuoteLine({ row, currency }) {
  const thumbnailUrl = row.thumbnailUrl ?? row.product?.imageSet?.thumb
  return <div className="quote-line" key={`${row.productId}-${row.color}-${row.size}`}>
    <div className={`quote-thumb tone-${row.tone}`}>
      <span className="jewel-shape" />
      {thumbnailUrl && <img src={thumbnailUrl} alt={row.productName} loading="lazy" width="300" height="300" onError={(event) => { event.currentTarget.hidden = true }} />}
    </div>
    <span>
      <strong>{row.productCode}</strong>
      <small>{row.productName}</small>
      <small>{row.color} / {row.size} / {row.quantity} pcs</small>
    </span>
    <strong>{formatMoney(row.subtotal, currency)}</strong>
  </div>
}

function AccessNotice({ viewerState }) {
  const { toLocalePath } = useLocalePath()
  const isPending = viewerState === 'pending'
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isPending ? '회원 확인 중입니다.' : '견적 문의는 회원 확인 후 이용할 수 있습니다.'}</h1><p>{isPending ? '이메일 인증 및 바이어 승인 후 가격과 견적 문의 기능이 열립니다.' : '로그인하거나 회원 신청 후 견적을 보내주세요.'}</p><Link to={toLocalePath('/account')}>회원 상태 보기</Link></div></main>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>먼저 Inquiry List에 상품을 담아주세요.</h1><Link to={toLocalePath('/products')}>상품 목록 보기</Link></div></main>

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const inquiry = await submitRequestQuote(memo)
      if (inquiry) navigate(toLocalePath(`/my-inquiries/${inquiry.inquiryId}`))
    } catch (nextError) {
      setError(getHybridGatewayErrorMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="content">
    <div className="page-title"><div><p>Request Quote</p><h1>견적 내용을 확인해주세요</h1></div></div>
    <section className="quote-panel">
      <Send size={24} />
      <h2>Noblesse에 견적 문의 보내기</h2>
      <div className="quote-section"><p>이 요청은 주문이나 결제가 아닙니다. Noblesse가 재고, 단가, 납기와 배송 조건을 확인한 뒤 최종 견적을 안내합니다.</p></div>
      <div className="quote-section"><h3>바이어 정보</h3><dl><dt>회사명</dt><dd>{buyer.companyName}</dd><dt>담당자</dt><dd>{buyer.contactName}</dd><dt>지역</dt><dd>{buyer.assignedMarket}</dd><dt>통화</dt><dd>{buyer.currency}</dd></dl></div>
      <div className="quote-section"><h3>견적 요약</h3><dl><dt>상품 수</dt><dd>{inquiryRows.length}</dd><dt>총 수량</dt><dd>{totalQuantity}</dd><dt>예상 합계</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl></div>
      {inquiryRows.map((row) => <QuoteLine key={`${row.productId}-${row.color}-${row.size}`} row={row} currency={buyer.currency} />)}
      <textarea value={memo} maxLength="2000" onChange={(event) => setMemo(event.target.value)} placeholder="요청 메모" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={submitting} type="button" onClick={submit}>{submitting ? '견적 문의 전송 중…' : '견적 문의 보내기'}</button>
    </section>
  </main>
}
