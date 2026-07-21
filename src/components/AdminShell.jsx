import {
  BarChart3,
  Building2,
  FileText,
  Home,
  PackageSearch,
  Settings2,
  Store,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { getRuntimeConfig } from '../config/runtimeConfig'
import { getAdminRuntimeKind, useAdminCopy } from '../pages/admin/adminCopy'
import { useLocalePath } from '../utils/locale'
import { useAdminAccess } from './AdminAccessContext'
import '../styles/admin-console.css'

const adminNavigation = [
  { key: 'dashboard', path: '/admin', icon: Home, permissions: ['dashboard.read'], end: true },
  { key: 'products', path: '/admin/products', icon: PackageSearch, permissions: ['catalog.read'] },
  { key: 'quotes', path: '/admin/quotes', fallbackPath: '/admin/inquiries', icon: FileText, permissions: ['quotes.read', 'inquiries.read'] },
  { key: 'buyers', path: '/admin/buyers', icon: Building2, permissions: ['buyers.read'] },
  { key: 'operations', path: '/admin/operations', icon: Settings2, permissions: ['catalog.read', 'prices.read', 'admins.read', 'audit.read'] },
  { key: 'analytics', path: '/admin/analytics', icon: BarChart3, permissions: ['analytics.read'] },
]

export function AdminShell() {
  const location = useLocation()
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const runtimeKind = getAdminRuntimeKind(getRuntimeConfig())
  const { admin, hasPermission, status } = useAdminAccess()
  const roleLabel = t.shell.roles?.[admin?.adminRole] || admin?.adminRole || 'admin'
  const isVisualEditorRoute = /\/admin\/(?:home-editor|products\/(?:new|[^/]+\/edit))\/?$/.test(location.pathname)

  return <main className={`admin-shell admin-console-shell${isVisualEditorRoute ? ' is-visual-editor-route' : ''}`}>
    <aside className="admin-sidebar admin-console-sidebar" aria-label={t.shell.aria}>
      <div className="admin-brand-block">
        <Store size={22} />
        <div>
          <strong>Noblesse</strong>
          <span>{t.shell.brand}</span>
        </div>
      </div>
      <nav>
        {adminNavigation.map(({ end, fallbackPath, icon: Icon, key, path, permissions }) => {
          const visible = status !== 'ready' || permissions.some((permission) => hasPermission(permission))
          if (!visible) return null
          const label = key === 'operations' ? t.shell.groups?.operations : t.shell.nav?.[key]
          const destination = key === 'quotes' && !hasPermission('quotes.read') ? fallbackPath : path
          return <NavLink aria-label={label} end={end} key={key} title={label} to={toLocalePath(destination)}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <span className="admin-role-badge">{roleLabel}</span>
        <NavLink className="admin-back-link" to={toLocalePath('/products')}>{t.shell.backToCatalog}</NavLink>
      </div>
    </aside>
    <section className="admin-main admin-console-main">
      <div className="admin-console-topbar">
        <div>
          <span>{t.shell.currentAdmin || 'Current admin'}</span>
          <strong>{admin?.email || t.shell.brand}</strong>
        </div>
        <span className="admin-runtime-label">{t.shell.badge[runtimeKind]}</span>
      </div>
      <Outlet />
    </section>
  </main>
}
