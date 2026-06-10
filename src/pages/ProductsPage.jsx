import { Grid2X2, List, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { mockCollections } from '../data/catalog'
import { useLocalePath } from '../utils/locale'

const categoryLabels = {
  all: '전체',
  piercing: '피어싱',
  earrings: '귀걸이',
  barbell: '바벨',
  labret: '라블렛',
  'nose-piercing': '노즈 피어싱',
  'belly-ring': '배꼽 링',
  cubic: '큐빅',
  pearl: '진주',
  '14k-gold': '14K 골드',
  titanium: '티타늄',
  'surgical-steel': '써지컬 스틸',
}

const tagLabels = {
  new: '신상품',
  best: '베스트',
}

const filterLabelNames = {
  Category: '카테고리',
  Collection: '컬렉션',
  Material: '재질',
  Color: '컬러',
  Tag: '태그',
  Search: '검색어',
}

const collectionLabels = Object.fromEntries(mockCollections.map((collection) => [collection.collectionId, collection.titleKo]))

const formatCategoryLabel = (categoryId) => categoryLabels[categoryId] ?? categoryId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

const hasText = (value, query) => String(value ?? '').toLowerCase().includes(query)

export function ProductsPage() {
  const { products } = useCommerce()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gridMode, setGridMode] = useState('two')
  const { toLocalePath } = useLocalePath()

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
      <div><p>상품 목록</p><h1>피어싱 카탈로그</h1></div>
      <span>{filtered.length}개 상품</span>
    </div>

    <form className="product-search" onSubmit={submitSearch}>
      <Search size={18} />
      <input key={q} name="q" defaultValue={q} placeholder="피어싱, 재질, 스타일을 검색해보세요" />
      <button type="submit">검색</button>
    </form>

    {hasFilters && <div className="filter-summary">
      <div className="filter-chips">
        {filterChips.map(([label, value]) => <span className="filter-chip" key={`${label}-${value}`}><b>{filterLabelNames[label]}:</b> {value}</span>)}
      </div>
      <Link className="clear-filters" to={toLocalePath('/products')}><X size={14} />필터 초기화</Link>
    </div>}

    <div className="product-tools">
      <div className="category-list">
        {categories.map((item) => <button className={(item === 'all' ? !category : category === item) ? 'active' : ''} key={item} type="button" onClick={() => setFilter('category', item === 'all' ? '' : item)}>{formatCategoryLabel(item)}</button>)}
      </div>
      <div className="view-switch">
        <button className={gridMode === 'two' ? 'active' : ''} type="button" aria-label="그리드 보기" onClick={() => setGridMode('two')}><Grid2X2 size={16} /></button>
        <button className={gridMode === 'one' ? 'active' : ''} type="button" aria-label="리스트 보기" onClick={() => setGridMode('one')}><List size={17} /></button>
      </div>
    </div>

    {filtered.length > 0
      ? <div className={`catalog-grid product-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
      : <section className="empty product-empty"><h2>조건에 맞는 상품이 없습니다.</h2><p>필터를 초기화하거나 다른 카테고리를 선택해보세요.</p><small>No products found for this filter. Try another category or clear filters.</small><Link className="secondary-action" to={toLocalePath('/products')}>필터 초기화</Link></section>}
  </main>
}
