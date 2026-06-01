import { Grid2X2, List, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'

export function ProductsPage() {
  const { products } = useCommerce()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체')
  const [gridMode, setGridMode] = useState('two')
  const categories = ['전체', ...new Set(products.map((product) => product.category))]
  const filtered = useMemo(() => products.filter((product) => product.status !== '숨김' && (category === '전체' || product.category === category) && [product.ko, product.ja, product.id].some((value) => value.toLowerCase().includes(query.toLowerCase()))), [category, products, query])

  return (
    <main className="store-main">
      <div className="page-heading"><div><p>JEWELRY CATALOG</p><h1>전체 상품</h1></div><span>{filtered.length}개 상품</span></div>
      <label className="catalog-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명, 일본어명, 품번으로 검색" /></label>
      <div className="catalog-toolbar">
        <div className="category-chips">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="grid-switch"><SlidersHorizontal size={16} /><button className={gridMode === 'two' ? 'active' : ''} type="button" onClick={() => setGridMode('two')} aria-label="2열 보기"><Grid2X2 size={16} /></button><button className={gridMode === 'one' ? 'active' : ''} type="button" onClick={() => setGridMode('one')} aria-label="1열 보기"><List size={17} /></button></div>
      </div>
      <div className={`retail-grid catalog-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.id} product={product} />)}</div>
    </main>
  )
}
