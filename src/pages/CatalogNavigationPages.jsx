import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { getLocalizedProductName, useLocalePath } from '../utils/locale'

const localizedField = (prefix, locale) => `${prefix}${locale === 'kr' ? 'Ko' : locale === 'jp' ? 'Ja' : locale === 'cn' ? 'Zh' : 'En'}`

export function CategoryPage() {
  const { categories = [] } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const visibleCategories = categories.filter((category) => category.isVisible !== false)

  return <main className="content catalog-navigation-page">
    <div className="page-title"><p>Catalog</p><h1>카테고리</h1><span>제품군별 피어싱 카탈로그를 확인해보세요.</span></div>
    <div className="catalog-navigation-grid">
      {visibleCategories.map((category) => <Link key={category.categoryId} to={toLocalePath(`/products?category=${encodeURIComponent(category.categoryId)}`)}>
        {category.coverUrl && <img alt="" src={category.coverUrl} />}
        <strong>{category[localizedField('name', locale)] || category.nameEn}</strong><span>상품 보기</span>
      </Link>)}
    </div>
  </main>
}

export function EventsPage() {
  const { collections = [], products = [] } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const visibleCollections = collections.filter((collection) => collection.isVisible !== false)

  return <main className="content catalog-navigation-page">
    <div className="page-title"><p>Collections</p><h1>이벤트 및 컬렉션</h1><span>바이어를 위한 테마별 피어싱 셀렉션입니다.</span></div>
    <div className="catalog-navigation-grid">
      {visibleCollections.map((collection) => <Link key={collection.collectionId} to={toLocalePath(`/products?collection=${encodeURIComponent(collection.collectionId)}`)}>
        {collection.coverUrl && <img alt="" src={collection.coverUrl} />}
        <strong>{collection[localizedField('title', locale)] || collection.titleEn}</strong>
        <span>{products.filter((product) => product.collectionIds?.includes(collection.collectionId)).length}개 상품</span>
      </Link>)}
    </div>
  </main>
}

export function SearchPage() {
  return <main className="content"><ProductsSearchBridge /></main>
}

function ProductsSearchBridge() {
  const { products = [] } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const query = (params.get('q') || '').trim().toLowerCase()
  const matches = products.filter((product) => [product.code, product.nameKo, product.nameEn, product.nameJa, product.nameZh, product.material]
    .some((value) => String(value || '').toLowerCase().includes(query)))

  return <>
    <div className="page-title"><p>Search</p><h1>검색 결과</h1><span>{query ? `“${query}” 검색 결과` : '검색어를 입력해주세요.'}</span></div>
    {matches.length ? <div className="search-result-list">
      {matches.map((product) => <Link key={product.productId} to={toLocalePath(`/products/${product.productId}`)}>
        {product.imageSet?.card && <img alt="" src={product.imageSet.card} />}
        <span><strong>{getLocalizedProductName(product, locale)}</strong><small>{product.code} · {product.material}</small></span>
      </Link>)}
    </div> : <section className="empty"><h2>검색 결과가 없습니다.</h2><p>다른 재질, 스타일 또는 상품 코드를 검색해보세요.</p></section>}
  </>
}

export function LanguagePage() {
  const { locale, toLanguagePath } = useLocalePath()
  const options = [['kr', '한국어'], ['en', 'English'], ['jp', '日本語'], ['cn', '中文']]
  return <main className="content catalog-navigation-page">
    <div className="page-title"><p>Language</p><h1>언어 및 시장 선택</h1><span>바이어가 사용하는 언어를 선택하세요.</span></div>
    <div className="language-option-list">{options.map(([code, label]) => <Link className={code === locale ? 'active' : ''} key={code} to={toLanguagePath(code)}><strong>{label}</strong><span>{code.toUpperCase()}</span></Link>)}</div>
  </main>
}
