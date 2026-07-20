import { Building2, FilePenLine, FileText, PackageSearch } from 'lucide-react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminEmptyState, AdminLink, AdminPageHeader } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiResource } from './adminApiPageUtils'

export function AdminDashboardPage() {
  const { hasPermission } = useAdminAccess()
  const resource = useAdminApiResource((api, token) => api.getDashboard(token), [])
  const apiState = shouldShowAdminApiState(resource.status) ? <AdminApiState error={resource.error} status={resource.status} /> : null
  if (apiState) return apiState

  const data = resource.data || {}
  const inquiries = data.inquiries || {}
  const buyers = data.buyers || {}
  const workQueue = data.workQueue || {}
  const catalogHealth = data.catalogHealth || {}
  const tasks = [
    { key: 'inquiries', title: '새 문의 확인', description: '고객 요청을 확인하고 견적 초안을 만드세요.', count: workQueue.inquiryFollowUp ?? inquiries.requested ?? 0, to: '/admin/inquiries', permission: 'inquiries.read', icon: FileText },
    { key: 'quotes', title: '견적 초안 및 후속 처리', description: '초안을 완성하고 유효한 PDF 견적서를 발행하세요.', count: workQueue.quoteFollowUp ?? 0, to: '/admin/quotes', permission: 'quotes.read', icon: FilePenLine },
    { key: 'buyers', title: '승인 대기 거래처', description: '회사 정보와 가격 접근 권한을 검토하세요.', count: workQueue.buyerReviews ?? buyers.pending ?? 0, to: '/admin/buyers', permission: 'buyers.read', icon: Building2 },
    { key: 'products', title: '보완이 필요한 상품', description: '번역, 사진, 카테고리와 KR 가격을 완성하세요.', count: catalogHealth.needsReview ?? 0, to: '/admin/products?completion=incomplete', permission: 'catalog.read', icon: PackageSearch },
  ].filter((item) => hasPermission(item.permission))

  return <>
    <AdminPageHeader title="홈" description="먼저 처리해야 할 운영 업무를 확인하세요." actions={hasPermission('catalog.write') && <AdminLink className="primary-action" to="/admin/products/new">새 상품</AdminLink>} />
    {tasks.length === 0 ? <AdminEmptyState title="표시할 운영 업무가 없습니다." /> : <section className="admin-task-list" aria-label="오늘 할 일">
      <header><h2>오늘 할 일</h2><span>{tasks.reduce((sum, item) => sum + Number(item.count || 0), 0)}건</span></header>
      {tasks.map(({ count, description, icon: Icon, key, title, to }) => <AdminLink className="admin-task-row" key={key} to={to}>
        <Icon aria-hidden="true" size={20} />
        <span><strong>{title}</strong><small>{description}</small></span>
        <b>{count || 0}</b>
      </AdminLink>)}
    </section>}
    <section className="admin-dashboard-summary">
      <div><span>공개 상품</span><strong>{data.products?.visible ?? 0}</strong></div>
      <div><span>숨김 상품</span><strong>{catalogHealth.hidden ?? 0}</strong></div>
      <div><span>진행 중 문의</span><strong>{(inquiries.requested ?? 0) + (inquiries.checking ?? 0)}</strong></div>
    </section>
  </>
}
