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

const brandKoreanName = '\uADC0\uC871 \uD53C\uC5B4\uC2F1'
const brandLanguageLabel = '\uD53C\uC5B4\uC2F1 / Piercing / \u30D4\u30A2\u30B9 / \u51B2\u5B54'
const searchPlaceholder = '\uD53C\uC5B4\uC2F1, \uC7AC\uC9C8, \uC2A4\uD0C0\uC77C\uC744 \uAC80\uC0C9\uD574\uBCF4\uC138\uC694'

export function StoreShell() {
  const navigate = useNavigate()
  const { buyerAccess, inquiryItems, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-main">
        <Link className="brand" to="/" aria-label="Noblesse Piercing home">
          <img className="brand-logo" src={noblesseLogo} alt="Noblesse Piercing logo" width="48" height="48" />
          <span className="brand-korean">{brandKoreanName}</span>
        </Link>
        <div className="brand-center">
          <strong>Noblesse Piercing</strong>
          <small>{brandLanguageLabel}</small>
        </div>
        <nav className="header-actions" aria-label="Buyer navigation">
          {isGuest && <>
            <NavLink to="/login"><LogIn size={18} />Login</NavLink>
            <NavLink to="/register"><UserRound size={18} />Request Access</NavLink>
            <NavLink to="/products"><Search size={18} />Product List</NavLink>
          </>}
          {isPending && <>
            <NavLink to="/approval-pending"><Clock3 size={18} />Approval Pending</NavLink>
            <NavLink to="/account"><UserRound size={18} />Account</NavLink>
            <NavLink to="/products"><Search size={18} />Product List</NavLink>
          </>}
          {isApproved && <>
            <NavLink className="inquiry-link" to="/inquiry-list"><ListPlus size={18} />Inquiry List<b>{inquiryItems.length}</b></NavLink>
            <NavLink to="/my-inquiries"><FileText size={18} />My Inquiries</NavLink>
            <NavLink to="/account"><UserRound size={18} />Account</NavLink>
          </>}
          {isAdmin && <>
            <NavLink to="/account"><ShieldCheck size={18} />Admin Preview</NavLink>
            <NavLink to="/account"><UserRound size={18} />Account</NavLink>
            <NavLink to="/products"><Search size={18} />Product List</NavLink>
          </>}
        </nav>
      </div>
      <div className="header-lower">
        <button className="header-search" type="button" onClick={() => navigate('/products')}>
          <span>{searchPlaceholder}</span>
          <Search size={19} />
        </button>
        <nav className="header-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/products">Product List</NavLink>
          {buyerAccess.canUseInquiryList && <NavLink to="/inquiry-list">Inquiry List</NavLink>}
          {buyerAccess.canRequestQuote && <NavLink to="/request-quote">Request Quote</NavLink>}
          {buyerAccess.canViewMyInquiries && <NavLink to="/my-inquiries">My Inquiries</NavLink>}
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
