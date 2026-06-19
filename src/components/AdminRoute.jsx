import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

export function AdminRoute({ children }) {
  const { dataMode, isAdmin } = useCommerce()
  const { toLocalePath } = useLocalePath()
  const isMockMode = dataMode === 'mock'

  if (isMockMode && isAdmin) return children

  return <main className="content admin-access-page">
    <section className="admin-card admin-access-card">
      <ShieldCheck size={30} />
      <p className="eyebrow">{isMockMode ? 'Admin Preview' : 'Admin API Required'}</p>
      <h1>Admin access required</h1>
      <p>{isMockMode
        ? '관리자 권한이 필요합니다. 현재 화면은 mock viewerState 기준 preview이며, production에서는 Auth와 server-side role check가 필요합니다.'
        : 'Release mode does not trust frontend viewer state. Admin access requires server-side authentication and role verification.'}</p>
      <div className="admin-actions">
        <Link className="primary-action" to={toLocalePath('/products')}>Product List</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>Account</Link>
      </div>
    </section>
  </main>
}
