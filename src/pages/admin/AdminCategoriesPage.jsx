import { Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import {
  addCatalogFilterOption,
  loadCatalogFilterOptions,
  removeCatalogFilterOption,
  updateCatalogFilterOption,
} from '../../services/catalogFilterOptions'
import { AdminEmptyState, AdminPageHeader, AdminPagination, AdminToast } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const emptyCategoryForm = {
  categoryId: '',
  nameKo: '',
  nameEn: '',
  nameJa: '',
  nameZhTw: '',
  slug: '',
  sortOrder: '0',
  isVisible: false,
}
const emptyFilterForm = {
  type: 'collections',
  id: '',
  labelKo: '',
  labelEn: '',
  labelJa: '',
  labelCn: '',
  sortOrder: '0',
  isVisible: true,
}
const pageSize = 20

function categoryToForm(category) {
  return {
    categoryId: category.categoryId || '',
    nameKo: category.nameKo || '',
    nameEn: category.nameEn || '',
    nameJa: category.nameJa || '',
    nameZhTw: category.nameZhTw || '',
    slug: category.slug || '',
    sortOrder: String(category.sortOrder ?? 0),
    isVisible: Boolean(category.isVisible),
  }
}

function categoryPayload(form, editing) {
  return {
    ...(!editing ? { categoryId: form.categoryId.trim() } : {}),
    nameKo: form.nameKo.trim() || undefined,
    nameEn: form.nameEn.trim(),
    nameJa: form.nameJa.trim() || undefined,
    nameZhTw: form.nameZhTw.trim() || undefined,
    slug: form.slug.trim(),
    sortOrder: Number(form.sortOrder || 0),
    isVisible: Boolean(form.isVisible),
  }
}

export function AdminCategoriesPage() {
  const { hasPermission } = useAdminAccess()
  const canWrite = hasPermission('catalog.write')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [offset, setOffset] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editor, setEditor] = useState(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [savingId, setSavingId] = useState('')
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const [filterForm, setFilterForm] = useState(emptyFilterForm)
  const [filterOptions, setFilterOptions] = useState(() => loadCatalogFilterOptions())
  const filters = useMemo(() => ({ visible, q: query.trim(), limit: pageSize, offset }), [offset, query, visible])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getCategories(filters, token), [query, visible, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const categories = data?.categories || []
  const setCategoryField = (field, value) => setCategoryForm((current) => ({ ...current, [field]: value }))
  const setFilterField = (field, value) => setFilterForm((current) => ({ ...current, [field]: value }))

  const resetEditor = () => {
    setEditor(null)
    setCategoryForm(emptyCategoryForm)
  }

  const openCreate = () => {
    setEditor({ mode: 'create', id: '' })
    setCategoryForm(emptyCategoryForm)
  }

  const openEdit = (category) => {
    setEditor({ mode: 'edit', id: category.id })
    setCategoryForm(categoryToForm(category))
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    const editing = editor?.mode === 'edit'
    setSavingId(editor?.id || 'create')
    try {
      if (editing) {
        await mutate((api, token) => api.updateCategory(editor.id, categoryPayload(categoryForm, true), token))
      } else {
        await mutate((api, token) => api.createCategory(categoryPayload(categoryForm, false), token))
      }
      setToast({ message: editing ? '카테고리를 수정했습니다.' : '카테고리를 추가했습니다.', tone: 'success' })
      resetEditor()
      setRefreshKey((current) => current + 1)
    } catch (saveError) {
      setToast({ message: saveError?.message || '카테고리를 저장하지 못했습니다.', tone: 'error' })
    } finally {
      setSavingId('')
    }
  }

  const toggleCategory = async (category) => {
    setSavingId(category.id)
    try {
      await mutate((api, token) => api.updateCategory(category.id, { isVisible: !category.isVisible }, token))
      setToast({ message: category.isVisible ? '카테고리를 숨겼습니다.' : '카테고리를 공개했습니다.', tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (toggleError) {
      setToast({ message: toggleError?.message || '공개 상태를 바꾸지 못했습니다.', tone: 'error' })
    } finally {
      setSavingId('')
    }
  }

  const createFilterOption = (event) => {
    event.preventDefault()
    try {
      const next = addCatalogFilterOption(filterForm.type, {
        id: filterForm.id,
        labelKo: filterForm.labelKo,
        labelEn: filterForm.labelEn,
        labelJa: filterForm.labelJa,
        labelCn: filterForm.labelCn,
        sortOrder: Number(filterForm.sortOrder || 0),
        isVisible: filterForm.isVisible,
      })
      setFilterOptions(next)
      setFilterForm(emptyFilterForm)
      setToast({ message: '쇼핑몰 필터 옵션을 추가했습니다.', tone: 'success' })
    } catch (filterError) {
      setToast({ message: filterError?.message || '필터 옵션을 추가하지 못했습니다.', tone: 'error' })
    }
  }

  const toggleFilterOption = (type, option) => {
    setFilterOptions(updateCatalogFilterOption(type, option.id, { isVisible: !option.isVisible }))
  }

  const deleteFilterOption = (type, optionId) => {
    setFilterOptions(removeCatalogFilterOption(type, optionId))
    setToast({ message: '쇼핑몰 필터 옵션을 삭제했습니다.', tone: 'success' })
  }

  return <>
    <AdminPageHeader
      title="카테고리"
      description="상품 분류 이름과 쇼핑몰 노출 순서를 관리합니다."
      actions={canWrite && <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />새 카테고리</button>}
    />

    {editor && <form className="admin-editor-section admin-category-editor" onSubmit={saveCategory}>
      <div className="admin-section-heading"><div><h2>{editor.mode === 'edit' ? '카테고리 수정' : '새 카테고리'}</h2><p>영문명은 필수이며 나머지 언어는 운영 준비에 맞춰 입력할 수 있습니다.</p></div></div>
      <div className="admin-form-grid">
        <label className="admin-field"><span>카테고리 키 <b>*</b></span><input disabled={editor.mode === 'edit'} placeholder="barbell" required value={categoryForm.categoryId} onChange={(event) => setCategoryField('categoryId', event.target.value)} /></label>
        <label className="admin-field"><span>URL 슬러그 <b>*</b></span><input placeholder="barbell" required value={categoryForm.slug} onChange={(event) => setCategoryField('slug', event.target.value)} /></label>
        <label className="admin-field"><span>한국어</span><input value={categoryForm.nameKo} onChange={(event) => setCategoryField('nameKo', event.target.value)} /></label>
        <label className="admin-field"><span>English <b>*</b></span><input required value={categoryForm.nameEn} onChange={(event) => setCategoryField('nameEn', event.target.value)} /></label>
        <label className="admin-field"><span>日本語</span><input value={categoryForm.nameJa} onChange={(event) => setCategoryField('nameJa', event.target.value)} /></label>
        <label className="admin-field"><span>繁體中文</span><input value={categoryForm.nameZhTw} onChange={(event) => setCategoryField('nameZhTw', event.target.value)} /></label>
        <label className="admin-field"><span>정렬 순서</span><input min="0" type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryField('sortOrder', event.target.value)} /></label>
        <label className="admin-switch"><input checked={categoryForm.isVisible} type="checkbox" onChange={(event) => setCategoryField('isVisible', event.target.checked)} /><span>쇼핑몰에 공개</span></label>
      </div>
      <div className="admin-actions"><button type="button" onClick={resetEditor}>취소</button><button className="primary-action" disabled={Boolean(savingId)} type="submit">{savingId ? '저장 중...' : '저장'}</button></div>
    </form>}

    <div className="admin-filter-bar admin-category-filter-bar">
      <label className="admin-search"><span className="sr-only">카테고리 검색</span><input placeholder="이름, 키, 슬러그 검색" value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} /></label>
      <label className="admin-field"><span>공개 상태</span><select value={visible} onChange={(event) => { setVisible(event.target.value); setOffset(0) }}><option value="">전체</option><option value="true">공개</option><option value="false">비공개</option></select></label>
    </div>

    {categories.length === 0 ? <AdminEmptyState title="조건에 맞는 카테고리가 없습니다." description="검색 조건을 바꾸거나 새 카테고리를 추가하세요." /> : <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>카테고리</th><th>다국어 이름</th><th>URL</th><th>공개 상태</th><th>정렬</th><th>작업</th></tr></thead>
        <tbody>{categories.map((category) => <tr key={category.id}>
          <td data-label="카테고리"><strong>{category.nameKo || category.nameEn || category.categoryId}</strong><small>{category.categoryId}</small></td>
          <td data-label="다국어 이름"><small>{[category.nameEn, category.nameJa, category.nameZhTw].filter(Boolean).join(' / ') || '-'}</small></td>
          <td data-label="URL">{category.slug}</td>
          <td data-label="공개 상태"><span className={`admin-status ${category.isVisible ? 'visible' : 'hidden'}`}>{category.isVisible ? '공개' : '비공개'}</span></td>
          <td data-label="정렬">{category.sortOrder ?? 0}</td>
          <td data-label="작업"><div className="admin-row-actions">
            {canWrite && <button aria-label={`${category.categoryId} 수정`} title="수정" type="button" onClick={() => openEdit(category)}><Pencil size={16} /></button>}
            {canWrite && <button disabled={savingId === category.id} type="button" onClick={() => toggleCategory(category)}>{category.isVisible ? '숨기기' : '공개'}</button>}
          </div></td>
        </tr>)}</tbody>
      </table>
      <AdminPagination disabled={status === 'loading'} meta={meta} onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))} onPrevious={() => setOffset(Math.max(0, offset - pageSize))} />
    </div>}

    <details className="admin-advanced-section admin-filter-option-card">
      <summary>쇼핑몰 필터 옵션</summary>
      <p className="admin-muted">상품 목록 필터에 추가로 노출할 카테고리와 컬렉션 이름을 관리합니다.</p>
      <form className="admin-form-grid" onSubmit={createFilterOption}>
        <label className="admin-field"><span>구분</span><select value={filterForm.type} onChange={(event) => setFilterField('type', event.target.value)}><option value="collections">컬렉션</option><option value="categories">카테고리</option></select></label>
        <label className="admin-field"><span>키</span><input placeholder="minimal-line" required value={filterForm.id} onChange={(event) => setFilterField('id', event.target.value)} /></label>
        <label className="admin-field"><span>한국어</span><input required value={filterForm.labelKo} onChange={(event) => setFilterField('labelKo', event.target.value)} /></label>
        <label className="admin-field"><span>English</span><input value={filterForm.labelEn} onChange={(event) => setFilterField('labelEn', event.target.value)} /></label>
        <label className="admin-field"><span>日本語</span><input value={filterForm.labelJa} onChange={(event) => setFilterField('labelJa', event.target.value)} /></label>
        <label className="admin-field"><span>繁體中文</span><input value={filterForm.labelCn} onChange={(event) => setFilterField('labelCn', event.target.value)} /></label>
        <label className="admin-field"><span>정렬 순서</span><input type="number" value={filterForm.sortOrder} onChange={(event) => setFilterField('sortOrder', event.target.value)} /></label>
        <label className="admin-switch"><input checked={filterForm.isVisible} type="checkbox" onChange={(event) => setFilterField('isVisible', event.target.checked)} /><span>필터에 표시</span></label>
        <button className="primary-action" type="submit">옵션 추가</button>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>구분</th><th>키</th><th>이름</th><th>표시</th><th>정렬</th><th>작업</th></tr></thead>
          <tbody>{['categories', 'collections'].flatMap((type) => filterOptions[type].map((option) => <tr key={`${type}-${option.id}`}>
            <td data-label="구분">{type === 'categories' ? '카테고리' : '컬렉션'}</td>
            <td data-label="키">{option.id}</td>
            <td data-label="이름"><strong>{option.labelKo}</strong><small>{[option.labelEn, option.labelJa, option.labelCn].filter(Boolean).join(' / ')}</small></td>
            <td data-label="표시">{option.isVisible ? '표시' : '숨김'}</td>
            <td data-label="정렬">{option.sortOrder}</td>
            <td data-label="작업"><div className="admin-row-actions"><button type="button" onClick={() => toggleFilterOption(type, option)}>{option.isVisible ? '숨기기' : '표시'}</button><button type="button" onClick={() => deleteFilterOption(type, option.id)}>삭제</button></div></td>
          </tr>))}</tbody>
        </table>
      </div>
    </details>

    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
