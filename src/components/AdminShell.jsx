import {
  BarChart3,
  Building2,
  FileText,
  Home,
  PackageSearch,
  Settings2,
  Store,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { getRuntimeConfig } from '../config/runtimeConfig'
import { getAdminRuntimeKind, useAdminCopy } from '../pages/admin/adminCopy'
import { useLocalePath } from '../utils/locale'
import { useAdminAccess } from './AdminAccessContext'
import '../styles/admin-console.css'

const adminNavigation = [
  { key: 'dashboard', label: '홈', path: '/admin', icon: Home, permissions: ['dashboard.read'], end: true },
  { key: 'products', label: '상품', path: '/admin/products', icon: PackageSearch, permissions: ['catalog.read'] },
  { key: 'quotes', label: '견적', path: '/admin/quotes', fallbackPath: '/admin/inquiries', icon: FileText, permissions: ['quotes.read', 'inquiries.read'] },
  { key: 'buyers', label: '고객', path: '/admin/buyers', icon: Building2, permissions: ['buyers.read'] },
  { key: 'operations', label: '운영', path: '/admin/operations', icon: Settings2, permissions: ['catalog.read', 'prices.read', 'admins.read', 'audit.read'] },
  { key: 'analytics', label: '분석', path: '/admin/analytics', icon: BarChart3, permissions: ['analytics.read'] },
]

export function AdminShell() {
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const runtimeKind = getAdminRuntimeKind(getRuntimeConfig())
  const { admin, hasPermission, status } = useAdminAccess()
  const roleLabel = t.shell.roles?.[admin?.adminRole] || admin?.adminRole || 'admin'

  return <main className="admin-shell admin-console-shell">
    <aside className="admin-sidebar admin-console-sidebar" aria-label={t.shell.aria}>
      <div className="admin-brand-block">
        <Store size={22} />
        <div>
          <strong>Noblesse</strong>
          <span>운영 관리자</span>
        </div>
      </div>
      <nav>
        {adminNavigation.map(({ end, fallbackPath, icon: Icon, key, label, path, permissions }) => {
          const visible = status !== 'ready' || permissions.some((permission) => hasPermission(permission))
          if (!visible) return null
          const destination = key === 'quotes' && !hasPermission('quotes.read') ? fallbackPath : path
          return <NavLink end={end} key={key} to={toLocalePath(destination)}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <span className="admin-role-badge">{roleLabel}</span>
        <NavLink className="admin-back-link" to={toLocalePath('/products')}>쇼핑몰 보기</NavLink>
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
