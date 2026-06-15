import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Gem, Globe2, Headphones, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import { mockCollections } from '../data/catalog'
import { useLocalePath } from '../utils/locale'

const homeCopy = {
  kr: {
    eyebrow: '국내·해외 B2B 카탈로그',
    title: '귀족',
    lead: '국내·해외 B2B 바이어를 위한 Noblesse 피어싱 카탈로그입니다.',
    note: '제품 정보, MOQ, 소재와 옵션을 확인하고 거래 문의를 남겨주세요.',
    viewCatalog: '카탈로그 보기',
    access: '거래 문의하기',
    pending: '확인 상태 보기',
    approved: '문의 리스트',
    admin: '관리자 미리보기',
    buyerStripGuest: '국내·해외 거래처용 카탈로그',
    buyerStripPending: '거래처 정보 확인 중이에요',
    buyerStripApproved: '거래 조건 안내 가능',
    buyerStripGuestNote: '거래 조건과 견적은 담당자 확인 후 안내됩니다.',
    buyerStripApprovedNote: '담당 지역 거래 조건을 확인할 수 있어요.',
    quickTitle: '빠른 카테고리',
    quickNote: '자주 찾는 피어싱 스타일에서 시작하세요.',
    collectionsTitle: '추천 컬렉션',
    collectionsNote: '지역별 소싱을 위해 정리한 브랜드 셀렉션입니다.',
    browseProducts: '상품 둘러보기',
    stylesLabel: '스타일',
    featuredTitle: '추천 피어싱',
    featuredNote: 'Noblesse 카탈로그에 어울리는 베스트 셀렉션입니다.',
    newTitle: '신상품',
    newNote: '다음 셀렉션을 위해 준비한 신규 피어싱입니다.',
    exportTitle: '수출 베스트',
    exportNote: '소싱 정보가 명확한 수출 추천 스타일입니다.',
    viewAll: '전체 보기',
    campaignTitle: '귀족 시그니처',
    campaignNote: '국내·해외 거래처 문의에 맞춘 피어싱 스타일입니다.',
    campaignCta: '거래 조건 문의',
    recentTitle: '최근 본 상품',
    recentNote: '최근 확인한 상품은 이후 영역에 표시될 예정입니다.',
    supportTitle: '거래처 문의',
    supportNote: 'Email, KakaoTalk, WhatsApp 상담 채널을 준비 중입니다.',
    supportSmall: '담당자 확인 후 견적과 거래 조건을 안내드립니다.',
    companyTitle: '회사 정보',
    companyNote: 'Noblesse Piercing',
    companySmall: '국내·해외 B2B 피어싱 카탈로그 / 거래처 문의 지원',
    brandNoteTitle: '국내·해외 거래처를 위한 구성',
    brandNoteText: '큰 상품 이미지, 소재와 옵션, MOQ, 거래 문의 흐름을 제공합니다.',
  },
  en: {
    eyebrow: 'Domestic & global B2B catalog',
    title: 'Noblesse Piercing',
    lead: 'A Noblesse piercing catalog for domestic and international B2B buyers.',
    note: 'Review product details, MOQ, materials, and options, then send a trade inquiry.',
    viewCatalog: 'View Catalog',
    access: 'Trade Inquiry',
    pending: 'Under Review',
    approved: 'Inquiry List',
    admin: 'Admin Preview',
    buyerStripGuest: 'B2B catalog for domestic and global buyers',
    buyerStripPending: 'Trade profile under review',
    buyerStripApproved: 'Trade terms available',
    buyerStripGuestNote: 'Trade terms and quotations are guided after staff review.',
    buyerStripApprovedNote: 'Assigned-market trade terms are ready.',
    quickTitle: 'Quick Categories',
    quickNote: 'Start from piercing styles members search for most often.',
    collectionsTitle: 'Featured Collections',
    collectionsNote: 'Curated brand selections for market-specific sourcing.',
    browseProducts: 'Browse Products',
    stylesLabel: 'styles',
    featuredTitle: 'Featured Piercing',
    featuredNote: 'Best selections for the Noblesse catalog.',
    newTitle: 'New Arrivals',
    newNote: 'Fresh piercing styles prepared for the next selection.',
    exportTitle: 'Export Best Items',
    exportNote: 'Export-ready styles with clear sourcing information.',
    viewAll: 'View All',
    campaignTitle: 'Noblesse Signature',
    campaignNote: 'Curated piercing styles for domestic and international trade inquiries.',
    campaignCta: 'Ask About Trade Terms',
    recentTitle: 'Recently Viewed',
    recentNote: 'Recently viewed products will appear here later.',
    supportTitle: 'Trade Inquiry Support',
    supportNote: 'Email, KakaoTalk, and WhatsApp support channels are being prepared.',
    supportSmall: 'Our team follows up with quotation and trade terms after review.',
    companyTitle: 'Company Info',
    companyNote: 'Noblesse Piercing',
    companySmall: 'Domestic and global B2B piercing catalog / Trade inquiry support',
    brandNoteTitle: 'Built For B2B Trade Inquiries',
    brandNoteText: 'Large product images, material and option details, MOQ, and a clear inquiry flow.',
  },
  jp: {
    eyebrow: '国内・海外B2Bカタログ',
    title: '貴族ピアス',
    lead: '国内・海外B2B取引先向けのNoblesseピアスカタログです。',
    note: '商品情報、最小数量、素材、オプションを確認し、取引先お問い合わせを送信してください。',
    viewCatalog: '商品を見る',
    access: '取引先お問い合わせ',
    pending: '確認状況を見る',
    approved: 'お問い合わせリスト',
    admin: '管理者プレビュー',
    buyerStripGuest: '国内・海外B2B取引先向けカタログ',
    buyerStripPending: '取引先情報を確認中です',
    buyerStripApproved: '取引条件案内可能',
    buyerStripGuestNote: '取引条件と見積は担当者確認後にご案内します。',
    buyerStripApprovedNote: '担当地域の取引条件をご確認いただけます。',
    quickTitle: 'クイックカテゴリー',
    quickNote: 'よく探されるピアススタイルから始めましょう。',
    collectionsTitle: 'おすすめコレクション',
    collectionsNote: '地域ごとの好みに合わせたブランドセレクションです。',
    browseProducts: '商品を見る',
    stylesLabel: 'スタイル',
    featuredTitle: 'おすすめピアス',
    featuredNote: 'Noblesseカタログに適したベストセレクションです。',
    newTitle: '新商品',
    newNote: '次のセレクションに向けた新しいピアスです。',
    exportTitle: '輸出ベスト',
    exportNote: '輸出相談に適したおすすめスタイルです。',
    viewAll: 'すべて見る',
    campaignTitle: '貴族ピアス シグネチャー',
    campaignNote: '国内・海外の取引先お問い合わせに合わせたピアススタイルです。',
    campaignCta: '取引条件を問い合わせる',
    recentTitle: '最近見た商品',
    recentNote: '最近確認した商品は今後ここに表示されます。',
    supportTitle: '取引先お問い合わせ',
    supportNote: 'Email、KakaoTalk、WhatsAppの相談チャネルを準備中です。',
    supportSmall: '担当者確認後、見積と取引条件をご案内します。',
    companyTitle: '会社情報',
    companyNote: 'Noblesse Piercing',
    companySmall: '国内・海外B2Bピアスカタログ / 取引先お問い合わせサポート',
    brandNoteTitle: '国内・海外取引先向け構成',
    brandNoteText: '大きな商品画像、素材とオプション、最小数量、わかりやすいお問い合わせフローを提供します。',
  },
  cn: {
    eyebrow: '国内外B2B商品目录',
    title: '高贵的穿孔',
    lead: '面向国内外B2B买家的 Noblesse 穿孔商品目录。',
    note: '查看商品信息、最小数量、材质和选项后，请提交贸易咨询。',
    viewCatalog: '查看商品',
    access: '贸易咨询',
    pending: '查看确认状态',
    approved: '咨询清单',
    admin: '管理员预览',
    buyerStripGuest: '面向国内外B2B买家的商品目录',
    buyerStripPending: '贸易信息确认中',
    buyerStripApproved: '可提供交易条件',
    buyerStripGuestNote: '交易条件和报价将在工作人员确认后提供。',
    buyerStripApprovedNote: '可查看负责地区的交易条件。',
    quickTitle: '快速分类',
    quickNote: '从常见穿孔款式开始浏览。',
    collectionsTitle: '推荐系列',
    collectionsNote: '按地区偏好整理的品牌精选。',
    browseProducts: '浏览商品',
    stylesLabel: '款式',
    featuredTitle: '推荐穿孔',
    featuredNote: '适合 Noblesse 目录的精选款式。',
    newTitle: '新品上架',
    newNote: '为下一轮选品准备的新款穿孔。',
    exportTitle: '出口热选',
    exportNote: '适合出口咨询的推荐款式。',
    viewAll: '查看全部',
    campaignTitle: '高贵的穿孔 Signature',
    campaignNote: '为国内外贸易咨询精选的穿孔风格。',
    campaignCta: '咨询交易条件',
    recentTitle: '最近浏览',
    recentNote: '最近查看的商品稍后会显示在这里。',
    supportTitle: '贸易咨询支持',
    supportNote: 'Email、KakaoTalk、WhatsApp 咨询渠道正在准备中。',
    supportSmall: '工作人员确认后，将提供报价和交易条件。',
    companyTitle: '公司信息',
    companyNote: 'Noblesse Piercing',
    companySmall: '国内外B2B穿孔商品目录 / 贸易咨询支持',
    brandNoteTitle: '面向国内外B2B买家设计',
    brandNoteText: '提供大图商品展示、材质和选项、最小数量以及清晰的咨询流程。',
  },
}

