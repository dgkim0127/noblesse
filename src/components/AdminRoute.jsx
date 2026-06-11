import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

export function AdminRoute({ children }) {
  const { isAdmin } = useCommerce()
  const { toLocalePath } = useLocalePath()

  if (isAdmin) return children

  return <main className="content admin-access-page">
    <section className="admin-card admin-access-card">
      <ShieldCheck size={30} />
      <p className="eyebrow">Admin Preview</p>
      <h1>Admin access required</h1>
      <p>관리자 권한이 필요합니다. 현재 화면은 mock viewerState 기준 preview이며, production에서는 Auth와 server-side role check가 필요합니다.</p>
      <div className="admin-actions">
        <Link className="primary-action" to={toLocalePath('/products')}>Product List</Link>
        <Link className="secondary-action" to={toLocalePath('/account')}>Account</Link>
      </div>
    </section>
  </main>
}
