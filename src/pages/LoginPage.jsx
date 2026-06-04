import { ArrowRight, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { setViewerState } = useCommerce()

  const loginAsApprovedBuyer = (event) => {
    event.preventDefault()
    setViewerState('approved')
    navigate('/account')
  }

  const browseAsGuest = () => {
    setViewerState('guest')
    navigate('/products')
  }

  return <main className="content auth-page"><section className="account-panel auth-panel"><LogIn size={25} /><p className="eyebrow">BUYER LOGIN</p><h1>Access your Noblesse buyer catalog</h1><form className="auth-form" onSubmit={loginAsApprovedBuyer}><label>Email<input autoComplete="email" name="email" placeholder="buyer@example.com" type="email" /></label><label>Password<input autoComplete="current-password" name="password" placeholder="Password" type="password" /></label><button className="primary-action" type="submit">Login</button></form><div className="auth-links"><button className="text-action" type="button" onClick={browseAsGuest}>Browse as guest</button><Link to="/register">Request Buyer Access <ArrowRight size={15} /></Link></div></section></main>
}
