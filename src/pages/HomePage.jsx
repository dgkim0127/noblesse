import { BadgeCheck, CircleDot, Gem, PackageCheck, Sparkles, Tag, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { CatalogCard } from '../components/CatalogCard'

const shortcuts = [
  ['바벨', CircleDot], ['라블렛', Sparkles], ['링', CircleDot], ['체인', PackageCheck],
  ['신상품', Sparkles], ['베스트', TrendingUp], ['재입고', Gem], ['MOQ 특가', Tag],
]

export function HomePage() {
  const { activeBuyer, isApprovedMember, products } = useCommerce()
  const visible = products.filter((product) => product.status !== '숨김')

  return (
    <main className="store-main">
      <section className="retail-shortcuts">
        {shortcuts.map(([label, Icon]) => <Link key={label} to={`/products?category=${label}`}><span><Icon size={20} /></span>{label}</Link>)}
      </section>
      <section className="retail-hero">
        <div>
          <p>MEMBER-ONLY JEWELRY EDIT</p>
          <h1>작은 디테일로 완성하는<br />오늘의 피어싱 셀렉션</h1>
          <span>{isApprovedMember ? `${activeBuyer.name} · ${activeBuyer.grade}등급 ${activeBuyer.discount}% 할인 적용` : '승인 거래처 회원에게 회원가와 주문 조건을 제공합니다.'}</span>
        </div>
        <Link to={isApprovedMember ? '/products' : '/register'}>{isApprovedMember ? '상품 둘러보기' : '거래처 회원 신청'}</Link>
      </section>
      <section className="retail-section">
        <div className="retail-title"><div><TrendingUp size={19} /><h2>지금 많이 찾는 상품</h2></div><Link to="/products">전체보기</Link></div>
        <div className="retail-grid">{visible.map((product) => <CatalogCard key={product.id} product={product} />)}</div>
      </section>
      <section className="member-note">
        <BadgeCheck size={20} />
        <div><strong>승인 거래처 전용 혜택</strong><span>로그인 후 회원가, 옵션별 MOQ, 주문 가능 상태를 확인할 수 있습니다.</span></div>
      </section>
    </main>
  )
}
