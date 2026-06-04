import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

const fields = [
  ['Email', 'email', 'email'],
  ['Password', 'password', 'password'],
  ['Company Name', 'companyName', 'text'],
  ['Contact Name', 'contactName', 'text'],
  ['Country', 'country', 'text'],
  ['Preferred Language', 'preferredLanguage', 'text'],
  ['Phone', 'phone', 'tel'],
  ['Messenger Type', 'messengerType', 'text'],
  ['Messenger ID', 'messengerId', 'text'],
  ['Sales Channel', 'salesChannel', 'text'],
  ['Business Number', 'businessNumber', 'text'],
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()

  const submitRequest = (event) => {
    event.preventDefault()
    setViewerState('pending')
    navigate('/approval-pending')
  }

  return <main className="content auth-page"><section className="account-panel auth-panel wide"><FileText size={25} /><p className="eyebrow">BUYER ACCESS</p><h1>Request access to Approved Buyer Price</h1><p>Submit your buyer information for Noblesse review. This mock form routes to the pending state before Firebase Auth is connected.</p><form className="auth-form register-grid" onSubmit={submitRequest}>{fields.map(([label, name, type]) => <label key={name}>{label}<input autoComplete="off" name={name} placeholder={label} type={type} /></label>)}<label className="full-span">Request Memo<textarea name="requestMemo" placeholder="Tell us about your store, market, or preferred piercing line." /></label><button className="primary-action full-span" type="submit">Request Buyer Access</button></form></section></main>
}
