import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatMoney } from '../utils/commerce'
import { getLocalizedProductAlt, getLocalizedProductName, useLocalePath } from '../utils/locale'

const kr = {
  exportTitle: '\uc218\ucd9c \ubca0\uc2a4\ud2b8 \uc544\uc774\ud15c',
  exportBody: '\ud574\uc678 \uc9c0\uc5ed\uc6a9 \uc218\ucd9c \ucd94\ucc9c \ubca0\uc2a4\ud2b8 \uc544\uc774\ud15c',
  silverTitle: '\uc2e4\ubc84 \ub370\uc77c\ub9ac \ud53c\uc5b4\uc2f1',
  silverBody: '\ub370\uc77c\ub9ac \uce74\ud0c8\ub85c\uadf8\uc5d0 \uc5b4\uc6b8\ub9ac\ub294 \uc2e4\ubc84 \ud53c\uc5b4\uc2f1 \uc140\ub809\uc158',
  ringTitle: '\ub9c1 \ud53c\uc5b4\uc2f1 \ub77c\uc778',
  ringBody: '\ucc29\uc6a9 \uc774\ubbf8\uc9c0 \uc911\uc2ec\uc73c\ub85c \ud655\uc778\ud558\ub294 \ub9c1 \ud53c\uc5b4\uc2f1 \ub77c\uc778',
  labretTitle: '\uc11c\uc9c0\uceec \ub77c\ube0c\ub81b \ub77c\uc778',
  labretBody: '\uac70\ub798\ucc98 \ubb38\uc758\uc5d0 \uc801\ud569\ud55c \uc11c\uc9c0\uceec \ub77c\ube0c\ub81b \ucd94\ucc9c \ub77c\uc778',
  cubicTitle: '\ud504\ub9ac\ubbf8\uc5c4 \ud050\ube45 \ud53c\uc5b4\uc2f1',
  cubicBody: '\ud050\ube45\uacfc \uc624\ud314 \ub514\ud14c\uc77c \uc911\uc2ec\uc758 \ud53c\uc5b4\uc2f1 \uc140\ub809\uc158',
  pearlTitle: '\ud384 \ud050\ube45 \ud0c0\uc774\ub2c8 \uc2a4\ud0c0\uc77c',
  pearlBody: '\uc791\uace0 \uace0\uae09\uc2a4\ub7ec\uc6b4 \ud384 \ud050\ube45 \ud53c\uc5b4\uc2f1 \uce74\ud0c8\ub85c\uadf8',
  b2b: 'B2B \uc140\ub809\uc158',
  noblesse: '\ub178\ube14\ub808\uc2a4 \ucd94\ucc9c',
  cubic: '\ud050\ube45 \uceec\ub809\uc158',
  pearl: '\ud384 \ud050\ube45 \uc5d0\ub514\ud2b8',
}

