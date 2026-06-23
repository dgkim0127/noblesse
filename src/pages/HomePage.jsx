import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ClipboardList, Headphones, Heart, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { mockProducts } from '../data/catalog'
import { formatMoney } from '../utils/commerce'
import { useLocalePath } from '../utils/locale'
import { getLocalizedProductAlt, getLocalizedProductName } from '../utils/locale'

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
    admin: '관리자',
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
    campaignEyebrow: '귀족 시그니처',
    campaignTitle: '귀족 시그니처',
    campaignNote: '국내·해외 거래처 문의에 맞춘 피어싱 스타일입니다.',
    campaignCta: '거래 조건 문의',
    recentTitle: '최근 본 상품',
    recentNote: '최근 확인한 상품은 이후 영역에 표시될 예정입니다.',
    supportTitle: '거래처 문의',
    supportNote: 'Email, KakaoTalk, WhatsApp 상담 채널을 준비 중입니다.',
    supportSmall: '담당자 확인 후 견적과 거래 조건을 안내드립니다.',
    companyTitle: '회사 정보',
    companyNote: 'Noblesse',
    companySmall: '국내·해외 B2B 피어싱 카탈로그 / 거래처 문의 지원',
    brandNoteTitle: '국내·해외 거래처를 위한 구성',
    brandNoteText: '큰 상품 이미지, 소재와 옵션, MOQ, 거래 문의 흐름을 제공합니다.',
  },
  en: {
    eyebrow: 'Domestic & global B2B catalog',
    title: 'Noblesse',
    lead: 'A Noblesse piercing catalog for domestic and international B2B buyers.',
    note: 'Review product details, MOQ, materials, and options, then send a trade inquiry.',
    viewCatalog: 'View Catalog',
    access: 'Trade Inquiry',
    pending: 'Under Review',
    approved: 'Inquiry List',
    admin: 'Admin',
    buyerStripGuest: 'B2B catalog for domestic and global buyers',
    buyerStripPending: 'Trade profile under review',
    buyerStripApproved: 'Trade terms available',
    buyerStripGuestNote: 'Trade terms and quotations are guided after staff review.',
    buyerStripApprovedNote: 'Assigned-market trade terms are ready.',
    quickTitle: 'Quick Categories',
    quickNote: 'Start from piercing styles B2B buyers search for most often.',
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
    campaignEyebrow: 'Noblesse Signature',
    campaignTitle: 'Noblesse Signature',
    campaignNote: 'Curated piercing styles for domestic and international trade inquiries.',
    campaignCta: 'Ask About Trade Terms',
    recentTitle: 'Recently Viewed',
    recentNote: 'Recently viewed products will appear here later.',
    supportTitle: 'Trade Inquiry Support',
    supportNote: 'Email, KakaoTalk, and WhatsApp support channels are being prepared.',
    supportSmall: 'Our team follows up with quotation and trade terms after review.',
    companyTitle: 'Company Info',
    companyNote: 'Noblesse',
    companySmall: 'Domestic and global B2B piercing catalog / Trade inquiry support',
    brandNoteTitle: 'Built For B2B Trade Inquiries',
    brandNoteText: 'Large product images, material and option details, MOQ, and a clear inquiry flow.',
  },
  jp: {
    eyebrow: '国内・海外B2Bカタログ',
    title: '貴族',
    lead: '国内・海外B2B取引先向けの貴族カタログです。',
    note: '商品情報、最小数量、素材、オプションを確認し、取引先お問い合わせを送信してください。',
    viewCatalog: '商品を見る',
    access: '取引先お問い合わせ',
    pending: '確認状況を見る',
    approved: 'お問い合わせリスト',
    admin: '管理者',
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
    featuredNote: '貴族カタログに適したベストセレクションです。',
    newTitle: '新商品',
    newNote: '次のセレクションに向けた新しいピアスです。',
    exportTitle: '輸出ベスト',
    exportNote: '輸出相談に適したおすすめスタイルです。',
    viewAll: 'すべて見る',
    campaignEyebrow: '貴族 Signature',
    campaignTitle: '貴族 Signature',
    campaignNote: '国内・海外の取引先お問い合わせに合わせたピアススタイルです。',
    campaignCta: '取引条件を問い合わせる',
    recentTitle: '最近見た商品',
    recentNote: '最近確認した商品は今後ここに表示されます。',
    supportTitle: '取引先お問い合わせ',
    supportNote: 'Email、KakaoTalk、WhatsAppの相談チャネルを準備中です。',
    supportSmall: '担当者確認後、見積と取引条件をご案内します。',
    companyTitle: '会社情報',
    companyNote: '貴族',
    companySmall: '国内・海外B2Bピアスカタログ / 取引先お問い合わせサポート',
    brandNoteTitle: '国内・海外取引先向け構成',
    brandNoteText: '大きな商品画像、素材とオプション、最小数量、わかりやすいお問い合わせフローを提供します。',
  },
  cn: {
    eyebrow: '国内外B2B商品目录',
    title: '贵族',
    lead: '面向国内外B2B买家的贵族商品目录。',
    note: '查看商品信息、最小数量、材质和选项后，请提交贸易咨询。',
    viewCatalog: '查看商品',
    access: '贸易咨询',
    pending: '查看确认状态',
    approved: '咨询清单',
    admin: '管理员',
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
    featuredNote: '适合贵族目录的精选款式。',
    newTitle: '新品上架',
    newNote: '为下一轮选品准备的新款穿孔。',
    exportTitle: '出口热选',
    exportNote: '适合出口咨询的推荐款式。',
    viewAll: '查看全部',
    campaignEyebrow: '贵族 Signature',
    campaignTitle: '贵族 Signature',
    campaignNote: '为国内外贸易咨询精选的穿孔风格。',
    campaignCta: '咨询交易条件',
    recentTitle: '最近浏览',
    recentNote: '最近查看的商品稍后会显示在这里。',
    supportTitle: '贸易咨询支持',
    supportNote: 'Email、KakaoTalk、WhatsApp 咨询渠道正在准备中。',
    supportSmall: '工作人员确认后，将提供报价和交易条件。',
    companyTitle: '公司信息',
    companyNote: '贵族',
    companySmall: '国内外B2B穿孔商品目录 / 贸易咨询支持',
    brandNoteTitle: '面向国内外B2B买家设计',
    brandNoteText: '提供大图商品展示、材质和选项、最小数量以及清晰的咨询流程。',
  },
}

