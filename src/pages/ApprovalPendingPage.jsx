import { BadgeCheck, Clock3, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const approvalSteps = [
  '거래처 정보 검토',
  '담당 지역 배정',
  '거래 조건 확인',
  '문의 안내 준비',
]

export function ApprovalPendingPage() {
  const { buyer, dataMode, isApproved, isGuest, isPending, setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const isMockMode = dataMode === 'mock'

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      {isApproved ? <BadgeCheck size={25} /> : isGuest ? <UserRound size={25} /> : <Clock3 size={25} />}
      <p className="eyebrow">거래처 확인</p>
      <h1>{isApproved ? '거래 조건 안내가 가능한 계정입니다.' : isGuest ? '거래처 문의를 진행해주세요' : '거래처 정보 확인 중입니다.'}</h1>
      {isPending && <p>제출한 거래처 정보를 담당자가 확인 중입니다. 확인 후 거래 조건과 견적 문의 가능 여부를 안내드립니다.</p>}
      {isApproved && <p>{buyer.companyName} 계정은 거래 조건, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다. 견적 문의는 최종 주문이 아닙니다.</p>}
      {isGuest && <p>거래처 문의 후 확인이 완료되면 거래 조건과 문의 기능 안내가 가능합니다.</p>}
      <div className="approval-steps">
        {approvalSteps.map((step) => <span key={step}>{step}</span>)}
      </div>
      <div className="approval-note">
        <strong>Noblesse 문의</strong>
        <span>카탈로그나 거래 조건 확인이 급한 경우 회사명과 지역 정보를 포함해 담당자에게 문의해주세요.</span>
      </div>
      <div className="account-actions">
        <Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>마이페이지로 이동</Link>
        <Link className="secondary-action" to={toLocalePath('/register')}>거래처 문의 남기기</Link>
        <a className="secondary-action" href="mailto:dgkim0127@gmail.com"><Mail size={15} />이메일 문의</a>
        {isApproved && <Link className="secondary-action" to={toLocalePath('/inquiry-list')}>문의 리스트</Link>}
        {isGuest && <Link className="secondary-action" to={toLocalePath('/register')}>거래처 문의</Link>}
      </div>
      {isMockMode && !isApproved && <button className="text-action preview-action" type="button" onClick={() => setViewerState('approved')}>개발 미리보기: 거래 조건 보기</button>}
    </section>
  </main>
}
