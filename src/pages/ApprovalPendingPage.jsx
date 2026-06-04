import { Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function ApprovalPendingPage() {
  const { buyer } = useCommerce()

  return <main className="content auth-page"><section className="account-panel auth-panel"><Clock3 size={25} /><p className="eyebrow">BUYER APPROVAL</p><h1>Buyer Approval is pending</h1><p>{buyer.companyName || 'Your buyer profile'} is being reviewed by Noblesse. Approved Buyer Price, MOQ details, Inquiry List, and Request Quote become available after approval.</p><div className="approval-note"><strong>Contact Noblesse</strong><span>For urgent catalog access, contact your Noblesse manager with your company name and market.</span></div><Link className="primary-action" to="/products">Back to Catalog</Link></section></main>
}
