import { BadgeCheck, Clock3, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const approvalSteps = [
  '회사 정보 검토',
  '담당 지역 배정',
  '가격 보기 준비',
  '문의 기능 준비',
]

export function ApprovalPendingPage() {
  const { buyer, isApproved, isGuest, isPending, setViewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      {isApproved ? <BadgeCheck size={25} /> : isGuest ? <UserRound size={25} /> : <Clock3 size={25} />}
      <p className="eyebrow">회원 확인</p>
      <h1>{isApproved ? '이미 회원가를 볼 수 있는 계정입니다.' : isGuest ? '회원 신청을 진행해주세요' : '회원 확인 중입니다.'}</h1>
      {isPending && <p>제출한 회원 정보를 확인 중입니다. 확인 후 회원가와 견적 문의 기능을 사용할 수 있습니다.</p>}
      {isApproved && <p>{buyer.companyName} 계정은 이미 회원가, 문의 리스트, 견적 문의 기능을 사용할 수 있습니다.</p>}
      {isGuest && <p>회원 신청 후 확인이 완료되면 회원가와 문의 기능이 열립니다.</p>}
      <div className="approval-steps">
        {approvalSteps.map((step) => <span key={step}>{step}</span>)}
      </div>
      <div className="approval-note">
        <strong>Noblesse 문의</strong>
        <span>카탈로그 접근이 급한 경우 회사명과 지역 정보를 포함해 담당자에게 문의해주세요.</span>
      </div>
      <div className="account-actions">
        <Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>마이페이지로 이동</Link>
        <a className="secondary-action" href="mailto:contact@noblesse.example"><Mail size={15} />Noblesse 문의</a>
        {isApproved && <Link className="secondary-action" to={toLocalePath('/inquiry-list')}>문의 리스트</Link>}
        {isGuest && <Link className="secondary-action" to={toLocalePath('/register')}>회원 신청</Link>}
      </div>
      {!isApproved && <button className="text-action preview-action" type="button" onClick={() => setViewerState('approved')}>개발 미리보기: 회원가 보기</button>}
    </section>
  </main>
}
