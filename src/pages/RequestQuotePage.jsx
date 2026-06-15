import { LockKeyhole, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
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
  const isPending = viewerState === 'pending'
  const { toLocalePath } = useLocalePath()
  return <main className="content"><div className="approval-page"><LockKeyhole size={25} /><h1>{isPending ? '거래처 정보 확인 중입니다.' : '견적 문의는 거래처 확인 후 이용할 수 있습니다.'}</h1><p>{isPending ? '견적 문의는 담당자 확인 후 가능하며 가격과 합계는 그 전까지 숨겨집니다.' : '로그인하거나 거래처 문의 후 제품 견적을 남겨주세요.'}</p><Link to={toLocalePath('/account')}>확인 상태 보기</Link></div></main>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { buyer, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [memo, setMemo] = useState('')
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>먼저 문의 리스트에 상품을 담아주세요.</h1><Link to={toLocalePath('/products')}>상품 목록 보기</Link></div></main>

  const submit = () => {
    const inquiry = submitRequestQuote(memo)
    if (inquiry) navigate(toLocalePath(`/my-inquiries/${inquiry.inquiryId}`))
  }

  return <main className="content">
    <div className="page-title"><div><p>견적 문의</p><h1>견적 내용을 확인해주세요</h1></div></div>
    <section className="quote-panel">
      <Send size={24} />
      <h2>Noblesse에 거래 조건과 견적 문의 보내기</h2>
      <div className="quote-section">
        <p>현재 단계는 최종 거래 확정 단계가 아닙니다. 관리자가 재고, 단가, 납기, 배송 조건을 확인한 뒤 최종 견적을 안내합니다.</p>
        <p>This is not a final order. Our team will review product availability, price, lead time, and shipping conditions before sending a final quotation.</p>
      </div>
      <div className="quote-section">
        <h3>거래처 정보</h3>
        <dl><dt>회사명</dt><dd>{buyer.companyName}</dd><dt>담당자</dt><dd>{buyer.contactName}</dd><dt>지역</dt><dd>{buyer.assignedMarket}</dd><dt>통화</dt><dd>{buyer.currency}</dd></dl>
      </div>
      <div className="quote-section">
        <h3>견적 요약</h3>
        <dl><dt>상품 수</dt><dd>{inquiryRows.length}</dd><dt>총 수량</dt><dd>{totalQuantity}</dd><dt>예상 합계</dt><dd>{formatMoney(estimatedTotal, buyer.currency)}</dd></dl>
      </div>
      {inquiryRows.map((row) => <QuoteLine key={`${row.productId}-${row.color}-${row.size}`} row={row} currency={buyer.currency} />)}
      <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="요청 메모" />
      <button className="primary-action" type="button" onClick={submit}>견적 문의 보내기</button>
    </section>
  </main>
}
