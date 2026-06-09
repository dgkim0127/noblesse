import { ArrowRight, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'

const brandKoreanName = '\uADC0\uC871 \uD53C\uC5B4\uC2F1'
const brandLanguageLabel = '\uD53C\uC5B4\uC2F1 / Piercing / \u30D4\u30A2\u30B9 / \u51B2\u5B54'

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

  return <main className="content auth-page">
    <section className="account-panel auth-panel">
      <LogIn size={25} />
      <p className="eyebrow">BUYER LOGIN</p>
      <h1>Noblesse Piercing buyer access</h1>
      <div className="brand-mini">
        <strong>{brandKoreanName}</strong>
        <span>{brandLanguageLabel}</span>
      </div>
      <p>Approved buyers can access prices, Inquiry List, and Request Quote.</p>
      <form className="auth-form" onSubmit={loginAsApprovedBuyer}>
        <label>Email<input autoComplete="email" name="email" placeholder="buyer@example.com" type="email" /></label>
        <label>Password<input autoComplete="current-password" name="password" placeholder="Password" type="password" /></label>
        <button className="primary-action" type="submit">Login</button>
      </form>
      <div className="auth-links">
        <button className="text-action" type="button" onClick={browseAsGuest}>Browse as Guest</button>
        <Link to="/register">Register / Request Buyer Access <ArrowRight size={15} /></Link>
      </div>
    </section>
  </main>
}
