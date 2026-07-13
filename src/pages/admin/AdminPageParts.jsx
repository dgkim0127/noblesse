import { Link } from 'react-router-dom'
import { formatMoney } from '../../utils/commerce'
import { useLocalePath } from '../../utils/locale'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

export function AdminPageHeader({ eyebrow, title, description, actions }) {
  const t = useAdminCopy()
  return <div className="admin-page-header">
    <div>
      <p className="eyebrow">{eyebrow || t.common.adminApi}</p>
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
  const t = useAdminCopy()
  return <span className={`admin-status ${status}`}>{getAdminStatusLabel(t, status)}</span>
}

export function AdminMoney({ value, currency = 'USD', unavailable = false }) {
  if (unavailable) return <>가격 확인중</>
  return <>{formatMoney(value, currency)}</>
}

export function AdminLink({ children, to, className = 'secondary-action' }) {
  const { toLocalePath } = useLocalePath()
  return <Link className={className} to={toLocalePath(to)}>{children}</Link>
}

export function AdminPagination({ meta, onPrevious, onNext, disabled = false }) {
  const t = useAdminCopy()
  if (!meta) return null

  const offset = Number(meta.offset || 0)
  const limit = Number(meta.limit || 0)
  const hasPrevious = offset > 0
  const hasNext = meta.nextOffset != null || meta.nextCursor != null
  const start = limit > 0 ? offset + 1 : offset
  const end = limit > 0 ? offset + limit : offset

  return <div className="admin-actions admin-pagination" aria-label={t.common.pagination || 'Pagination'}>
    <button disabled={disabled || !hasPrevious} type="button" onClick={onPrevious}>{t.common.previous}</button>
    <span>{start}-{end}</span>
    <button disabled={disabled || !hasNext} type="button" onClick={onNext}>{t.common.next}</button>
  </div>
}
