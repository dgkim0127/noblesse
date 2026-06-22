import { Fragment, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { AdminPageHeader } from './AdminPageParts'
import { useAdminCopy } from './adminCopy'

const permissionOptions = [
  'buyers.read',
  'buyers.review',
  'buyers.suspend',
  'catalog.write',
  'catalog.publish',
  'prices.write',
  'quotes.write',
  'admins.read',
  'admins.manage',
  'audit.read',
  'settings.manage',
]

export function AdminTeamPage() {
  const t = useAdminCopy()
  const { admin, hasPermission } = useAdminAccess()
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingUserId, setEditingUserId] = useState('')
  const [draft, setDraft] = useState({ adminRole: 'operator', permissionKey: 'buyers.read', effect: 'allow', reason: '', expiresAt: '' })
  const [message, setMessage] = useState('')
  const { data, error, status } = useAdminApiResource((api, token) => api.getAdmins(token), [refreshKey])
  const mutate = useAdminApiMutation()
  const canManage = admin?.adminRole === 'owner' && hasPermission('admins.manage')
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
  const startEdit = (row) => {
    setEditingUserId(row.userId)
    setDraft({
      adminRole: row.adminRole || 'operator',
      permissionKey: 'buyers.read',
      effect: 'allow',
      reason: '',
      expiresAt: '',
    })
    setMessage('')
  }

  const saveRole = async (userId) => {
    setMessage('')
    try {
      await mutate((api, token) => api.updateAdminRole(userId, draft.adminRole, token))
      setMessage(copy.roleSaved || 'Admin role updated.')
      setEditingUserId('')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || copy.saveFailed || 'Unable to update admin role.')
    }
  }

  const replaceOverride = async (userId) => {
    setMessage('')
    try {
      await mutate((api, token) => api.replacePermissionOverrides(userId, [{
        permissionKey: draft.permissionKey,
        effect: draft.effect,
        reason: draft.reason,
        expiresAt: draft.expiresAt || null,
      }], token))
      setMessage(copy.overrideSaved || 'Permission override saved.')
      setEditingUserId('')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || copy.saveFailed || 'Unable to save permission override.')
    }
  }

  const deleteOverride = async (userId, permissionKey) => {
    setMessage('')
    try {
      await mutate((api, token) => api.deletePermissionOverride(userId, permissionKey, token))
      setMessage(copy.overrideDeleted || 'Permission override removed.')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || copy.saveFailed || 'Unable to remove permission override.')
    }
  }

  return <section className="admin-stack">
    <AdminPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.body} />
    {message && <p className="admin-inline-message">{message}</p>}
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
                <th>{copy.permissionCount || 'Permissions'}</th>
                <th>{copy.overrides || 'Overrides'}</th>
                <th>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((row) => {
                const isEditing = editingUserId === row.userId
                const isOwner = row.adminRole === 'owner'
                return <Fragment key={row.userId}>
                  <tr>
                    <td>{row.email || '-'}</td>
                    <td><span className="status-pill">{t.shell.roles?.[row.adminRole] || row.adminRole}</span></td>
                    <td>{row.accountStatus || row.status}</td>
                    <td>{row.permissions?.length ?? 0}</td>
                    <td>
                      {(row.permissionOverrides || []).length === 0
                        ? '-'
                        : <ul className="admin-compact-list">
                          {row.permissionOverrides.map((override) => <li key={override.permissionKey}>
                            <span>{override.effect}: {override.permissionKey}</span>
                            <small>{override.expiresAt || copy.noExpiry || 'No expiry'}</small>
                            {canManage && !isOwner && <button type="button" onClick={() => deleteOverride(row.userId, override.permissionKey)}>{t.common.remove || 'Remove'}</button>}
                          </li>)}
                        </ul>}
                    </td>
                    <td>
                      {canManage && !isOwner && <button type="button" onClick={() => startEdit(row)}>{t.common.edit || 'Edit'}</button>}
                      {canManage && isOwner && <span className="admin-muted">{copy.ownerProtected || 'Owner overrides are not allowed.'}</span>}
                    </td>
                  </tr>
                  {isEditing && <tr>
                    <td colSpan={6}>
                      <div className="admin-edit-panel">
                        <label>{copy.role}
                          <select value={draft.adminRole} onChange={(event) => setDraft((current) => ({ ...current, adminRole: event.target.value }))}>
                            <option value="operator">{t.shell.roles?.operator || 'Operator'}</option>
                            <option value="manager">{t.shell.roles?.manager || 'Manager'}</option>
                          </select>
                        </label>
                        <button type="button" onClick={() => saveRole(row.userId)}>{copy.saveRole || 'Save role'}</button>
                        <label>{copy.permissionKey || 'Permission'}
                          <select value={draft.permissionKey} onChange={(event) => setDraft((current) => ({ ...current, permissionKey: event.target.value }))}>
                            {permissionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </label>
                        <label>{copy.effect || 'Effect'}
                          <select value={draft.effect} onChange={(event) => setDraft((current) => ({ ...current, effect: event.target.value }))}>
                            <option value="allow">allow</option>
                            <option value="deny">deny</option>
                          </select>
                        </label>
                        <label>{copy.reason || 'Reason'}
                          <input value={draft.reason} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} required />
                        </label>
                        <label>{copy.expiresAt || 'Expires at'}
                          <input value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} placeholder="2026-12-31T00:00:00Z" />
                        </label>
                        <button disabled={!draft.reason.trim()} type="button" onClick={() => replaceOverride(row.userId)}>{copy.saveOverride || 'Save override'}</button>
                      </div>
                    </td>
                  </tr>}
                </Fragment>
              })}
            </tbody>
          </table>
        </div>}
      {!canManage && <p className="admin-muted">{copy.readOnly || 'You can review admin access but cannot edit roles or overrides.'}</p>}
    </section>
  </section>
}
