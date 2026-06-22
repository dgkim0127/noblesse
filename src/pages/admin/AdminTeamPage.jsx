import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'
import { AdminPageHeader } from './AdminPageParts'
import { useAdminCopy } from './adminCopy'

export function AdminTeamPage() {
  const t = useAdminCopy()
  const { data, error, status } = useAdminApiResource((api, token) => api.getAdmins(token), [])
  const copy = t.team || {
    eyebrow: 'Governance',
    title: 'Admin team',
    body: 'Review admin roles, status, and effective access.',
    empty: 'No admin users found.',
    email: 'Email',
    role: 'Role',
    account: 'Account',
  }

  if (shouldShowAdminApiState(status)) return <AdminApiState error={error} status={status} />

  const admins = data?.admins || []
  return <section className="admin-stack">
    <AdminPageHeader eyebrow={copy.eyebrow} title={copy.title} body={copy.body} />
    <section className="admin-card">
      {admins.length === 0
        ? <p>{copy.empty}</p>
        : <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{copy.email}</th>
                <th>{copy.role}</th>
                <th>{copy.account}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => <tr key={admin.userId}>
                <td>{admin.email || '-'}</td>
                <td><span className="status-pill">{admin.adminRole}</span></td>
                <td>{admin.accountStatus || admin.status}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </section>
  </section>
}