const showcasePanels = [
  {
    key: 'export',
    badge: 'BEST',
    title: { kr: kr.exportTitle, en: 'Export Best Items', jp: 'Export Best Items', cn: 'Export Best Items' },
    subtitle: { kr: kr.b2b, en: 'B2B Selection', jp: 'B2B Selection', cn: 'B2B Selection' },
    body: { kr: kr.exportBody, en: 'Recommended export picks for global buyers', jp: 'Recommended export picks for global buyers', cn: 'Recommended export picks for global buyers' },
    image: 'https://images.unsplash.com/photo-1722410180651-efd51636f260?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?collection=export-best-items',
  },
  {
    key: 'silver',
    badge: 'SILVER',
    title: { kr: kr.silverTitle, en: 'Silver Daily Piercing', jp: 'Silver Daily Piercing', cn: 'Silver Daily Piercing' },
    subtitle: { kr: 'SILVER', en: 'SILVER', jp: 'SILVER', cn: 'SILVER' },
    body: { kr: kr.silverBody, en: 'Daily silver piercing selection for B2B catalogs', jp: 'Daily silver piercing selection for B2B catalogs', cn: 'Daily silver piercing selection for B2B catalogs' },
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?collection=steady-line',
  },
  {
    key: 'ring',
    badge: 'RING',
    title: { kr: kr.ringTitle, en: 'Ring Piercing Line', jp: 'Ring Piercing Line', cn: 'Ring Piercing Line' },
    subtitle: { kr: 'RING', en: 'RING', jp: 'RING', cn: 'RING' },
    body: { kr: kr.ringBody, en: 'Ring piercing line focused on wearing images', jp: 'Ring piercing line focused on wearing images', cn: 'Ring piercing line focused on wearing images' },
    image: 'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?category=belly-ring',
  },
  {
    key: 'labret',
    badge: 'NEW',
    title: { kr: kr.labretTitle, en: 'Surgical Labret Line', jp: 'Surgical Labret Line', cn: 'Surgical Labret Line' },
    subtitle: { kr: kr.noblesse, en: 'Noblesse Picks', jp: 'Noblesse Picks', cn: 'Noblesse Picks' },
    body: { kr: kr.labretBody, en: 'Surgical labret styles for trade inquiries', jp: 'Surgical labret styles for trade inquiries', cn: 'Surgical labret styles for trade inquiries' },
    image: 'https://images.unsplash.com/photo-1603974372039-adc49044b6bd?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?category=labret',
  },
  {
    key: 'cubic',
    badge: 'HOT',
    title: { kr: kr.cubicTitle, en: 'Premium Cubic Piercing', jp: 'Premium Cubic Piercing', cn: 'Premium Cubic Piercing' },
    subtitle: { kr: kr.cubic, en: 'Cubic Collection', jp: 'Cubic Collection', cn: 'Cubic Collection' },
    body: { kr: kr.cubicBody, en: 'Cubic and opal detail piercing selection', jp: 'Cubic and opal detail piercing selection', cn: 'Cubic and opal detail piercing selection' },
    image: 'https://images.unsplash.com/photo-1671644730555-916aa8d8157f?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?collection=premium-cubic-line',
  },
  {
    key: 'pearl',
    badge: 'TRADE',
    title: { kr: kr.pearlTitle, en: 'Pearl Cubic Tiny Styles', jp: 'Pearl Cubic Tiny Styles', cn: 'Pearl Cubic Tiny Styles' },
    subtitle: { kr: kr.pearl, en: 'Pearl Cubic Edit', jp: 'Pearl Cubic Edit', cn: 'Pearl Cubic Edit' },
    body: { kr: kr.pearlBody, en: 'Tiny pearl and cubic piercing catalog', jp: 'Tiny pearl and cubic piercing catalog', cn: 'Tiny pearl and cubic piercing catalog' },
    image: 'https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?auto=format&fit=crop&w=1400&h=1800&q=88',
    link: '/products?category=pearl',
  },
]

const buyerConceptSubtitle = {
  kr: '승인된 바이어를 위한 프리미엄 피어싱 카탈로그',
  en: 'A premium piercing catalog for approved buyers',
  jp: '承認バイヤーのためのプレミアムピアスカタログ',
  cn: '面向已获批准买家的高端穿孔目录',
}

