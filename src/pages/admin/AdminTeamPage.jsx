import { Fragment, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { AdminPageHeader } from './AdminPageParts'
import { useAdminCopy } from './adminCopy'
import { delegableAdminPermissions, getAdminPermissionLabel } from '../../constants/adminPermissionCatalog'
import { useLocalePath } from '../../utils/locale'

export function AdminTeamPage() {
  const t = useAdminCopy()
  const { locale } = useLocalePath()
  const { admin, hasPermission } = useAdminAccess()
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingUserId, setEditingUserId] = useState('')
  const [editingMode, setEditingMode] = useState('')
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
  const startRoleEdit = (row) => {
    setEditingUserId(row.userId)
    setEditingMode('role')
    setDraft({
      adminRole: row.adminRole || 'operator',
      permissionKey: 'buyers.read',
      effect: 'allow',
      reason: '',
      expiresAt: '',
    })
    setMessage('')
  }

  const startOverrideEdit = (row, override = null) => {
    setEditingUserId(row.userId)
    setEditingMode('override')
    setDraft({
      adminRole: row.adminRole || 'operator',
      permissionKey: override?.permissionKey || 'buyers.read',
      effect: override?.effect || 'allow',
      reason: override?.reason || '',
      expiresAt: override?.expiresAt || '',
    })
    setMessage('')
  }

  const saveRole = async (row) => {
    setMessage('')
    const nextRole = draft.adminRole
    const currentRole = row.adminRole || 'operator'
    if (nextRole === currentRole) {
      setEditingUserId('')
      setEditingMode('')
      return
    }
    const isSelfOwnerDowngrade = row.userId === admin?.userId && currentRole === 'owner' && nextRole !== 'owner'
    const confirmMessage = isSelfOwnerDowngrade
      ? (copy.confirmSelfDowngrade || 'You are changing your own owner role. Continue?')
      : nextRole === 'owner'
        ? (copy.confirmPromoteOwner || 'Promote this admin to owner?')
        : currentRole === 'owner'
          ? (copy.confirmDowngradeOwner || 'Downgrade this owner role?')
          : (copy.confirmRoleChange || 'Change this admin role?')
    if (!window.confirm(confirmMessage)) return
    try {
      await mutate((api, token) => api.updateAdminRole(row.userId, nextRole, token))
      setMessage(copy.roleSaved || 'Admin role updated.')
      setEditingUserId('')
      setEditingMode('')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || copy.saveFailed || 'Unable to update admin role.')
    }
  }

  const upsertOverride = async (userId) => {
    setMessage('')
    try {
      await mutate((api, token) => api.upsertPermissionOverride(userId, draft.permissionKey, {
        effect: draft.effect,
        reason: draft.reason,
        expiresAt: draft.expiresAt || null,
      }, token))
      setMessage(copy.overrideSaved || 'Permission override saved.')
      setEditingUserId('')
      setEditingMode('')
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
                const isEditingRole = editingUserId === row.userId && editingMode === 'role'
                const isEditingOverride = editingUserId === row.userId && editingMode === 'override'
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
                            <span>{override.effect}: {getAdminPermissionLabel(override.permissionKey, locale)}</span>
                            <small>{override.expiresAt || copy.noExpiry || 'No expiry'}</small>
                            {canManage && !isOwner && <button type="button" onClick={() => startOverrideEdit(row, override)}>{t.common.edit || 'Edit'}</button>}
                            {canManage && !isOwner && <button type="button" onClick={() => deleteOverride(row.userId, override.permissionKey)}>{t.common.remove || 'Remove'}</button>}
                          </li>)}
                        </ul>}
                    </td>
                    <td>
                      {canManage && <button type="button" onClick={() => startRoleEdit(row)}>{copy.editRole || 'Edit role'}</button>}
                      {canManage && !isOwner && <button type="button" onClick={() => startOverrideEdit(row)}>{copy.addOverride || 'Add override'}</button>}
                      {canManage && isOwner && <span className="admin-muted">{copy.ownerProtected || 'Owner overrides are not allowed.'}</span>}
                    </td>
                  </tr>
                  {isEditingRole && <tr>
                    <td colSpan={6}>
                      <div className="admin-edit-panel">
                        <label>{copy.role}
                          <select value={draft.adminRole} onChange={(event) => setDraft((current) => ({ ...current, adminRole: event.target.value }))}>
                            <option value="operator">{t.shell.roles?.operator || 'Operator'}</option>
                            <option value="manager">{t.shell.roles?.manager || 'Manager'}</option>
                            <option value="owner">{t.shell.roles?.owner || 'Owner'}</option>
                          </select>
                        </label>
                        {row.userId === admin?.userId && row.adminRole === 'owner' && draft.adminRole !== 'owner' && <p className="admin-muted">{copy.selfDowngradeWarning || 'You are downgrading your own owner role.'}</p>}
                        <button type="button" onClick={() => saveRole(row)}>{copy.saveRole || 'Save role'}</button>
                        <button type="button" onClick={() => { setEditingUserId(''); setEditingMode('') }}>{copy.cancel || 'Cancel'}</button>
                      </div>
                    </td>
                  </tr>}
                  {isEditingOverride && !isOwner && <tr>
                    <td colSpan={6}>
                      <div className="admin-edit-panel">
                        <label>{copy.permissionKey || 'Permission'}
                          <select value={draft.permissionKey} onChange={(event) => setDraft((current) => ({ ...current, permissionKey: event.target.value }))}>
                            {delegableAdminPermissions.map((item) => <option key={item} value={item}>{getAdminPermissionLabel(item, locale)}</option>)}
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
                        <button disabled={!draft.reason.trim()} type="button" onClick={() => upsertOverride(row.userId)}>{copy.saveOverride || 'Save override'}</button>
                        <button type="button" onClick={() => { setEditingUserId(''); setEditingMode('') }}>{copy.cancel || 'Cancel'}</button>
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