const quickCategories = [
  { key: 'new', query: '?tag=new', labels: { kr: '신상품', en: 'New', jp: '新商品', cn: '新品' } },
  { key: 'best', query: '?tag=best', labels: { kr: '베스트', en: 'Best', jp: 'ベスト', cn: '热选' } },
  { key: 'ring', query: '?category=piercing', labels: { kr: '링', en: 'Ring', jp: 'リング', cn: '环' } },
  { key: 'barbell', query: '?category=barbell', labels: { kr: '바벨', en: 'Barbell', jp: 'バーベル', cn: '杠铃' } },
  { key: 'labret', query: '?category=labret', labels: { kr: '라블렛', en: 'Labret', jp: 'ラブレット', cn: '唇钉' } },
  { key: 'silver', query: '?color=Silver', labels: { kr: '실버', en: 'Silver', jp: 'シルバー', cn: '银色' } },
  { key: 'gold', query: '?color=Gold', labels: { kr: '골드', en: 'Gold', jp: 'ゴールド', cn: '金色' } },
  { key: 'titanium', query: '?material=Titanium', labels: { kr: '티타늄', en: 'Titanium', jp: 'チタン', cn: '钛钢' } },
  { key: 'steel', query: '?material=Surgical%20Steel', labels: { kr: '써지컬 스틸', en: 'Surgical Steel', jp: 'サージカルステンレス', cn: '医用钢' } },
]

