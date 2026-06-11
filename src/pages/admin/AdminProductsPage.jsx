import { useMemo, useState } from 'react'
import { getAdminProductSummary } from '../../services'
import { AdminLink, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'

export function AdminProductsPage() {
  const products = getAdminProductSummary()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [material, setMaterial] = useState('ALL')
  const categories = useMemo(() => ['ALL', ...new Set(products.map((product) => product.categoryId))], [products])
  const materials = useMemo(() => ['ALL', ...new Set(products.map((product) => product.material))], [products])
  const filteredProducts = useMemo(() => products.filter((product) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [product.code, product.nameEn, product.nameKo, product.nameJa].some((value) => String(value).toLowerCase().includes(term))
    const matchesCategory = category === 'ALL' || product.categoryId === category
    const matchesMaterial = material === 'ALL' || product.material === material
    return matchesQuery && matchesCategory && matchesMaterial
  }), [category, material, products, query])

  return <>
    <AdminPageHeader title="Product Management Preview" description="Display-only product metadata preview aligned with future PostgreSQL/Supabase product and catalog records." />
    <AdminPreviewNote>Product Management is display-only in this preview. Production product edits must go through trusted admin API/RPC.</AdminPreviewNote>

    <div className="admin-toolbar">
      <label className="admin-search">Product Code Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="NB-001 or product name" /></label>
      <div className="admin-filter-row">
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Material<select value={material} onChange={(event) => setMaterial(event.target.value)}>{materials.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
    </div>

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Category</th><th>Material</th><th>Colors</th><th>Sizes</th><th>MOQ Default</th><th>Visible</th><th>Export Available</th><th>New</th><th>Best</th><th>Actions</th></tr></thead>
          <tbody>{filteredProducts.map((product) => <tr key={product.productId}>
            <td>{product.code}</td>
            <td>{product.nameEn}</td>
            <td>{product.categoryId}</td>
            <td>{product.material}</td>
            <td>{product.colors.join(', ')}</td>
            <td>{product.sizes.join(', ')}</td>
            <td>{product.moqDefault}</td>
            <td>{product.isVisible ? 'Visible' : 'Hidden'}</td>
            <td>{product.isExportAvailable ? 'Available' : 'Unavailable'}</td>
            <td>{product.isNew ? 'Yes' : 'No'}</td>
            <td>{product.isBest ? 'Yes' : 'No'}</td>
            <td><div className="admin-actions tight"><AdminLink to={`/products/${product.productId}`}>View Product</AdminLink><button type="button">Edit Preview</button></div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
