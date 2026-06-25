import { Grid2X2, Home, List, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { getCatalogFilterOptionLabel, loadCatalogFilterOptions, subscribeCatalogFilterOptions } from '../services/catalogFilterOptions'
import { resolveLocaleCopy, useLocalePath } from '../utils/locale'

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

const productFilterCopy = {
  kr: {
    all: '전체',
    best: '베스트',
    category: '카테고리',
    close: '필터 닫기',
    collection: '컬렉션',
    material: '소재',
    new: '신상품',
    open: '필터',
    reset: '초기화',
    tag: '상태',
  },
  en: {
    all: 'All',
    best: 'Best',
    category: 'Category',
    close: 'Close filters',
    collection: 'Collection',
    material: 'Material',
    new: 'New',
    open: 'Filter',
    reset: 'Reset',
    tag: 'Status',
  },
  jp: {
    all: 'すべて',
    best: 'ベスト',
    category: 'カテゴリー',
    close: 'フィルターを閉じる',
    collection: 'コレクション',
    material: '素材',
    new: '新商品',
    open: 'フィルター',
    reset: 'リセット',
    tag: 'ステータス',
  },
  cn: {
    all: '全部',
    best: '精选',
    category: '分类',
    close: '关闭筛选',
    collection: '系列',
    material: '材质',
    new: '新品',
    open: '筛选',
    reset: '重置',
    tag: '状态',
  },
}

const productFolderCopy = {
  kr: {
    aria: '상품 폴더 경로',
    home: '홈',
    root: '피어싱',
    folders: {
      'ring-piercing': '링피어싱',
      'one-touch-segment': '원터치/세그먼트',
      segment: '세그먼트',
      labret: '라블렛',
      barbell: '바벨',
      cubic: '큐빅',
      silver: '실버 925',
    },
  },
  en: {
    aria: 'Product folder path',
    home: 'Home',
    root: 'Piercing',
    folders: {
      'ring-piercing': 'Ring Piercing',
      'one-touch-segment': 'One-touch / Segment',
      segment: 'Segment',
      labret: 'Labret',
      barbell: 'Barbell',
      cubic: 'Cubic',
      silver: 'Silver 925',
    },
  },
  jp: {
    aria: '商品フォルダーのパス',
    home: 'ホーム',
    root: 'ピアス',
    folders: {
      'ring-piercing': 'リングピアス',
      'one-touch-segment': 'ワンタッチ / セグメント',
      segment: 'セグメント',
      labret: 'ラブレット',
      barbell: 'バーベル',
      cubic: 'キュービック',
      silver: 'シルバー 925',
    },
  },
  cn: {
    aria: '商品文件夹路径',
    home: '首页',
    root: '穿孔',
    folders: {
      'ring-piercing': '环形穿孔',
      'one-touch-segment': '一触式 / 分段环',
      segment: '分段环',
      labret: '唇钉',
      barbell: '杠铃',
      cubic: '锆石',
      silver: '银 925',
    },
  },
}

const formatCategoryLabel = (categoryId, locale) => {
  const labels = resolveLocaleCopy(categoryLabels, locale, 'en')
  return labels?.[categoryId] ?? categoryLabels.en[categoryId] ?? categoryId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const hiddenCategoryFilters = new Set(['14k-gold'])
const hiddenMaterialFilters = new Set(['14K Gold'])
const materialLabels = {
  kr: {
    'Surgical Steel': '써지컬 스틸',
    Titanium: '티타늄',
    Pearl: '진주',
    Cubic: '큐빅',
  },
  en: {
    'Surgical Steel': 'Surgical Steel',
    Titanium: 'Titanium',
    Pearl: 'Pearl',
    Cubic: 'Cubic',
  },
  jp: {
    'Surgical Steel': 'サージカルスチール',
    Titanium: 'チタン',
    Pearl: 'パール',
    Cubic: 'キュービック',
  },
  cn: {
    'Surgical Steel': '医用钢',
    Titanium: '钛',
    Pearl: '珍珠',
    Cubic: '锆石',
  },
}

const formatMaterialLabel = (materialName, locale) => {
  const labels = resolveLocaleCopy(materialLabels, locale, 'en')
  return labels?.[materialName] ?? materialLabels.en[materialName] ?? materialName
}

const formatFolderLabel = (folderId, locale) => {
  const decoded = decodeURIComponent(folderId)
  const copy = resolveLocaleCopy(productFolderCopy, locale, 'en')
  return copy?.folders?.[decoded]
    ?? productFolderCopy.en.folders[decoded]
    ?? decoded.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const hasText = (value, query) => String(value ?? '').toLowerCase().includes(query)

export function ProductsPage() {
  const { dataError, dataStatus, products } = useCommerce()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gridMode, setGridMode] = useState('two')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [managedFilterOptions, setManagedFilterOptions] = useState(() => loadCatalogFilterOptions())
  const { locale, toLocalePath } = useLocalePath()
  const copy = resolveLocaleCopy(productPageCopy, locale)
  const filterCopy = resolveLocaleCopy(productFilterCopy, locale)
  const localeCollectionLabels = resolveLocaleCopy(collectionLabels, locale, 'en')
  const localeTagLabels = resolveLocaleCopy(tagLabels, locale, 'en')
  const localeFilterLabelNames = resolveLocaleCopy(filterLabelNames, locale, 'en')

  useEffect(() => subscribeCatalogFilterOptions(setManagedFilterOptions), [])

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const collection = searchParams.get('collection') ?? ''
  const material = searchParams.get('material') ?? ''
  const color = searchParams.get('color') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const folder = searchParams.get('folder') ?? ''
  const subfolder = searchParams.get('subfolder') ?? ''
  const hasFilters = Boolean(q || category || collection || material || color || tag)

  const managedCategories = managedFilterOptions.categories.filter((item) => item.isVisible && !hiddenCategoryFilters.has(item.id))
  const managedCollections = managedFilterOptions.collections.filter((item) => item.isVisible)
  const managedCategoryLabels = new Map(managedCategories.map((item) => [item.id, getCatalogFilterOptionLabel(item, locale)]))
  const managedCollectionLabels = new Map(managedCollections.map((item) => [item.id, getCatalogFilterOptionLabel(item, locale)]))
  const categories = ['all', ...new Set([
    ...managedCategories.map((item) => item.id),
    ...products.map((product) => product.categoryId).filter((item) => !hiddenCategoryFilters.has(item)),
  ])]
  const materials = [...new Set(products.map((product) => product.material).filter((item) => item && !hiddenMaterialFilters.has(item)))]
  const collections = [...new Set([
    ...managedCollections.map((item) => item.id),
    ...products.flatMap((product) => product.collectionIds ?? []),
  ])]
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

  if (dataStatus === 'loading') {
    return <main className="content"><section className="empty product-empty"><h2>Loading catalog...</h2><p>Product metadata is being loaded from the catalog API.</p></section></main>
  }

  if (dataStatus === 'error') {
    return <main className="content"><section className="empty product-empty"><h2>Catalog API unavailable</h2><p>{dataError || 'Unable to load catalog products.'}</p></section></main>
  }

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  const filterChips = [
    category && ['Category', managedCategoryLabels.get(category) ?? formatCategoryLabel(category, locale)],
    collection && ['Collection', managedCollectionLabels.get(collection) ?? localeCollectionLabels[collection] ?? collection],
    material && ['Material', formatMaterialLabel(material, locale)],
    color && ['Color', color],
    tag && ['Tag', localeTagLabels?.[tag] ?? tagLabels.en[tag] ?? tag],
    q && ['Search', q],
  ].filter(Boolean)

  const folderCopy = resolveLocaleCopy(productFolderCopy, locale)
  const buildProductPath = (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const query = params.toString()
    return toLocalePath(`/products${query ? `?${query}` : ''}`)
  }
  const folderTrail = [
    { icon: true, label: folderCopy.home, to: toLocalePath('/') },
    { label: folderCopy.root, to: buildProductPath() },
    category && { label: managedCategoryLabels.get(category) ?? formatCategoryLabel(category, locale), to: buildProductPath({ category }) },
    collection && { label: managedCollectionLabels.get(collection) ?? localeCollectionLabels[collection] ?? collection, to: buildProductPath({ category, collection }) },
    folder && { label: formatFolderLabel(folder, locale), to: buildProductPath({ category, collection, folder }) },
    subfolder && { label: formatFolderLabel(subfolder, locale) },
  ].filter(Boolean)

  const renderFilterOption = (key, value, label) => {
    const activeValue = searchParams.get(key) ?? ''
    const isActive = value ? activeValue === value : !activeValue
    return <button className={isActive ? 'active' : ''} type="button" onClick={() => setFilter(key, value)}>{label}</button>
  }

  return <main className="content products-content">
    <div className={`product-folder-row ${isFilterOpen ? 'has-filter-open' : ''}`}>
      <nav className="product-folder-trail" aria-label={folderCopy.aria}>
        {folderTrail.map((item, index) => {
          const isLast = index === folderTrail.length - 1
          return <span className="product-folder-item" key={`${item.label}-${index}`}>
            {index > 0 && <span className="product-folder-separator" aria-hidden="true">&gt;</span>}
            {item.to && !isLast
              ? <Link className={item.icon ? 'product-folder-home' : 'product-folder-link'} to={item.to} aria-label={item.icon ? item.label : undefined}>
                {item.icon ? <Home size={28} strokeWidth={1.8} /> : item.label}
              </Link>
              : <span className={item.icon ? 'product-folder-home product-folder-current' : 'product-folder-current'}>
                {item.icon ? <Home size={28} strokeWidth={1.8} /> : item.label}
              </span>}
          </span>
        })}
      </nav>
      <button className={`product-filter-toggle ${isFilterOpen ? 'active' : ''}`} type="button" aria-expanded={isFilterOpen} onClick={() => setIsFilterOpen((current) => !current)}>
        <span className="product-filter-icon" aria-hidden="true"><i /><i /><i /></span>
        <span className="product-filter-label">FILTER</span>
      </button>
      {isFilterOpen && <section className="product-filter-panel" aria-label={filterCopy.open}>
        <div className="product-filter-row">
          <strong>{filterCopy.material}</strong>
          <div>
            {renderFilterOption('material', '', filterCopy.all)}
            {materials.map((item) => renderFilterOption('material', item, formatMaterialLabel(item, locale)))}
          </div>
        </div>
        <div className="product-filter-row">
          <strong>{filterCopy.category}</strong>
          <div>
            {categories.map((item) => renderFilterOption('category', item === 'all' ? '' : item, managedCategoryLabels.get(item) ?? formatCategoryLabel(item, locale)))}
          </div>
        </div>
        <div className="product-filter-row">
          <strong>{filterCopy.collection}</strong>
          <div>
            {renderFilterOption('collection', '', filterCopy.all)}
            {collections.map((item) => renderFilterOption('collection', item, managedCollectionLabels.get(item) ?? localeCollectionLabels[item] ?? item))}
          </div>
        </div>
        <div className="product-filter-row">
          <strong>{filterCopy.tag}</strong>
          <div>
            {renderFilterOption('tag', '', filterCopy.all)}
            {renderFilterOption('tag', 'new', filterCopy.new)}
            {renderFilterOption('tag', 'best', filterCopy.best)}
          </div>
        </div>
        <Link className="product-filter-reset" to={toLocalePath('/products')} onClick={() => setIsFilterOpen(false)}><X size={14} />{filterCopy.reset}</Link>
      </section>}
    </div>

    <div className="page-title">
      <div><h1>{folderCopy.root}</h1></div>
      <span>{copy.count(filtered.length)}</span>
    </div>

    {hasFilters && <div className="filter-summary">
      <div className="filter-chips">
        {filterChips.map(([label, value]) => <span className="filter-chip" key={`${label}-${value}`}><b>{localeFilterLabelNames?.[label] ?? label}:</b> {value}</span>)}
      </div>
      <Link className="clear-filters" to={toLocalePath('/products')}><X size={14} />{copy.clearFilters}</Link>
    </div>}

    <div className="product-tools">
      <div className="category-list">
        {categories.map((item) => <button className={(item === 'all' ? !category : category === item) ? 'active' : ''} key={item} type="button" onClick={() => setFilter('category', item === 'all' ? '' : item)}>{managedCategoryLabels.get(item) ?? formatCategoryLabel(item, locale)}</button>)}
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