const collectionCopy = {
  'japan-buyer-picks': {
    kr: '일본 지역 취향에 맞춘 정제된 셀렉션입니다.',
    en: 'A refined selection for Japan-area members.',
    jp: '日本地域の好みに合わせたセレクションです。',
    cn: '适合日本地区偏好的精选系列。',
  },
  'us-buyer-picks': {
    kr: '미국 지역을 위한 깔끔한 스타일과 회전율 높은 피어싱입니다.',
    en: 'Clean, easy-to-select piercing styles for US-area members.',
    jp: '米国地域に向けたクリーンで回転率の高いスタイルです。',
    cn: '适合美国地区的简洁高周转款式。',
  },
  'minimal-piercing-line': {
    kr: '데일리 진열에 어울리는 미니멀 피어싱 라인입니다.',
    en: 'Minimal piercing line for daily merchandising.',
    jp: 'デイリー陳列に合うミニマルピアスラインです。',
    cn: '适合日常陈列的极简穿孔系列。',
  },
  'premium-cubic-line': {
    kr: '빛 반사가 선명한 프리미엄 큐빅 스타일입니다.',
    en: 'Premium cubic styles with bright reflection.',
    jp: '輝きがきれいなプレミアムキュービックラインです。',
    cn: '光泽清晰的高端锆石款式。',
  },
  'export-best-items': {
    kr: '수출 상담에 적합한 Noblesse Piercing 핵심 상품입니다.',
    en: 'Core Noblesse Piercing items for export sourcing.',
    jp: '輸出相談に適したNoblesse Piercingの中心商品です。',
    cn: '适合出口采购咨询的核心商品。',
  },
  'new-arrivals': {
    kr: '다음 셀렉션을 위한 신규 입고 스타일입니다.',
    en: 'New arrivals prepared for the next selection.',
    jp: '次のセレクションに向けた新入荷スタイルです。',
    cn: '为下一轮选品准备的新款。',
  },
}

