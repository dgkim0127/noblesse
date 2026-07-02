import { useMemo, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminLink, AdminPageHeader, AdminPagination, AdminPreviewNote, AdminStatus } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { formatAdminCopy, getAdminStatusLabel, useAdminCopy } from './adminCopy'

const filterTabs = ['all', 'draft', 'pending', 'approved', 'rejected', 'suspended', 'blocked']
const pageSize = 20
const verificationStatuses = ['pending', 'approved', 'rejected', 'suspended']
const accountStatuses = ['active', 'blocked']

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

function getBuyerCountry(buyer) {
  return buyer.country || buyer.assignedMarket || '-'
}

function getBuyerLoginId(buyer) {
  return buyer.email?.split('@')?.[0] || buyer.companyName || '-'
}

function getStatusActionLabel(t, status) {
  return formatAdminCopy(t.buyers.setStatus || '{status}', {
    status: getAdminStatusLabel(t, status),
  })
}

export function AdminBuyersPage() {
  const t = useAdminCopy()
  const { hasPermission } = useAdminAccess()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingAction, setSavingAction] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    verificationStatus: ['draft', 'pending', 'approved', 'rejected', 'suspended'].includes(filter) ? filter : '',
    accountStatus: filter === 'blocked' ? 'blocked' : '',
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

  const updateVerificationStatus = async (buyerId, nextStatus) => {
    setSavingAction(`${buyerId}:verification:${nextStatus}`)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerVerification(buyerId, {
        verificationStatus: nextStatus,
        reason: ['rejected', 'suspended'].includes(nextStatus) ? 'Updated by admin review' : undefined,
      }, token))
      setMessage(formatAdminCopy(t.buyers.updated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.buyers.updateFailed)
    } finally {
      setSavingAction('')
    }
  }

  const updateAccountStatus = async (buyerId, nextStatus) => {
    setSavingAction(`${buyerId}:account:${nextStatus}`)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBuyerAccountStatus(buyerId, {
        accountStatus: nextStatus,
        reason: nextStatus === 'blocked' ? 'Updated by admin account review' : undefined,
      }, token))
      setMessage(formatAdminCopy(t.buyers.updated, { status: getAdminStatusLabel(t, nextStatus) }))
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.buyers.updateFailed)
    } finally {
      setSavingAction('')
    }
  }

  const renderStatusActions = (buyer) => {
    const currentVerification = buyer.verificationStatus || buyer.status
    const currentAccount = buyer.accountStatus || 'active'
    const canReview = hasPermission('buyers.review')
    const canSuspend = hasPermission('buyers.suspend')

    return <div className="admin-buyer-status-panel">
      <div className="admin-buyer-status-row">
        <span>{t.buyers.verificationStatus || '거래처 상태'}</span>
        <AdminStatus status={currentVerification} />
      </div>
      {canReview && <div className="admin-actions tight">
        {verificationStatuses.filter((item) => item !== currentVerification).map((nextStatus) => <button
          disabled={savingAction === `${buyer.id}:verification:${nextStatus}`}
          key={nextStatus}
          type="button"
          onClick={() => updateVerificationStatus(buyer.id, nextStatus)}
        >
          {getStatusActionLabel(t, nextStatus)}
        </button>)}
      </div>}
      <div className="admin-buyer-status-row">
        <span>{t.buyers.accountStatus || '계정 상태'}</span>
        <AdminStatus status={currentAccount} />
      </div>
      {canSuspend && <div className="admin-actions tight">
        {accountStatuses.filter((item) => item !== currentAccount).map((nextStatus) => <button
          disabled={savingAction === `${buyer.id}:account:${nextStatus}`}
          key={nextStatus}
          type="button"
          onClick={() => updateAccountStatus(buyer.id, nextStatus)}
        >
          {getStatusActionLabel(t, nextStatus)}
        </button>)}
      </div>}
      {!canReview && !canSuspend && <p className="admin-permission-note">상태 변경 권한이 필요합니다. 거래처 승인 변경은 buyers.review, 계정 차단/해제는 buyers.suspend 권한이 있어야 합니다.</p>}
    </div>
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
      {buyers.length > 0 ? <div className="admin-buyer-list">
        {buyers.map((buyer) => {
          const buyerCountry = getBuyerCountry(buyer)
          const buyerLoginId = getBuyerLoginId(buyer)
          return <article className="admin-buyer-card" key={buyer.id}>
          <div className="admin-buyer-card-main">
            <h2>{buyerLoginId} - {buyer.contactName || '-'}</h2>
            <p>{buyer.companyName || t.buyers.buyerAccount}</p>
            <p className="admin-buyer-email">{buyer.email || '-'}</p>
            <div className="admin-actions tight">
              <AdminLink to={`/admin/buyers/${buyer.id}`}>{t.common.view}</AdminLink>
            </div>
          </div>
          <dl className="admin-buyer-meta">
            <dt>국가</dt><dd><span className="admin-buyer-country">{buyerCountry}</span></dd>
            <dt>{t.buyers.waitingDays || '대기일'}</dt><dd>{buyer.waitingDays ?? '-'}</dd>
            <dt>{t.buyers.inquiryCount || '문의'}</dt><dd>{buyer.inquiryCount ?? 0}</dd>
            <dt>{t.common.createdAt}</dt><dd>{formatDate(buyer.createdAt)}</dd>
          </dl>
          {renderStatusActions(buyer)}
        </article>
        })}
      </div> : <p className="admin-empty">{t.buyers.empty}</p>}
      <AdminPagination
        disabled={status === 'loading'}
        meta={meta}
        onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
        onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
      />
    </section>
  </>
}
