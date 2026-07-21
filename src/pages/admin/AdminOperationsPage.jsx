import { FolderTree, Images, Landmark, LayoutTemplate, ShieldCheck, Tags, UsersRound } from 'lucide-react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminLink, AdminPageHeader } from './AdminPageParts'

const operationLinks = [
  { title: '메인 화면', description: '고객 홈을 보면서 섹션, 문구와 노출 상품을 편집합니다.', to: '/admin/home-editor', icon: LayoutTemplate, permission: 'catalog.write' },
  { title: '홈 스냅', description: '홈 첫 화면의 사진, 문구와 노출 순서를 관리합니다.', to: '/admin/home-showcase', icon: Images, permission: 'catalog.read' },
  { title: '카테고리', description: '상품 분류와 노출 순서를 관리합니다.', to: '/admin/categories', icon: FolderTree, permission: 'catalog.read' },
  { title: '가격', description: '로그인 거래처에게 표시할 시장별 가격을 관리합니다.', to: '/admin/prices', icon: Tags, permission: 'prices.read' },
  { title: '환율 정책', description: '자동 환율 가격의 기준과 상태를 확인합니다.', to: '/admin/fx', icon: Landmark, permission: 'prices.read' },
  { title: '관리자와 권한', description: '운영 담당자 역할과 권한을 관리합니다.', to: '/admin/team', icon: UsersRound, permission: 'admins.read' },
  { title: '변경 이력', description: '관리자 작업과 중요 변경 기록을 확인합니다.', to: '/admin/audit', icon: ShieldCheck, permission: 'audit.read' },
]

export function AdminOperationsPage() {
  const { hasPermission } = useAdminAccess()
  const visibleLinks = operationLinks.filter((item) => hasPermission(item.permission))

  return <>
    <AdminPageHeader title="운영" description="상품 판매 준비와 관리자 권한에 필요한 설정을 관리합니다." />
    <section className="admin-operation-list" aria-label="운영 메뉴">
      {visibleLinks.map(({ description, icon: Icon, title, to }) => <AdminLink className="admin-operation-link" key={to} to={to}>
        <Icon aria-hidden="true" size={20} />
        <span><strong>{title}</strong><small>{description}</small></span>
      </AdminLink>)}
    </section>
  </>
}