const buyerConceptPanels = [
  {
    key: 'trade-consult',
    eyebrow: 'BUYER BOARD',
    title: {
      kr: '거래처 상담 라인',
      en: 'Buyer Consultation Line',
      jp: 'Buyer Consultation Line',
      cn: 'Buyer Consultation Line',
    },
    body: {
      kr: '신규 거래처가 소재와 스타일을 빠르게 검토하기 좋은 대표 구성을 모았습니다.',
      en: 'Representative assortments for quick material and style review.',
      jp: 'Representative assortments for quick material and style review.',
      cn: 'Representative assortments for quick material and style review.',
    },
    tags: ['MOQ', 'QUOTE', 'B2B'],
    image: showcasePanels[4].image,
    link: '/products?collection=buyer-selection',
  },
  {
    key: 'regional-curation',
    eyebrow: 'JP MARKET',
    title: {
      kr: '지역별 셀렉션',
      en: 'Regional Selection',
      jp: 'Regional Selection',
      cn: 'Regional Selection',
    },
    body: {
      kr: 'KR·JP·해외 거래처가 선호하는 소재와 스타일을 묶어 확인합니다.',
      en: 'Material and style boards prepared by buyer market.',
      jp: 'Material and style boards prepared by buyer market.',
      cn: 'Material and style boards prepared by buyer market.',
    },
    tags: ['KR', 'JP', 'GLOBAL'],
    image: showcasePanels[1].image,
    link: '/products?collection=export-best-items',
  },
  {
    key: 'sample-board',
    eyebrow: 'EXPORT KIT',
    title: {
      kr: '샘플 보드 제안',
      en: 'Sample Board Proposal',
      jp: 'Sample Board Proposal',
      cn: 'Sample Board Proposal',
    },
    body: {
      kr: '상담용 대표 이미지와 샘플 구성을 함께 확인하는 B2B 보드입니다.',
      en: 'Image-led sample boards for buyer consultation.',
      jp: 'Image-led sample boards for buyer consultation.',
      cn: 'Image-led sample boards for buyer consultation.',
    },
    tags: ['SAMPLE', 'IMAGE', 'LINE'],
    image: showcasePanels[2].image,
    link: '/products?category=labret',
  },
  {
    key: 'display-proposal',
    eyebrow: 'DISPLAY',
    title: {
      kr: '매장 진열 제안',
      en: 'Display Proposal',
      jp: 'Display Proposal',
      cn: 'Display Proposal',
    },
    body: {
      kr: '진열과 촬영 커트를 함께 고려한 상담용 이미지 중심 구성입니다.',
      en: 'Display-ready boards for shop and catalog planning.',
      jp: 'Display-ready boards for shop and catalog planning.',
      cn: 'Display-ready boards for shop and catalog planning.',
    },
    tags: ['DISPLAY', 'CUT', 'CATALOG'],
    image: showcasePanels[0].image,
    link: '/products?category=barbell',
  },
  {
    key: 'material-board',
    eyebrow: 'MATERIAL',
    title: {
      kr: '소재별 상담 보드',
      en: 'Material Board',
      jp: 'Material Board',
      cn: 'Material Board',
    },
    body: {
      kr: '써지컬, 실버, 큐빅 등 거래처가 비교하기 쉬운 소재 중심 구성입니다.',
      en: 'A material-led board for comparing daily catalog lines.',
      jp: 'A material-led board for comparing daily catalog lines.',
      cn: 'A material-led board for comparing daily catalog lines.',
    },
    tags: ['MATERIAL', 'PRICE', 'LINE'],
    image: showcasePanels[3].image,
    link: '/products?category=silver',
  },
  {
    key: 'reorder-line',
    eyebrow: 'REORDER',
    title: {
      kr: '꾸준한 재입고 라인',
      en: 'Steady Reorder Line',
      jp: 'Steady Reorder Line',
      cn: 'Steady Reorder Line',
    },
    body: {
      kr: '계절을 크게 타지 않는 기본 라인으로 반복 상담에 적합합니다.',
      en: 'Steady assortments suitable for repeated buyer consultations.',
      jp: 'Steady assortments suitable for repeated buyer consultations.',
      cn: 'Steady assortments suitable for repeated buyer consultations.',
    },
    tags: ['STEADY', 'BASIC', 'B2B'],
    image: showcasePanels[5].image,
    link: '/products?collection=steady-selection',
  },
]

