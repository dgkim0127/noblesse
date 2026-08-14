import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { useLocalePath } from '../utils/locale'

const pageCopy = {
  kr: {
    title: 'Piercing',
    subtitle: '피어싱=귀족, 더이상 말이 필요한가요?',
    clear: '필터 초기화',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '다른 카테고리를 선택해보세요.',
  },
  en: {
    title: 'Piercing',
    subtitle: 'Piercing by Noblesse, ready for buyer review.',
    clear: 'Clear filters',
    emptyTitle: 'No products found.',
    emptyBody: 'Choose another category.',
  },
  jp: {
    title: 'Piercing',
    subtitle: 'ピアスは貴族、これ以上の説明は必要ですか？',
    clear: 'フィルターを解除',
    emptyTitle: '該当する商品がありません。',
    emptyBody: '別のカテゴリーを選択してください。',
  },
  cn: {
    title: 'Piercing',
    subtitle: '穿孔饰品选贵族，还需要更多说明吗？',
    clear: '清除筛选',
    emptyTitle: '没有符合条件的产品。',
    emptyBody: '请选择其他分类。',
  },
}

const productCategoryTabs = [
  {
    key: 'ball',
    categoryId: 'piercing',
    label: { kr: '볼피어싱', en: 'Ball Piercing', jp: 'ボールピアス', cn: '球形饰品' },
  },
  {
    key: 'ring',
    categoryId: 'belly-ring',
    label: { kr: '링피어싱', en: 'Ring Piercing', jp: 'リングピアス', cn: '环形饰品' },
  },
  {
    key: 'labret',
    categoryId: 'labret',
    label: { kr: '라블렛', en: 'Labret', jp: 'ラブレット', cn: '唇钉饰品' },
  },
  {
    key: 'drop',
    categoryId: 'barbell',
    label: { kr: '드롭/투핀', en: 'Drop / Two Pin', jp: 'ドロップ/2ピン', cn: '垂坠/双针' },
  },
  {
    key: 'earring',
    categoryId: 'earrings',
    label: { kr: '귀걸이형', en: 'Earring Type', jp: 'イヤリング型', cn: '耳环型' },
  },
]

export function ProductsPage() {
  const { products } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const [searchParams, setSearchParams] = useSearchParams()
  const copy = pageCopy[locale] ?? pageCopy.kr

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const collection = searchParams.get('collection') ?? ''
  const activeCategory = category || (q || collection ? '' : productCategoryTabs[0].categoryId)

  const filtered = useMemo(() => {
    const normalizedQuery = q.trim().toLowerCase()
    return products.filter((product) => {
      if (!product.isVisible) return false
      if (activeCategory && product.categoryId !== activeCategory) return false
      if (collection && !product.collectionIds.includes(collection)) return false
      if (!normalizedQuery) return true

      return [
        product.code,
        product.nameKo,
        product.nameEn,
        product.nameJa,
        product.nameZh,
        product.material,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery))
    })
  }, [activeCategory, collection, products, q])

  const setCategory = (categoryId) => {
    const next = new URLSearchParams(searchParams)
    next.set('category', categoryId)
    next.delete('collection')
    setSearchParams(next)
  }

  return <main className="content product-list-page">
    <header className="product-list-reference-head">
      <h1>{copy.title}</h1>
      <p>{copy.subtitle}</p>
    </header>

    <nav className="category-list product-category-tabs" aria-label={copy.title}>
      {productCategoryTabs.map((item) => <button
        aria-pressed={activeCategory === item.categoryId}
        className={activeCategory === item.categoryId ? 'active' : ''}
        key={item.key}
        type="button"
        onClick={() => setCategory(item.categoryId)}
      >
        {item.label[locale] ?? item.label.en}
      </button>)}
    </nav>

    {(q || collection) && <Link className="clear-filters" to={toLocalePath(activeCategory ? `/products?category=${activeCategory}` : '/products')}><X size={14} />{copy.clear}</Link>}

    {filtered.length > 0
      ? <div className="catalog-grid product-results">{filtered.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
      : <section className="empty product-empty"><h2>{copy.emptyTitle}</h2><p>{copy.emptyBody}</p></section>}
  </main>
}
