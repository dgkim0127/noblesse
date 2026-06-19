import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const visibilityTabs = [
  { label: 'All', value: '' },
  { label: 'Visible', value: 'true' },
  { label: 'Hidden', value: 'false' },
]

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
      setMessage('Category created.')
      setForm(initialForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to create category.')
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
      setMessage(error?.message || 'Unable to update category.')
    } finally {
      setSavingId('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Category Management"
      description="Create, review, and deactivate catalog categories through protected admin API writes."
    />
    <AdminPreviewNote>Categories are deactivated by setting visibility off. No destructive delete runs from this screen.</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createCategory}>
      <label className="admin-search">Category Key<input value={form.categoryId} onChange={(event) => setField('categoryId', event.target.value)} placeholder="E2E_33A3_category" required /></label>
      <label className="admin-search">English Name<input value={form.nameEn} onChange={(event) => setField('nameEn', event.target.value)} placeholder="Staging Category" required /></label>
      <label className="admin-search">Slug<input value={form.slug} onChange={(event) => setField('slug', event.target.value)} placeholder="staging-category" required /></label>
      <label className="admin-search">Sort<input value={form.sortOrder} onChange={(event) => setField('sortOrder', event.target.value)} type="number" /></label>
      <label className="admin-check"><input checked={form.isVisible} onChange={(event) => setField('isVisible', event.target.checked)} type="checkbox" /> Visible</label>
      <button className="primary-action" type="submit">Create Category</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">Search Categories<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="category key or name" /></label>
      <div className="admin-filter-tabs">
        {visibilityTabs.map((tab) => <button className={visible === tab.value ? 'active' : ''} key={tab.label} type="button" onClick={() => resetPage(setVisible)(tab.value)}>{tab.label}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Key</th><th>Name</th><th>Slug</th><th>Visible</th><th>Sort</th><th>Actions</th></tr></thead>
          <tbody>{categories.map((category) => <tr key={category.id}>
            <td>{category.categoryId}</td>
            <td>{category.nameEn || category.nameKo || category.nameJa || '-'}</td>
            <td>{category.slug}</td>
            <td>{category.isVisible ? 'Visible' : 'Hidden'}</td>
            <td>{category.sortOrder ?? 0}</td>
            <td>
              <div className="admin-actions tight">
                <button
                  disabled={savingId === category.id}
                  onClick={() => updateCategory(category.id, { isVisible: !category.isVisible }, category.isVisible ? 'Category hidden.' : 'Category visible.')}
                  type="button"
                >
                  {category.isVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  disabled={savingId === category.id}
                  onClick={() => updateCategory(category.id, { nameEn: `${category.nameEn || category.categoryId} Updated` }, 'Category name updated.')}
                  type="button"
                >
                  Append Update
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {categories.length === 0 && <p className="admin-empty">No categories found.</p>}
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
