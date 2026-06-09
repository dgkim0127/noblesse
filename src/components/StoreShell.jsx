import { Clock3, FileText, Heart, ListPlus, LogIn, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import noblesseLogo from '../assets/noblesse-logo.png'
import { useCommerce } from '../commerce/commerceStore'

const viewerLabels = {
  guest: 'Guest Preview',
  pending: 'Approval Pending',
  approved: 'Approved Buyer / JP Market',
  admin: 'Admin Preview',
}

export function StoreShell() {
  const navigate = useNavigate()
  const { inquiryItems, isApproved, setViewerState, viewerState } = useCommerce()
  const isGuest = viewerState === 'guest'
  const isPending = viewerState === 'pending'
  const isAdmin = viewerState === 'admin'

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to="/" aria-label="Noblesse Piercing home">
          <img className="brand-logo" src={noblesseLogo} alt="Noblesse Piercing logo" width="48" height="48" />
          <span className="brand-korean">귀족 피어싱</span>
        </Link>
        <div className="brand-center">
          <strong>Noblesse Piercing</strong>
          <small>피어싱 / Piercing / ピアス / 冲孔</small>
        </div>
        <nav className="header-actions" aria-label="Buyer navigation">
          {isGuest && <>
            <NavLink to="/login"><LogIn size={18} />Login</NavLink>
            <NavLink to="/register"><UserRound size={18} />Request Access</NavLink>
          </>}
          {isPending && <NavLink to="/approval-pending"><Clock3 size={18} />Approval Pending</NavLink>}
          {isApproved && <>
            <NavLink to="/my-inquiries"><FileText size={18} />My Inquiries</NavLink>
            <NavLink to="/account"><UserRound size={18} />My Page</NavLink>
            <NavLink className="inquiry-link" to="/inquiry-list"><ListPlus size={18} />Inquiry List<b>{inquiryItems.length}</b></NavLink>
          </>}
          {isAdmin && <NavLink to="/account"><ShieldCheck size={18} />Admin Preview</NavLink>}
        </nav>
      </div>
      <div className="header-lower">
        <button className="header-search" type="button" onClick={() => navigate('/products')}>
          <span>피어싱, 재질, 스타일을 검색해보세요</span>
          <Search size={19} />
        </button>
        <nav className="header-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/products">Product List</NavLink>
          <NavLink to="/inquiry-list">Inquiry List</NavLink>
          <NavLink to="/request-quote">Request Quote</NavLink>
          <NavLink to="/my-inquiries">My Inquiries</NavLink>
          <NavLink to="/account">Account</NavLink>
        </nav>
      </div>
      <div className="preview-bar">
        <span>{viewerLabels[viewerState]}</span>
        {['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{viewerLabels[state]}</button>)}
      </div>
    </header>
    <Outlet />
    <footer className="site-footer"><strong>Noblesse Piercing</strong><span>Premium piercing catalog for global buyers</span><Heart size={15} /></footer>
  </div>
}