const collectionTitleCn = {
  'japan-buyer-picks': '日本精选',
  'us-buyer-picks': '美国精选',
  'minimal-piercing-line': '极简穿孔系列',
  'premium-cubic-line': '高级锆石系列',
  'export-best-items': '出口热选单品',
  'new-arrivals': '新品上架',
}

const heroBanners = [
  {
    key: 'titanium-labret',
    title: {
      kr: '티타늄 라블렛 라인',
      en: 'Titanium Labret Line',
      jp: 'チタンラブレットライン',
      cn: '钛钢唇钉系列',
    },
    eyebrow: {
      kr: '노블레스 추천',
      en: 'Noblesse Picks',
      jp: 'Noblesseセレクト',
      cn: 'Noblesse精选',
    },
    text: {
      kr: '거래처 문의에 적합한 티타늄 라블렛 추천 라인',
      en: 'Recommended titanium labret styles for members.',
      jp: '会員向けのチタンラブレット推薦ライン。',
      cn: '为会员准备的钛钢唇钉推荐系列。',
    },
    to: '/products?material=Titanium',
    image: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?auto=format&fit=crop&crop=entropy&w=1400&h=760&q=82',
  },
  {
    key: 'premium-cubic',
    title: {
      kr: '프리미엄 큐빅 피어싱',
      en: 'Premium Cubic Piercing',
      jp: 'プレミアムキュービックピアス',
      cn: '高级锆石穿孔饰品',
    },
    eyebrow: {
      kr: '큐빅 컬렉션',
      en: 'Cubic Collection',
      jp: 'キュービックコレクション',
      cn: '锆石系列',
    },
    text: {
      kr: '큐빅과 오팔 디테일 중심의 피어싱 셀렉션',
      en: 'A piercing selection focused on cubic and opal details.',
      jp: 'キュービックとオパールポイント中心のピアスセレクション。',
      cn: '以锆石与欧泊细节为中心的穿孔饰品选择。',
    },
    to: '/products?collection=premium-cubic-line',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&crop=entropy&w=1400&h=760&q=82',
  },
  {
    key: 'gold-tiny',
    title: {
      kr: '14K 골드 타이니 스타일',
      en: '14K Gold Tiny Styles',
      jp: '14Kゴールドミニスタイル',
      cn: '14K金小巧款式',
    },
    eyebrow: {
      kr: '골드 에디트',
      en: 'Gold Edit',
      jp: 'ゴールドエディット',
      cn: '金色精选',
    },
    text: {
      kr: '작고 고급스러운 14K 골드 피어싱 카탈로그',
      en: 'A refined catalog of tiny 14K gold piercing styles.',
      jp: '小さく上品な14Kゴールドピアスカタログ。',
      cn: '精致小巧的14K金穿孔饰品目录。',
    },
    to: '/products?material=14K%20Gold',
    image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&crop=entropy&w=1400&h=760&q=82',
  },
  {
    key: 'export-best',
    title: {
      kr: '수출 베스트 아이템',
      en: 'Export Best Items',
      jp: '輸出ベストアイテム',
      cn: '出口热选单品',
    },
    eyebrow: {
      kr: '글로벌 셀렉션',
      en: 'Global Selection',
      jp: 'グローバルセレクション',
      cn: '全球精选',
    },
    text: {
      kr: '해외 지역용 수출 추천 베스트 아이템',
      en: 'Export-ready best items for global sourcing.',
      jp: '海外地域向けの輸出推薦ベストアイテム。',
      cn: '适合海外地区采购的出口推荐单品。',
    },
    to: '/products?collection=export-best-items',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&crop=entropy&w=1400&h=760&q=82',
  },
]

