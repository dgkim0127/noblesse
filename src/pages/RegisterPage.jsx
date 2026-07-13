import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const { isSupabaseConfigured, register, setViewerState } = useCommerce()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      if (isSupabaseConfigured) await register(Object.fromEntries(form.entries()))
      else setViewerState('pending')
      navigate('/approval-pending')
    } catch (nextError) {
      setError(nextError.message || 'Unable to submit the buyer access request.')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="content auth-page"><section className="account-panel auth-panel wide"><FileText size={25} /><p className="eyebrow">BUYER ACCESS</p><h1>Request buyer approval</h1><p className="auth-subtitle">Create an account to request global catalog pricing and official quotations.</p><p>Approval is required before market prices and Request Quote are available. A quotation is not a final order or payment request.</p><form className="auth-form register-grid" onSubmit={submit}><fieldset className="form-section"><legend>Account</legend><label>Email<input autoComplete="email" name="email" required type="email" /></label><label>Password<input autoComplete="new-password" minLength="8" name="password" required type="password" /></label></fieldset><fieldset className="form-section"><legend>Business profile</legend><label>Company<input name="companyName" required type="text" /></label><label>Contact name<input name="contactName" required type="text" /></label><label>Country<input name="country" placeholder="KR, JP, US" required type="text" /></label><label>Preferred language<select defaultValue="en" name="preferredLanguage"><option value="ko">Korean</option><option value="en">English</option><option value="ja">Japanese</option><option value="zh">Chinese</option></select></label><label>Phone<input name="phone" type="tel" /></label></fieldset><fieldset className="form-section full-span"><legend>Terms</legend><label className="agreement-check"><input required type="checkbox" /><span>I agree to the buyer terms and privacy collection policy.<small>Required for account and quote request processing.</small></span></label></fieldset>{error && <p className="form-error full-span" role="alert">{error}</p>}<button className="primary-action full-span" disabled={submitting} type="submit">{submitting ? 'Submitting...' : 'Request Buyer Access'}</button></form></section></main>
}
