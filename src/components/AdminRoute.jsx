import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { isAuthConfigured } from '../services/authService'
import { useAdminCopy } from '../pages/admin/adminCopy'
import { useLocalePath } from '../utils/locale'

export function AdminRoute({ children }) {
  const { authStatus, dataMode, isAdmin } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const isMockMode = dataMode === 'mock'

  if (isAdmin) return children

  if (!isMockMode && authStatus === 'checking') {
    return <main className="content admin-access-page">
      <section className="admin-card admin-access-card">
        <ShieldCheck size={30} />
        <p className="eyebrow">{t.route.checkingEyebrow}</p>
        <h1>{t.route.checkingTitle}</h1>
        <p>{t.route.checkingBody}</p>
      </section>
    </main>
  }

  const authMissing = !isMockMode && !isAuthConfigured()

  return <main className="content admin-access-page">
    <section className="admin-card admin-access-card">
      <ShieldCheck size={30} />
      <p className="eyebrow">{isMockMode ? t.route.previewEyebrow : t.route.requiredEyebrow}</p>
      <h1>{t.route.requiredTitle}</h1>
      <p>{authMissing
        ? t.route.missingConfig
        : isMockMode
          ? t.route.previewBody
          : t.route.releaseBody}</p>
      <div className="admin-actions">
        {!isMockMode && <Link className="primary-action" to={toLocalePath('/login')}>{t.route.login}</Link>}
        <Link className="secondary-action" to={toLocalePath('/products')}>{t.route.productList}</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>{t.route.account}</Link>
      </div>
    </section>
  </main>
}
