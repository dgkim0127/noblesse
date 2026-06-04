import { Grid2X2, List, Search } from 'lucide-react'
import { useState } from 'react'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'

const categoryLabels = {
  all: 'All',
  piercing: 'Piercing',
  earrings: 'Earrings',
  barbell: 'Barbell',
  labret: 'Labret',
  'nose-piercing': 'Nose Piercing',
  'belly-ring': 'Belly Ring',
  cubic: 'Cubic',
  pearl: 'Pearl',
  '14k-gold': '14K Gold',
  titanium: 'Titanium',
  'surgical-steel': 'Surgical Steel',
}

const formatCategoryLabel = (categoryId) => categoryLabels[categoryId] ?? categoryId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

export function ProductsPage() {
  const { products } = useCommerce()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [gridMode, setGridMode] = useState('two')
  const categories = ['all', ...new Set(products.map((product) => product.categoryId))]
  const normalizedQuery = query.toLowerCase()
  const filtered = products.filter((product) => product.isVisible && (category === 'all' || product.categoryId === category) && [product.code, product.nameEn, product.nameJa].some((value) => value.toLowerCase().includes(normalizedQuery)))
  return <main className="content"><div className="page-title"><div><p>PRODUCT LIST</p><h1>Piercing catalog</h1></div><span>{filtered.length} items</span></div><label className="product-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search piercing, material, or style" /></label><div className="product-tools"><div className="category-list">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{formatCategoryLabel(item)}</button>)}</div><div className="view-switch"><button className={gridMode === 'two' ? 'active' : ''} type="button" aria-label="Grid view" onClick={() => setGridMode('two')}><Grid2X2 size={16} /></button><button className={gridMode === 'one' ? 'active' : ''} type="button" aria-label="List view" onClick={() => setGridMode('one')}><List size={17} /></button></div></div><div className={`catalog-grid product-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div></main>
}
