import { BarChart3, FileText, Gauge, Gem, Handshake, LayoutDashboard, Tags } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { getRuntimeConfig } from '../config/runtimeConfig'
import { getAdminRuntimeKind, useAdminCopy } from '../pages/admin/adminCopy'
import { useLocalePath } from '../utils/locale'

const adminNav = [
  { key: 'dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { key: 'buyers', path: '/admin/buyers', icon: Handshake },
  { key: 'products', path: '/admin/products', icon: Gem },
  { key: 'categories', path: '/admin/categories', icon: Tags },
  { key: 'prices', path: '/admin/prices', icon: Tags },
  { key: 'inquiries', path: '/admin/inquiries', icon: FileText },
  { key: 'quotes', path: '/admin/quotes', icon: FileText },
  { key: 'analytics', path: '/admin/analytics', icon: BarChart3 },
]

export function AdminShell() {
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const runtimeKind = getAdminRuntimeKind(getRuntimeConfig())

  return <main className="admin-shell">
    <aside className="admin-sidebar" aria-label={t.shell.aria}>
      <div className="admin-brand-block">
        <Gauge size={24} />
        <div>
          <strong>{t.shell.brand}</strong>
          <span>{t.shell.serverVerified[runtimeKind]}</span>
        </div>
      </div>
      <span className="admin-preview-badge">{t.shell.badge[runtimeKind]}</span>
      <nav>
        {adminNav.map(({ end, icon: Icon, key, path }) => <NavLink end={end} key={path} to={toLocalePath(path)}>
          <Icon size={17} />
          <span>{t.shell.nav[key]}</span>
        </NavLink>)}
      </nav>
      <NavLink className="admin-back-link" to={toLocalePath('/products')}>{t.shell.backToCatalog}</NavLink>
    </aside>
    <section className="admin-main">
      <Outlet />
    </section>
  </main>
}
