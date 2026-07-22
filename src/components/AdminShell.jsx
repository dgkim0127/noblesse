import {
  ArrowLeft,
  BarChart3,
  Building2,
  FileText,
  Home,
  MoreHorizontal,
  PackageSearch,
  Settings2,
  Store,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { toLocalePath } = useLocalePath()
  const t = useAdminCopy()
  const runtimeKind = getAdminRuntimeKind(getRuntimeConfig())
  const { admin, hasPermission, status } = useAdminAccess()
  const roleLabel = t.shell.roles?.[admin?.adminRole] || admin?.adminRole || 'admin'
  const isVisualEditorRoute = /\/admin\/(?:home-editor|products\/(?:new|[^/]+\/edit))\/?$/.test(location.pathname)
  const isQuoteDetailRoute = /\/admin\/quotes\/[^/]+\/?$/.test(location.pathname)
  const visibleNavigation = adminNavigation.filter(({ permissions }) => (
    status !== 'ready' || permissions.some((permission) => hasPermission(permission))
  ))
  const getNavigationLabel = (key) => key === 'operations' ? t.shell.groups?.operations : t.shell.nav?.[key]
  const getNavigationDestination = ({ fallbackPath, key, path }) => (
    key === 'quotes' && !hasPermission('quotes.read') ? fallbackPath : path
  )
  const mobilePrimaryNavigation = visibleNavigation.filter(({ key }) => ['dashboard', 'products', 'quotes', 'buyers'].includes(key))
  const mobileMoreNavigation = visibleNavigation.filter(({ key }) => ['operations', 'analytics'].includes(key))
  const activeNavigation = [...visibleNavigation].reverse().find(({ path }) => location.pathname.includes(path))
  const mobileTitle = isQuoteDetailRoute
    ? t.shell.mobileQuotePreparation
    : getNavigationLabel(activeNavigation?.key || 'dashboard')

  return <main className={`admin-shell admin-console-shell${isVisualEditorRoute ? ' is-visual-editor-route' : ''}`}>
    <header className="admin-mobile-appbar">
      <button aria-label={t.shell.back} title={t.shell.back} type="button" onClick={() => navigate(-1)}><ArrowLeft size={21} /></button>
      <strong>{mobileTitle}</strong>
      <details className="admin-mobile-overflow">
        <summary aria-label={t.shell.more} title={t.shell.more}><MoreHorizontal size={22} /></summary>
        <div>
          {mobileMoreNavigation.map((item) => {
            const Icon = item.icon
            const label = getNavigationLabel(item.key)
            return <NavLink key={item.key} to={toLocalePath(getNavigationDestination(item))}><Icon size={17} /><span>{label}</span></NavLink>
          })}
          <NavLink to={toLocalePath('/products')}><Store size={17} /><span>{t.shell.backToCatalog}</span></NavLink>
        </div>
      </details>
    </header>
    <aside className="admin-sidebar admin-console-sidebar" aria-label={t.shell.aria}>
      <div className="admin-brand-block">
        <Store size={22} />
        <div>
          <strong>Noblesse</strong>
          <span>{t.shell.brand}</span>
        </div>
      </div>
      <nav>
        {visibleNavigation.map((item) => {
          const { end, icon: Icon, key } = item
          const label = getNavigationLabel(key)
          return <NavLink aria-label={label} end={end} key={key} title={label} to={toLocalePath(getNavigationDestination(item))}>
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
    <nav className="admin-mobile-bottom-nav" aria-label={t.shell.mobileNavigation}>
      {mobilePrimaryNavigation.map((item) => {
        const { end, icon: Icon, key } = item
        const label = getNavigationLabel(key)
        return <NavLink aria-label={label} end={end} key={key} to={toLocalePath(getNavigationDestination(item))}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      })}
      <details className="admin-mobile-more-tab">
        <summary aria-label={t.shell.more}><MoreHorizontal size={20} /><span>{t.shell.more}</span></summary>
        <div>
          {mobileMoreNavigation.map((item) => {
            const Icon = item.icon
            const label = getNavigationLabel(item.key)
            return <NavLink key={item.key} to={toLocalePath(getNavigationDestination(item))}><Icon size={18} /><span>{label}</span></NavLink>
          })}
        </div>
      </details>
    </nav>
  </main>
}
