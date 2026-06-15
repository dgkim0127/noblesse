import { BarChart3, FileText, Gauge, Gem, Handshake, LayoutDashboard, Tags } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLocalePath } from '../utils/locale'

const adminNav = [
  { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Buyers', path: '/admin/buyers', icon: Handshake },
  { label: 'Products', path: '/admin/products', icon: Gem },
  { label: 'Prices', path: '/admin/prices', icon: Tags },
  { label: 'Inquiries', path: '/admin/inquiries', icon: FileText },
  { label: 'Quotes', path: '/admin/quotes', icon: FileText },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
]

export function AdminShell() {
  const { toLocalePath } = useLocalePath()

  return <main className="admin-shell">
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-brand-block">
        <Gauge size={24} />
        <div>
          <strong>귀족 Admin</strong>
          <span>Noblesse Admin Preview</span>
        </div>
      </div>
      <span className="admin-preview-badge">Mock Preview</span>
      <nav>
        {adminNav.map(({ end, icon: Icon, label, path }) => <NavLink end={end} key={path} to={toLocalePath(path)}>
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>)}
      </nav>
      <NavLink className="admin-back-link" to={toLocalePath('/products')}>Back to Catalog</NavLink>
    </aside>
    <section className="admin-main">
      <Outlet />
    </section>
  </main>
}
