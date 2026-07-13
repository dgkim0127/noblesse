import { Clock3, FileText, Heart, ListPlus, LogIn, PackagePlus, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function StoreShell() {
  const navigate = useNavigate()
  const { inquiryItems, isAdmin, isApproved, isSupabaseConfigured, logout, setViewerState, viewerState } = useCommerce()
  const isGuest = viewerState === 'guest'
  const isPending = viewerState === 'pending'
  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to="/"><span className="brand-mark">N</span><span><strong>NOBLESSE</strong><small>Global piercing quote catalog</small></span></Link>
        <button className="header-search" type="button" onClick={() => navigate('/products')}><Search size={19} /><span>Search piercing, material, or style</span></button>
        <nav className="header-actions" aria-label="Buyer navigation">
          {isGuest && <><NavLink to="/login"><LogIn size={18} />Login</NavLink><NavLink to="/register"><UserRound size={18} />Request Access</NavLink></>}
          {isPending && <NavLink to="/approval-pending"><Clock3 size={18} />Approval Pending</NavLink>}
          {isApproved && <><NavLink to="/my-inquiries"><FileText size={18} />My Quotes</NavLink><NavLink to="/account"><UserRound size={18} />My Page</NavLink><NavLink className="inquiry-link" to="/inquiry-list"><ListPlus size={18} />Inquiry List<b>{inquiryItems.length}</b></NavLink></>}
          {isAdmin && <><NavLink to="/admin/catalog"><PackagePlus size={18} />Catalog Admin</NavLink><NavLink to="/admin/quotes"><ShieldCheck size={18} />Quote Admin</NavLink></>}
          {isSupabaseConfigured && !isGuest && <button className="header-signout" type="button" onClick={logout}>Sign out</button>}
        </nav>
      </div>
      {!isSupabaseConfigured && <div className="preview-bar"><span>Demo role preview</span>{['guest', 'pending', 'approved', 'admin'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{state}</button>)}</div>}
    </header>
    <Outlet />
    <footer className="site-footer"><strong>NOBLESSE</strong><span>Premium piercing catalog for global buyers</span><Heart size={15} /></footer>
  </div>
}