function getLocalizedValue(values, locale) {
  return values[locale] ?? values.en ?? values.kr
}

function getCollectionTitle(collection, locale) {
  if (locale === 'kr') return collection.titleKo
  if (locale === 'jp') return collection.titleJa
  if (locale === 'cn') return collectionTitleCn[collection.collectionId] ?? collection.titleEn
  return collection.titleEn
}

const latinScrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const globalScrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789가나다라마바사아자차카타파하ピアス貴族高贵穿孔'

const lastScrambleTextByKey = new Map()

const rememberScrambleText = (persistKey, text) => {
  lastScrambleTextByKey.set(persistKey, text)
}

const getScrambleCharacters = (text) => (
  /^[A-Za-z\s]+$/.test(text) ? latinScrambleCharacters : globalScrambleCharacters
)

const buildScrambleFrame = (
  finalCharacters,
  previousCharacters,
  currentLength,
  currentFrame,
  startLength = currentLength,
  direction = 0,
  scrambleCharacters = globalScrambleCharacters,
) => Array.from({ length: currentLength }, (_, index) => {
  if (index >= finalCharacters.length) {
    return previousCharacters[index] ?? scrambleCharacters[(currentFrame * 13 + index * 19) % scrambleCharacters.length]
  }

  const char = finalCharacters[index]
  if (char === ' ') return '\u00A0'

  const introducedFrame = direction > 0 && index >= startLength
    ? index - startLength + 1
    : 0
  const settleFrame = Math.max(5 + Math.floor(index / 2), introducedFrame + 3)

  if (currentFrame >= settleFrame) return char

  if (currentFrame < 5 && previousCharacters[index]) {
    return previousCharacters[index]
  }

  return scrambleCharacters[(currentFrame * 13 + index * 19) % scrambleCharacters.length]
})

