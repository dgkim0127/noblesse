import { useMemo, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminConfirmDialog, AdminLink, AdminPageHeader, AdminPagination, AdminPreviewNote, AdminStatus } from './AdminPageParts'
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

function getBuyerTitle(buyer) {
  const loginId = getBuyerLoginId(buyer)
  const name = buyer.contactName || buyer.companyName || '-'
  return `${loginId} - ${name}`
}

function getStatusActionLabel(t, status) {
  if (t.buyers.statusActions?.[status]) {
    return t.buyers.statusActions[status]
  }
  return formatAdminCopy(t.buyers.setStatus || '{status}', {
    status: getAdminStatusLabel(t, status),
  })
}

function formatDiscountRate(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return String(Math.round(number * 100) / 100)
}

function getBuyerAccountLabel(t, buyer) {
  const status = buyer.accountStatus || 'active'
  const label = getAdminStatusLabel(t, status)
  if (status === 'active') {
    const discountRate = Number(buyer.discountRate || 0)
    if (!Number.isFinite(discountRate) || discountRate <= 0) return label
    return `${label} (DC ${formatDiscountRate(discountRate)}%)`
  }
  return label
}

function getFilterCount(meta, tab) {
  const count = meta?.statusCounts?.[tab]
  if (count === undefined || count === null) return null
  const number = Number(count)
  return Number.isFinite(number) ? number : null
}

export function AdminBuyersPage() {
  const t = useAdminCopy()
  const { admin, hasPermission } = useAdminAccess()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingAction, setSavingAction] = useState('')
  const [message, setMessage] = useState('')
  const [promoteTarget, setPromoteTarget] = useState(null)
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

  const requestBuyerPromotion = (buyer) => {
    if (!buyer.email) {
      setMessage(t.buyers.promoteNeedsEmail || '운영자로 지정하려면 회원 이메일이 필요합니다.')
      return
    }
    setPromoteTarget(buyer)
  }

  const promoteBuyerToOperator = async () => {
    const buyer = promoteTarget
    if (!buyer?.email) return
    setSavingAction(`${buyer.id}:promote-operator`)
    setMessage('')
    try {
      await mutate((api, token) => api.promoteUserToAdmin({
        email: buyer.email,
        adminRole: 'operator',
      }, token))
      setMessage(t.buyers.promoteSuccess || '운영자로 지정했습니다. 운영자 권한은 회원 > 운영 메뉴에서 확인할 수 있습니다.')
      setRefreshKey((current) => current + 1)
      setPromoteTarget(null)
    } catch (error) {
      setMessage(error?.message || t.buyers.promoteFailed || '운영자로 지정할 수 없습니다.')
    } finally {
      setSavingAction('')
    }
  }

  const renderStatusActions = (buyer) => {
    const currentVerification = buyer.verificationStatus || buyer.status
    const currentAccount = buyer.accountStatus || 'active'
    const canReview = hasPermission('buyers.review')
    const canSuspend = hasPermission('buyers.suspend')
    const canPromoteOperator = admin?.adminRole === 'owner' && hasPermission('admins.manage')

    return <div className="admin-buyer-status-panel">
      <div className="admin-buyer-status-row">
        <span>{t.buyers.reviewStatus || t.buyers.verificationStatus || '거래처 심사'}</span>
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
        <span>{t.buyers.loginStatus || t.buyers.accountStatus || '로그인'}</span>
        <span className={`admin-status ${currentAccount}`}>{getBuyerAccountLabel(t, buyer)}</span>
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
      {canPromoteOperator && <div className="admin-actions tight">
        <button
          disabled={savingAction === `${buyer.id}:promote-operator`}
          type="button"
          onClick={() => requestBuyerPromotion(buyer)}
        >
          {t.buyers.promoteOperator || '운영자로 지정'}
        </button>
      </div>}
      {!canPromoteOperator && <p className="admin-permission-note">{t.buyers.promotePermissionNote || '운영자 지정은 최고 관리자 권한이 필요합니다.'}</p>}
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
        {filterTabs.map((tab) => {
          const count = getFilterCount(meta, tab)
          return <button aria-pressed={filter === tab} className={filter === tab ? 'active' : ''} key={tab} type="button" onClick={() => resetPage(setFilter)(tab)}>
            <span>{tab === 'all' ? t.common.all : getAdminStatusLabel(t, tab)}</span>
            {count !== null && <span className="admin-filter-count">{count}</span>}
          </button>
        })}
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
            <h2>{getBuyerTitle(buyer)}</h2>
            <p>{buyer.companyName || formatAdminCopy(t.buyers.loginIdLine || '아이디 {loginId}', { loginId: buyerLoginId })}</p>
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
    <AdminConfirmDialog
      busy={Boolean(promoteTarget && savingAction === `${promoteTarget.id}:promote-operator`)}
      confirmLabel={t.buyers.promoteOperator || '운영자로 지정'}
      description={promoteTarget ? formatAdminCopy(t.buyers.promoteConfirm || '{buyer} 회원을 운영자로 지정할까요?', { buyer: getBuyerTitle(promoteTarget) }) : ''}
      open={Boolean(promoteTarget)}
      title={t.buyers.promoteOperator || '운영자로 지정'}
      onCancel={() => !savingAction && setPromoteTarget(null)}
      onConfirm={promoteBuyerToOperator}
    />
  </>
}
