import {
  BarChart3,
  ClipboardList,
  FileText,
  Gauge,
  Gem,
  Handshake,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Tags,
  UsersRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { getRuntimeConfig } from '../config/runtimeConfig'
import { getAdminRuntimeKind, useAdminCopy } from '../pages/admin/adminCopy'
import { useLocalePath } from '../utils/locale'
import { useAdminAccess } from './AdminAccessContext'
import '../styles/admin-console.css'

const adminNavGroups = [
  {
    key: 'overview',
    items: [{ key: 'dashboard', path: '/admin', icon: LayoutDashboard, permission: 'dashboard.read', end: true }],
  },
  {
    key: 'operations',
    items: [
      { key: 'buyers', path: '/admin/buyers', icon: Handshake, permission: 'buyers.read' },
      { key: 'inquiries', path: '/admin/inquiries', icon: FileText, permission: 'inquiries.read' },
      { key: 'quotes', path: '/admin/quotes', icon: ClipboardList, permission: 'quotes.read' },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'catalogEntry', path: '/admin/catalog/new', icon: PlusCircle, permission: 'catalog.write' },
      { key: 'products', path: '/admin/products', icon: Gem, permission: 'catalog.read' },
      { key: 'categories', path: '/admin/categories', icon: Tags, permission: 'catalog.read' },
      { key: 'prices', path: '/admin/prices', icon: Tags, permission: 'prices.read' },
    ],
  },
  {
    key: 'insights',
    items: [{ key: 'analytics', path: '/admin/analytics', icon: BarChart3, permission: 'analytics.read' }],
  },
  {
    key: 'governance',
    items: [
      { key: 'team', path: '/admin/team', icon: UsersRound, permission: 'admins.read' },
      { key: 'audit', path: '/admin/audit', icon: ShieldCheck, permission: 'audit.read' },
    ],
  },
]

const fallbackGroups = {
  overview: 'Overview',
  operations: 'Operations',
  catalog: 'Catalog',
  insights: 'Insights',
  governance: 'Governance',
}

export function AdminShell() {
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const runtimeKind = getAdminRuntimeKind(getRuntimeConfig())
  const { admin, hasPermission, status } = useAdminAccess()
  const roleLabel = t.shell.roles?.[admin?.adminRole] || admin?.adminRole || 'admin'

  return <main className="admin-shell admin-console-shell">
    <aside className="admin-sidebar admin-console-sidebar" aria-label={t.shell.aria}>
      <div className="admin-brand-block">
        <Gauge size={24} />
        <div>
          <strong>{t.shell.brand}</strong>
          <span>{t.shell.serverVerified[runtimeKind]}</span>
        </div>
      </div>
      <div className="admin-console-badges">
        <span className="admin-preview-badge">{t.shell.badge[runtimeKind]}</span>
        <span className="admin-role-badge">{roleLabel}</span>
      </div>
      <nav>
        {adminNavGroups.map((group) => {
          const visibleItems = group.items.filter((item) => status !== 'ready' || hasPermission(item.permission))
          if (visibleItems.length === 0) return null
          return <div className="admin-nav-group" key={group.key}>
            <p>{t.shell.groups?.[group.key] || fallbackGroups[group.key]}</p>
            {visibleItems.map(({ end, icon: Icon, key, path }) => <NavLink end={end} key={path} to={toLocalePath(path)}>
              <Icon size={17} />
              <span>{t.shell.nav[key]}</span>
            </NavLink>)}
          </div>
        })}
      </nav>
      <NavLink className="admin-back-link" to={toLocalePath('/products')}>{t.shell.backToCatalog}</NavLink>
    </aside>
    <section className="admin-main admin-console-main">
      <div className="admin-console-topbar">
        <div>
          <span>{t.shell.currentAdmin || 'Current admin'}</span>
          <strong>{admin?.email || t.shell.brand}</strong>
        </div>
        <span className="admin-preview-badge">{t.shell.badge[runtimeKind]}</span>
      </div>
      <Outlet />
    </section>
  </main>
}
