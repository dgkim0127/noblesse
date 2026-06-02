import { Grid2X2, List, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'

export function ProductsPage() {
  const { products } = useCommerce()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [gridMode, setGridMode] = useState('two')
  const categories = ['all', ...new Set(products.map((product) => product.categoryId))]
  const filtered = useMemo(() => products.filter((product) => product.isVisible && (category === 'all' || product.categoryId === category) && [product.code, product.nameEn, product.nameJa].some((value) => value.toLowerCase().includes(query.toLowerCase()))), [category, products, query])
  return <main className="content"><div className="page-title"><div><p>PRODUCT LIST</p><h1>Jewelry catalog</h1></div><span>{filtered.length} items</span></div><label className="product-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product name or code" /></label><div className="product-tools"><div className="category-list">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div><div className="view-switch"><button className={gridMode === 'two' ? 'active' : ''} type="button" aria-label="Grid view" onClick={() => setGridMode('two')}><Grid2X2 size={16} /></button><button className={gridMode === 'one' ? 'active' : ''} type="button" aria-label="List view" onClick={() => setGridMode('one')}><List size={17} /></button></div></div><div className={`catalog-grid product-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div></main>
}