function ScrambleText({ as: Tag = 'span', children, className = '', persistKey = 'default' }) {
  const text = String(children)
  const textLength = Array.from(text).length
  const activeScrambleCharacters = getScrambleCharacters(text)
  const measureRef = useRef(null)
  const initialCharacters = Array.from(lastScrambleTextByKey.get(persistKey) ?? text)
  const initialLength = initialCharacters.length || textLength
  const displayLengthRef = useRef(initialLength)
  const latestDisplayRef = useRef(initialCharacters)
  const [textWidth, setTextWidth] = useState(null)
  const [displayCharacters, setDisplayCharacters] = useState(initialCharacters)
  const displayText = displayCharacters.join('')

  useLayoutEffect(() => {
    const width = measureRef.current?.getBoundingClientRect().width
    if (width) setTextWidth(Math.ceil(width))
  }, [displayText])

  useEffect(() => {
    displayLengthRef.current = displayCharacters.length
    latestDisplayRef.current = displayCharacters
  }, [displayCharacters])

  useEffect(() => () => {
    rememberScrambleText(persistKey, text)
  }, [persistKey, text])

  useEffect(() => {
    const finalCharacters = Array.from(text)
    const previousCharacters = latestDisplayRef.current.length > 0 ? latestDisplayRef.current : finalCharacters
    const previousText = previousCharacters.join('').replace(/\u00A0/g, ' ')

    if (previousText === text) {
      setDisplayCharacters(finalCharacters)
      displayLengthRef.current = finalCharacters.length
      rememberScrambleText(persistKey, text)
      return undefined
    }

    const startLength = previousCharacters.length || finalCharacters.length
    const targetLength = finalCharacters.length
    const lengthDelta = targetLength - startLength
    const direction = Math.sign(lengthDelta)
    const absDelta = Math.abs(lengthDelta)
    let frame = 0
    const lengthSpeed = 2
    const maxFrame = absDelta === 0
      ? Math.max(16, Math.ceil(finalCharacters.length / 2) + 10)
      : Math.max(22, absDelta * lengthSpeed + Math.ceil(finalCharacters.length / 2) + 10)

    setDisplayCharacters(buildScrambleFrame(finalCharacters, previousCharacters, startLength, frame, startLength, direction, activeScrambleCharacters))

    const timer = window.setInterval(() => {
      frame += 1
      const lengthStep = direction === 0 ? 0 : Math.min(absDelta, Math.floor(frame / lengthSpeed))
      const currentLength = startLength + direction * lengthStep

      setDisplayCharacters(buildScrambleFrame(finalCharacters, previousCharacters, currentLength, frame, startLength, direction, activeScrambleCharacters))

      if (frame >= maxFrame) {
        window.clearInterval(timer)
        setDisplayCharacters(finalCharacters)
        displayLengthRef.current = finalCharacters.length
        rememberScrambleText(persistKey, text)
      }
    }, 36)

    return () => window.clearInterval(timer)
  }, [activeScrambleCharacters, persistKey, text])

  return <Tag
    className={`scramble-text ${className}`}
    style={textWidth ? { '--scramble-width': `${textWidth}px` } : undefined}
    aria-label={text}
  >
    <span className="scramble-text-measure" ref={measureRef} aria-hidden="true" data-measure-text={displayText} />
    <span className="scramble-text-visual" aria-hidden="true">
      {displayCharacters.map((char, index) => <span
        className="scramble-text-char"
        key={`${text}-${index}-${char}`}
        style={{ '--char-index': index }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>)}
    </span>
  </Tag>
}

function ProductSection({ products, sectionId, title, note, viewAllLabel }) {
  const { toLocalePath } = useLocalePath()
  if (products.length === 0) return null

  return <section className="section-wrap product-feature-section">
    <div className="section-title">
      <div>
        <Sparkles size={18} />
        <ScrambleText as="h2" persistKey={`product-section-title-${sectionId}`}>{title}</ScrambleText>
        <ScrambleText as="p" persistKey={`product-section-note-${sectionId}`}>{note}</ScrambleText>
      </div>
      <Link to={toLocalePath('/products')}><ScrambleText persistKey={`product-section-link-${sectionId}`}>{viewAllLabel}</ScrambleText></Link>
    </div>
    <div className="catalog-grid">{products.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
  </section>
}

export function HomePage() {
  const [activeHeroBanner, setActiveHeroBanner] = useState(0)
  const { buyer, isApproved, products, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = homeCopy[locale] ?? homeCopy.kr
  const featuredProducts = products.filter((product) => product.isBest).slice(0, 8)
  const newProducts = products.filter((product) => product.isNew).slice(0, 8)
  const exportProducts = products.filter((product) => product.collectionIds.includes('export-best-items')).slice(0, 8)
  const heroCta = isApproved
    ? { label: copy.approved, to: '/inquiry-list' }
    : viewerState === 'pending'
      ? { label: copy.pending, to: '/approval-pending' }
      : viewerState === 'admin'
        ? { label: copy.admin, to: '/account' }
        : { label: copy.access, to: '/register' }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroBanner((current) => (current + 1) % heroBanners.length)
    }, 4200)

    return () => window.clearInterval(timer)
  }, [])

  return <main>
    <section className="hero home-hero">
      <div className="hero-copy">
        <ScrambleText as="p" className="eyebrow" persistKey="hero-eyebrow">{copy.eyebrow}</ScrambleText>
        <ScrambleText as="h1" persistKey="hero-title">{copy.title}</ScrambleText>
        <ScrambleText persistKey="hero-lead">{copy.lead}</ScrambleText>
        <ScrambleText as="small" persistKey="hero-note">{copy.note}</ScrambleText>
        <div className="hero-actions">
          <Link className="primary-action" to={toLocalePath('/products')}><ScrambleText persistKey="hero-primary-cta">{copy.viewCatalog}</ScrambleText> <ArrowRight size={17} /></Link>
          <Link className="secondary-action" to={toLocalePath(heroCta.to)}><ScrambleText persistKey="hero-secondary-cta">{heroCta.label}</ScrambleText></Link>
        </div>
      </div>
      <div className="hero-art home-hero-art hero-carousel" aria-label="Noblesse Piercing banner carousel">
        <div className="hero-carousel-track" style={{ transform: `translateX(-${activeHeroBanner * 100}%)` }}>
          {heroBanners.map((banner, index) => {
            const bannerTitle = getLocalizedValue(banner.title, locale)
            const bannerEyebrow = getLocalizedValue(banner.eyebrow, locale)
            const bannerText = getLocalizedValue(banner.text, locale)

            return <Link className="hero-banner-slide" key={banner.key} to={toLocalePath(banner.to)}>
              <img alt={bannerTitle} height="700" loading={index === 0 ? 'eager' : 'lazy'} src={banner.image} width="1100" />
              <span className="hero-banner-copy">
                <ScrambleText as="small" persistKey={`hero-banner-eyebrow-${index}`}>{bannerEyebrow}</ScrambleText>
                <ScrambleText as="strong" persistKey={`hero-banner-title-${index}`}>{bannerTitle}</ScrambleText>
                <ScrambleText as="em" persistKey={`hero-banner-text-${index}`}>{bannerText}</ScrambleText>
              </span>
            </Link>
          })}
        </div>
        <div className="hero-carousel-dots" aria-label="배너 선택">
          {heroBanners.map((banner, index) => <button
            aria-label={`${getLocalizedValue(banner.title, locale)} 배너 보기`}
            className={activeHeroBanner === index ? 'active' : ''}
            key={banner.key}
            onClick={() => setActiveHeroBanner(index)}
            type="button"
          />)}
        </div>
      </div>
    </section>

    <section className="buyer-strip">
      <BadgeCheck size={19} />
      <div>
        <strong>{isApproved ? copy.buyerStripApproved : viewerState === 'pending' ? copy.buyerStripPending : copy.buyerStripGuest}</strong>{' '}
        <span>{isApproved ? `${buyer.assignedMarket} ${copy.buyerStripApprovedNote}` : copy.buyerStripGuestNote}</span>
      </div>
      <Globe2 size={19} />
    </section>

    <section className="section-wrap quick-category-section">
      <div className="section-title">
        <div>
          <Gem size={18} />
          <ScrambleText as="h2" persistKey="quick-title">{copy.quickTitle}</ScrambleText>
          <ScrambleText as="p" persistKey="quick-note">{copy.quickNote}</ScrambleText>
        </div>
      </div>
      <div className="quick-category-grid">
        {quickCategories.map((category) => {
          const label = getLocalizedValue(category.labels, locale)
          return <Link className="quick-category-card" key={category.key} to={toLocalePath(`/products${category.query}`)}>
            <ScrambleText persistKey={`quick-symbol-${category.key}`}>{label.slice(0, 1)}</ScrambleText>
            <ScrambleText as="strong" persistKey={`quick-label-${category.key}`}>{label}</ScrambleText>
          </Link>
        })}
      </div>
    </section>

    <section className="section-wrap collections-section">
      <div className="section-title">
        <div>
          <Sparkles size={18} />
          <ScrambleText as="h2" persistKey="collections-title">{copy.collectionsTitle}</ScrambleText>
          <ScrambleText as="p" persistKey="collections-note">{copy.collectionsNote}</ScrambleText>
        </div>
        <Link to={toLocalePath('/products')}><ScrambleText persistKey="collections-link">{copy.browseProducts}</ScrambleText></Link>
      </div>
      <div className="collection-grid">
        {mockCollections.map((collection) => <Link className="collection-card" key={collection.collectionId} to={toLocalePath(`/products?collection=${collection.collectionId}`)}>
          <ScrambleText as="small" persistKey={`collection-count-${collection.collectionId}`}>{`${collection.productIds.length} ${copy.stylesLabel}`}</ScrambleText>
          <ScrambleText as="strong" persistKey={`collection-title-${collection.collectionId}`}>{getCollectionTitle(collection, locale)}</ScrambleText>
          <ScrambleText persistKey={`collection-note-${collection.collectionId}`}>{getLocalizedValue(collectionCopy[collection.collectionId], locale)}</ScrambleText>
        </Link>)}
      </div>
    </section>

    <ProductSection products={featuredProducts} sectionId="featured" title={copy.featuredTitle} note={copy.featuredNote} viewAllLabel={copy.viewAll} />
    <ProductSection products={newProducts} sectionId="new" title={copy.newTitle} note={copy.newNote} viewAllLabel={copy.viewAll} />
    <ProductSection products={exportProducts} sectionId="export" title={copy.exportTitle} note={copy.exportNote} viewAllLabel={copy.viewAll} />

    <section className="campaign-banner">
      <div>
        <ScrambleText as="p" className="eyebrow" persistKey="campaign-eyebrow">Noblesse Signature</ScrambleText>
        <ScrambleText as="h2" persistKey="campaign-title">{copy.campaignTitle}</ScrambleText>
        <ScrambleText persistKey="campaign-note">{copy.campaignNote}</ScrambleText>
      </div>
      <Link className="secondary-action" to={toLocalePath(isApproved ? '/request-quote' : '/register')}><ScrambleText persistKey="campaign-cta">{copy.campaignCta}</ScrambleText></Link>
    </section>

    <section className="section-wrap home-bottom-grid">
      <article className="info-card">
        <ClockIcon />
        <ScrambleText as="h2" persistKey="recent-title">{copy.recentTitle}</ScrambleText>
        <ScrambleText as="p" persistKey="recent-note">{copy.recentNote}</ScrambleText>
      </article>
      <article className="info-card">
        <Headphones size={22} />
        <ScrambleText as="h2" persistKey="support-title">{copy.supportTitle}</ScrambleText>
        <ScrambleText as="p" persistKey="support-note">{copy.supportNote}</ScrambleText>
        <ScrambleText as="small" persistKey="support-small">{copy.supportSmall}</ScrambleText>
      </article>
      <article className="info-card">
        <Mail size={22} />
        <ScrambleText as="h2" persistKey="company-title">{copy.companyTitle}</ScrambleText>
        <ScrambleText as="p" persistKey="company-note">{copy.companyNote}</ScrambleText>
        <ScrambleText as="small" persistKey="company-small">{copy.companySmall}</ScrambleText>
      </article>
    </section>

    <section className="brand-note">
      <MessageCircle size={21} />
      <div>
        <ScrambleText as="strong" persistKey="brand-note-title">{copy.brandNoteTitle}</ScrambleText>
        <ScrambleText persistKey="brand-note-text">{copy.brandNoteText}</ScrambleText>
      </div>
    </section>
  </main>
}

function ClockIcon() {
  return <span className="soft-icon">N</span>
}
