import { useMemo, useState } from 'react'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { AdminPageHeader, AdminPagination } from './AdminPageParts'
import { useAdminCopy } from './adminCopy'

const pageSize = 50

export function AdminAuditPage() {
  const t = useAdminCopy()
  const [action, setAction] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const params = useMemo(() => ({
    action,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [action, offset, query])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getAuditLogs(params, token), [action, query, offset])
  const copy = t.audit || {
    eyebrow: 'Governance',
    title: 'Audit log',
    body: 'Recent admin activity without sensitive snapshots.',
    empty: 'No audit events found.',
    action: 'Action',
    entity: 'Entity',
    request: 'Request',
    created: 'Created',
  }

  if (shouldShowAdminApiState(status)) return <AdminApiState error={error} status={status} />

  const auditLogs = data?.auditLogs || []
  return <section className="admin-stack">
    <AdminPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.body} />
    <div className="admin-toolbar">
      <label className="admin-search">{copy.action}
        <input value={action} onChange={(event) => { setAction(event.target.value); setOffset(0) }} placeholder="admin.buyer.status.update" />
      </label>
      <label className="admin-search">{copy.search || 'Actor or target'}
        <input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} placeholder={copy.searchPlaceholder || 'request id, target id'} />
      </label>
    </div>
    <section className="admin-card">
      {auditLogs.length === 0
        ? <p>{copy.empty}</p>
        : <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{copy.action}</th>
                <th>{copy.entity}</th>
                <th>{copy.actor || 'Actor'}</th>
                <th>{copy.request}</th>
                <th>{copy.created}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((entry) => <tr key={entry.id}>
                <td>{entry.action}</td>
                <td>{entry.entityType || '-'} {entry.entityId ? `#${String(entry.entityId).slice(0, 8)}` : ''}</td>
                <td>{entry.actor?.role || '-'}</td>
                <td>{entry.requestId || '-'}</td>
                <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
              </tr>)}
            </tbody>
          </table>
          <AdminPagination
            disabled={status === 'loading'}
            meta={meta}
            onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
            onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
          />
        </div>}
    </section>
  </section>
}
