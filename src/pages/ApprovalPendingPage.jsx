import { BadgeCheck, Clock3, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

const approvalSteps = [
  'Company review',
  'Market assignment',
  'Price access approval',
  'Inquiry access approval',
]

export function ApprovalPendingPage() {
  const { buyer, isApproved, isGuest, isPending, setViewerState } = useCommerce()

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      {isApproved ? <BadgeCheck size={25} /> : isGuest ? <UserRound size={25} /> : <Clock3 size={25} />}
      <p className="eyebrow">BUYER APPROVAL</p>
      <h1>{isApproved ? 'Your buyer account is already approved.' : isGuest ? 'Request Buyer Access' : 'Buyer Approval Pending'}</h1>
      {isPending && <p>Your buyer profile has been submitted. Noblesse will review your company information before enabling Approved Buyer Price and Request Quote access.</p>}
      {isApproved && <p>{buyer.companyName} can already view Approved Buyer Price and use Inquiry List / Request Quote.</p>}
      {isGuest && <p>Submit a Buyer Access Request to unlock approved pricing and Inquiry features after review.</p>}
      <div className="approval-steps">
        {approvalSteps.map((step) => <span key={step}>{step}</span>)}
      </div>
      <div className="approval-note">
        <strong>Contact Noblesse</strong>
        <span>For urgent catalog access, contact your Noblesse manager with your company name and market.</span>
      </div>
      <div className="account-actions">
        <Link className="primary-action" to="/products">Browse Product List</Link>
        <Link className="secondary-action" to="/account">Go to Account</Link>
        <a className="secondary-action" href="mailto:contact@noblesse.example"><Mail size={15} />Contact Noblesse</a>
        {isApproved && <Link className="secondary-action" to="/inquiry-list">Inquiry List</Link>}
        {isGuest && <Link className="secondary-action" to="/register">Register</Link>}
      </div>
      {!isApproved && <button className="text-action preview-action" type="button" onClick={() => setViewerState('approved')}>Dev Preview: Preview as Approved Buyer</button>}
    </section>
  </main>
}