const _quickCategories = [
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

const _collectionCopy = {
  'japan-buyer-picks': {
    kr: '일본 지역 취향에 맞춘 정제된 셀렉션입니다.',
    en: 'A refined selection for Japan-area buyers.',
    jp: '日本地域の好みに合わせたセレクションです。',
    cn: '适合日本地区偏好的精选系列。',
  },
  'us-buyer-picks': {
    kr: '미국 지역을 위한 깔끔한 스타일과 회전율 높은 피어싱입니다.',
    en: 'Clean, easy-to-select piercing styles for US-area buyers.',
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
    kr: '수출 상담에 적합한 Noblesse 핵심 상품입니다.',
    en: 'Core Noblesse items for export sourcing.',
    jp: '輸出相談に適したNoblesseの中心商品です。',
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
      jp: '貴族セレクト',
      cn: '贵族精选',
    },
    text: {
      kr: '거래처 문의에 적합한 티타늄 라블렛 추천 라인',
      en: 'Recommended titanium labret styles for trade inquiries.',
      jp: '取引先お問い合わせに適したチタンラブレット推薦ライン。',
      cn: '适合贸易咨询的钛钢唇钉推荐系列。',
    },
    to: '/products?material=Titanium',
    image: 'https://images.unsplash.com/photo-1671644730555-916aa8d8157f?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
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
    image: 'https://images.unsplash.com/photo-1602722872368-0cfc00f748ff?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
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
    image: 'https://images.unsplash.com/photo-1701777892740-88419a701472?auto=format&fit=crop&crop=entropy&w=900&h=1350&q=86',
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
      kr: 'B2B 셀렉션',
      en: 'B2B Selection',
      jp: 'B2Bセレクション',
      cn: 'B2B精选',
    },
    text: {
      kr: '해외 지역용 수출 추천 베스트 아이템',
      en: 'Export-ready best items for global sourcing.',
      jp: '海外地域向けの輸出推薦ベストアイテム。',
      cn: '适合海外地区采购的出口推荐单品。',
    },
    to: '/products?collection=export-best-items',
    image: 'https://images.unsplash.com/photo-1690126889953-a100f54b619e?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
  },
]

const homeSectionNav = [
  { id: 'new-arrival', label: '신상품' },
  { id: 'weekly-pick', label: '주간 추천' },
  { id: 'buyer-selection', label: '바이어 셀렉션' },
  { id: 'piercing-catalog', label: 'Piercing' },
  { id: 'steady-selection', label: '스테디 셀렉션' },
]

const homeCategoryChips = [
  { icon: 'surgical', label: '써지컬 피어싱', to: '/products?material=Surgical%20Steel' },
  { icon: 'silver', label: '실버 925', to: '/products?material=Silver%20925' },
  { icon: 'ring', label: '링 피어싱', to: '/products?q=ring' },
  { icon: 'cubic', label: '큐빅 피어싱', to: '/products?q=cubic' },
  { icon: 'ribbon', label: '리본 아이템', to: '/products?q=ribbon' },
  { icon: 'butterfly', label: '나비 아이템', to: '/products?q=butterfly' },
]

function CategoryChipIcon({ type }) {
  if (type === 'surgical') {
    return <svg aria-hidden="true" className="home-category-svg icon-surgical" viewBox="0 0 32 32">
      <circle cx="8" cy="16" r="4.4" />
      <circle cx="24" cy="16" r="4.4" />
      <path d="M12 16h8" />
      <path d="M16 9.5v13" />
    </svg>
  }

  if (type === 'silver') {
    return <svg aria-hidden="true" className="home-category-svg icon-silver" viewBox="0 0 32 32">
      <path className="silver-body" d="M7.2 12.2h17.6c1.7 0 3 1.3 3 3v1.6c0 1.7-1.3 3-3 3H7.2c-1.7 0-3-1.3-3-3v-1.6c0-1.7 1.3-3 3-3z" />
      <path className="silver-shine" d="M8 14h15.8" />
      <path className="silver-shadow" d="M8.4 18.1h15.2" />
      <text x="16" y="17.5" textAnchor="middle">925</text>
    </svg>
  }

  if (type === 'ring') {
    return <svg aria-hidden="true" className="home-category-svg icon-ring" viewBox="0 0 32 32">
      <circle cx="16" cy="17" r="8.4" />
      <circle cx="16" cy="17" r="4.7" />
      <path d="M20.6 7.4l2.2-2.2M23.3 10.2l2.7-.8" />
    </svg>
  }

  if (type === 'cubic') {
    return <svg aria-hidden="true" className="home-category-svg icon-cubic" viewBox="0 0 32 32">
      <path d="M10 7.5h12l4.5 6.5L16 25 5.5 14z" />
      <path d="M10 7.5L16 25l6-17.5M5.5 14h21M10 7.5l-4.5 6.5M22 7.5l4.5 6.5" />
    </svg>
  }

  if (type === 'ribbon') {
    return <svg aria-hidden="true" className="home-category-svg icon-ribbon" viewBox="0 0 32 32">
      <path className="ribbon-loop-left" d="M15 15.2C11.3 10.7 6.5 9.7 4.8 12.6c-1.6 2.7 1.6 6.2 5.1 5.6 1.8-.3 3.5-1.3 5.1-3z" />
      <path className="ribbon-loop-right" d="M17 15.2c3.7-4.5 8.5-5.5 10.2-2.6 1.6 2.7-1.6 6.2-5.1 5.6-1.8-.3-3.5-1.3-5.1-3z" />
      <rect className="ribbon-knot" x="13.1" y="13.4" width="5.8" height="5.4" rx="1.8" />
      <path className="ribbon-tail-left" d="M13.8 18.1l-3.2 6.1 5.4-2.5" />
      <path className="ribbon-tail-right" d="M18.2 18.1l3.2 6.1-5.4-2.5" />
    </svg>
  }

  return <svg aria-hidden="true" className="home-category-svg icon-butterfly" viewBox="0 0 32 32">
    <path d="M15 15.5C11.8 7.8 6.7 6.3 4.4 9.6c-2.1 3 .4 8.2 5 8.5 2.2.2 4.1-.9 5.6-2.6z" />
    <path d="M17 15.5c3.2-7.7 8.3-9.2 10.6-5.9 2.1 3-.4 8.2-5 8.5-2.2.2-4.1-.9-5.6-2.6z" />
    <path d="M15 17.2c-2.6 1-4.5 3.7-3.1 6 1.4 2.1 4.1.8 4.1-3.7M17 17.2c2.6 1 4.5 3.7 3.1 6-1.4 2.1-4.1.8-4.1-3.7" />
    <path d="M16 13.8v7.7" />
  </svg>
}

