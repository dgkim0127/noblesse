import { Clock3, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function ApprovalPendingPage() {
  const { buyer, viewerState } = useCommerce()
  const isBlocked = viewerState === 'blocked'

  return <main className="content auth-page"><section className="account-panel auth-panel">{isBlocked ? <UserRound size={25} /> : <Clock3 size={25} />}<p className="eyebrow">BUYER APPROVAL</p><h1>{isBlocked ? 'Account review required' : 'Buyer Approval is pending'}</h1><p>{isBlocked ? 'This Buyer profile needs an additional Noblesse review. Contact Noblesse with your company name, country, and assigned market.' : `${buyer.companyName || 'Your buyer profile'} is being reviewed by Noblesse. Admin reviews company information and trade conditions before approval.`}</p><div className="approval-note"><strong>Access after approval</strong><span>Approved Buyer Price, MOQ details, Inquiry List, and Request Quote become available after approval.</span></div><div className="approval-note"><strong>Contact Noblesse</strong><span>For urgent catalog access, contact your Noblesse manager with your company name and market.</span></div><div className="account-actions"><Link className="primary-action" to="/products">Back to Catalog</Link><Link className="secondary-action" to="/account">Account</Link></div></section></main>
}
