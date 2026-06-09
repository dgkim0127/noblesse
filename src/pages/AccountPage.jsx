import { BadgeCheck, Clock3, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

const featureLabels = [
  ['canViewProducts', 'Product browsing'],
  ['canViewPrices', 'Approved Buyer Price'],
  ['canUseInquiryList', 'Inquiry List'],
  ['canRequestQuote', 'Request Quote'],
  ['canViewMyInquiries', 'My Inquiries'],
]

function FeatureList({ buyerAccess }) {
  return <ul className="buyer-feature-list">
    {featureLabels.map(([key, label]) => <li className={buyerAccess[key] ? 'enabled' : 'disabled'} key={key}><span>{buyerAccess[key] ? 'Available' : 'Locked'}</span>{label}</li>)}
  </ul>
}

export function AccountPage() {
  const navigate = useNavigate()
  const { buyer, buyerAccess, isAdmin, isApproved, isGuest, isPending, setViewerState, viewerState } = useCommerce()
  const minimumRequestAmount = isGuest || isPending ? 'Available after approval' : formatMoney(buyer.minOrderAmount, buyer.currency)
  const profileRows = [
    ['Current viewerState', viewerState],
    ['Company Name', buyer.companyName || 'Not registered'],
    ['Contact Name', buyer.contactName || 'Guest Buyer'],
    ['Country', buyer.country || 'Not selected'],
    ['Preferred Language', buyer.preferredLanguage || 'Not selected'],
    ['Assigned Market', buyer.assignedMarket || 'Not assigned'],
    ['Currency', buyer.currency || 'Not assigned'],
    ['Role', buyer.role || 'No persisted role'],
    ['Status', buyer.status || 'No persisted status'],
    ['Discount Rate', `${buyer.discountRate ?? 0}%`],
    ['Minimum Request Quote Amount', minimumRequestAmount],
  ]

  const logoutMock = () => {
    setViewerState('guest')
    navigate('/products')
  }

  return <main className="content">
    <div className="page-title"><div><p>BUYER PROFILE</p><h1>Buyer access</h1></div><span>{viewerState}</span></div>
    <section className="account-panel account-overview">
      {isGuest && <div className="account-status-card"><UserRound size={25} /><h2>You are browsing as Guest.</h2><p>Prices, Inquiry List, and Request Quote are locked until Buyer Approval.</p><div className="account-actions"><Link className="primary-action" to="/register">Request Buyer Access</Link><Link className="secondary-action" to="/login">Login</Link><Link className="secondary-action" to="/products">Browse Product List</Link></div></div>}
      {isPending && <div className="account-status-card"><Clock3 size={25} /><h2>Buyer Approval Pending</h2><p>{buyer.companyName} is waiting for Noblesse review. Prices, Inquiry List, and Request Quote remain locked until approval.</p><div className="account-actions"><Link className="primary-action" to="/products">Browse Product List</Link><Link className="secondary-action" to="/approval-pending">Approval Pending</Link><a className="secondary-action" href="mailto:contact@noblesse.example">Contact Noblesse</a></div></div>}
      {isApproved && <div className="account-status-card"><BadgeCheck size={25} /><h2>Approved Buyer</h2><p>{buyer.companyName} can view {buyer.assignedMarket} market prices and use Inquiry List / Request Quote.</p><strong>{buyer.discountRate}% buyer discount / minimum request {formatMoney(buyer.minOrderAmount, buyer.currency)}</strong><div className="account-actions"><Link className="primary-action" to="/products">Product List</Link><Link className="secondary-action" to="/inquiry-list">Inquiry List</Link><Link className="secondary-action" to="/my-inquiries">My Inquiries</Link></div></div>}
      {isAdmin && <div className="account-status-card"><ShieldCheck size={25} /><h2>Admin Preview</h2><p>Admin dashboard will be implemented in a later phase.</p><div className="account-actions"><Link className="primary-action" to="/products">Product List</Link><Link className="secondary-action" to="/my-inquiries">My Inquiries</Link></div></div>}
    </section>
    <section className="account-panel">
      <h2>Available features</h2>
      <FeatureList buyerAccess={buyerAccess} />
    </section>
    <section className="account-panel">
      <h2>Buyer profile fields</h2>
      <dl>{profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <button className="text-action logout-action" type="button" onClick={logoutMock}><LogOut size={15} />Logout mock</button>
    </section>
  </main>
}