const homeShowcasePanels = [
  {
    ...heroBanners[1],
    key: 'cubic-premium',
    title: {
      kr: '프리미엄 큐빅 피어싱',
      en: 'Premium Cubic Piercing',
      jp: 'プレミアムキュービックピアス',
      cn: '高级锆石穿孔饰品',
    },
    eyebrow: {
      kr: 'NEW',
      en: 'NEW',
      jp: 'NEW',
      cn: 'NEW',
    },
    text: {
      kr: '빛 반사가 살아나는 큐빅 중심의 셀렉션',
      en: 'A cubic-focused selection with clear light reflection.',
      jp: '光の反射が映えるキュービック中心のセレクション。',
      cn: '以清晰光泽为重点的锆石精选。',
    },
    to: '/products?collection=premium-cubic-line',
    image: 'https://images.unsplash.com/photo-1602722872368-0cfc00f748ff?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
  },
  {
    ...heroBanners[3],
    key: 'trade-export',
    title: {
      kr: '수출 베스트 아이템',
      en: 'Export Best Items',
      jp: '輸出ベストアイテム',
      cn: '出口热选单品',
    },
    eyebrow: {
      kr: 'TRADE',
      en: 'TRADE',
      jp: 'TRADE',
      cn: 'TRADE',
    },
    text: {
      kr: '해외 거래처 상담에 맞춘 대표 라인',
      en: 'Representative lines for global trade inquiries.',
      jp: '海外取引先の相談に合わせた代表ライン。',
      cn: '适合海外贸易咨询的代表系列。',
    },
    to: '/products?collection=export-best-items',
    image: 'https://images.unsplash.com/photo-1690126889953-a100f54b619e?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
  },
  {
    ...heroBanners[1],
    key: 'silver-daily',
    title: {
      kr: '실버 데일리 피어싱',
      en: 'Silver Daily Piercing',
      jp: 'シルバーデイリーピアス',
      cn: '银色日常穿孔饰品',
    },
    eyebrow: {
      kr: 'SILVER',
      en: 'SILVER',
      jp: 'SILVER',
      cn: 'SILVER',
    },
    text: {
      kr: '데일리 카탈로그에 어울리는 실버 피어싱 셀렉션',
      en: 'Silver piercing selection for daily catalog styling.',
      jp: 'デイリーカタログに合うシルバーピアスセレクション。',
      cn: '适合日常目录搭配的银色穿孔饰品精选。',
    },
    image: 'https://images.unsplash.com/photo-1722410180651-efd51636f260?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
    to: '/products?material=Silver%20925',
  },
  {
    ...heroBanners[2],
    key: 'ring-fit',
    title: {
      kr: '링 피어싱 라인',
      en: 'Ring Piercing Line',
      jp: 'リングピアスライン',
      cn: '环形穿孔系列',
    },
    eyebrow: {
      kr: 'RING',
      en: 'RING',
      jp: 'RING',
      cn: 'RING',
    },
    text: {
      kr: '착용 이미지 중심으로 확인하는 링 피어싱 라인',
      en: 'Ring piercing line focused on worn-image styling.',
      jp: '着用イメージ中心で確認するリングピアスライン。',
      cn: '以佩戴图为中心查看的环形穿孔系列。',
    },
    image: 'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&crop=entropy&w=900&h=1350&q=86',
    to: '/products?q=ring',
  },
]

function getLocalizedValue(values, locale) {
  return values[locale] ?? values.en ?? values.kr
}

function _getCollectionTitle(collection, locale) {
  if (locale === 'kr') return collection.titleKo
  if (locale === 'jp') return collection.titleJa
  if (locale === 'cn') return collectionTitleCn[collection.collectionId] ?? collection.titleEn
  return collection.titleEn
}

const latinScrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const globalScrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789Noblesse귀족貴族贵族'

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

const homeSectionLimit = 8

const homeSectionProductLimit = {
  'new-arrival': 12,
  'weekly-pick': 7,
  'buyer-selection': 12,
  'piercing-catalog': 16,
  'steady-selection': 12,
}

const homeSectionSubtabs = {
  'piercing-catalog': ['볼피어싱', '링피어싱', '라블렛', '드롭/투핀', '귀걸이형'],
  'steady-selection': ['데일리 실버', '미니 큐빅', '베이직 링', '하트/리본', '스테디 바벨'],
}

const piercingCatalogTabFilters = [
  { label: '볼피어싱', categoryIds: ['piercing', 'cubic', 'pearl', 'surgical-steel'] },
  { label: '링피어싱', categoryIds: ['belly-ring'] },
  { label: '라블렛', categoryIds: ['labret'] },
  { label: '드롭/투핀', categoryIds: ['barbell'] },
  { label: '귀걸이형', categoryIds: ['earrings'] },
]

