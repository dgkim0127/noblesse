import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

function routeForState(viewerState) {
  if (viewerState === 'pending') return '/approval-pending'
  if (viewerState === 'approved') return '/products'
  return '/account'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { authError, authLoading, login, logout } = useCommerce()
  const [formError, setFormError] = useState('')

  const submitLogin = async (event) => {
    event.preventDefault()
    setFormError('')
    const formData = new FormData(event.currentTarget)
    try {
      const result = await login(formData.get('email'), formData.get('password'))
      navigate(routeForState(result.viewerState))
    } catch (error) {
      setFormError(error.message)
    }
  }

  const browseAsGuest = async () => {
    await logout()
    navigate('/products')
  }

  return <main className="content auth-page"><section className="account-panel auth-panel"><LogIn size={25} /><p className="eyebrow">BUYER LOGIN</p><h1>Access your Noblesse buyer catalog</h1><form className="auth-form" onSubmit={submitLogin}><label>Email<input autoComplete="email" name="email" placeholder="buyer@example.com" required type="email" /></label><label>Password<input autoComplete="current-password" name="password" placeholder="Password" required type="password" /></label>{(formError || authError) && <p className="form-error">{formError || authError}</p>}<button className="primary-action" disabled={authLoading} type="submit">{authLoading ? 'Checking access...' : 'Login'}</button></form><div className="auth-links"><button className="text-action" type="button" onClick={browseAsGuest}>Browse as guest</button><Link to="/register">Request Buyer Access <ArrowRight size={15} /></Link></div></section></main>
}
