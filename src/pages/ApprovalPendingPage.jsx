import { BadgeCheck, Clock3, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const approvalSteps = [
  '거래처 등록',
  '상품과 가격 확인',
  '견적 리스트 작성',
  '견적 요청 전송',
]

export function ApprovalPendingPage() {
  const { buyer, dataMode, isApproved, isGuest, isPending, setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const isMockMode = dataMode === 'mock'

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      {isApproved ? <BadgeCheck size={25} /> : isGuest ? <UserRound size={25} /> : <Clock3 size={25} />}
      <p className="eyebrow">거래처 확인</p>
      <h1>{isApproved ? '가격과 견적 기능을 사용할 수 있습니다.' : isGuest ? '거래처 등록을 진행해주세요.' : '계정 상태 확인이 필요합니다.'}</h1>
      {isPending && <p>거래처 등록 정보를 확인하거나 담당자에게 문의해주세요.</p>}
      {isApproved && <p>{buyer.companyName} 계정은 거래 조건, 견적 리스트, 견적 요청 기능을 사용할 수 있습니다. 견적 요청은 최종 주문이 아닙니다.</p>}
      {isGuest && <p>거래처 계정을 등록하고 로그인하면 가격과 견적 기능을 바로 이용할 수 있습니다.</p>}
      <div className="approval-steps">
        {approvalSteps.map((step) => <span key={step}>{step}</span>)}
      </div>
      <div className="approval-note">
        <strong>Noblesse 문의</strong>
        <span>카탈로그 이용 또는 거래 조건 확인이 급한 경우 회사명과 지역 정보를 포함해 담당자에게 문의해주세요.</span>
      </div>
      <div className="account-actions">
        <Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>마이페이지로 이동</Link>
        <Link className="secondary-action" to={toLocalePath('/register')}>거래처 등록</Link>
        <a className="secondary-action" href="mailto:dgkim0127@gmail.com"><Mail size={15} />이메일 문의</a>
        {isApproved && <Link className="secondary-action" to={toLocalePath('/inquiry-list')}>견적 리스트</Link>}
      </div>
      {isMockMode && !isApproved && <button className="text-action preview-action" type="button" onClick={() => setViewerState('approved')}>개발 미리보기: 거래 조건 보기</button>}
    </section>
  </main>
}