const homeText = {
  kr: {
    more: '\ub354\ubcf4\uae30',
    price: '\uc2b9\uc778 \ud6c4 \uac00\uaca9 \ud655\uc778 \uac00\ub2a5',
    sections: {
      new: '\uc2e0\uc0c1\ud488',
      weekly: 'WEEKLY BEST',
      buyer: '\ubc14\uc774\uc5b4 \uc140\ub809\uc158',
      catalog: '\ud53c\uc5b4\uc2f1 \uce74\ud0c8\ub85c\uadf8',
      steady: '\uc2a4\ud14c\ub514 \ub77c\uc778',
    },
  },
  en: {
    more: 'More',
    price: 'Price available after approval',
    sections: {
      new: 'New Arrivals',
      weekly: 'WEEKLY BEST',
      buyer: 'Buyer Selection',
      catalog: 'Piercing Catalog',
      steady: 'Steady Line',
    },
  },
  jp: {
    more: 'More',
    price: 'Price available after approval',
    sections: {
      new: '\u65b0\u5546\u54c1',
      weekly: 'WEEKLY BEST',
      buyer: '\u30d0\u30a4\u30e4\u30fc\u30bb\u30ec\u30af\u30b7\u30e7\u30f3',
      catalog: '\u30d4\u30a2\u30b9\u30ab\u30bf\u30ed\u30b0',
      steady: '\u5b9a\u756a\u30e9\u30a4\u30f3',
    },
  },
  cn: {
    more: 'More',
    price: 'Price available after approval',
    sections: {
      new: '\u65b0\u54c1',
      weekly: 'WEEKLY BEST',
      buyer: '\u4e70\u624b\u7cbe\u9009',
      catalog: '\u7a7f\u5b54\u76ee\u5f55',
      steady: '\u7ecf\u5178\u7cfb\u5217',
    },
  },
}

const chips = [
  '\uc11c\uc9c0\uceec \ud53c\uc5b4\uc2f1',
  '\ubc14\ubca8\ud615 \ud53c\uc5b4\uc2f1',
  '925\uc2e4\ubc84 \ud53c\uc5b4\uc2f1',
  '\ud050\ube45 \ud53c\uc5b4\uc2f1',
  '\ud53c\uc5b4\uc2f1 \uc138\ud2b8',
  '\uc55e\uc740 \ud53c\uc5b4\uc2f1',
  '\ub9c1 \ud53c\uc5b4\uc2f1',
  '\ud050\ube45 \ud53c\uc5b4\uc2f1',
  '\ub9ac\ubcf8 \uc544\uc774\ud15c',
  '\ub098\ube44 \uc544\uc774\ud15c',
]

const piercingCatalogTabs = [
  {
    key: 'ball',
    label: { kr: '볼피어싱', en: 'Ball Piercing', jp: 'ボールピアス', cn: '球形饰品' },
    categoryIds: ['piercing', 'cubic', 'pearl', 'surgical-steel'],
  },
  {
    key: 'ring',
    label: { kr: '링피어싱', en: 'Ring Piercing', jp: 'リングピアス', cn: '环形饰品' },
    categoryIds: ['belly-ring'],
  },
  {
    key: 'labret',
    label: { kr: '라블렛', en: 'Labret', jp: 'ラブレット', cn: '唇钉饰品' },
    categoryIds: ['labret'],
  },
  {
    key: 'drop',
    label: { kr: '드롭/투핀', en: 'Drop / Two Pin', jp: 'ドロップ/2ピン', cn: '垂坠/双针' },
    categoryIds: ['barbell'],
  },
  {
    key: 'earring',
    label: { kr: '귀걸이형', en: 'Earring Type', jp: 'イヤリング型', cn: '耳环型' },
    categoryIds: ['earrings'],
  },
]

const piercingCatalogSubtitle = {
  kr: '피어싱=귀족, 더이상 말이 필요한가요?',
  en: 'Piercing by Noblesse, ready for buyer review.',
  jp: 'ピアスは貴族、これ以上の説明は必要ですか？',
  cn: '穿孔饰品选贵族，还需要更多说明吗？',
}

function localized(item, locale, key) {
  return item[key]?.[locale] ?? item[key]?.kr ?? ''
}

function ProductTile({ product, compact = false }) {
  const { approvedPrice, buyer, isApproved } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const name = getLocalizedProductName(product, locale)
  const alt = getLocalizedProductAlt(product, locale)
  const text = homeText[locale] ?? homeText.kr
  const images = [product.imageSet?.card, product.imageSet?.detail, product.imageSet?.zoom].filter(Boolean)

  return <article className={compact ? 'home-product-card compact' : 'home-product-card'}>
    <Link className="home-product-image" to={toLocalePath(`/products/${product.productId}`)} aria-label={name}>
      <div className="home-product-image-cycle">
        {images.map((src, index) => <img key={`${src}-${index}`} src={src} alt={index === 0 ? alt : ''} loading="lazy" />)}
      </div>
      <span className="home-product-heart" aria-hidden="true"><Heart size={18} /></span>
      <span className="home-product-status">{product.badge}</span>
    </Link>
    <Link className="home-product-title" to={toLocalePath(`/products/${product.productId}`)}>{name}</Link>
    <p>{product.material}</p>
    <strong>{isApproved ? formatMoney(approvedPrice(product.productId), buyer.currency) : text.price}</strong>
  </article>
}

