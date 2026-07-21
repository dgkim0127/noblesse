import { AlertCircle, ChevronLeft, ChevronRight, Inbox, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMoney } from '../../utils/commerce'
import { useLocalePath } from '../../utils/locale'
import { getAdminStatusLabel, useAdminCopy } from './adminCopy'

export function AdminPageHeader({ eyebrow, title, description, actions }) {
  return <div className="admin-page-header">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
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
  if (unavailable) return <>가격 확인 중</>
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

  return <div className="admin-actions admin-pagination" aria-label={t.common.pagination || '페이지 이동'}>
    <button aria-label={t.common.previous} disabled={disabled || !hasPrevious} title={t.common.previous} type="button" onClick={onPrevious}><ChevronLeft size={17} /></button>
    <span>{start}-{end}</span>
    <button aria-label={t.common.next} disabled={disabled || !hasNext} title={t.common.next} type="button" onClick={onNext}><ChevronRight size={17} /></button>
  </div>
}

export function AdminEmptyState({ title, description, action, icon: Icon = Inbox }) {
  return <div className="admin-empty-state">
    <Icon aria-hidden="true" size={26} />
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {action}
  </div>
}

export function AdminNotice({ children, tone = 'info' }) {
  return <div className={`admin-notice admin-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <AlertCircle aria-hidden="true" size={18} />
    <div>{children}</div>
  </div>
}

export function AdminToast({ message, tone = 'success', closeLabel = '알림 닫기', onClose }) {
  if (!message) return null
  return <div className={`admin-toast admin-toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span>{message}</span>
    {onClose && <button aria-label={closeLabel} title={closeLabel} type="button" onClick={onClose}><X size={16} /></button>}
  </div>
}

export function AdminConfirmDialog({ open, title, description, children, confirmLabel = '확인', cancelLabel = '취소', busyLabel = '처리 중...', danger = false, busy = false, confirmDisabled = false, onConfirm, onCancel }) {
  if (!open) return null
  return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onCancel?.()
  }}>
    <section aria-describedby="admin-confirm-description" aria-labelledby="admin-confirm-title" aria-modal="true" className="admin-dialog" role="alertdialog">
      <h2 id="admin-confirm-title">{title}</h2>
      {description && <p id="admin-confirm-description">{description}</p>}
      {children}
      <div className="admin-actions">
        <button disabled={busy} type="button" onClick={onCancel}>{cancelLabel}</button>
        <button className={danger ? 'danger-action' : 'primary-action'} disabled={busy || confirmDisabled} type="button" onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</button>
      </div>
    </section>
  </div>
}

export function AdminSaveBar({ visible, dirtyLabel = '저장하지 않은 변경사항이 있습니다.', saveLabel = '저장', discardLabel = '되돌리기', savingLabel = '저장 중...', ariaLabel = '변경사항 저장', saving = false, onSave, onDiscard }) {
  if (!visible) return null
  return <div className="admin-save-bar" role="region" aria-label={ariaLabel}>
    <strong>{dirtyLabel}</strong>
    <div className="admin-actions">
      <button disabled={saving} type="button" onClick={onDiscard}>{discardLabel}</button>
      <button className="primary-action" disabled={saving} type="button" onClick={onSave}>{saving ? savingLabel : saveLabel}</button>
    </div>
  </div>
}

export function AdminCompletionBadge({ complete, completeLabel = '완료', incompleteLabel = '미완성' }) {
  return <span className={`admin-completion-badge ${complete ? 'is-complete' : 'is-incomplete'}`}>
    {complete ? completeLabel : incompleteLabel}
  </span>
}
