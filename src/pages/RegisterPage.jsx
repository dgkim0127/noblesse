import { FileText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

const approvalHelper = '\uAC70\uB798\uCC98 \uC2B9\uC778\uC774 \uC644\uB8CC\uB418\uBA74 \uD68C\uC6D0\uAC00, MOQ, Inquiry List, Request Quote \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'

const buyerFields = [
  ['Email', 'email', 'email'],
  ['Password', 'password', 'password'],
  ['Company Name', 'companyName', 'text'],
  ['Contact Name', 'contactName', 'text'],
  ['Country', 'country', 'text'],
  ['Preferred Language', 'preferredLanguage', 'text'],
]

const contactFields = [
  ['Phone', 'phone', 'tel'],
  ['Messenger Type', 'messengerType', 'text'],
  ['Messenger ID', 'messengerId', 'text'],
]

const businessFields = [
  ['Sales Channel', 'salesChannel', 'text'],
  ['Business Number', 'businessNumber', 'text'],
]

function FieldGroup({ title, children }) {
  return <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="register-grid">{children}</div>
  </fieldset>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()

  const submitRequest = (event) => {
    event.preventDefault()
    setViewerState('pending')
    navigate('/approval-pending')
  }

  return <main className="content auth-page">
    <section className="account-panel auth-panel wide">
      <FileText size={25} />
      <p className="eyebrow">BUYER ACCESS REQUEST</p>
      <h1>Request access to Approved Buyer Price</h1>
      <p>Submitting this form does not immediately unlock buyer prices. Noblesse will review your buyer profile before approval.</p>
      <p className="approval-helper">{approvalHelper}</p>
      <form className="auth-form" onSubmit={submitRequest}>
        <FieldGroup title="Buyer Information">
          {buyerFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <FieldGroup title="Contact Information">
          {contactFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <FieldGroup title="Business Information">
          {businessFields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}
        </FieldGroup>
        <fieldset className="form-section">
          <legend>Request Memo</legend>
          <label>Request Memo<textarea name="requestMemo" placeholder="Tell us about your store, market, or preferred piercing line." /></label>
        </fieldset>
        <div className="approval-note">
          <strong>Approval Notice</strong>
          <span>Buyer Approval is reviewed manually. Price access and Inquiry features remain locked until approval.</span>
        </div>
        <div className="account-actions">
          <button className="primary-action" type="submit">Request Buyer Access</button>
          <Link className="secondary-action" to="/login">Back to Login</Link>
        </div>
      </form>
    </section>
  </main>
}
