import { Copy, Eye, EyeOff, MoreHorizontal, PackagePlus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminAccess } from '../../components/AdminAccessContext'
import {
  AdminCompletionBadge,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminLink,
  AdminPageHeader,
  AdminPagination,
  AdminToast,
} from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const pageSize = 20
const languageLabels = { kr: '한국어', en: 'English', jp: '日本語', 'zh-TW': '繁體中文' }

function getProductName(product) {
  return product.nameKo || product.nameEn || product.nameJa || product.nameZhTw || '이름 없음'
}

function getThumb(product) {
  return product.imageSet?.thumb || product.imageSet?.card || product.imageSet?.detail || product.imageSet?.primary || ''
}

function formatUpdatedAt(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function LanguageCompletion({ product }) {
  const languages = product.completion?.languages || {}
  return <div className="admin-language-completion">
    {Object.entries(languageLabels).map(([locale, label]) => <span className={languages[locale] ? 'is-complete' : ''} key={locale} title={`${label} ${languages[locale] ? '완료' : '미완성'}`}>{locale === 'zh-TW' ? 'TW' : locale.toUpperCase()}</span>)}
  </div>
}

function ProductCompletionCell({ product }) {
  const missing = product.completion?.missing || []
  return <div className="admin-product-completion">
    <LanguageCompletion product={product} />
    <AdminCompletionBadge complete={product.completion?.hasPrimaryImage} completeLabel="사진 완료" incompleteLabel="사진 없음" />
    <small>{product.completion?.publishable ? '공개 가능' : `${missing.length || 1}개 확인 필요`}</small>
  </div>
}

function ProductPriceCell({ product }) {
  return <div className="admin-product-health">
    <AdminCompletionBadge complete={product.completion?.hasKrPrice} completeLabel="KR 가격 등록" incompleteLabel="KR 가격 없음" />
  </div>
}

export function AdminProductsPage() {
  const { hasPermission } = useAdminAccess()
  const [searchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [category, setCategory] = useState('')
  const [completion, setCompletion] = useState(() => searchParams.get('completion') || '')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [confirm, setConfirm] = useState(null)
  const [duplicateTarget, setDuplicateTarget] = useState(null)
  const [duplicateCode, setDuplicateCode] = useState('')
  const mutate = useAdminApiMutation()

  const filters = useMemo(() => ({
    visible,
    category,
    completion,
    q: query,
    limit: pageSize,
    offset,
  }), [category, completion, offset, query, visible])

  const productsResource = useAdminApiResource((api, token) => api.getProducts(filters, token), [visible, category, completion, query, offset, refreshKey])
  const categoriesResource = useAdminApiResource((api, token) => api.getCategories({ limit: 200 }, token), [refreshKey])
  const apiState = shouldShowAdminApiState(productsResource.status)
    ? <AdminApiState error={productsResource.error} status={productsResource.status} />
    : shouldShowAdminApiState(categoriesResource.status)
      ? <AdminApiState error={categoriesResource.error} status={categoriesResource.status} />
      : null

  const products = productsResource.data?.products || []
  const categories = categoriesResource.data?.categories || []
  const allVisibleSelected = products.length > 0 && products.every((product) => selectedIds.includes(product.id))

  useEffect(() => {
    setSelectedIds([])
  }, [category, completion, offset, query, refreshKey, visible])

  if (apiState) return apiState

  const resetPage = (setter, value) => {
    setter(value)
    setOffset(0)
  }

  const refresh = () => setRefreshKey((current) => current + 1)
  const notifyError = (error, fallback) => setToast({ message: error?.message || fallback, tone: 'error' })

  const runBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return
    setBusy(true)
    try {
      await mutate((api, token) => api.bulkUpdateProducts(selectedIds, bulkAction, bulkCategory, token))
      setToast({ message: `${selectedIds.length}개 상품을 처리했습니다.`, tone: 'success' })
      setConfirm(null)
      setBulkAction('')
      setBulkCategory('')
      refresh()
    } catch (error) {
      notifyError(error, '일괄 작업을 완료하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const requestBulkAction = () => {
    if (!bulkAction || selectedIds.length === 0 || (bulkAction === 'setCategory' && !bulkCategory)) return
    const labels = { publish: '공개', unpublish: '비공개', setCategory: '카테고리 변경' }
    setConfirm({
      title: `${selectedIds.length}개 상품을 ${labels[bulkAction]}할까요?`,
      description: bulkAction === 'publish'
        ? '모든 상품이 공개 조건을 충족해야 하며, 하나라도 미완성이면 전체 작업이 취소됩니다.'
        : '선택한 상품에 동일하게 적용됩니다.',
      confirmLabel: labels[bulkAction],
      action: runBulkAction,
    })
  }

  const updateVisibility = (product) => {
    const nextVisible = !product.isVisible
    setConfirm({
      title: `${getProductName(product)} 상품을 ${nextVisible ? '공개' : '비공개'}할까요?`,
      description: nextVisible ? '공개 전 언어, 카테고리, 대표 이미지와 KR 가격을 검사합니다.' : '쇼핑몰 상품 목록에서 즉시 숨겨집니다.',
      confirmLabel: nextVisible ? '공개' : '비공개',
      action: async () => {
        setBusy(true)
        try {
          await mutate((api, token) => api.updateProductVisibility(product.id, nextVisible, token))
          setToast({ message: nextVisible ? '상품을 공개했습니다.' : '상품을 비공개로 전환했습니다.', tone: 'success' })
          setConfirm(null)
          refresh()
        } catch (error) {
          notifyError(error, '공개 상태를 변경하지 못했습니다.')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const openDuplicate = (product) => {
    setDuplicateTarget(product)
    setDuplicateCode(`${product.code}-COPY`)
  }

  const duplicateProduct = async (event) => {
    event.preventDefault()
    if (!duplicateTarget || !duplicateCode.trim()) return
    setBusy(true)
    try {
      await mutate((api, token) => api.duplicateProduct(duplicateTarget.id, duplicateCode.trim(), token))
      setToast({ message: '상품을 비공개 초안으로 복제했습니다.', tone: 'success' })
      setDuplicateTarget(null)
      setDuplicateCode('')
      refresh()
    } catch (error) {
      notifyError(error, '상품을 복제하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <AdminPageHeader
      title="상품"
      description="상품 정보와 공개 준비 상태를 확인하고 관리합니다."
      actions={hasPermission('catalog.write') && <AdminLink className="primary-action" to="/admin/products/new"><PackagePlus size={17} />새 상품</AdminLink>}
    />

    <section className="admin-resource-index">
      <form className="admin-filter-bar" onSubmit={(event) => {
        event.preventDefault()
        resetPage(setQuery, searchInput.trim())
      }}>
        <label className="admin-search-field">
          <span>상품 검색</span>
          <div><input aria-label="상품 검색" placeholder="상품명 또는 코드" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button aria-label="검색" title="검색" type="submit"><Search size={17} /></button></div>
        </label>
        <label><span>공개 상태</span><select value={visible} onChange={(event) => resetPage(setVisible, event.target.value)}><option value="">전체</option><option value="true">공개</option><option value="false">비공개</option></select></label>
        <label><span>카테고리</span><select value={category} onChange={(event) => resetPage(setCategory, event.target.value)}><option value="">전체</option>{categories.map((item) => <option key={item.id} value={item.categoryId}>{item.nameKo || item.nameEn || item.nameZhTw || item.categoryId}</option>)}</select></label>
        <label><span>미완성 항목</span><select value={completion} onChange={(event) => resetPage(setCompletion, event.target.value)}><option value="">전체</option><option value="incomplete">하나 이상 미완성</option><option value="language">언어</option><option value="image">사진</option><option value="price">KR 가격</option><option value="category">카테고리</option></select></label>
      </form>

      {selectedIds.length > 0 && hasPermission('catalog.write') && <div className="admin-bulk-bar">
        <strong>{selectedIds.length}개 선택</strong>
        <select aria-label="일괄 작업" value={bulkAction} onChange={(event) => setBulkAction(event.target.value)}>
          <option value="">작업 선택</option>
          {hasPermission('catalog.publish') && <><option value="publish">공개</option><option value="unpublish">비공개</option></>}
          <option value="setCategory">카테고리 변경</option>
        </select>
        {bulkAction === 'setCategory' && <select aria-label="변경할 카테고리" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}><option value="">카테고리 선택</option>{categories.map((item) => <option key={item.id} value={item.categoryId}>{item.nameKo || item.nameEn || item.categoryId}</option>)}</select>}
        <button className="primary-action" disabled={!bulkAction || (bulkAction === 'setCategory' && !bulkCategory)} type="button" onClick={requestBulkAction}>적용</button>
        <button type="button" onClick={() => setSelectedIds([])}>선택 해제</button>
      </div>}

      {products.length === 0 ? <AdminEmptyState title="조건에 맞는 상품이 없습니다." description="필터를 바꾸거나 새 상품을 등록해보세요." action={hasPermission('catalog.write') && <AdminLink className="primary-action" to="/admin/products/new">새 상품</AdminLink>} /> : <div className="admin-table-wrap admin-product-table-wrap">
        <table className="admin-table admin-product-table">
          <thead><tr>
            <th className="admin-select-column"><input aria-label="현재 페이지 전체 선택" checked={allVisibleSelected} type="checkbox" onChange={(event) => setSelectedIds(event.target.checked ? products.map((product) => product.id) : [])} /></th>
            <th>상품</th><th>완성도</th><th>가격</th><th>공개</th><th>수정일</th><th><span className="sr-only">작업</span></th>
          </tr></thead>
          <tbody>{products.map((product) => <tr key={product.id}>
            <td data-label="선택"><input aria-label={`${getProductName(product)} 선택`} checked={selectedIds.includes(product.id)} type="checkbox" onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, product.id])] : current.filter((id) => id !== product.id))} /></td>
            <td data-label="상품"><div className="admin-product-identity">{getThumb(product) ? <img alt="" loading="lazy" src={getThumb(product)} /> : <span className="admin-product-image-placeholder" />}
              <div><AdminLink className="admin-product-name" to={`/admin/products/${product.id}/edit`}>{getProductName(product)}</AdminLink><small>{product.code}</small>{!product.completion?.publishable && <small className="admin-missing-summary" title={(product.completion?.missing || []).join(', ')}>공개 준비 필요</small>}</div>
            </div></td>
            <td data-label="완성도"><ProductCompletionCell product={product} /></td>
            <td data-label="가격"><ProductPriceCell product={product} /></td>
            <td data-label="공개"><span className={`admin-status ${product.isVisible ? 'approved' : 'draft'}`}>{product.isVisible ? '공개' : '비공개'}</span></td>
            <td data-label="수정일">{formatUpdatedAt(product.updatedAt)}</td>
            <td data-label="작업"><div className="admin-row-actions">
              <AdminLink className="admin-icon-link" to={`/admin/products/${product.id}/edit`}><MoreHorizontal size={18} /><span className="sr-only">수정</span></AdminLink>
              {hasPermission('catalog.write') && <button aria-label="상품 복제" title="상품 복제" type="button" onClick={() => openDuplicate(product)}><Copy size={17} /></button>}
              {hasPermission('catalog.publish') && <button aria-label={product.isVisible ? '비공개' : '공개'} title={product.isVisible ? '비공개' : '공개'} type="button" onClick={() => updateVisibility(product)}>{product.isVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}

      <AdminPagination
        disabled={productsResource.status === 'loading'}
        meta={productsResource.meta}
        onNext={() => setOffset(Number(productsResource.meta?.nextOffset ?? offset + pageSize))}
        onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
      />
    </section>

    {duplicateTarget && <div className="admin-dialog-backdrop" role="presentation">
      <form aria-modal="true" className="admin-dialog" role="dialog" onSubmit={duplicateProduct}>
        <h2>상품 복제</h2>
        <p>{getProductName(duplicateTarget)}의 정보와 이미지 참조를 복사합니다. 가격은 복사하지 않으며 비공개 초안으로 생성합니다.</p>
        <label className="admin-field"><span>새 상품 코드</span><input autoFocus required value={duplicateCode} onChange={(event) => setDuplicateCode(event.target.value)} /></label>
        <div className="admin-actions"><button disabled={busy} type="button" onClick={() => setDuplicateTarget(null)}>취소</button><button className="primary-action" disabled={busy} type="submit">{busy ? '복제 중...' : '복제'}</button></div>
      </form>
    </div>}

    <AdminConfirmDialog
      busy={busy}
      confirmLabel={confirm?.confirmLabel}
      description={confirm?.description}
      open={Boolean(confirm)}
      title={confirm?.title || ''}
      onCancel={() => !busy && setConfirm(null)}
      onConfirm={confirm?.action}
    />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