const homeSectionTabFilters = {
  'piercing-catalog': piercingCatalogTabFilters,
  'steady-selection': [
    { categoryIds: ['piercing', 'surgical-steel'], materialIncludes: ['Silver', 'Steel'] },
    { categoryIds: ['cubic'], collectionIds: ['premium-cubic-line'] },
    { categoryIds: ['piercing', 'belly-ring'] },
    { categoryIds: ['pearl', 'cubic', 'earrings'], collectionIds: ['japan-buyer-picks'] },
    { categoryIds: ['barbell', 'surgical-steel'], collectionIds: ['minimal-piercing-line'] },
  ],
}

const productMatchesTabFilter = (product, filter) => {
  if (!filter) return true

  const matchesCategory = filter.categoryIds?.includes(product.categoryId)
  const matchesCollection = filter.collectionIds?.some((collectionId) => product.collectionIds?.includes(collectionId))
  const matchesMaterial = filter.materialIncludes?.some((material) => product.material?.includes(material))

  return Boolean(matchesCategory || matchesCollection || matchesMaterial)
}

const homeSectionViewAll = {
  'new-arrival': { label: '신상품 더보기', to: '/products?collection=new-arrivals' },
  'weekly-pick': { label: '주간 추천 더보기', to: '/products?sort=best' },
  'piercing-catalog': { label: '피어싱 더 보기', to: '/products?category=piercing' },
  'steady-selection': { label: '스테디 더보기', to: '/products?collection=steady' },
}

const isAllowedHomeProduct = (product) => (
  product
  && !/(14K|Titanium)/i.test(product.material ?? '')
  && !['14k-gold', 'titanium'].includes(product.categoryId)
)

const _fillHomeSectionProducts = (preferredProducts, allProducts, limit = homeSectionLimit) => {
  const picked = []
  const seen = new Set()

  for (const product of [...preferredProducts, ...allProducts]) {
    if (!isAllowedHomeProduct(product)) continue
    if (!product || seen.has(product.productId)) continue
    picked.push(product)
    seen.add(product.productId)
    if (picked.length >= limit) break
  }

  return picked
}

const weeklyDemandSamples = [
  { inquiries: 17155, checks: 287 },
  { inquiries: 57070, checks: 1642 },
  { inquiries: 6507, checks: 64 },
  { inquiries: 9059, checks: 213 },
  { inquiries: 44796, checks: 1635 },
  { inquiries: 58112, checks: 721 },
  { inquiries: 12061, checks: 381 },
]

const buyerConceptPanels = [
  {
    key: 'buyer-consult-line',
    eyebrow: 'BUYER BOARD',
    title: {
      kr: '거래처 상담 라인',
      en: 'Buyer Consultation Line',
      jp: '取引先相談ライン',
      cn: '客户洽谈系列',
    },
    text: {
      kr: '신규 거래처가 소재와 스타일을 빠르게 검토하기 좋은 대표 구성을 모았습니다.',
      en: 'A representative board for reviewing materials and styles quickly.',
      jp: '素材とスタイルをすばやく確認できる取引先向け構成です。',
      cn: '适合客户快速确认材质与风格的代表组合。',
    },
    tags: {
      kr: ['MOQ 협의', '소재 제안', '샘플 상담'],
      en: ['MOQ Review', 'Material Guide', 'Sample Talk'],
      jp: ['MOQ相談', '素材提案', 'サンプル相談'],
      cn: ['MOQ 协商', '材质建议', '样品咨询'],
    },
    image: 'https://images.unsplash.com/photo-1722410180651-efd51636f260?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/products?collection=buyer-consultation',
  },
  {
    key: 'jp-market-curation',
    eyebrow: 'JP MARKET',
    title: {
      kr: 'JP 지역 추천 구성',
      en: 'JP Market Curation',
      jp: 'JP地域おすすめ構成',
      cn: 'JP 地区推荐组合',
    },
    text: {
      kr: '작고 선명한 실버·큐빅 라인을 중심으로 상담하기 좋은 셀렉션입니다.',
      en: 'A compact silver and cubic-focused curation for JP market talks.',
      jp: '小ぶりなシルバーとキュービックを中心にした相談向けセレクションです。',
      cn: '以小巧银色与锆石系列为主的 JP 市场洽谈组合。',
    },
    tags: {
      kr: ['JP 상담', '데일리 라인', '재입고 제안'],
      en: ['JP Inquiry', 'Daily Line', 'Restock'],
      jp: ['JP相談', 'デイリー', '再入荷提案'],
      cn: ['JP 咨询', '日常系列', '补货建议'],
    },
    image: 'https://images.unsplash.com/photo-1602722872368-0cfc00f748ff?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/products?market=JP',
  },
  {
    key: 'export-sample-kit',
    eyebrow: 'EXPORT KIT',
    title: {
      kr: '수출 샘플 보드',
      en: 'Export Sample Board',
      jp: '輸出サンプルボード',
      cn: '出口样品板',
    },
    text: {
      kr: '상담용 대표 이미지와 샘플 구성을 함께 확인하는 B2B 보드입니다.',
      en: 'A B2B board pairing sample sets with representative imagery.',
      jp: '代表画像とサンプル構成を一緒に確認するB2Bボードです。',
      cn: '可同时确认代表图片与样品组合的 B2B 看板。',
    },
    tags: {
      kr: ['수출 추천', '이미지 상담', '대표 구성'],
      en: ['Export Pick', 'Image Review', 'Core Set'],
      jp: ['輸出提案', '画像相談', '代表構成'],
      cn: ['出口推荐', '图片确认', '核心组合'],
    },
    image: 'https://images.unsplash.com/photo-1690126889953-a100f54b619e?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/products?collection=export-best-items',
  },
  {
    key: 'steady-reorder',
    eyebrow: 'REORDER',
    title: {
      kr: '꾸준한 재입고 라인',
      en: 'Steady Reorder Line',
      jp: '定番再入荷ライン',
      cn: '稳定补货系列',
    },
    text: {
      kr: '계절을 크게 타지 않는 기본 라인으로 반복 상담에 적합합니다.',
      en: 'Stable everyday lines designed for repeat buyer discussions.',
      jp: '季節を問わず継続相談しやすい定番ラインです。',
      cn: '不太受季节影响，适合持续洽谈的基础系列。',
    },
    tags: {
      kr: ['스테디', '기본 구성', '거래처용'],
      en: ['Steady', 'Core Line', 'For Buyers'],
      jp: ['定番', '基本構成', '取引先向け'],
      cn: ['常备', '基础组合', '客户用'],
    },
    image: 'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&crop=entropy&w=1200&h=1200&q=86',
    to: '/products?collection=steady',
  },
  {
    key: 'display-board',
    eyebrow: 'DISPLAY',
    title: {
      kr: '매장 진열 제안',
      en: 'Display Board Proposal',
      jp: '売場ディスプレイ提案',
      cn: '陈列展示建议',
    },
    text: {
      kr: '진열과 촬영 컷을 함께 고려한 상담용 이미지 중심 구성입니다.',
      en: 'Image-led curation for merchandising and catalog display talks.',
      jp: '陳列と撮影イメージを合わせて提案する構成です。',
      cn: '兼顾陈列与拍摄效果的图片导向组合。',
    },
    tags: {
      kr: ['진열 제안', '촬영 컷', '카탈로그용'],
      en: ['Display', 'Photo Set', 'Catalog'],
      jp: ['陳列提案', '撮影カット', 'カタログ用'],
      cn: ['陈列建议', '拍摄图', '目录用'],
    },
    image: 'https://images.unsplash.com/photo-1701777892740-88419a701472?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/products?collection=display-board',
  },
  {
    key: 'material-match',
    eyebrow: 'MATERIAL',
    title: {
      kr: '소재별 상담 보드',
      en: 'Material Match Board',
      jp: '素材別相談ボード',
      cn: '材质洽谈看板',
    },
    text: {
      kr: '써지컬, 실버, 큐빅 등 거래처가 비교하기 쉬운 소재 중심 구성입니다.',
      en: 'Material-led comparison board for buyer-side selection.',
      jp: 'サージカル、シルバー、キュービックを比較しやすい構成です。',
      cn: '便于客户比较外科钢、银、锆石等材质。',
    },
    tags: {
      kr: ['소재 비교', '가격 상담', '라인 제안'],
      en: ['Material', 'Price Talk', 'Line Plan'],
      jp: ['素材比較', '価格相談', 'ライン提案'],
      cn: ['材质比较', '价格洽谈', '系列建议'],
    },
    image: 'https://images.unsplash.com/photo-1671644730555-916aa8d8157f?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/products?collection=material-match',
  },
]

