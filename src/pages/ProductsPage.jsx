import { Grid2X2, List, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const productPageCopy = {
  kr: {
    eyebrow: '상품 목록',
    title: '피어싱 카탈로그',
    count: (count) => `${count}개 상품`,
    searchPlaceholder: '피어싱, 재질, 스타일을 검색해보세요',
    searchButton: '검색',
    clearFilters: '필터 초기화',
    gridAria: '그리드 보기',
    listAria: '리스트 보기',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '필터를 초기화하거나 다른 카테고리를 선택해보세요.',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  en: {
    eyebrow: 'Product list',
    title: 'Piercing Catalog',
    count: (count) => `${count} products`,
    searchPlaceholder: 'Search piercing, material, or style',
    searchButton: 'Search',
    clearFilters: 'Clear filters',
    gridAria: 'Grid view',
    listAria: 'List view',
    emptyTitle: 'No products match this filter.',
    emptyBody: 'Clear filters or choose another category.',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  jp: {
    eyebrow: '商品一覧',
    title: 'ピアスカタログ',
    count: (count) => `${count} 商品`,
    searchPlaceholder: 'ピアス、素材、スタイルを検索',
    searchButton: '検索',
    clearFilters: 'フィルターを解除',
    gridAria: 'グリッド表示',
    listAria: 'リスト表示',
    emptyTitle: '条件に合う商品がありません。',
    emptyBody: 'フィルターを解除するか、別のカテゴリを選択してください。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  cn: {
    eyebrow: '商品列表',
    title: '穿孔商品目录',
    count: (count) => `${count}件商品`,
    searchPlaceholder: '搜索穿孔、材质或风格',
    searchButton: '搜索',
    clearFilters: '清除筛选',
    gridAria: '网格视图',
    listAria: '列表视图',
    emptyTitle: '没有符合条件的商品。',
    emptyBody: '请清除筛选或选择其他分类。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
}

const categoryLabels = {
  kr: {
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
  },
  en: {
    all: 'All',
    piercing: 'Piercing',
    earrings: 'Earrings',
    barbell: 'Barbell',
    labret: 'Labret',
    'nose-piercing': 'Nose piercing',
    'belly-ring': 'Belly ring',
    cubic: 'Cubic',
    pearl: 'Pearl',
    '14k-gold': '14K Gold',
    titanium: 'Titanium',
    'surgical-steel': 'Surgical Steel',
  },
  jp: {
    all: 'すべて',
    piercing: 'ピアス',
    earrings: 'イヤリング',
    barbell: 'バーベル',
    labret: 'ラブレット',
    'nose-piercing': 'ノーズピアス',
    'belly-ring': 'へそピアス',
    cubic: 'キュービック',
    pearl: 'パール',
    '14k-gold': '14Kゴールド',
    titanium: 'チタン',
    'surgical-steel': 'サージカルスチール',
  },
  cn: {
    all: '全部',
    piercing: '穿孔饰品',
    earrings: '耳饰',
    barbell: '杠铃',
    labret: '唇钉',
    'nose-piercing': '鼻钉',
    'belly-ring': '肚脐环',
    cubic: '锆石',
    pearl: '珍珠',
    '14k-gold': '14K金',
    titanium: '钛钢',
    'surgical-steel': '医用钢',
  },
}

const tagLabels = {
  kr: { new: '신상품', best: '베스트' },
  en: { new: 'New', best: 'Best' },
  jp: { new: '新商品', best: 'ベスト' },
  cn: { new: '新品', best: '热选' },
}

const filterLabelNames = {
  kr: { Category: '카테고리', Collection: '컬렉션', Material: '재질', Color: '컬러', Tag: '태그', Search: '검색어' },
  en: { Category: 'Category', Collection: 'Collection', Material: 'Material', Color: 'Color', Tag: 'Tag', Search: 'Search' },
  jp: { Category: 'カテゴリ', Collection: 'コレクション', Material: '素材', Color: 'カラー', Tag: 'タグ', Search: '検索語' },
  cn: { Category: '分类', Collection: '系列', Material: '材质', Color: '颜色', Tag: '标签', Search: '搜索词' },
}

const collectionLabels = {
  kr: {
    'japan-buyer-picks': '일본 셀렉션',
    'us-buyer-picks': '미국 셀렉션',
    'minimal-piercing-line': '미니멀 피어싱 라인',
    'premium-cubic-line': '프리미엄 큐빅 라인',
    'export-best-items': '수출 베스트 아이템',
    'new-arrivals': '신상품',
  },
  en: {
    'japan-buyer-picks': 'Japan Selection',
    'us-buyer-picks': 'US Selection',
    'minimal-piercing-line': 'Minimal Piercing Line',
    'premium-cubic-line': 'Premium Cubic Line',
    'export-best-items': 'Export Best Items',
    'new-arrivals': 'New Arrivals',
  },
  jp: {
    'japan-buyer-picks': '日本セレクション',
    'us-buyer-picks': '米国セレクション',
    'minimal-piercing-line': 'ミニマルピアスライン',
    'premium-cubic-line': 'プレミアムキュービックライン',
    'export-best-items': '輸出ベストアイテム',
    'new-arrivals': '新商品',
  },
  cn: {
    'japan-buyer-picks': '日本精选',
    'us-buyer-picks': '美国精选',
    'minimal-piercing-line': '极简穿孔系列',
    'premium-cubic-line': '高级锆石系列',
    'export-best-items': '出口精选',
    'new-arrivals': '新品',
  },
}

const formatCategoryLabel = (categoryId, locale) => categoryLabels[locale]?.[categoryId] ?? categoryLabels.en[categoryId] ?? categoryId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

const hasText = (value, query) => String(value ?? '').toLowerCase().includes(query)

export function ProductsPage() {
  const { products } = useCommerce()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gridMode, setGridMode] = useState('two')
  const { locale, toLocalePath } = useLocalePath()
  const copy = productPageCopy[locale] ?? productPageCopy.kr
  const localeCollectionLabels = collectionLabels[locale] ?? collectionLabels.en

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
    category && ['Category', formatCategoryLabel(category, locale)],
    collection && ['Collection', localeCollectionLabels[collection] ?? collection],
    material && ['Material', material],
    color && ['Color', color],
    tag && ['Tag', tagLabels[locale]?.[tag] ?? tagLabels.en[tag] ?? tag],
    q && ['Search', q],
  ].filter(Boolean)

  return <main className="content">
    <div className="page-title">
      <div><p>{copy.eyebrow}</p><h1>{copy.title}</h1></div>
      <span>{copy.count(filtered.length)}</span>
    </div>

    <form className="product-search" onSubmit={submitSearch}>
      <Search size={18} />
      <input key={q} name="q" defaultValue={q} placeholder={copy.searchPlaceholder} />
      <button type="submit">{copy.searchButton}</button>
    </form>

    {hasFilters && <div className="filter-summary">
      <div className="filter-chips">
        {filterChips.map(([label, value]) => <span className="filter-chip" key={`${label}-${value}`}><b>{filterLabelNames[locale]?.[label] ?? label}:</b> {value}</span>)}
      </div>
      <Link className="clear-filters" to={toLocalePath('/products')}><X size={14} />{copy.clearFilters}</Link>
    </div>}

    <div className="product-tools">
      <div className="category-list">
        {categories.map((item) => <button className={(item === 'all' ? !category : category === item) ? 'active' : ''} key={item} type="button" onClick={() => setFilter('category', item === 'all' ? '' : item)}>{formatCategoryLabel(item, locale)}</button>)}
      </div>
      <div className="view-switch">
        <button className={gridMode === 'two' ? 'active' : ''} type="button" aria-label={copy.gridAria} onClick={() => setGridMode('two')}><Grid2X2 size={16} /></button>
        <button className={gridMode === 'one' ? 'active' : ''} type="button" aria-label={copy.listAria} onClick={() => setGridMode('one')}><List size={17} /></button>
      </div>
    </div>

    {filtered.length > 0
      ? <div className={`catalog-grid product-results ${gridMode === 'one' ? 'one-column' : ''}`}>{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
      : <section className="empty product-empty"><h2>{copy.emptyTitle}</h2><p>{copy.emptyBody}</p><small>{copy.emptySmall}</small><Link className="secondary-action" to={toLocalePath('/products')}>{copy.clearFilters}</Link></section>}
  </main>
}
