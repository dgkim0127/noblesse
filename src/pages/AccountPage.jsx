import { BadgeCheck, Clock3, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

const featureLabels = [
  ['canViewProducts', '상품 탐색'],
  ['canViewPrices', '회원가'],
  ['canUseInquiryList', '문의 리스트'],
  ['canRequestQuote', '견적 문의'],
  ['canViewMyInquiries', '견적 내역'],
]

function FeatureList({ buyerAccess }) {
  return <ul className="buyer-feature-list">
    {featureLabels.map(([key, label]) => <li className={buyerAccess[key] ? 'enabled' : 'disabled'} key={key}><span>{buyerAccess[key] ? '사용 가능' : '잠김'}</span>{label}</li>)}
  </ul>
}

export function AccountPage() {
  const navigate = useNavigate()
  const { buyer, buyerAccess, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const minimumRequestAmount = isGuest || isPending ? '확인 후 볼 수 있음' : formatMoney(buyer.minOrderAmount, buyer.currency)
  const profileRows = [
    ['현재 미리보기 상태', viewerState],
    ['회사명', buyer.companyName || '등록 전'],
    ['담당자명', buyer.contactName || '게스트 회원'],
    ['국가', buyer.country || '선택 전'],
    ['선호 언어', buyer.preferredLanguage || '선택 전'],
    ['담당 지역', buyer.assignedMarket || '배정 전'],
    ['통화', buyer.currency || '배정 전'],
    ['역할', buyer.role || '저장된 역할 없음'],
    ['회원 상태', buyer.status || '저장된 상태 없음'],
    ['할인율', `${buyer.discountRate ?? 0}%`],
    ['최소 문의 금액', minimumRequestAmount],
  ]

  const logoutMock = () => {
    setViewerState('guest')
    navigate(toLocalePath('/products'))
  }

  return <main className="content">
    <div className="page-title"><div><p>회원 프로필</p><h1>회원 확인 상태</h1></div><span>{viewerState}</span></div>
    <section className="account-panel account-overview">
      {isGuest && <div className="account-status-card"><UserRound size={25} /><h2>비회원으로 둘러보는 중입니다.</h2><p>가격, 문의 리스트, 견적 문의 기능은 회원 확인 후 사용할 수 있습니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/register')}>회원 신청</Link><Link className="secondary-action" to={toLocalePath('/login')}>로그인</Link><Link className="secondary-action" to={toLocalePath('/products')}>상품 목록 보기</Link></div></div>}
      {isPending && <div className="account-status-card"><Clock3 size={25} /><h2>회원 확인 중입니다.</h2><p>{buyer.companyName} 정보를 Noblesse가 확인 중입니다. 가격과 문의 기능은 확인 후 열립니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link><Link className="secondary-action" to={toLocalePath('/approval-pending')}>확인 상태 보기</Link><a className="secondary-action" href="mailto:contact@noblesse.example">Noblesse 문의</a></div></div>}
      {isApproved && <div className="account-status-card"><BadgeCheck size={25} /><h2>회원가 이용 가능</h2><p>{buyer.companyName}은 {buyer.assignedMarket} 지역 가격과 문의 리스트 / 견적 문의 기능을 사용할 수 있습니다.</p><strong>{buyer.discountRate}% 회원 할인 / 최소 문의 금액 {formatMoney(buyer.minOrderAmount, buyer.currency)}</strong><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록</Link><Link className="secondary-action" to={toLocalePath('/inquiry-list')}>문의 리스트</Link><Link className="secondary-action" to={toLocalePath('/my-inquiries')}>견적 내역</Link></div></div>}
      {isAdmin && <div className="account-status-card"><ShieldCheck size={25} /><h2>관리자 미리보기</h2><p>관리자 화면은 이후 단계에서 구현합니다. 현재는 고객 화면과 권한 상태만 확인합니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록</Link><Link className="secondary-action" to={toLocalePath('/my-inquiries')}>견적 내역</Link></div></div>}
    </section>
    <section className="account-panel">
      <h2>사용 가능 기능</h2>
      <FeatureList buyerAccess={buyerAccess} />
    </section>
    <section className="account-panel">
      <h2>회원 프로필 필드</h2>
      <dl>{profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <button className="text-action logout-action" type="button" onClick={logoutMock}><LogOut size={15} />목업 로그아웃</button>
    </section>
  </main>
}
