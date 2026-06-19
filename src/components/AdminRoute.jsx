import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { isAuthConfigured } from '../services/authService'
import { useLocalePath } from '../utils/locale'

export function AdminRoute({ children }) {
  const { authStatus, dataMode, isAdmin } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const isMockMode = dataMode === 'mock'

  if (isAdmin) return children

  if (!isMockMode && authStatus === 'checking') {
    return <main className="content admin-access-page">
      <section className="admin-card admin-access-card">
        <ShieldCheck size={30} />
        <p className="eyebrow">Admin API</p>
        <h1>Checking admin session</h1>
        <p>Firebase authentication is being verified before the server-side admin role check runs.</p>
      </section>
    </main>
  }

  const authMissing = !isMockMode && !isAuthConfigured()

  return <main className="content admin-access-page">
    <section className="admin-card admin-access-card">
      <ShieldCheck size={30} />
      <p className="eyebrow">{isMockMode ? 'Admin Preview' : 'Admin API Required'}</p>
      <h1>Admin access required</h1>
      <p>{authMissing
        ? 'Firebase client configuration is required before an admin can sign in for the server-side role check.'
        : isMockMode
          ? 'Admin preview is available only in explicit development mode.'
          : 'Release mode does not trust frontend viewer state. Sign in with an approved admin account so the backend can verify the role server-side.'}</p>
      <div className="admin-actions">
        {!isMockMode && <Link className="primary-action" to={toLocalePath('/login')}>Admin Login</Link>}
        <Link className="secondary-action" to={toLocalePath('/products')}>Product List</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>Account</Link>
      </div>
    </section>
  </main>
}