function SectionHeader({ id, title }) {
  return <div className="home-section-title" id={`home-${id}`}>
    <h2>{title}</h2>
  </div>
}

function PiercingCatalogSection({ title, products }) {
  const { locale, toLocalePath } = useLocalePath()
  const text = homeText[locale] ?? homeText.kr
  const [activeTabKey, setActiveTabKey] = useState(piercingCatalogTabs[0].key)
  const activeTab = piercingCatalogTabs.find((tab) => tab.key === activeTabKey) ?? piercingCatalogTabs[0]
  const filteredProducts = products.filter((product) => activeTab.categoryIds.includes(product.categoryId))
  const visibleProducts = filteredProducts.length > 0 ? filteredProducts : products

  return <section className="product-feature-section piercing-catalog-section" aria-labelledby="home-catalog-title">
    <div className="piercing-catalog-heading" id="home-catalog">
      <h2 id="home-catalog-title">Piercing</h2>
      <p>{piercingCatalogSubtitle[locale] ?? piercingCatalogSubtitle.en}</p>
    </div>
    <nav className="piercing-catalog-tabs" aria-label={title}>
      {piercingCatalogTabs.map((tab) => <button
        aria-pressed={activeTabKey === tab.key}
        className={activeTabKey === tab.key ? 'active' : ''}
        key={tab.key}
        type="button"
        onClick={() => setActiveTabKey(tab.key)}
      >
        {tab.label[locale] ?? tab.label.en}
      </button>)}
    </nav>
    <div className="home-product-grid piercing-catalog-grid">
      {visibleProducts.slice(0, 12).map((product) => <ProductTile key={`catalog-${activeTab.key}-${product.productId}`} product={product} />)}
    </div>
    <Link className="piercing-catalog-more" to={toLocalePath('/products')}>{text.more}</Link>
  </section>
}