const getWeeklyDemand = (index) => weeklyDemandSamples[index % weeklyDemandSamples.length]

function HomeProductCard({ product, index, variant = 'default' }) {
  const { addInquiryItem, approvedPrice, getPrice, isApproved, viewerState } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteNotice, setFavoriteNotice] = useState('')
  const productName = getLocalizedProductName(product, locale)
  const productAlt = getLocalizedProductAlt(product, locale)
  const price = getPrice(product.productId)
  const imageSources = [
    product.imageSet?.card,
    product.imageSet?.detail,
    product.imageSet?.zoom,
  ].filter((src) => src && !src.includes('cdn.example.com'))
  const fallbackImage = homeShowcasePanels[index % homeShowcasePanels.length]?.image
  const cardImageSources = imageSources.length > 0 ? imageSources : [fallbackImage].filter(Boolean)
  const unavailablePriceLabel = { kr: '가격 미등록', en: 'Price unavailable', jp: '価格未登録', cn: '价格未登记' }[locale] ?? 'Price unavailable'
  const displayPrice = isApproved && price
    ? formatMoney(approvedPrice(product.productId), price.currency)
    : isApproved ? unavailablePriceLabel : '승인 후 가격 확인 가능'
  const statusLabel = product.isNew ? 'NEW' : product.isBest ? 'BEST' : 'B2B'
  const weeklyDemand = variant === 'weekly-pick' ? getWeeklyDemand(index) : null

  const handleFavoriteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (viewerState === 'guest') {
      setFavoriteNotice('로그인 후 사용할 수 있어요')
      window.clearTimeout(window.__noblesseFavoriteNoticeTimer)
      window.__noblesseFavoriteNoticeTimer = window.setTimeout(() => setFavoriteNotice(''), 1800)
      return
    }

    setIsFavorite((current) => !current)
  }

  const handleInquiryActionClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isApproved) {
      setFavoriteNotice('승인 후 이용 가능')
      window.clearTimeout(window.__noblesseFavoriteNoticeTimer)
      window.__noblesseFavoriteNoticeTimer = window.setTimeout(() => setFavoriteNotice(''), 1800)
      return
    }

    addInquiryItem(product.productId)
    setFavoriteNotice('견적 리스트에 담았어요')
    window.clearTimeout(window.__noblesseFavoriteNoticeTimer)
    window.__noblesseFavoriteNoticeTimer = window.setTimeout(() => setFavoriteNotice(''), 1800)
  }

  return <article className={`home-product-card variant-${variant}`} style={{ '--product-index': index }}>
    <div className="home-product-media">
    <Link className={`home-product-image tone-${product.tone}`} to={toLocalePath(`/products/${product.productId}`)} aria-label={productName}>
      <span className="home-product-status">{statusLabel}</span>
      <span className="jewel-shape" />
      <span className="home-product-image-cycle" style={{ '--cycle-delay': `${(index % 5) * 0.18}s` }}>
        {cardImageSources.map((src, imageIndex) => <img
          alt={imageIndex === 0 ? productAlt : ''}
          aria-hidden={imageIndex === 0 ? undefined : 'true'}
          key={`${product.productId}-${imageIndex}`}
          loading="lazy"
          src={src}
          width="600"
          height="900"
          onError={(event) => { event.currentTarget.hidden = true }}
        />)}
      </span>
    </Link>
    <div className="home-product-actions" aria-label={`${productName} 빠른 작업`}>
      <button className="home-product-action" type="button" aria-label={`${productName} 견적 리스트에 담기`} onClick={handleInquiryActionClick}>
        <ClipboardList size={15} />
      </button>
      <button className={`home-product-action home-product-heart${isFavorite ? ' is-saved' : ''}`} type="button" aria-pressed={isFavorite} aria-label={`${productName} 좋아요`} onClick={handleFavoriteClick}>
        <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
    {favoriteNotice ? <span className="home-product-favorite-notice">{favoriteNotice}</span> : null}
    </div>
    <div className="home-product-info">
      <Link to={toLocalePath(`/products/${product.productId}`)}>
        <strong>{productName}</strong>
        {weeklyDemand ? <span className="home-product-demand">
          {`누적 문의 ${weeklyDemand.inquiries.toLocaleString('ko-KR')}건+ · 확인 ${weeklyDemand.checks.toLocaleString('ko-KR')}회`}
        </span> : null}
        <small>{product.material}</small>
      </Link>
      <b>{displayPrice}</b>
    </div>
  </article>
}

