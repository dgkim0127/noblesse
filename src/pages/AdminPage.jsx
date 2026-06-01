import { BadgeCheck, Boxes, Image, LayoutDashboard, PackageCheck, Tags, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatWon } from '../utils/commerce'

const sections = [
  ['/admin/orders', '주문 관리', PackageCheck],
  ['/admin/products', '상품 관리', Boxes],
  ['/admin/members', '회원 관리', Users],
  ['/admin/categories', '카테고리', Tags],
  ['/admin/banners', '배너 관리', Image],
]

export function AdminPage() {
  const { pathname } = useLocation()
  const { orders, products } = useCommerce()
  const current = sections.find(([path]) => pathname.startsWith(path))?.[1] ?? '운영 대시보드'
  return <div className="admin-shell"><aside><Link className="admin-brand" to="/"><div className="brand-mark">貴</div><strong>귀족 Admin</strong></Link><nav><Link to="/admin"><LayoutDashboard size={17} />대시보드</Link>{sections.map(([path, label, Icon]) => <Link className={pathname.startsWith(path) ? 'active' : ''} key={path} to={path}><Icon size={17} />{label}</Link>)}</nav><Link className="back-store" to="/">구매자몰 보기</Link></aside><main><header><div><p>KIZOKU OPERATIONS</p><h1>{current}</h1></div><span><BadgeCheck size={16} />관리자 전용</span></header>{pathname === '/admin' || pathname === '/admin/' ? <div className="admin-dashboard"><article><span>주문 요청</span><strong>{orders.length}</strong></article><article><span>등록 상품</span><strong>{products.length}</strong></article><article><span>승인 대기 회원</span><strong>1</strong></article></div> : <AdminTable type={pathname.split('/').pop()} orders={orders} products={products} />}</main></div>
}

function AdminTable({ type, orders, products }) {
  if (type === 'orders') return <section className="admin-panel"><h2>주문 요청 목록</h2>{orders.map((order) => <div className="admin-row" key={order.id}><strong>{order.orderNumber}</strong><span>{order.status}</span><em>{formatWon(order.finalAmount)}</em><button type="button">상세 확인</button></div>)}</section>
  if (type === 'products') return <section className="admin-panel"><h2>상품 목록</h2>{products.map((product) => <div className="admin-row" key={product.id}><strong>{product.ko}</strong><span>{product.category}</span><em>{product.status}</em><button type="button">수정</button></div>)}</section>
  if (type === 'members') return <section className="admin-panel"><h2>거래처 승인</h2><div className="admin-row"><strong>Tokyo Piercing Lab</strong><span>사업자 증빙 제출 완료</span><em>승인 대기</em><button type="button">검토</button></div></section>
  return <section className="admin-panel"><h2>{type === 'banners' ? '홈 배너와 추천 섹션' : '카테고리 노출 순서'}</h2><p>관리자가 노출 순서와 고정 상품을 편집하는 운영 영역입니다.</p><button type="button">새 항목 추가</button></section>
}
