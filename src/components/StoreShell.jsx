import { FileText, Heart, ListPlus, Search, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function StoreShell() {
  const navigate = useNavigate()
  const { inquiryItems, isApproved, setViewerState, viewerState } = useCommerce()
  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to="/"><span className="brand-mark">N</span><span><strong>NOBLESSE</strong><small>PIERCING COLLECTION</small></span></Link>
        <button className="header-search" type="button" onClick={() => navigate('/products')}><Search size={19} /><span>Search product name or code</span></button>
        <nav className="header-actions" aria-label="Buyer navigation">
          <NavLink to="/my-inquiries"><FileText size={18} />My Inquiries</NavLink>
          <NavLink to="/account"><UserRound size={18} />{isApproved ? 'Approved Buyer' : 'Buyer Approval'}</NavLink>
          <NavLink className="inquiry-link" to="/inquiry-list"><ListPlus size={18} />Inquiry List<b>{inquiryItems.length}</b></NavLink>
        </nav>
      </div>
      <div className="preview-bar"><span>Mock buyer state</span>{['guest', 'pending', 'approved'].map((state) => <button className={viewerState === state ? 'active' : ''} key={state} type="button" onClick={() => setViewerState(state)}>{state}</button>)}</div>
    </header>
    <Outlet />
    <footer className="site-footer"><strong>NOBLESSE</strong><span>Premium piercing catalog for global buyers</span><Heart size={15} /></footer>
  </div>
}
