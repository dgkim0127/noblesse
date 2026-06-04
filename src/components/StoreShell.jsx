import { Clock3, FileText, Heart, ListPlus, LogIn, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function StoreShell() {
  const navigate = useNavigate()
  const { inquiryItems, isApproved, setViewerState, viewerState } = useCommerce()
  const isGuest = viewerState === 'guest'
  const isPending = viewerState === 'pending'
  const isAdmin = viewerState === 'admin'
  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to="/"><span className="brand-mark">N</span><span><strong>NOBLESSE</strong><small>피어싱 · Piercing · ピアス · 冲孔</small></span></Link>
        <button className="header-search" type="button" onClick={() => navigate('/products')}><Search size={19} /><span>피어싱, 재질, 스타일을 검색해보세요</span></button>
        <nav className="header-actions" aria-label="Buyer navigation">
          {isGuest && <><NavLink to="/login"><LogIn size={18} />Login</NavLink><NavLink to="/register"><UserRound size={18} />Request Access</NavLink></>}
          {isPending && <NavLink to="/approval-pending"><Clock3 size={18} />Approval Pending</NavLink>}
          {isApproved && <><NavLink to="/my-inquiries"><FileText size={18} />My Inquiries</NavLink><NavLink to="/account"><UserRound size={18} />My Page</NavLink><NavLink className="inquiry-link" to="/inquiry-list"><ListPlus size={18} />Inquiry List<b>{inquiryItems.length}</b></NavLink></>}
          {isAdmin && <NavLink to="/account"><ShieldCheck size={18} />Admin Preview</NavLink>}
        </nav>
      </div>
      <div className="preview-bar"><span>Mock buyer state</span>{['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{state}</button>)}</div>
    </header>
    <Outlet />
    <footer className="site-footer"><strong>NOBLESSE</strong><span>Premium piercing catalog for global buyers</span><Heart size={15} /></footer>
  </div>
}