function ProductSection({ products, sectionId, title, note }) {
  const [activeTab, setActiveTab] = useState(0)
  const [tabMotionKey, setTabMotionKey] = useState(0)

  if (products.length === 0) return null

  const sectionSubtabs = homeSectionSubtabs[sectionId] ?? []
  const sectionTabFilters = homeSectionTabFilters[sectionId] ?? []
  const viewAll = homeSectionViewAll[sectionId]
  const isLoopSection = sectionId === 'weekly-pick'
  const activeTabFilter = sectionTabFilters[activeTab] ?? null
  const filteredProducts = activeTabFilter
    ? products.filter((product) => productMatchesTabFilter(product, activeTabFilter))
    : products
  const safeProducts = sectionTabFilters.length > 0
    ? _fillHomeSectionProducts(filteredProducts, products, homeSectionProductLimit[sectionId])
    : filteredProducts.length > 0 ? filteredProducts : products
  const sectionProducts = safeProducts.slice(0, homeSectionProductLimit[sectionId] ?? homeSectionLimit)
  const renderProducts = isLoopSection ? [...sectionProducts, ...sectionProducts] : sectionProducts
  const handleTabClick = (index) => {
    if (index === activeTab) return

    setActiveTab(index)
    setTabMotionKey((current) => current + 1)
  }

  return <section className={`section-wrap product-feature-section section-${sectionId}`} id={`home-${sectionId}`}>
    <div className="home-product-section-title">
      <ScrambleText as="h2" persistKey={`product-section-title-${sectionId}`}>{title}</ScrambleText>
      {note ? <p>{note}</p> : null}
    </div>
    {sectionSubtabs.length > 0 ? <div className="home-section-subtabs" aria-label={`${title} categories`}>
      {sectionSubtabs.map((tab, index) => <button className={index === activeTab ? 'is-active' : undefined} key={tab} type="button" onClick={() => handleTabClick(index)}>{tab}</button>)}
    </div> : null}
    <div className={`home-product-grid${isLoopSection ? ' is-looping' : ''}${sectionTabFilters.length > 0 ? ' has-tab-motion' : ''}`} key={`${sectionId}-${tabMotionKey}`}>
      {renderProducts.map((product, index) => <HomeProductCard key={`${product.productId}-${index}`} product={product} index={index} variant={sectionId} />)}
    </div>
    {viewAll ? <Link className="home-section-more" to={viewAll.to}>
      <span>{viewAll.label}</span>
    </Link> : null}
  </section>
}

