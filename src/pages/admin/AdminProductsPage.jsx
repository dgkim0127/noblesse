import { useMemo, useState } from 'react'
import { AdminLink, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const visibilityTabs = [
  { label: 'All', value: '' },
  { label: 'Visible', value: 'true' },
  { label: 'Hidden', value: 'false' },
]

const initialProductForm = {
  code: '',
  nameEn: '',
  categoryKey: '',
  material: '',
  moqDefault: '1',
  isVisible: false,
}
const pageSize = 20

export function AdminProductsPage() {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState(initialProductForm)
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingProductId, setSavingProductId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    visible,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, visible])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getProducts(filters, token), [query, visible, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const loading = <AdminApiState error={error} status={status} />
  if (loading) return loading

  const products = data?.products || []

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const createProduct = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      await mutate((api, token) => api.createProduct({
        code: form.code.trim(),
        nameEn: form.nameEn.trim(),
        categoryKey: form.categoryKey.trim() || undefined,
        material: form.material.trim() || undefined,
        moqDefault: Number(form.moqDefault || 1),
        colors: [],
        sizes: [],
        imageSet: {},
        imageAlt: {},
        isVisible: form.isVisible,
      }, token))
      setMessage('Product created.')
      setForm(initialProductForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to create product.')
    }
  }

  const updateVisibility = async (productId, nextVisible) => {
    setSavingProductId(productId)
    setMessage('')
    try {
      await mutate((api, token) => api.updateProductVisibility(productId, nextVisible, token))
      setMessage(nextVisible ? 'Product is now visible.' : 'Product is now hidden.')
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || 'Unable to update product visibility.')
    } finally {
      setSavingProductId('')
    }
  }

  return <>
    <AdminPageHeader
      eyebrow="Admin API"
      title="Product Management"
      description="Review catalog metadata and control public visibility through the trusted backend API."
    />
    <AdminPreviewNote>Product editing, price updates, image workflow, and destructive actions remain out of scope for this release.</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createProduct}>
      <label className="admin-search">Code<input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="E2E_33A3_NB" required /></label>
      <label className="admin-search">Name<input value={form.nameEn} onChange={(event) => setField('nameEn', event.target.value)} placeholder="Staging Product" required /></label>
      <label className="admin-search">Category Key<input value={form.categoryKey} onChange={(event) => setField('categoryKey', event.target.value)} placeholder="category key" /></label>
      <label className="admin-search">Material<input value={form.material} onChange={(event) => setField('material', event.target.value)} placeholder="Surgical Steel" /></label>
      <label className="admin-search">MOQ<input value={form.moqDefault} min="1" onChange={(event) => setField('moqDefault', event.target.value)} type="number" /></label>
      <label className="admin-check"><input checked={form.isVisible} onChange={(event) => setField('isVisible', event.target.checked)} type="checkbox" /> Visible</label>
      <button className="primary-action" type="submit">Create Product</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">Product Search<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="NB-001 or product name" /></label>
      <div className="admin-filter-tabs">
        {visibilityTabs.map((tab) => <button className={visible === tab.value ? 'active' : ''} key={tab.label} type="button" onClick={() => resetPage(setVisible)(tab.value)}>{tab.label}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Category</th><th>Material</th><th>Colors</th><th>Sizes</th><th>MOQ Default</th><th>Visible</th><th>Export Available</th><th>New</th><th>Best</th><th>Actions</th></tr></thead>
          <tbody>{products.map((product) => {
            const productRouteId = product.productId || product.code || product.id
            return <tr key={product.id}>
            <td>{product.code}</td>
            <td>{product.nameEn || product.nameKo || product.nameJa || '-'}</td>
            <td>{product.categoryNameEn || product.categoryNameKo || product.categoryId || '-'}</td>
            <td>{product.material || '-'}</td>
            <td>{(product.colors || []).join(', ') || '-'}</td>
            <td>{(product.sizes || []).join(', ') || '-'}</td>
            <td>{product.moqDefault ?? '-'}</td>
            <td>{product.isVisible ? 'Visible' : 'Hidden'}</td>
            <td>{product.isExportAvailable ? 'Available' : 'Unavailable'}</td>
            <td>{product.isNew ? 'Yes' : 'No'}</td>
            <td>{product.isBest ? 'Yes' : 'No'}</td>
            <td>
              <div className="admin-actions tight">
                <AdminLink to={`/products/${productRouteId}`}>View Product</AdminLink>
                <button
                  disabled={savingProductId === product.id}
                  type="button"
                  onClick={() => updateVisibility(product.id, !product.isVisible)}
                >
                  {product.isVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  disabled={savingProductId === product.id}
                  type="button"
                  onClick={async () => {
                    setSavingProductId(product.id)
                    setMessage('')
                    try {
                      await mutate((api, token) => api.updateProduct(product.id, { nameEn: `${product.nameEn || product.code} Updated` }, token))
                      setMessage('Product name updated.')
                      setRefreshKey((current) => current + 1)
                    } catch (error) {
                      setMessage(error?.message || 'Unable to update product.')
                    } finally {
                      setSavingProductId('')
                    }
                  }}
                >
                  Append Update
                </button>
              </div>
            </td>
          </tr>
          })}</tbody>
        </table>
        {products.length === 0 && <p className="admin-empty">No products found.</p>}
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
