import { BadgeCheck, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon } from '../utils/commerce'

export function AccountPage() {
  const { activeBuyer, isApprovedMember } = useCommerce()
  if (!isApprovedMember) return <main className="store-main"><div className="locked-page"><LogIn size={26} /><h1>로그인 후 거래처 정보를 확인할 수 있습니다.</h1><Link to="/login">로그인</Link></div></main>
  return <main className="store-main"><div className="page-heading"><div><p>MEMBER ACCOUNT</p><h1>거래처 정보</h1></div></div><section className="account-card"><BadgeCheck size={26} /><h2>{activeBuyer.name}</h2><p>담당자 {activeBuyer.contactName}</p><p>{activeBuyer.grade}등급 · 승인 회원</p><strong>할인율 {activeBuyer.discount}% · 최소 주문 {formatWon(activeBuyer.minOrder)}</strong></section></main>
}
