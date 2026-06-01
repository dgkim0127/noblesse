import { Menu, Search, ShoppingBag, ShoppingCart, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function StoreShell() {
  const navigate = useNavigate()
  const { cartQuantity, isApprovedMember, setViewerMode, viewerMode } = useCommerce()

  return (
    <div className="shop-shell">
      <header className="shop-header">
        <div className="shop-header-main">
          <Link className="brand-lockup" to="/">
            <div className="brand-mark">貴</div>
            <div>
              <strong>귀족</strong>
              <span>KIZOKU Jewelry</span>
            </div>
          </Link>
          <button className="shell-search" type="button" onClick={() => navigate('/products')}>
            <Search size={20} />
            <span>바벨, 라블렛, 링, 체인 주얼리를 검색해보세요</span>
          </button>
          <nav className="shop-actions" aria-label="쇼핑 메뉴">
            <NavLink to="/orders">
              <ShoppingBag size={18} />
              내 주문
            </NavLink>
            <NavLink to="/account">
              <UserRound size={18} />
              {isApprovedMember ? '승인 회원' : '로그인'}
            </NavLink>
            <NavLink className="cart-pill" to="/cart">
              <ShoppingCart size={18} />
              장바구니
              <span>{cartQuantity}</span>
            </NavLink>
          </nav>
          <button className="mobile-menu" type="button" aria-label="상품 목록 열기" onClick={() => navigate('/products')}>
            <Menu size={20} />
          </button>
        </div>
        <div className="member-preview-bar">
          <span>프로토타입 보기</span>
          <button className={viewerMode === 'member' ? 'active' : ''} type="button" onClick={() => setViewerMode('member')}>승인 회원</button>
          <button className={viewerMode === 'guest' ? 'active' : ''} type="button" onClick={() => setViewerMode('guest')}>비회원</button>
          <NavLink to="/admin">관리자 화면</NavLink>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
