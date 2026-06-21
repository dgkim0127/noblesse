import { useMemo, useState } from 'react'
import { AdminLink, AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

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
  const t = useAdminCopy()
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
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

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
      setMessage(t.products.created)
      setForm(initialProductForm)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.products.createFailed)
    }
  }

  const updateVisibility = async (productId, nextVisible) => {
    setSavingProductId(productId)
    setMessage('')
    try {
      await mutate((api, token) => api.updateProductVisibility(productId, nextVisible, token))
      setMessage(nextVisible ? t.products.visibleNow : t.products.hiddenNow)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || t.products.updateFailed)
    } finally {
      setSavingProductId('')
    }
  }

  return <>
    <AdminPageHeader
      title={t.products.title}
      description={t.products.description}
      actions={<AdminLink className="primary-action" to="/admin/catalog/new">{t.dashboard.addProduct}</AdminLink>}
    />
    <AdminPreviewNote>{t.products.note}</AdminPreviewNote>

    <form className="admin-toolbar" onSubmit={createProduct}>
      <label className="admin-search">{t.products.code}<input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="NB-001" required /></label>
      <label className="admin-search">{t.products.name}<input value={form.nameEn} onChange={(event) => setField('nameEn', event.target.value)} placeholder={t.products.name} required /></label>
      <label className="admin-search">{t.products.categoryKey}<input value={form.categoryKey} onChange={(event) => setField('categoryKey', event.target.value)} placeholder={t.products.categoryKey} /></label>
      <label className="admin-search">{t.products.material}<input value={form.material} onChange={(event) => setField('material', event.target.value)} placeholder={t.products.material} /></label>
      <label className="admin-search">{t.products.moq}<input value={form.moqDefault} min="1" onChange={(event) => setField('moqDefault', event.target.value)} type="number" /></label>
      <label className="admin-check"><input checked={form.isVisible} onChange={(event) => setField('isVisible', event.target.checked)} type="checkbox" /> {t.common.visible}</label>
      <button className="primary-action" type="submit">{t.products.create}</button>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">{t.products.searchLabel}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder={t.products.searchPlaceholder} /></label>
      <div className="admin-filter-tabs">
        {[['', t.common.all], ['true', t.common.visible], ['false', t.common.hidden]].map(([value, label]) => <button className={visible === value ? 'active' : ''} key={value || 'all'} type="button" onClick={() => resetPage(setVisible)(value)}>{label}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{t.fields.productCode}</th><th>{t.fields.productName}</th><th>{t.fields.category}</th><th>{t.fields.material}</th><th>{t.fields.colors}</th><th>{t.fields.sizes}</th><th>{t.fields.moqDefault}</th><th>{t.common.visible}</th><th>{t.products.exportAvailable}</th><th>{t.products.isNew}</th><th>{t.products.isBest}</th><th>{t.common.actions}</th></tr></thead>
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
            <td>{product.isVisible ? t.common.visible : t.common.hidden}</td>
            <td>{product.isExportAvailable ? t.common.available : t.common.unavailable}</td>
            <td>{product.isNew ? t.common.yes : t.common.no}</td>
            <td>{product.isBest ? t.common.yes : t.common.no}</td>
            <td>
              <div className="admin-actions tight">
                <AdminLink to={`/products/${productRouteId}`}>{t.products.viewProduct}</AdminLink>
                <button
                  disabled={savingProductId === product.id}
                  type="button"
                  onClick={() => updateVisibility(product.id, !product.isVisible)}
                >
                  {product.isVisible ? t.common.hide : t.common.show}
                </button>
                <button
                  disabled={savingProductId === product.id}
                  type="button"
                  onClick={async () => {
                    setSavingProductId(product.id)
                    setMessage('')
                    try {
                      await mutate((api, token) => api.updateProduct(product.id, { nameEn: `${product.nameEn || product.code} Updated` }, token))
                      setMessage(t.products.nameUpdated)
                      setRefreshKey((current) => current + 1)
                    } catch (error) {
                      setMessage(error?.message || t.products.updateFailed)
                    } finally {
                      setSavingProductId('')
                    }
                  }}
                >
                  {t.common.appendUpdate}
                </button>
              </div>
            </td>
          </tr>
          })}</tbody>
        </table>
        {products.length === 0 && <p className="admin-empty">{t.products.empty}</p>}
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
