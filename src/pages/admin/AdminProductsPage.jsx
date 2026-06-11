import { getAdminProductSummary } from '../../services'
import { AdminLink, AdminPageHeader, AdminPreviewNote } from './AdminPageParts'

export function AdminProductsPage() {
  const products = getAdminProductSummary()

  return <>
    <AdminPageHeader title="Product Management Preview" description="Display-only product metadata preview aligned with future PostgreSQL/Supabase product and catalog records." />
    <AdminPreviewNote>Product creation, image upload, and Storage connection are intentionally not implemented in this preview.</AdminPreviewNote>

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Category</th><th>Material</th><th>Colors</th><th>Sizes</th><th>MOQ Default</th><th>Visible</th><th>Export Available</th><th>New</th><th>Best</th><th>Actions</th></tr></thead>
          <tbody>{products.map((product) => <tr key={product.productId}>
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
