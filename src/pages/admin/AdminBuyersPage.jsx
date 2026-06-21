import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

const filterTabs = ['all', 'pending', 'approved', 'blocked']
const pageSize = 20

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export function AdminBuyersPage() {
  const t = useAdminCopy()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingBuyerId, setSavingBuyerId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    status: filter === 'all' ? '' : filter,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [filter, offset, query])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getBuyers(filters, token), [filter, query, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const buyers = data?.buyers || []
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const updateStatus = async (buyerId, nextStatus) => {
    setSavingBuyerId(buyerId)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerStatus(buyerId, nextStatus, token))
      setMessage(formatAdminCopy(t.buyers.updated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.buyers.updateFailed)
    } finally {
      setSavingBuyerId('')
    }
  }

  return <>
    <AdminPageHeader
      title={t.buyers.title}
      description={t.buyers.description}
    />
    <AdminPreviewNote>{t.buyers.note}</AdminPreviewNote>

    <div className="admin-toolbar">
      <label className="admin-search">{t.buyers.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.buyers.searchPlaceholder} /></label>
      <div className="admin-filter-tabs">
        {filterTabs.map((tab) => <button className={filter === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setFilter)(tab)}>{tab === 'all' ? t.common.all : getAdminStatusLabel(t, tab)}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.companyName}</th><th>{t.fields.contactName}</th><th>{t.fields.email}</th><th>{t.fields.country}</th><th>{t.fields.language}</th><th>{t.fields.market}</th><th>{t.fields.currency}</th><th>{t.common.status}</th><th>{t.common.createdAt}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{buyers.map((buyer) => <tr key={buyer.id}>
            <td>{buyer.companyName || '-'}</td>
            <td>{buyer.contactName || '-'}</td>
            <td>{buyer.email || '-'}</td>
            <td>{buyer.country || '-'}</td>
            <td>{buyer.preferredLanguage || '-'}</td>
            <td>{buyer.assignedMarket || '-'}</td>
            <td>{buyer.currency || '-'}</td>
            <td><AdminStatus status={buyer.status} /></td>
            <td>{formatDate(buyer.createdAt)}</td>
            <td>
              <div className="admin-actions tight">
                {['pending', 'approved', 'blocked'].filter((item) => item !== buyer.status).map((nextStatus) => <button
                  disabled={savingBuyerId === buyer.id}
                  key={nextStatus}
                  type="button"
                  onClick={() => updateStatus(buyer.id, nextStatus)}
                >
                  {t.common.set} {getAdminStatusLabel(t, nextStatus)}
                </button>)}
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {buyers.length === 0 && <p className="admin-empty">{t.buyers.empty}</p>}
        <AdminPagination
          disabled={status === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>
  </>
}
