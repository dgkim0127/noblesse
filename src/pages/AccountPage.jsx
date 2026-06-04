import { BadgeCheck, Clock3, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'

export function AccountPage() {
  const { buyer, viewerState } = useCommerce()
  const isGuest = viewerState === 'guest'
  const isPending = viewerState === 'pending'
  const isApprovedBuyer = viewerState === 'approved'
  const isAdmin = viewerState === 'admin'
  const minimumRequestAmount = isGuest || isPending ? 'Available after approval' : formatMoney(buyer.minOrderAmount, buyer.currency)
  const profileRows = [
    ['Current state', viewerState],
    ['Company', buyer.companyName || 'Not registered'],
    ['Contact', buyer.contactName || 'Guest Buyer'],
    ['Country', buyer.country || 'Not selected'],
    ['Preferred language', buyer.preferredLanguage || 'Not selected'],
    ['Assigned market', buyer.assignedMarket || 'Not assigned'],
    ['Currency', buyer.currency || 'Not assigned'],
    ['Role', buyer.role || 'No buyer profile'],
    ['Status', buyer.status || 'Not signed in'],
    ['Discount rate', `${buyer.discountRate ?? 0}%`],
    ['Minimum request amount', minimumRequestAmount],
  ]

  return <main className="content"><div className="page-title"><div><p>BUYER PROFILE</p><h1>Buyer access</h1></div><span>{viewerState}</span></div><section className="account-panel account-overview">{isGuest && <><UserRound size={25} /><h2>Guest buyer</h2><p>Browse the catalog, then request Buyer Approval to view Approved Buyer Price and send Request Quote.</p><div className="account-actions"><Link className="primary-action" to="/register">Request Access</Link><Link className="secondary-action" to="/login">Login</Link></div></>}{isPending && <><Clock3 size={25} /><h2>Buyer Approval is pending</h2><p>{buyer.companyName} is waiting for Noblesse review. Approved Buyer Price, MOQ details, Inquiry List, and Request Quote will unlock after approval.</p><div className="account-actions"><Link className="primary-action" to="/approval-pending">Approval Pending</Link><Link className="secondary-action" to="/products">Back to Catalog</Link></div></>}{isApprovedBuyer && <><BadgeCheck size={25} /><h2>Approved Buyer</h2><p>{buyer.companyName} can view {buyer.assignedMarket} market prices and create Inquiry List selections.</p><strong>{buyer.discountRate}% buyer discount / minimum request {formatMoney(buyer.minOrderAmount, buyer.currency)}</strong><div className="account-actions"><Link className="primary-action" to="/inquiry-list">Inquiry List</Link><Link className="secondary-action" to="/my-inquiries">My Inquiries</Link></div></>}{isAdmin && <><ShieldCheck size={25} /><h2>Admin preview</h2><p>This mock state confirms admin identity fields. Admin management screens are intentionally scaffolded for a later phase.</p><div className="account-actions"><Link className="primary-action" to="/products">Preview Catalog</Link></div></>}</section><section className="account-panel"><h2>Buyer profile fields</h2><dl>{profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section></main>
}
