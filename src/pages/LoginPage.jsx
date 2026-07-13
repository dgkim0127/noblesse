import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { isSupabaseConfigured, login, setViewerState } = useCommerce()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      if (isSupabaseConfigured) await login(form.get('email'), form.get('password'))
      else setViewerState('approved')
      navigate('/account')
    } catch (nextError) {
      setError(nextError.message || 'Unable to sign in. Please check your details.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="content auth-page"><section className="account-panel auth-panel"><LogIn size={25} /><p className="eyebrow">BUYER LOGIN</p><h1>Access your Noblesse buyer catalog</h1><form className="auth-form" onSubmit={submit}><label>Email<input autoComplete="email" name="email" placeholder="buyer@example.com" required type="email" /></label><label>Password<input autoComplete="current-password" name="password" placeholder="Password" required type="password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-action" disabled={submitting} type="submit">{submitting ? 'Signing in...' : 'Login'}</button></form><div className="auth-links">{!isSupabaseConfigured && <button className="text-action" type="button" onClick={() => { setViewerState('guest'); navigate('/products') }}>Browse as guest</button>}<Link to="/register">Request Buyer Access <ArrowRight size={15} /></Link></div></section></main>
}
