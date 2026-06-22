import { ShieldCheck } from 'lucide-react'
import { useAdminCopy } from '../pages/admin/adminCopy'
import { useAdminAccess } from './AdminAccessContext'

export function AdminPermissionGate({ permission, children }) {
  const { status, hasPermission } = useAdminAccess()
  const t = useAdminCopy()

  if (status === 'loading') {
    return <div className="admin-page-loading">{t.apiState.loading}</div>
  }

  if (status === 'ready' && hasPermission(permission)) {
    return children
  }

  return <section className="admin-forbidden">
    <ShieldCheck size={30} />
    <p className="eyebrow">{t.route.requiredEyebrow}</p>
    <h1>{t.shell.forbiddenTitle || 'Permission required'}</h1>
    <p>{t.shell.forbiddenBody || 'This admin route requires a permission that is not assigned to your account.'}</p>
  </section>
}
