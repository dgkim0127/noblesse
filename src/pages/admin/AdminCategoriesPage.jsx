import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

const initialForm = {
  categoryId: '',
  nameEn: '',
  nameKo: '',
  nameJa: '',
  slug: '',
  sortOrder: '0',
  isVisible: false,
}
const pageSize = 20

export function AdminCategoriesPage() {
  const t = useAdminCopy()
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    visible,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, visible])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getCategories(filters, token), [query, visible, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const categories = data?.categories || []

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
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
  </>
}
