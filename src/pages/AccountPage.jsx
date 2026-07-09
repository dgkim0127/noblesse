import { BadgeCheck, Clock3, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'

const featureLabels = [
  ['canViewProducts', '상품 탐색'],
  ['canViewPrices', '회원가 / 거래 조건'],
  ['canUseInquiryList', '견적 리스트'],
  ['canRequestQuote', '견적 요청'],
  ['canViewMyInquiries', '견적 내역'],
]

function FeatureList({ buyerAccess }) {
  return <ul className="buyer-feature-list">
    {featureLabels.map(([key, label]) => <li className={buyerAccess[key] ? 'enabled' : 'disabled'} key={key}><span>{buyerAccess[key] ? '사용 가능' : '제한'}</span>{label}</li>)}
  </ul>
}

export function AccountPage() {
  const navigate = useNavigate()
  const { buyer, buyerAccess, isAdmin, isApproved, isGuest, isPending, signOut, viewerState } = useCommerce()
  const { toLocalePath } = useLocalePath()

  if (isAdmin) return <Navigate replace to={toLocalePath('/admin')} />

  const minimumRequestAmount = !isApproved ? '승인 후 확인 가능' : formatMoney(buyer.minOrderAmount, buyer.currency)
  const profileRows = [
    ['현재 접근 상태', viewerState],
    ['회사명', buyer.companyName || '등록 전'],
    ['담당자명', buyer.contactName || '게스트'],
    ['국가', buyer.country || '선택 전'],
    ['선호 언어', buyer.preferredLanguage || '선택 전'],
    ['담당 시장', buyer.assignedMarket || '배정 전'],
    ['통화', buyer.currency || '배정 전'],
    ['역할', buyer.role || '등록된 역할 없음'],
    ['거래처 상태', buyer.status || '등록된 상태 없음'],
    ['할인율', `${buyer.discountRate ?? 0}%`],
    ['견적 기준 금액', minimumRequestAmount],
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate(toLocalePath('/products'))
  }

  return <main className="content">
    <div className="page-title"><div><p>거래처 프로필</p><h1>거래처 확인 상태</h1></div><span>{viewerState}</span></div>
    <section className="account-panel account-overview">
      {isGuest && <div className="account-status-card"><UserRound size={25} /><h2>비회원으로 둘러보는 중입니다.</h2><p>상품 카탈로그는 볼 수 있지만 가격과 견적 기능은 거래처 승인 후 열립니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/register')}>거래처 신청</Link><Link className="secondary-action" to={toLocalePath('/login')}>로그인</Link><Link className="secondary-action" to={toLocalePath('/products')}>상품 목록 보기</Link></div></div>}
      {isPending && <div className="account-status-card"><Clock3 size={25} /><h2>거래처 정보를 확인 중입니다.</h2><p>{buyer.companyName} 정보를 담당자가 검토하고 있습니다. 승인 후 가격, 거래 조건, 견적 리스트 기능을 안내드립니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link><Link className="secondary-action" to={toLocalePath('/approval-pending')}>확인 상태 보기</Link><Link className="secondary-action" to={toLocalePath('/register')}>거래처 신청 수정</Link><a className="secondary-action" href="mailto:dgkim0127@gmail.com"><Mail size={15} />이메일 문의</a></div></div>}
      {['blocked', 'rejected', 'suspended'].includes(viewerState) && <div className="account-status-card"><Clock3 size={25} /><h2>거래처 이용 상태 확인이 필요합니다.</h2><p>현재 계정 또는 거래처 상태로는 가격 확인과 견적 요청 기능을 사용할 수 없습니다. 담당자 확인 후 다시 안내드립니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록 보기</Link><Link className="secondary-action" to={toLocalePath('/register')}>거래처 신청 수정</Link><a className="secondary-action" href="mailto:dgkim0127@gmail.com"><Mail size={15} />이메일 문의</a></div></div>}
      {isApproved && <div className="account-status-card"><BadgeCheck size={25} /><h2>거래 조건 안내가 가능한 계정입니다.</h2><p>{buyer.companyName}은 {buyer.assignedMarket} 지역 거래 조건과 견적 리스트 / 견적 요청 기능을 사용할 수 있습니다. 견적 요청은 최종 주문이 아닙니다.</p><strong>{buyer.discountRate}% 거래 조건 / 견적 기준 금액 {formatMoney(buyer.minOrderAmount, buyer.currency)}</strong><div className="account-actions"><Link className="primary-action" to={toLocalePath('/products')}>상품 목록</Link><Link className="secondary-action" to={toLocalePath('/inquiry-list')}>견적 리스트</Link><Link className="secondary-action" to={toLocalePath('/my-inquiries')}>견적 내역</Link></div></div>}
      {isAdmin && <div className="account-status-card"><ShieldCheck size={25} /><h2>관리자 계정</h2><p>관리자 권한은 서버에서 확인되며 상품, 거래처, 문의와 견적 관리 화면을 사용할 수 있습니다.</p><div className="account-actions"><Link className="primary-action" to={toLocalePath('/admin')}>관리자 화면</Link><Link className="secondary-action" to={toLocalePath('/products')}>상품 목록</Link><Link className="secondary-action" to={toLocalePath('/my-inquiries')}>견적 내역</Link></div></div>}
    </section>
    <section className="account-panel">
      <h2>사용 가능 기능</h2>
      <FeatureList buyerAccess={buyerAccess} />
    </section>
    <section className="account-panel">
      <h2>거래처 프로필 필드</h2>
      <dl>{profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <button className="text-action logout-action" type="button" onClick={handleSignOut}><LogOut size={15} />로그아웃</button>
    </section>
  </main>
}