function BuyerConceptSection({ title }) {
  const { locale, toLocalePath } = useLocalePath()
  const loopPanels = buyerConceptPanels
  const panels = [...loopPanels, ...loopPanels, ...loopPanels, ...loopPanels]

  return <section className="buyer-concept-section" id="home-buyer">
    <div className="buyer-concept-inner">
      <div className="buyer-concept-heading">
        <span aria-hidden="true">✦</span>
        <div>
          <h2>{title}</h2>
          <p>{buyerConceptSubtitle[locale] || buyerConceptSubtitle.en}</p>
        </div>
      </div>
      <div className="buyer-concept-window">
        <div className="buyer-concept-track">
          {panels.map((panel, index) => <Link className="buyer-concept-panel" key={`${panel.key}-${index}`} to={toLocalePath(panel.link)}>
            <img src={panel.image} alt="" loading={index < 4 ? 'eager' : 'lazy'} />
            <div className="buyer-concept-shade" />
            <div className="buyer-concept-copy">
              <b>{panel.eyebrow}</b>
              <h3>{localized(panel, locale, 'title')}</h3>
              <p>{localized(panel, locale, 'body')}</p>
              <ul>
                {panel.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </div>
          </Link>)}
        </div>
      </div>
    </div>
  </section>
}

function alignShowcase(scroller) {
  const firstPanel = scroller?.querySelector('.home-showcase-panel')
  const track = scroller?.querySelector('.home-showcase-track')
  if (!scroller || !firstPanel || !track) return

  const panelWidth = firstPanel.getBoundingClientRect().width
  const gap = Number.parseFloat(getComputedStyle(track).columnGap || '8')
  const step = panelWidth + gap
  const loopWidth = step * showcasePanels.length

  scroller.scrollLeft = loopWidth + (step * 1.5) - (scroller.clientWidth / 2)
}

export function HomePage() {
  const { products } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const location = useLocation()
  const showcaseRef = useRef(null)
  const text = homeText[locale] ?? homeText.kr

  const visibleProducts = useMemo(() => products.filter((product) => product.isVisible), [products])
  const newProducts = visibleProducts.filter((product) => product.isNew)
  const bestProducts = visibleProducts.filter((product) => product.isBest || product.collectionIds.includes('weekly-best'))
  const catalogProducts = visibleProducts.filter((product) => product.categoryId === 'piercing' || product.categoryId === 'barbell')
  const steadyProducts = visibleProducts.filter((product) => product.collectionIds.includes('steady-line'))
  const showcaseLoop = [...showcasePanels, ...showcasePanels, ...showcasePanels]

  useLayoutEffect(() => {
    const scroller = showcaseRef.current
    if (!scroller) return undefined

    alignShowcase(scroller)
    const resizeObserver = new ResizeObserver(() => alignShowcase(scroller))
    resizeObserver.observe(scroller)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const scroller = showcaseRef.current
    if (!scroller) return undefined

    const interval = window.setInterval(() => {
      const firstPanel = scroller.querySelector('.home-showcase-panel')
      const track = scroller.querySelector('.home-showcase-track')
      if (!firstPanel || !track) return

      const panelWidth = firstPanel.getBoundingClientRect().width
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || '8')
      const step = panelWidth + gap
      const loopWidth = step * showcasePanels.length

      scroller.scrollBy({ left: step * 2, behavior: 'smooth' })
      window.setTimeout(() => {
        if (scroller.scrollLeft >= loopWidth * 2) {
          scroller.scrollLeft -= loopWidth
        }
      }, 900)
    }, 4800)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!location.hash) return
    window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 40)
  }, [location.hash])

  return <main className="catalog-home">
    <section className="home-showcase-section" aria-label="Noblesse showcase">
      <div className="home-showcase-grid" ref={showcaseRef}>
        <div className="home-showcase-track">
          {showcaseLoop.map((panel, index) => <Link className="home-showcase-panel" key={`${panel.key}-${index}`} to={toLocalePath(panel.link)}>
            <img src={panel.image} alt="" loading={index < 4 ? 'eager' : 'lazy'} />
            <div className="home-showcase-overlay" />
            <div className="home-showcase-copy">
              <b>{panel.badge}</b>
              <h2>{localized(panel, locale, 'title')}</h2>
              <p>{localized(panel, locale, 'subtitle')}</p>
              <span>{localized(panel, locale, 'body')}</span>
            </div>
          </Link>)}
        </div>
      </div>
      <div className="home-showcase-categories">
        {chips.map((chip, index) => <Link key={`${chip}-${index}`} to={toLocalePath(`/products?q=${encodeURIComponent(chip)}`)}>{chip}</Link>)}
      </div>
    </section>

    <section className="product-feature-section">
      <SectionHeader id="new" title={text.sections.new} />
      <div className="home-product-grid">
        {newProducts.slice(0, 10).map((product) => <ProductTile key={`new-${product.productId}`} product={product} />)}
      </div>
      <Link className="home-more-button" to={toLocalePath('/products')}>{text.sections.new} {text.more}</Link>
    </section>

    <section className="product-feature-section weekly-section">
      <SectionHeader id="weekly" title={text.sections.weekly} />
      <div className="home-product-rail">
        {[...bestProducts, ...bestProducts].map((product, index) => <ProductTile compact key={`weekly-${product.productId}-${index}`} product={product} />)}
      </div>
    </section>

    <BuyerConceptSection title={text.sections.buyer} />

    <PiercingCatalogSection title={text.sections.catalog} products={catalogProducts} />

    <section className="product-feature-section">
      <SectionHeader id="steady" title={text.sections.steady} />
      <div className="home-product-grid">
        {steadyProducts.slice(0, 10).map((product) => <ProductTile key={`steady-${product.productId}`} product={product} />)}
      </div>
    </section>
  </main>
}