function BuyerCollectionSection() {
  const { locale, toLocalePath } = useLocalePath()
  const marqueeViewportRef = useRef(null)
  const panels = [...buyerConceptPanels, ...buyerConceptPanels, ...buyerConceptPanels]

  useEffect(() => {
    const viewport = marqueeViewportRef.current
    const rail = viewport?.querySelector('.buyer-concept-rail')

    if (!viewport || !rail) return undefined

    const getCardStep = () => {
      const loopPoint = rail.scrollWidth / 3
      const firstCard = rail.querySelector('.buyer-concept-card')
      const gap = Number.parseFloat(window.getComputedStyle(rail).gap) || 0
      const cardStep = firstCard ? firstCard.getBoundingClientRect().width + gap : 0

      return {
        cardStep,
        loopPoint,
      }
    }

    const slide = () => {
      const { cardStep, loopPoint } = getCardStep()
      if (!cardStep || loopPoint <= viewport.clientWidth) return

      if (viewport.scrollLeft >= loopPoint) {
        viewport.scrollLeft -= loopPoint
      }

      const nextLeft = viewport.scrollLeft + cardStep * 2

      viewport.scrollTo({
        behavior: 'smooth',
        left: nextLeft,
      })

      if (nextLeft >= loopPoint) {
        window.setTimeout(() => {
          if (viewport.scrollLeft >= loopPoint) {
            viewport.scrollLeft -= loopPoint
          }
        }, 720)
      }
    }

    const interval = window.setInterval(slide, 2000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return <section className="section-wrap buyer-collection-section" id="home-buyer-selection">
    <div className="buyer-collection-heading">
      <span className="buyer-heading-spark" aria-hidden="true">✦</span>
      <div>
        <ScrambleText as="h2" persistKey="buyer-concept-title">바이어 셀렉션</ScrambleText>
        <p>국내·해외 거래처 상담 흐름에 맞춰 정리한 B2B 컨셉 보드입니다.</p>
      </div>
    </div>
    <div className="buyer-concept-viewport" ref={marqueeViewportRef}>
      <div className="buyer-concept-rail">
        {panels.map((panel, index) => {
          const title = getLocalizedValue(panel.title, locale)
          const text = getLocalizedValue(panel.text, locale)
          const tags = getLocalizedValue(panel.tags, locale)

          return <Link className="buyer-concept-card" to={toLocalePath(panel.to)} key={`${panel.key}-${index}`}>
            <img src={panel.image} alt={title} loading="lazy" width="1200" height="1200" />
            <span className="buyer-concept-eyebrow">NOBLESSE</span>
            <div className="buyer-concept-copy">
              <strong>{title}</strong>
              <p>{text}</p>
              <ul>
                {tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </div>
          </Link>
        })}
      </div>
    </div>
  </section>
}

export function HomePage() {
  const showcaseScrollerRef = useRef(null)
  const sectionNavAnchorRef = useRef(null)
  const sectionNavTriggerRef = useRef(null)
  const showcaseDragRef = useRef({
    didDrag: false,
    isDragging: false,
    scrollLeft: 0,
    startX: 0,
  })
  const [isShowcaseDragging, setIsShowcaseDragging] = useState(false)
  const [isSectionNavFixed, setIsSectionNavFixed] = useState(false)
  const [activeHomeSection, setActiveHomeSection] = useState(homeSectionNav[0].id)
  const { isApproved, products } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = homeCopy[locale] ?? homeCopy.kr
  const homeSourceProducts = products.length > 0 ? products : mockProducts
  const homeProducts = homeSourceProducts.filter(isAllowedHomeProduct)
  const newProducts = _fillHomeSectionProducts(homeProducts.filter((product) => product.isNew), homeProducts)
  const weeklyProducts = _fillHomeSectionProducts(homeProducts.filter((product) => product.isBest), homeProducts)
  const piercingCatalogProducts = _fillHomeSectionProducts(
    homeProducts.filter((product) => ['piercing', 'barbell', 'labret', 'nose-piercing', 'belly-ring'].includes(product.categoryId)),
    homeProducts,
    homeSectionProductLimit['piercing-catalog'],
  )
  const steadySelectionProducts = _fillHomeSectionProducts(
    homeProducts.filter((product) => product.material.includes('Silver') || product.collectionIds.includes('minimal-piercing-line') || product.collectionIds.includes('premium-cubic-line')),
    homeProducts,
  )
  const showcaseLoopPanels = [...homeShowcasePanels, ...homeShowcasePanels, ...homeShowcasePanels]

  const replayProductSectionReveal = (section) => {
    const cards = Array.from(section.querySelectorAll('.home-product-card'))

    if (!cards.length) return

    cards.forEach((card, index) => {
      card.style.setProperty('--reveal-index', String(index % 8))
      card.classList.remove('is-visible')
    })

    const revealCards = () => {
      cards.forEach((card) => {
        card.classList.add('is-visible')
      })
    }

    const sectionIsVisible = () => {
      const rect = section.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.84 && rect.bottom > window.innerHeight * 0.16
    }

    if (sectionIsVisible()) {
      window.requestAnimationFrame(() => {
        window.setTimeout(revealCards, 70)
      })
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return

      observer.disconnect()
      window.setTimeout(revealCards, 80)
    }, {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.08,
    })

    observer.observe(section)
    window.setTimeout(() => {
      observer.disconnect()
      if (sectionIsVisible()) revealCards()
    }, 1600)
  }

  const scrollToHomeSection = (sectionId) => {
    setActiveHomeSection(sectionId)
    const section = document.getElementById(`home-${sectionId}`)
    if (!section) return

    if (['new-arrival', 'piercing-catalog', 'steady-selection'].includes(sectionId)) {
      replayProductSectionReveal(section)
    }

    const headerOffset = window.matchMedia('(max-width: 760px)').matches ? 92 : 88
    const targetTop = section.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({
      behavior: 'smooth',
      top: Math.max(0, targetTop),
    })
  }

  const getShowcaseStep = useCallback(() => {
    const scroller = showcaseScrollerRef.current
    const firstPanel = scroller?.querySelector('.home-showcase-panel')
    const track = scroller?.querySelector('.home-showcase-track')

    if (!scroller || !firstPanel || !track) return 0

    const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0
    return firstPanel.getBoundingClientRect().width + gap
  }, [])

  const alignShowcaseGapToCenter = useCallback(() => {
    const scroller = showcaseScrollerRef.current
    const firstPanel = scroller?.querySelector('.home-showcase-panel')
    const step = getShowcaseStep()

    if (!scroller || !firstPanel || !step) return

    const panelWidth = firstPanel.getBoundingClientRect().width
    const gapOffset = panelWidth + (step - panelWidth) / 2 - scroller.clientWidth / 2
    scroller.scrollLeft = Math.max(0, gapOffset)
  }, [getShowcaseStep])

  useEffect(() => {
    alignShowcaseGapToCenter()
    window.addEventListener('resize', alignShowcaseGapToCenter)

    return () => {
      window.removeEventListener('resize', alignShowcaseGapToCenter)
    }
  }, [alignShowcaseGapToCenter, getShowcaseStep])

  useEffect(() => {
    const root = document.querySelector('main')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!root || reduceMotion || !('IntersectionObserver' in window)) return undefined

    const revealSelector = [
      '.section-new-arrival .home-product-card',
      '.section-piercing-catalog .home-product-card',
      '.section-steady-selection .home-product-card',
    ].join(', ')
    const forceRevealSections = [
      'section-new-arrival',
      'section-piercing-catalog',
      'section-steady-selection',
    ]
    const observedItems = new WeakSet()

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return

        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.08,
    })

    const prepareRevealItem = (item) => {
      if (!(item instanceof HTMLElement) || observedItems.has(item)) return

      const siblings = Array.from(item.parentElement?.querySelectorAll('.home-product-card') ?? [])
      const itemIndex = Math.max(0, siblings.indexOf(item))
      const sectionClass = forceRevealSections.find((className) => item.closest(`.${className}`))

      observedItems.add(item)
      item.style.setProperty('--reveal-index', String(itemIndex % 8))
      item.classList.remove('is-visible')
      item.classList.add('home-scroll-reveal')
      if (sectionClass) item.classList.add(`reveal-${sectionClass.replace('section-', '')}`)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          observer.observe(item)
        })
      })
    }

    root.querySelectorAll(revealSelector).forEach(prepareRevealItem)

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return

          if (node.matches(revealSelector)) prepareRevealItem(node)
          node.querySelectorAll?.(revealSelector).forEach(prepareRevealItem)
        })
      })
    })

    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    })

    return () => {
      mutationObserver.disconnect()
      observer.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const fixedTop = () => (window.matchMedia('(max-width: 760px)').matches ? 74 : 18)

    const updateSectionNavPosition = () => {
      const anchor = sectionNavAnchorRef.current
      if (!anchor) return

      if (sectionNavTriggerRef.current === null) {
        sectionNavTriggerRef.current = anchor.getBoundingClientRect().top + window.scrollY - fixedTop()
      }

      setIsSectionNavFixed(window.scrollY >= sectionNavTriggerRef.current)

      const activeOffset = fixedTop() + 120
      const currentSection = homeSectionNav.reduce((current, item) => {
        const section = document.getElementById(`home-${item.id}`)
        if (!section) return current

        return section.getBoundingClientRect().top <= activeOffset ? item.id : current
      }, homeSectionNav[0].id)

      setActiveHomeSection(currentSection)
    }

    const resetSectionNavTrigger = () => {
      sectionNavTriggerRef.current = null
      updateSectionNavPosition()
    }

    updateSectionNavPosition()
    window.addEventListener('scroll', updateSectionNavPosition, { passive: true })
    window.addEventListener('resize', resetSectionNavTrigger)

    return () => {
      window.removeEventListener('scroll', updateSectionNavPosition)
      window.removeEventListener('resize', resetSectionNavTrigger)
    }
  }, [])

  const handleShowcasePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return

    const scroller = showcaseScrollerRef.current
    if (!scroller) return

    showcaseDragRef.current = {
      didDrag: false,
      isDragging: true,
      scrollLeft: scroller.scrollLeft,
      startX: event.clientX,
    }
    setIsShowcaseDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleShowcasePointerMove = (event) => {
    const drag = showcaseDragRef.current
    const scroller = showcaseScrollerRef.current

    if (!drag.isDragging || !scroller) return

    const deltaX = event.clientX - drag.startX
    if (Math.abs(deltaX) > 4) drag.didDrag = true

    scroller.scrollLeft = drag.scrollLeft - deltaX
    event.preventDefault()
  }

  const handleShowcasePointerEnd = (event) => {
    if (!showcaseDragRef.current.isDragging) return

    showcaseDragRef.current.isDragging = false
    setIsShowcaseDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    const scroller = showcaseScrollerRef.current
    const step = getShowcaseStep()
    const loopWidth = step * homeShowcasePanels.length

    if (scroller && step && scroller.scrollLeft >= loopWidth) {
      scroller.scrollLeft -= loopWidth
    }
  }

  const handleShowcaseClick = (event) => {
    if (!showcaseDragRef.current.didDrag) return

    event.preventDefault()
    event.stopPropagation()
    showcaseDragRef.current.didDrag = false
  }

  return <main>
    <section className="home-main-portrait-section home-showcase-section">
      <div
        aria-label="Noblesse piercing image showcase"
        className={`home-showcase-grid${isShowcaseDragging ? ' is-dragging' : ''}`}
        onPointerCancel={handleShowcasePointerEnd}
        onPointerDown={handleShowcasePointerDown}
        onPointerLeave={handleShowcasePointerEnd}
        onPointerMove={handleShowcasePointerMove}
        onPointerUp={handleShowcasePointerEnd}
        ref={showcaseScrollerRef}
      >
        <div className="home-showcase-track">
        {showcaseLoopPanels.map((banner, index) => {
          const bannerTitle = getLocalizedValue(banner.title, locale)
          const bannerEyebrow = getLocalizedValue(banner.eyebrow, locale)
          const bannerText = getLocalizedValue(banner.text, locale)
          const label = ['NEW', 'HOT', 'TRADE', 'BEST', 'SILVER', 'RING'][index % homeShowcasePanels.length]

          return <Link className="home-showcase-panel" key={`${banner.key}-${index}`} onClick={handleShowcaseClick} to={toLocalePath(banner.to)}>
            <img alt={bannerTitle} height="1200" loading={index === 0 ? 'eager' : 'lazy'} src={banner.image} width="900" />
            <span className="home-showcase-label">{label}</span>
            <span className="home-showcase-copy">
              <strong>{bannerTitle}</strong>
              <small>{bannerEyebrow}</small>
              <em>{bannerText}</em>
            </span>
          </Link>
        })}
        </div>
      </div>
      <div className="home-showcase-categories" aria-label="피어싱 카테고리">
        {homeCategoryChips.map((category) => <Link key={category.label} to={toLocalePath(category.to)}>
          <CategoryChipIcon type={category.icon} />
          <b>{category.label}</b>
        </Link>)}
      </div>
    </section>

    <div className={`home-section-nav-anchor${isSectionNavFixed ? ' is-fixed' : ''}`} ref={sectionNavAnchorRef}>
      <div className="home-section-nav" aria-label="홈 제품 섹션 이동">
        {homeSectionNav.map((item) => <button key={item.id} className={activeHomeSection === item.id ? 'is-active' : undefined} type="button" onClick={() => scrollToHomeSection(item.id)}>
          {item.label}
        </button>)}
      </div>
    </div>
    {isSectionNavFixed ? <div className="home-section-nav-fixed" aria-label="고정 제품 섹션 이동">
      {homeSectionNav.map((item) => <button key={item.id} className={activeHomeSection === item.id ? 'is-active' : undefined} type="button" onClick={() => scrollToHomeSection(item.id)}>
        {item.label}
      </button>)}
    </div> : null}

    <ProductSection products={newProducts} sectionId="new-arrival" title="NEW" note="새롭게 준비한 신규 라인과 이번 주 추천 아이템입니다." />
    <ProductSection products={weeklyProducts} sectionId="weekly-pick" title="WEEKLY BEST" />
    <BuyerCollectionSection />
    <ProductSection products={piercingCatalogProducts} sectionId="piercing-catalog" title="Piercing" note="피어싱=귀족, 더이상 말이 필요한가요?" />
    <ProductSection products={steadySelectionProducts} sectionId="steady-selection" title="스테디 셀렉션" note="꾸준히 찾는 데일리 라인을 모았습니다." />

    <section className="campaign-banner">
      <div>
        <ScrambleText as="p" className="eyebrow" persistKey="campaign-eyebrow">{copy.campaignEyebrow}</ScrambleText>
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

  </main>
}

function ClockIcon() {
  return <span className="soft-icon">N</span>
}
