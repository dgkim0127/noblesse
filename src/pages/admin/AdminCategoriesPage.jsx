import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'
import {
  addCatalogFilterOption,
  loadCatalogFilterOptions,
  removeCatalogFilterOption,
  updateCatalogFilterOption,
} from '../../services/catalogFilterOptions'

const initialForm = {
  categoryId: '',
  nameEn: '',
  nameKo: '',
  nameJa: '',
  slug: '',
  sortOrder: '0',
  isVisible: false,
}
const initialFilterOptionForm = {
  type: 'collections',
  id: '',
  labelKo: '',
  labelEn: '',
  sortOrder: '0',
  isVisible: true,
}
const pageSize = 20

const filterOptionTypeLabel = {
  categories: '카테고리',
  collections: '컬렉션',
}

export function AdminCategoriesPage() {
  const t = useAdminCopy()
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [filterOptionForm, setFilterOptionForm] = useState(initialFilterOptionForm)
  const [filterOptions, setFilterOptions] = useState(() => loadCatalogFilterOptions())
  const [filterOptionMessage, setFilterOptionMessage] = useState('')
  const filters = useMemo(() => ({
    visible,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, visible])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getCategories(filters, token), [query, visible, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const categories = data?.categories || []

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const setFilterOptionField = (field, value) => setFilterOptionForm((current) => ({ ...current, [field]: value }))
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const refreshFilterOptions = (nextOptions = loadCatalogFilterOptions()) => {
    setFilterOptions(nextOptions)
  }

  const createFilterOption = (event) => {
    event.preventDefault()
    setFilterOptionMessage('')
    try {
      const nextOptions = addCatalogFilterOption(filterOptionForm.type, {
        id: filterOptionForm.id,
        labelKo: filterOptionForm.labelKo,
        labelEn: filterOptionForm.labelEn,
        sortOrder: Number(filterOptionForm.sortOrder || 0),
        isVisible: filterOptionForm.isVisible,
      })
      refreshFilterOptions(nextOptions)
      setFilterOptionForm(initialFilterOptionForm)
      setFilterOptionMessage('필터 옵션을 추가했습니다.')
    } catch (error) {
      setFilterOptionMessage(error?.message || '필터 옵션을 추가할 수 없습니다.')
    }
  }

  const toggleFilterOption = (type, option) => {
    const nextOptions = updateCatalogFilterOption(type, option.id, { isVisible: !option.isVisible })
    refreshFilterOptions(nextOptions)
    setFilterOptionMessage(option.isVisible ? '필터 옵션을 숨겼습니다.' : '필터 옵션을 표시했습니다.')
  }

  const deleteFilterOption = (type, optionId) => {
    const nextOptions = removeCatalogFilterOption(type, optionId)
    refreshFilterOptions(nextOptions)
    setFilterOptionMessage('필터 옵션을 삭제했습니다.')
  }

  const createCategory = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      await mutate((api, token) => api.createCategory({
        categoryId: form.categoryId.trim(),
        nameEn: form.nameEn.trim(),
        nameKo: form.nameKo.trim() || undefined,
        nameJa: form.nameJa.trim() || undefined,
        slug: form.slug.trim(),
        sortOrder: Number(form.sortOrder || 0),
        isVisible: form.isVisible,
      }, token))
      setMessage(t.categories.created)
      setForm(initialForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.categories.createFailed)
    }
  }

  const updateCategory = async (categoryId, input, successMessage) => {
    setSavingId(categoryId)
    setMessage('')
    try {
      await mutate((api, token) => api.updateCategory(categoryId, input, token))
      setMessage(successMessage)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.categories.updateFailed)
    } finally {
      setSavingId('')
    }
  }

  return <>
    <AdminPageHeader
      title={t.categories.title}
      description={t.categories.description}
    />
    <AdminPreviewNote>{t.categories.note}</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createCategory}>
      <label className="admin-search">{t.categories.key}<input value={form.categoryId} onChange={(event) => setField('categoryId', event.target.value)} placeholder="category-key" required /></label>
      <label className="admin-search">{t.categories.englishName}<input value={form.nameEn} onChange={(event) => setField('nameEn', event.target.value)} placeholder={t.categories.englishName} required /></label>
      <label className="admin-search">{t.categories.slug}<input value={form.slug} onChange={(event) => setField('slug', event.target.value)} placeholder="category-slug" required /></label>
      <label className="admin-search">{t.categories.sort}<input value={form.sortOrder} onChange={(event) => setField('sortOrder', event.target.value)} type="number" /></label>
      <label className="admin-check"><input checked={form.isVisible} onChange={(event) => setField('isVisible', event.target.checked)} type="checkbox" /> {t.common.visible}</label>
      <button className="primary-action" type="submit">{t.categories.create}</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">{t.categories.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.categories.searchPlaceholder} /></label>
      <div className="admin-filter-tabs">
        {[['', t.common.all], ['true', t.common.visible], ['false', t.common.hidden]].map(([value, label]) => <button className={visible === value ? 'active' : ''} key={value || 'all'} type="button" onClick={() => resetPage(setVisible)(value)}>{label}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.key}</th><th>{t.fields.name}</th><th>{t.fields.slug}</th><th>{t.common.visible}</th><th>{t.fields.sort}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{categories.map((category) => <tr key={category.id}>
            <td>{category.categoryId}</td>
            <td>{category.nameEn || category.nameKo || category.nameJa || '-'}</td>
            <td>{category.slug}</td>
            <td>{category.isVisible ? t.common.visible : t.common.hidden}</td>
            <td>{category.sortOrder ?? 0}</td>
            <td>
              <div className="admin-actions tight">
                <button
                  disabled={savingId === category.id}
                  onClick={() => updateCategory(category.id, { isVisible: !category.isVisible }, category.isVisible ? t.categories.hidden : t.categories.visible)}
                  type="button"
                >
                  {category.isVisible ? t.common.hide : t.common.show}
                </button>
                <button
                  disabled={savingId === category.id}
                  onClick={() => updateCategory(category.id, { nameEn: `${category.nameEn || category.categoryId} Updated` }, t.categories.nameUpdated)}
                  type="button"
                >
                  {t.common.appendUpdate}
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {categories.length === 0 && <p className="admin-empty">{t.categories.empty}</p>}
        <AdminPagination
          disabled={status === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>

    <section className="admin-card admin-filter-option-card">
      <h2>필터 옵션 관리</h2>
      <p className="admin-muted">상품 목록의 필터 팝업에 노출할 카테고리와 컬렉션 항목을 추가합니다.</p>
      <form className="admin-toolbar" onSubmit={createFilterOption}>
        <label className="admin-search">구분
          <select value={filterOptionForm.type} onChange={(event) => setFilterOptionField('type', event.target.value)}>
            <option value="collections">컬렉션</option>
            <option value="categories">카테고리</option>
          </select>
        </label>
        <label className="admin-search">키<input value={filterOptionForm.id} onChange={(event) => setFilterOptionField('id', event.target.value)} placeholder="minimal-line" required /></label>
        <label className="admin-search">한글명<input value={filterOptionForm.labelKo} onChange={(event) => setFilterOptionField('labelKo', event.target.value)} placeholder="미니멀 라인" required /></label>
        <label className="admin-search">영문명<input value={filterOptionForm.labelEn} onChange={(event) => setFilterOptionField('labelEn', event.target.value)} placeholder="Minimal Line" /></label>
        <label className="admin-search">정렬<input value={filterOptionForm.sortOrder} onChange={(event) => setFilterOptionField('sortOrder', event.target.value)} type="number" /></label>
        <label className="admin-check"><input checked={filterOptionForm.isVisible} onChange={(event) => setFilterOptionField('isVisible', event.target.checked)} type="checkbox" /> 표시</label>
        <button className="primary-action" type="submit">필터 추가</button>
      </form>
      {filterOptionMessage && <p className="admin-inline-message">{filterOptionMessage}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>구분</th><th>키</th><th>한글명</th><th>영문명</th><th>표시</th><th>정렬</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{['categories', 'collections'].flatMap((type) => filterOptions[type].map((option) => <tr key={`${type}-${option.id}`}>
            <td>{filterOptionTypeLabel[type]}</td>
            <td>{option.id}</td>
            <td>{option.labelKo}</td>
            <td>{option.labelEn}</td>
            <td>{option.isVisible ? '표시' : '숨김'}</td>
            <td>{option.sortOrder}</td>
            <td>
              <div className="admin-actions tight">
                <button type="button" onClick={() => toggleFilterOption(type, option)}>{option.isVisible ? '숨김' : '표시'}</button>
                <button type="button" onClick={() => deleteFilterOption(type, option.id)}>삭제</button>
              </div>
            </td>
          </tr>))}</tbody>
        </table>
        {filterOptions.categories.length + filterOptions.collections.length === 0 && <p className="admin-empty">추가된 필터 옵션이 없습니다.</p>}
      </div>
    </section>
  </>
}
