import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { AdminPageHeader } from './AdminPageParts'
import { useAdminCopy } from './adminCopy'

export function AdminAuditPage() {
  const t = useAdminCopy()
  const { data, error, status } = useAdminApiResource((api, token) => api.getAuditLogs({ limit: 50 }, token), [])
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
    <AdminPageHeader eyebrow={copy.eyebrow} title={copy.title} body={copy.body} />
    <section className="admin-card">
      {auditLogs.length === 0
        ? <p>{copy.empty}</p>
        : <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{copy.action}</th>
                <th>{copy.entity}</th>
                <th>{copy.request}</th>
                <th>{copy.created}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((entry) => <tr key={entry.id}>
                <td>{entry.action}</td>
                <td>{entry.entityType || '-'} {entry.entityId ? `#${String(entry.entityId).slice(0, 8)}` : ''}</td>
                <td>{entry.requestId || '-'}</td>
                <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </section>
  </section>
}
