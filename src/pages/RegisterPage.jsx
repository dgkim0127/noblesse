import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

const fields = [
  ['Email', 'email', 'email', 'email'],
  ['Password', 'password', 'password', 'new-password'],
  ['Company Name', 'companyName', 'text', 'organization'],
  ['Contact Name', 'contactName', 'text', 'name'],
  ['Country', 'country', 'text', 'country-name'],
  ['Preferred Language', 'preferredLanguage', 'text', 'language'],
  ['Phone', 'phone', 'tel', 'tel'],
  ['Messenger Type', 'messengerType', 'text', 'off'],
  ['Messenger ID', 'messengerId', 'text', 'off'],
  ['Sales Channel', 'salesChannel', 'text', 'off'],
  ['Business Number', 'businessNumber', 'text', 'off'],
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { authError, authLoading, registerBuyer } = useCommerce()
  const [formError, setFormError] = useState('')

  const submitRequest = async (event) => {
    event.preventDefault()
    setFormError('')
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      await registerBuyer(formData)
      navigate('/approval-pending')
    } catch (error) {
      setFormError(error.message)
    }
  }

  return <main className="content auth-page"><section className="account-panel auth-panel wide"><FileText size={25} /><p className="eyebrow">BUYER ACCESS</p><h1>Request access to Approved Buyer Price</h1><p>Submit your buyer information for Noblesse review. New Buyer profiles start as pending until Noblesse confirms company information and trade conditions.</p><form className="auth-form register-grid" onSubmit={submitRequest}>{fields.map(([label, name, type, autoComplete]) => <label key={name}>{label}<input autoComplete={autoComplete} name={name} placeholder={label} required={name === 'email' || name === 'password' || name === 'companyName' || name === 'contactName'} type={type} /></label>)}<label className="full-span">Request Memo<textarea name="requestMemo" placeholder="Tell us about your store, market, or preferred piercing line." /></label>{(formError || authError) && <p className="form-error full-span">{formError || authError}</p>}<button className="primary-action full-span" disabled={authLoading} type="submit">{authLoading ? 'Submitting...' : 'Request Buyer Access'}</button></form></section></main>
}
