import { Grid2X2, List, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { mockCollections } from '../data/catalog'

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

const tagLabels = {
  new: 'New',
  best: 'Best',
}

const collectionLabels = Object.fromEntries(mockCollections.map((collection) => [collection.collectionId, collection.titleEn]))

const formatCategoryLabel = (categoryId) => categoryLabels[categoryId] ?? categoryId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

const hasText = (value, query) => String(value ?? '').toLowerCase().includes(query)

export function ProductsPage() {
  const { products } = useCommerce()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gridMode, setGridMode] = useState('two')

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const collection = searchParams.get('collection') ?? ''
  const material = searchParams.get('material') ?? ''
  const color = searchParams.get('color') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const hasFilters = Boolean(q || category || collection || material || color || tag)

  const categories = ['all', ...new Set(products.map((product) => product.categoryId))]
  const filtered = useMemo(() => {
    const normalizedQuery = q.trim().toLowerCase()

    return products.filter((product) => {
      if (!product.isVisible) return false
      if (category && product.categoryId !== category) return false
      if (collection && !product.collectionIds.includes(collection)) return false
      if (material && product.material !== material) return false
      if (color && !product.colors.includes(color)) return false
      if (tag === 'new' && !product.isNew) return false
      if (tag === 'best' && !product.isBest) return false
      if (tag && !['new', 'best'].includes(tag)) return false

      if (!normalizedQuery) return true

      return [
        product.code,
        product.nameKo,
        product.nameEn,
        product.nameJa,
        product.material,
      ].some((value) => hasText(value, normalizedQuery))
    })
  }, [category, collection, color, material, products, q, tag])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  const submitSearch = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setFilter('q', String(formData.get('q') ?? '').trim())
  }

  const filterChips = [
    category && ['Category', formatCategoryLabel(category)],
    collection && ['Collection', collectionLabels[collection] ?? collection],
    material && ['Material', material],
    color && ['Color', color],
    tag && ['Tag', tagLabels[tag] ?? tag],
    q && ['Search', q],
  ].filter(Boolean)

  return <main className="content">
    <div className="page-title">
      <div><p>PRODUCT LIST</p><h1>Piercing catalog</h1></div>
      <span>{filtered.length} items</span>
    </div>

    <form className="product-search" onSubmit={submitSearch}>
      <Search size={18} />
      <input key={q} name="q" defaultValue={q} placeholder="Search piercing, material, or style" />
      <button type="submit">Search</button>
    </form>

    {hasFilters && <div className="filter-summary">
      <div className="filter-chips">
        {filterChips.map(([label, value]) => <span className="filter-chip" key={`${label}-${value}`}><b>{label}:</b> {value}</span>)}
      </div>
      <Link className="clear-filters" to="/products"><X size={14} />Clear filters</Link>
    </div>}

    <div className="product-tools">
      <div className="category-list">
        {categories.map((item) => <button className={(item === 'all' ? !category : category === item) ? 'active' : ''} key={item} type="button" onClick={() => setFilter('category', item === 'all' ? '' : item)}>{formatCategoryLabel(item)}</button>)}
      </div>
      <div className="view-switch">
        <button className={gridMode === 'two' ? 'active' : ''} type="button" aria-label="Grid view" onClick={() => setGridMode('two')}><Grid2X2 size={16} /></button>
        <button className={gridMode === 'one' ? 'active' : ''} type="button" aria-label="List view" onClick={() => setGridMode('one')}><List size={17} /></button>
      </div>
    </div>

    {filtered.length > 0
      ? <div className={`catalog-grid product-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
      : <section className="empty product-empty"><h2>No products found for this filter.</h2><p>Try another category or clear filters.</p><small>조건에 맞는 상품이 없습니다. 필터를 초기화하거나 다른 카테고리를 선택하세요.</small><Link className="secondary-action" to="/products">Clear filters</Link></section>}
  </main>
}
