import { LockKeyhole, Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getInquiryRoutePath } from '../commerce/inquiryKeys'
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
  return <main className="content">
    <div className="approval-page">
      <LockKeyhole size={25} />
      <h1>{isPending ? '거래처 정보를 확인 중입니다.' : '견적 요청은 승인된 거래처만 이용할 수 있습니다.'}</h1>
      <p>{isPending ? '담당자 확인 후 견적 요청 기능을 안내드립니다.' : '로그인하거나 거래처 신청을 먼저 진행해주세요.'}</p>
      <p>거래 조건 확인이 급한 경우 이메일로 문의할 수 있습니다.</p>
      <div className="account-actions">
        <Link to={toLocalePath('/account')}>확인 상태 보기</Link>
        <a className="secondary-action" href="mailto:dgkim0127@gmail.com"><Mail size={15} />이메일 문의</a>
      </div>
    </div>
  </main>
}

export function RequestQuotePage() {
  const navigate = useNavigate()
  const { authError, authStatus, buyer, dataError, dataStatus, estimatedTotal, inquiryRows, isApproved, submitRequestQuote, totalQuantity, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const [memo, setMemo] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')

  if (dataStatus === 'loading' || authStatus === 'checking') return <main className="content"><div className="approval-page"><h1>견적 권한 확인 중</h1><p>카탈로그와 거래처 권한을 확인하고 있습니다.</p></div></main>
  if (dataStatus === 'error') return <main className="content"><div className="approval-page"><h1>카탈로그 API를 불러올 수 없습니다.</h1><p>{dataError || '견적 데이터를 불러오지 못했습니다.'}</p></div></main>
  if (authStatus === 'error') return <main className="content"><div className="approval-page"><h1>거래처 세션을 확인할 수 없습니다.</h1><p>{authError || '거래처 권한을 확인하지 못했습니다.'}</p></div></main>
  if (!isApproved) return <AccessNotice viewerState={viewerState} />
  if (!inquiryRows.length) return <main className="content"><div className="approval-page"><h1>먼저 견적 리스트에 상품을 담아주세요.</h1><Link to={toLocalePath('/products')}>상품 목록 보기</Link></div></main>

  const submit = async () => {
    if (submitStatus === 'submitting') return
    setSubmitStatus('submitting')
    setSubmitError('')
    try {
      const inquiry = await submitRequestQuote(memo)
      if (inquiry) {
        navigate(toLocalePath(getInquiryRoutePath(inquiry)))
        return
      }
      setSubmitStatus('idle')
      setSubmitError('견적 요청을 보낼 수 없습니다. 세션과 견적 상품을 확인해주세요.')
    } catch (error) {
      setSubmitStatus('idle')
      setSubmitError(error?.message || '견적 요청을 보낼 수 없습니다.')
    }
  }

  return <main className="content">
    <div className="page-title"><div><p>견적 요청</p><h1>요청 내용을 확인해주세요</h1></div></div>
    <section className="quote-panel">
      <Send size={24} />
      <h2>Noblesse에 거래 조건과 견적을 요청합니다</h2>
      <div className="quote-section">
        <p>현재 합계는 최종 거래 확정 금액이 아닙니다. 담당자가 재고, 가격, 납기, 배송 조건을 확인한 뒤 최종 견적을 안내합니다.</p>
        <p>This is not a final order. Our team will review product availability, price, lead time, and shipping conditions before sending a final quotation.</p>
      </div>
      <div className="quote-section">
        <h3>거래처 정보</h3>
        <dl><dt>회사명</dt><dd>{buyer.companyName}</dd><dt>담당자</dt><dd>{buyer.contactName}</dd><dt>시장</dt><dd>{buyer.assignedMarket}</dd><dt>통화</dt><dd>{inquiryRows[0]?.currency || buyer.currency}</dd></dl>
      </div>
      <div className="quote-section">
        <h3>견적 요약</h3>
        <dl><dt>상품 수</dt><dd>{inquiryRows.length}</dd><dt>총 수량</dt><dd>{totalQuantity}</dd><dt>예상 합계</dt><dd>{formatMoney(estimatedTotal, inquiryRows[0]?.currency || buyer.currency)}</dd></dl>
      </div>
      {inquiryRows.map((row) => <QuoteLine key={`${row.productId}-${row.color}-${row.size}`} row={row} currency={row.currency || buyer.currency} />)}
      <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="요청 메모" />
      {submitError && <p className="auth-notice" role="alert">{submitError}</p>}
      <button className="primary-action" type="button" disabled={submitStatus === 'submitting'} onClick={submit}>{submitStatus === 'submitting' ? '전송 중...' : '견적 요청 보내기'}</button>
    </section>
  </main>
}
