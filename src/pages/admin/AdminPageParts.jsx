import { Link } from 'react-router-dom'
import { formatMoney } from '../../utils/commerce'
import { useLocalePath } from '../../utils/locale'

export const inquiryStatusLabels = {
  requested: 'Requested',
  checking: 'Checking',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export const buyerStatusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  blocked: 'Blocked',
}

export function AdminPageHeader({ eyebrow = 'Admin Preview', title, description, actions }) {
  return <div className="admin-page-header">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="admin-actions">{actions}</div>}
  </div>
}

export function AdminPreviewNote({ children }) {
  return <aside className="admin-preview-note">{children}</aside>
}

export function AdminStatus({ status }) {
  return <span className={`admin-status ${status}`}>{inquiryStatusLabels[status] ?? buyerStatusLabels[status] ?? status}</span>
}

export function AdminMoney({ value, currency = 'USD' }) {
  return <>{formatMoney(value, currency)}</>
}

export function AdminLink({ children, to, className = 'secondary-action' }) {
  const { toLocalePath } = useLocalePath()
  return <Link className={className} to={toLocalePath(to)}>{children}</Link>
}
