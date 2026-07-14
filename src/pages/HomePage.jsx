import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, Headphones, Heart, Mail, Pause, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import { formatAdminPriceBook } from '../config/currency'
import { mockProducts } from '../data/catalog'
import { homeTaxonomyLinks } from '../data/productTaxonomy'
import {
  getHomeSourceProducts,
  selectAllowedHomeProducts,
  selectNewArrivalProducts,
  selectPiercingCatalogProducts,
  selectSteadySelectionProducts,
  selectWeeklyBestProducts,
} from '../services/homePlacement'
import { formatMoney } from '../utils/commerce'
import { getLocaleContentKey, getLocalizedProductAlt, getLocalizedProductName, resolveLocaleCopy, useLocalePath } from '../utils/locale'

const homeCopy = {
  kr: {
    eyebrow: '국내·해외 B2B 카탈로그',
    title: '귀족',
    lead: '국내·해외 B2B 바이어를 위한 Noblesse 피어싱 카탈로그입니다.',
    note: '제품 정보, MOQ, 소재와 옵션을 확인하고 거래 문의를 남겨주세요.',
    viewCatalog: '카탈로그 보기',
    access: '거래 문의하기',
    pending: '확인 상태 보기',
    approved: '견적 리스트',
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
    eyebrow: '國內外B2B商品目錄',
    title: '貴族',
    lead: '面向國內外B2B買家的貴族商品目錄。',
    note: '查看商品資訊、最小數量、材質和選項後，請提交貿易諮詢。',
    viewCatalog: '查看商品',
    access: '貿易諮詢',
    pending: '查看確認状態',
    approved: '諮詢清單',
    admin: '管理員',
    buyerStripGuest: '面向國內外B2B買家的商品目錄',
    buyerStripPending: '貿易資訊確認中',
    buyerStripApproved: '可提供交易條件',
    buyerStripGuestNote: '交易條件和報價將在工作人員確認後提供。',
    buyerStripApprovedNote: '可查看负責地區的交易條件。',
    quickTitle: '快速分類',
    quickNote: '從常见穿孔款式開始瀏覽。',
    collectionsTitle: '推薦系列',
    collectionsNote: '按地區偏好整理的品牌精選。',
    browseProducts: '瀏覽商品',
    stylesLabel: '款式',
    featuredTitle: '推薦穿孔',
    featuredNote: '適合貴族目錄的精選款式。',
    newTitle: '新品上架',
    newNote: '為下一轮選品準備的新款穿孔。',
    exportTitle: '出口熱選',
    exportNote: '適合出口諮詢的推薦款式。',
    viewAll: '查看全部',
    campaignEyebrow: '貴族 Signature',
    campaignTitle: '貴族 Signature',
    campaignNote: '為國內外貿易諮詢精選的穿孔風格。',
    campaignCta: '諮詢交易條件',
    recentTitle: '最近瀏覽',
    recentNote: '最近查看的商品稍後會顯示在这里。',
    supportTitle: '貿易諮詢支持',
    supportNote: 'Email、KakaoTalk、WhatsApp 諮詢渠道正在準備中。',
    supportSmall: '工作人員確認後，將提供報價和交易條件。',
    companyTitle: '公司資訊',
    companyNote: '貴族',
    companySmall: '國內外B2B穿孔商品目錄 / 貿易諮詢支持',
    brandNoteTitle: '面向國內外B2B買家設计',
    brandNoteText: '提供大圖商品展示、材質和選項、最小數量以及清晰的諮詢流程。',
  },
}

const _quickCategories = [
  { key: 'new', query: '?tag=new', labels: { kr: '신상품', en: 'New', jp: '新商品', cn: '新品' } },
  { key: 'best', query: '?tag=best', labels: { kr: '베스트', en: 'Best', jp: 'ベスト', cn: '熱選' } },
  { key: 'ring', query: '?category=piercing', labels: { kr: '링', en: 'Ring', jp: 'リング', cn: '環' } },
  { key: 'barbell', query: '?category=barbell', labels: { kr: '바벨', en: 'Barbell', jp: 'バーベル', cn: '槓鈴' } },
  { key: 'labret', query: '?category=labret', labels: { kr: '라블렛', en: 'Labret', jp: 'ラブレット', cn: '唇釘' } },
  { key: 'silver', query: '?color=Silver', labels: { kr: '실버', en: 'Silver', jp: 'シルバー', cn: '銀色' } },
  { key: 'gold', query: '?color=Gold', labels: { kr: '골드', en: 'Gold', jp: 'ゴールド', cn: '金色' } },
  { key: 'titanium', query: '?material=Titanium', labels: { kr: '티타늄', en: 'Titanium', jp: 'チタン', cn: '鈦鋼' } },
  { key: 'steel', query: '?material=Surgical%20Steel', labels: { kr: '써지컬 스틸', en: 'Surgical Steel', jp: 'サージカルステンレス', cn: '医用鋼' } },
]

const _collectionCopy = {
  'japan-buyer-picks': {
    kr: '일본 지역 취향에 맞춘 정제된 셀렉션입니다.',
    en: 'A refined selection for Japan-area buyers.',
    jp: '日本地域の好みに合わせたセレクションです。',
    cn: '適合日本地區偏好的精選系列。',
  },
  'us-buyer-picks': {
    kr: '미국 지역을 위한 깔끔한 스타일과 회전율 높은 피어싱입니다.',
    en: 'Clean, easy-to-select piercing styles for US-area buyers.',
    jp: '米国地域に向けたクリーンで回転率の高いスタイルです。',
    cn: '適合美國地區的簡洁高週轉款式。',
  },
  'minimal-piercing-line': {
    kr: '데일리 진열에 어울리는 미니멀 피어싱 라인입니다.',
    en: 'Minimal piercing line for daily merchandising.',
    jp: 'デイリー陳列に合うミニマルピアスラインです。',
    cn: '適合日常陈列的极簡穿孔系列。',
  },
  'premium-cubic-line': {
    kr: '빛 반사가 선명한 프리미엄 큐빅 스타일입니다.',
    en: 'Premium cubic styles with bright reflection.',
    jp: '輝きがきれいなプレミアムキュービックラインです。',
    cn: '光泽清晰的高端鋯石款式。',
  },
  'export-best-items': {
    kr: '수출 상담에 적합한 Noblesse 핵심 상품입니다.',
    en: 'Core Noblesse items for export sourcing.',
    jp: '輸出相談に適したNoblesseの中心商品です。',
    cn: '適合出口採購諮詢的核心商品。',
  },
  'new-arrivals': {
    kr: '다음 셀렉션을 위한 신규 입고 스타일입니다.',
    en: 'New arrivals prepared for the next selection.',
    jp: '次のセレクションに向けた新入荷スタイルです。',
    cn: '為下一轮選品準備的新款。',
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
      cn: '鈦鋼唇釘系列',
    },
    eyebrow: {
      kr: '노블레스 추천',
      en: 'Noblesse Picks',
      jp: '貴族セレクト',
      cn: '貴族精選',
    },
    text: {
      kr: '거래처 문의에 적합한 티타늄 라블렛 추천 라인',
      en: 'Recommended titanium labret styles for trade inquiries.',
      jp: '取引先お問い合わせに適したチタンラブレット推薦ライン。',
      cn: '適合貿易諮詢的鈦鋼唇釘推薦系列。',
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
      cn: '高級鋯石穿孔飾品',
    },
    eyebrow: {
      kr: '큐빅 컬렉션',
      en: 'Cubic Collection',
      jp: 'キュービックコレクション',
      cn: '鋯石系列',
    },
    text: {
      kr: '큐빅과 오팔 디테일 중심의 피어싱 셀렉션',
      en: 'A piercing selection focused on cubic and opal details.',
      jp: 'キュービックとオパールポイント中心のピアスセレクション。',
      cn: '以鋯石與歐泊細節為中心的穿孔飾品選擇。',
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
      cn: '金色精選',
    },
    text: {
      kr: '작고 고급스러운 14K 골드 피어싱 카탈로그',
      en: 'A refined catalog of tiny 14K gold piercing styles.',
      jp: '小さく上品な14Kゴールドピアスカタログ。',
      cn: '精致小巧的14K金穿孔飾品目錄。',
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
      cn: '出口熱選單品',
    },
    eyebrow: {
      kr: 'B2B 셀렉션',
      en: 'B2B Selection',
      jp: 'B2Bセレクション',
      cn: 'B2B精選',
    },
    text: {
      kr: '해외 지역용 수출 추천 베스트 아이템',
      en: 'Export-ready best items for global sourcing.',
      jp: '海外地域向けの輸出推薦ベストアイテム。',
      cn: '適合海外地區採購的出口推薦單品。',
    },
    to: '/products?collection=export-best-items',
    image: 'https://images.unsplash.com/photo-1690126889953-a100f54b619e?auto=format&fit=crop&crop=faces&w=900&h=1350&q=86',
  },
]

const homeSectionNav = [
  {
    id: 'new-arrival',
    labels: { kr: '신상품', en: 'New Arrival', jp: '新商品', cn: '新品' },
  },
  {
    id: 'weekly-pick',
    labels: { kr: '주간 추천', en: 'Weekly Best', jp: '週間ベスト', cn: '每週精選' },
  },
  {
    id: 'buyer-selection',
    labels: { kr: '바이어 셀렉션', en: 'Buyer Selection', jp: 'バイヤーセレクション', cn: '買家精選' },
  },
  {
    id: 'piercing-catalog',
    labels: { kr: '피어싱', en: 'Piercing', jp: 'ピアス', cn: '穿孔' },
  },
  {
    id: 'steady-selection',
    labels: { kr: '스테디 셀렉션', en: 'Steady Selection', jp: '定番セレクション', cn: '常青精選' },
  },
]

const homeCategoryChips = [
  {
    key: 'silver-925',
    icon: 'silver',
    labels: { kr: '실버925', en: 'Silver 925', jp: 'シルバー925', cn: '925銀' },
    to: homeTaxonomyLinks.silver925,
  },
  {
    key: 'brass-barbell',
    icon: 'surgical',
    labels: { kr: '바벨(신주)', en: 'Brass Barbell', jp: '真鍮バーベル', cn: '黄銅槓鈴' },
    to: homeTaxonomyLinks.brassBarbell,
  },
  {
    key: 'drop-antique',
    icon: null,
    labels: { kr: '드롭&엔틱', en: 'Drop & Antique', jp: 'ドロップ&アンティーク', cn: '垂墜&複古' },
    to: homeTaxonomyLinks.dropAntique,
  },
  {
    key: 'all-surgical',
    icon: 'surgical',
    emoji: '⚕️',
    labels: { kr: '올써지컬', en: 'All Surgical', jp: 'オールサージカル', cn: '全医用鋼' },
    to: homeTaxonomyLinks.allSurgical,
  },
  {
    key: 'pearl-acrylic',
    icon: null,
    labels: { kr: '진주&아크릴', en: 'Pearl & Acrylic', jp: 'パール&アクリル', cn: '珍珠&亞克力' },
    to: homeTaxonomyLinks.pearlAcrylic,
  },
  {
    key: 'mirrorball-stone',
    icon: null,
    labels: { kr: '미러볼&스톤', en: 'Mirror Ball & Stone', jp: 'ミラーボール&ストーン', cn: '鏡面球&宝石' },
    to: homeTaxonomyLinks.mirrorballStone,
  },
  {
    key: 'ring',
    icon: 'ring',
    emoji: '⭕',
    labels: { kr: '링', en: 'Ring', jp: 'リング', cn: '環' },
    to: homeTaxonomyLinks.ring,
  },
  {
    key: 'flower',
    icon: 'butterfly',
    emoji: '🌸',
    labels: { kr: '꽃', en: 'Flower', jp: '花', cn: '花' },
    to: homeTaxonomyLinks.flower,
  },
  {
    key: 'butterfly',
    icon: 'butterfly',
    emoji: '🦋',
    labels: { kr: '나비', en: 'Butterfly', jp: '蝶', cn: '蝴蝶' },
    to: homeTaxonomyLinks.butterfly,
  },
  {
    key: 'heart',
    icon: 'ribbon',
    emoji: '💗',
    labels: { kr: '하트', en: 'Heart', jp: 'ハート', cn: '愛心' },
    to: homeTaxonomyLinks.heart,
  },
  {
    key: 'star',
    icon: 'cubic',
    emoji: '⭐',
    labels: { kr: '별', en: 'Star', jp: '星', cn: '星星' },
    to: homeTaxonomyLinks.star,
  },
  {
    key: 'moon',
    icon: 'ring',
    emoji: '🌙',
    labels: { kr: '달', en: 'Moon', jp: '月', cn: '月亮' },
    to: homeTaxonomyLinks.moon,
  },
  {
    key: 'ribbon',
    icon: 'ribbon',
    emoji: '🎀',
    labels: { kr: '리본', en: 'Ribbon', jp: 'リボン', cn: '蝴蝶結' },
    to: homeTaxonomyLinks.ribbon,
  },
  {
    key: 'spark',
    icon: 'cubic',
    emoji: '✨',
    labels: { kr: '스파크', en: 'Spark', jp: 'スパーク', cn: '闪耀' },
    to: homeTaxonomyLinks.spark,
  },
]

function CategoryChipIcon({ emoji, type }) {
  if (emoji) {
    return <span aria-hidden="true" className="home-category-emoji">{emoji}</span>
  }

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
      cn: '高級鋯石穿孔飾品',
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
      cn: '以清晰光泽為重点的鋯石精選。',
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
      cn: '出口熱選單品',
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
      cn: '適合海外貿易諮詢的代表系列。',
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
      cn: '銀色日常穿孔飾品',
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
      cn: '適合日常目錄搭配的銀色穿孔飾品精選。',
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
      cn: '環形穿孔系列',
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
      cn: '以佩戴圖為中心查看的環形穿孔系列。',
    },
    image: 'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&crop=entropy&w=900&h=1350&q=86',
    to: '/products?q=ring',
  },
  {
    ...heroBanners[0],
    key: 'titanium-labret-showcase',
  },
  {
    ...heroBanners[2],
    key: 'gold-tiny-showcase',
  },
]

const homeShowcaseLabels = ['NEW', 'HOT', 'TRADE', 'BEST', 'TITANIUM', 'GOLD']
const homeShowcaseAutoplayDelay = 3600

function normalizeShowcaseImagePosition(value) {
  const x = Number(value?.x)
  const y = Number(value?.y)
  return [x, y].every((coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 100)
    ? { x, y }
    : { x: 50, y: 50 }
}

function normalizeManagedShowcasePanel(slide) {
  return {
    key: slide.id,
    title: slide.title || {},
    eyebrow: slide.eyebrow || {},
    text: slide.description || {},
    to: slide.targetUrl || '/products',
    image: slide.imageSet?.detail || slide.imageSet?.card || '',
    imageSet: slide.imageSet || {},
    imagePosition: normalizeShowcaseImagePosition(slide.imageSet?.position),
    label: slide.label || 'NOBLESSE',
  }
}
const homeShowcaseControlCopy = {
  kr: {
    group: '스냅 슬라이드 조작',
    previous: '이전 스냅',
    next: '다음 스냅',
    pause: '자동 슬라이드 일시정지',
    play: '자동 슬라이드 재생',
  },
  en: {
    group: 'Snap carousel controls',
    previous: 'Previous snap',
    next: 'Next snap',
    pause: 'Pause automatic slides',
    play: 'Play automatic slides',
  },
  jp: {
    group: 'スナップスライド操作',
    previous: '前のスナップ',
    next: '次のスナップ',
    pause: '自動スライドを一時停止',
    play: '自動スライドを再生',
  },
  cn: {
    group: '快照輪播控制',
    previous: '上一張快照',
    next: '下一張快照',
    pause: '暫停自動輪播',
    play: '播放自動輪播',
  },
}

function getLocalizedValue(values, locale) {
  return resolveLocaleCopy(values, locale, 'en') ?? values.en ?? values.kr
}

function _getCollectionTitle(collection, locale) {
  const contentLocale = resolveLocaleCopy({
    kr: 'kr',
    en: 'en',
    jp: 'jp',
    cn: 'cn',
  }, locale, 'en')
  if (contentLocale === 'kr') return collection.titleKo
  if (contentLocale === 'jp') return collection.titleJa
  if (contentLocale === 'cn') return resolveLocaleCopy({ cn: collectionTitleCn[collection.collectionId] ?? collection.titleEn }, locale, 'en')
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
  'piercing-catalog': {
    kr: ['볼피어싱', '링피어싱', '라블렛', '드롭/투핀', '귀걸이형'],
    en: ['Ball Piercing', 'Ring Piercing', 'Labret', 'Drop / Two-pin', 'Earring Type'],
    jp: ['ボールピアス', 'リングピアス', 'ラブレット', 'ドロップ / ツーピン', 'イヤリングタイプ'],
    cn: ['球形穿孔', '環形穿孔', '唇釘', '垂墜 / 雙针', '耳飾款'],
  },
  'steady-selection': {
    kr: ['데일리 실버', '미니 큐빅', '베이직 링', '하트/리본', '스테디 바벨'],
    en: ['Daily Silver', 'Mini Cubic', 'Basic Ring', 'Heart / Ribbon', 'Steady Barbell'],
    jp: ['デイリーシルバー', 'ミニキュービック', 'ベーシックリング', 'ハート / リボン', '定番バーベル'],
    cn: ['日常銀飾', '迷你鋯石', '基础環形', '愛心 / 蝴蝶結', '常青槓鈴'],
  },
}

const piercingCatalogTabFilters = [
  { categoryIds: ['piercing', 'cubic', 'pearl', 'surgical-steel'] },
  { categoryIds: ['belly-ring'] },
  { categoryIds: ['labret'] },
  { categoryIds: ['barbell'] },
  { categoryIds: ['earrings'] },
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
  'new-arrival': {
    labels: { kr: '신상품 더보기', en: 'View New Arrivals', jp: '新商品をもっと見る', cn: '查看更多新品' },
    to: '/products?collection=new-arrivals',
  },
  'weekly-pick': {
    labels: { kr: '주간 추천 더보기', en: 'View Weekly Best', jp: '週間ベストをもっと見る', cn: '查看更多每週精選' },
    to: '/products?sort=best',
  },
  'piercing-catalog': {
    labels: { kr: '피어싱 더보기', en: 'View Piercing', jp: 'ピアスをもっと見る', cn: '查看更多穿孔' },
    to: '/products?category=piercing',
  },
  'steady-selection': {
    labels: { kr: '스테디 더보기', en: 'View Steady Selection', jp: '定番をもっと見る', cn: '查看更多常青精選' },
    to: '/products?collection=steady',
  },
}

const homeProductSectionCopy = {
  kr: {
    newTitle: '신상품',
    newNote: '새롭게 준비한 신규 라인과 이번 주 추천 아이템입니다.',
    weeklyTitle: 'WEEKLY BEST',
    weeklyNote: '이번 주 거래처 문의가 모인 스타일을 한눈에 정리했습니다.',
    piercingTitle: '피어싱',
    piercingNote: '피어싱=귀족, 더이상 말이 필요한가요?',
    steadyTitle: '스테디 셀렉션',
    steadyNote: '꾸준히 찾는 데일리 라인을 모았습니다.',
  },
  en: {
    newTitle: 'New Arrival',
    newNote: 'New lines and recommended pieces prepared for this week.',
    weeklyTitle: 'Weekly Best',
    weeklyNote: 'A focused edit of styles drawing buyer inquiries this week.',
    piercingTitle: 'Piercing',
    piercingNote: 'Piercing = Noblesse. Need we say more?',
    steadyTitle: 'Steady Selection',
    steadyNote: 'Daily lines buyers keep coming back for.',
  },
  jp: {
    newTitle: '新商品',
    newNote: '今週のために用意した新しいラインとおすすめアイテムです。',
    weeklyTitle: '週間ベスト',
    weeklyNote: '今週の取引先お問い合わせが集まったスタイルをまとめました。',
    piercingTitle: 'ピアス',
    piercingNote: 'ピアス＝貴族。これ以上の説明が必要ですか？',
    steadyTitle: '定番セレクション',
    steadyNote: '毎日選ばれる定番ラインを集めました。',
  },
  cn: {
    newTitle: '新品',
    newNote: '本週準備的新品系列和推薦單品。',
    weeklyTitle: '每週精選',
    weeklyNote: '整理本週買家諮詢較多的重点款式。',
    piercingTitle: '穿孔',
    piercingNote: '穿孔 = 貴族，还需要更多说明吗？',
    steadyTitle: '常青精選',
    steadyNote: '汇集買家持续選擇的日常系列。',
  },
}

const homeBuyerCollectionCopy = {
  kr: {
    title: '바이어 셀렉션',
    note: '국내·해외 거래처 상담 흐름에 맞춰 정리한 B2B 컨셉 보드입니다.',
  },
  en: {
    title: 'Buyer Selection',
    note: 'B2B concept boards arranged for domestic and global buyer consultations.',
  },
  jp: {
    title: 'バイヤーセレクション',
    note: '国内外の取引先相談に合わせて整理したB2Bコンセプトボードです。',
  },
  cn: {
    title: '買家精選',
    note: '根據國內外客戶洽談流程整理的 B2B 概念看板。',
  },
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
      cn: '客戶洽談系列',
    },
    text: {
      kr: '신규 거래처가 소재와 스타일을 빠르게 검토하기 좋은 대표 구성을 모았습니다.',
      en: 'A representative board for reviewing materials and styles quickly.',
      jp: '素材とスタイルをすばやく確認できる取引先向け構成です。',
      cn: '適合客戶快速確認材質與風格的代表組合。',
    },
    tags: {
      kr: ['MOQ 협의', '소재 제안', '샘플 상담'],
      en: ['MOQ Review', 'Material Guide', 'Sample Talk'],
      jp: ['MOQ相談', '素材提案', 'サンプル相談'],
      cn: ['MOQ 協商', '材質建議', '樣品諮詢'],
    },
    image: 'https://images.unsplash.com/photo-1722410180651-efd51636f260?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/collections/buyer-consultation',
  },
  {
    key: 'jp-market-curation',
    eyebrow: 'JP MARKET',
    title: {
      kr: 'JP 지역 추천 구성',
      en: 'JP Market Curation',
      jp: 'JP地域おすすめ構成',
      cn: 'JP 地區推薦組合',
    },
    text: {
      kr: '작고 선명한 실버·큐빅 라인을 중심으로 상담하기 좋은 셀렉션입니다.',
      en: 'A compact silver and cubic-focused curation for JP market talks.',
      jp: '小ぶりなシルバーとキュービックを中心にした相談向けセレクションです。',
      cn: '以小巧銀色與鋯石系列為主的 JP 市場洽談組合。',
    },
    tags: {
      kr: ['JP 상담', '데일리 라인', '재입고 제안'],
      en: ['JP Inquiry', 'Daily Line', 'Restock'],
      jp: ['JP相談', 'デイリー', '再入荷提案'],
      cn: ['JP 諮詢', '日常系列', '补货建議'],
    },
    image: 'https://images.unsplash.com/photo-1602722872368-0cfc00f748ff?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/collections/japan-buyer-picks',
  },
  {
    key: 'export-sample-kit',
    eyebrow: 'EXPORT KIT',
    title: {
      kr: '수출 샘플 보드',
      en: 'Export Sample Board',
      jp: '輸出サンプルボード',
      cn: '出口樣品板',
    },
    text: {
      kr: '상담용 대표 이미지와 샘플 구성을 함께 확인하는 B2B 보드입니다.',
      en: 'A B2B board pairing sample sets with representative imagery.',
      jp: '代表画像とサンプル構成を一緒に確認するB2Bボードです。',
      cn: '可同時確認代表圖片與樣品組合的 B2B 看板。',
    },
    tags: {
      kr: ['수출 추천', '이미지 상담', '대표 구성'],
      en: ['Export Pick', 'Image Review', 'Core Set'],
      jp: ['輸出提案', '画像相談', '代表構成'],
      cn: ['出口推薦', '圖片確認', '核心組合'],
    },
    image: 'https://images.unsplash.com/photo-1690126889953-a100f54b619e?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/collections/export-best-items',
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
      cn: '不太受季節影响，適合持续洽談的基础系列。',
    },
    tags: {
      kr: ['스테디', '기본 구성', '거래처용'],
      en: ['Steady', 'Core Line', 'For Buyers'],
      jp: ['定番', '基本構成', '取引先向け'],
      cn: ['常備', '基础組合', '客戶用'],
    },
    image: 'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&crop=entropy&w=1200&h=1200&q=86',
    to: '/collections/steady',
  },
  {
    key: 'display-board',
    eyebrow: 'DISPLAY',
    title: {
      kr: '매장 진열 제안',
      en: 'Display Board Proposal',
      jp: '売場ディスプレイ提案',
      cn: '陈列展示建議',
    },
    text: {
      kr: '진열과 촬영 컷을 함께 고려한 상담용 이미지 중심 구성입니다.',
      en: 'Image-led curation for merchandising and catalog display talks.',
      jp: '陳列と撮影イメージを合わせて提案する構成です。',
      cn: '兼顾陈列與拍攝效果的圖片導向組合。',
    },
    tags: {
      kr: ['진열 제안', '촬영 컷', '카탈로그용'],
      en: ['Display', 'Photo Set', 'Catalog'],
      jp: ['陳列提案', '撮影カット', 'カタログ用'],
      cn: ['陈列建議', '拍攝圖', '目錄用'],
    },
    image: 'https://images.unsplash.com/photo-1701777892740-88419a701472?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/collections/display-board',
  },
  {
    key: 'material-match',
    eyebrow: 'MATERIAL',
    title: {
      kr: '소재별 상담 보드',
      en: 'Material Match Board',
      jp: '素材別相談ボード',
      cn: '材質洽談看板',
    },
    text: {
      kr: '써지컬, 실버, 큐빅 등 거래처가 비교하기 쉬운 소재 중심 구성입니다.',
      en: 'Material-led comparison board for buyer-side selection.',
      jp: 'サージカル、シルバー、キュービックを比較しやすい構成です。',
      cn: '便於客戶比較外科鋼、銀、鋯石等材質。',
    },
    tags: {
      kr: ['소재 비교', '가격 상담', '라인 제안'],
      en: ['Material', 'Price Talk', 'Line Plan'],
      jp: ['素材比較', '価格相談', 'ライン提案'],
      cn: ['材質比較', '價格洽談', '系列建議'],
    },
    image: 'https://images.unsplash.com/photo-1671644730555-916aa8d8157f?auto=format&fit=crop&crop=faces&w=1200&h=1200&q=86',
    to: '/collections/material-match',
  },
]

const getWeeklyDemand = (index) => weeklyDemandSamples[index % weeklyDemandSamples.length]

const formatWeeklyDemand = (weeklyDemand, locale) => {
  if (!weeklyDemand || weeklyDemand.inquiries < 10000) return null

  const contentLocale = getLocaleContentKey(locale)
  const count = weeklyDemand.inquiries.toLocaleString(contentLocale === 'kr' ? 'ko-KR' : undefined)
  if (contentLocale === 'en') return `Quote requests ${count}+`
  if (contentLocale === 'jp') return `見積依頼 ${count}件+`
  if (contentLocale === 'cn') return `詢價請求 ${count}+`
  return `견적 요청 ${count}+`
}

const priceAfterApprovalLabel = {
  kr: '승인 후 가격 확인 가능',
  en: 'Price available after approval',
  jp: '承認後に価格を確認できます',
  cn: '審核後可查看價格',
}

function HomeProductCard({ product, index, variant = 'default' }) {
  const { addInquiryItem, approvedPrice, getAdminPriceBooks, getPrice, isAdmin, isApproved, viewerState } = useCommerce()
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
  const adminPriceBooks = isAdmin ? getAdminPriceBooks(product.productId) : []
  const adminPriceItems = adminPriceBooks.map(formatAdminPriceBook)
  const unavailablePriceLabel = resolveLocaleCopy({ kr: '가격 미등록', en: 'Price unavailable', jp: '価格未登録', cn: '價格未登記' }, locale, 'en')
  const displayPrice = adminPriceBooks.length > 0
    ? null
    : isApproved && price
    ? formatMoney(approvedPrice(product.productId), price.currency)
    : isApproved ? unavailablePriceLabel : resolveLocaleCopy(priceAfterApprovalLabel, locale, 'en')
  const statusLabel = product.isNew ? 'NEW' : product.isBest ? 'BEST' : 'B2B'
  const weeklyDemand = variant === 'weekly-pick' ? getWeeklyDemand(index) : null
  const weeklyDemandText = weeklyDemand ? formatWeeklyDemand(weeklyDemand, locale) : null

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
        {weeklyDemandText ? <span className="home-product-demand">
          {weeklyDemandText}
        </span> : null}
        <small>{product.material}</small>
      </Link>
      {adminPriceItems.length > 0
        ? <span className="admin-price-book-grid home-admin-price-book-grid">{adminPriceItems.map((item, index) => <span className="admin-price-book-item" key={`${item.market}-${item.currency}-${index}`}><img alt={item.flagLabel} className="admin-price-book-flag" src={item.flagSrc} /><span className="admin-price-book-value"><b>{item.amount}</b><span>{item.symbol}</span><em>{item.currency}</em></span></span>)}</span>
        : <b>{displayPrice}</b>}
    </div>
  </article>
}

function ProductSection({ products, sectionId, title, note }) {
  const { locale, toLocalePath } = useLocalePath()
  const [activeTab, setActiveTab] = useState(0)
  const [tabMotionKey, setTabMotionKey] = useState(0)

  const sectionSubtabs = homeSectionSubtabs[sectionId]?.[locale] ?? homeSectionSubtabs[sectionId]?.en ?? []
  const sectionTabFilters = homeSectionTabFilters[sectionId] ?? []
  const visibleSubtabs = sectionTabFilters.length > 0
    ? sectionSubtabs
      .map((label, index) => ({
        filter: sectionTabFilters[index],
        label,
      }))
      .filter((tab) => tab.filter && products.some((product) => productMatchesTabFilter(product, tab.filter)))
    : sectionSubtabs.map((label, index) => ({
      filter: sectionTabFilters[index],
      label,
    }))
  const viewAll = homeSectionViewAll[sectionId]
  const isLoopSection = sectionId === 'weekly-pick'
  const resolvedActiveTab = Math.min(activeTab, Math.max(visibleSubtabs.length - 1, 0))
  const activeTabFilter = sectionTabFilters.length > 0
    ? visibleSubtabs[resolvedActiveTab]?.filter ?? null
    : null
  const filteredProducts = activeTabFilter
    ? products.filter((product) => productMatchesTabFilter(product, activeTabFilter))
    : products
  const sectionProducts = filteredProducts.slice(0, homeSectionProductLimit[sectionId] ?? homeSectionLimit)
  const renderProducts = isLoopSection ? [...sectionProducts, ...sectionProducts] : sectionProducts

  useEffect(() => {
    if (activeTab !== resolvedActiveTab) setActiveTab(resolvedActiveTab)
  }, [activeTab, resolvedActiveTab])

  const handleTabClick = (index) => {
    if (index === activeTab) return

    setActiveTab(index)
    setTabMotionKey((current) => current + 1)
  }

  if (products.length === 0 || sectionProducts.length === 0) return null

  if (isLoopSection) {
    const [featureProduct, ...supportProducts] = sectionProducts
    const weeklySupportProducts = supportProducts.slice(0, 4)

    return <section className={`section-wrap product-feature-section section-${sectionId}`} id={`home-${sectionId}`}>
      <div className="weekly-edit-inner">
        <div className="home-product-section-title weekly-edit-title">
          <span>NOBLESSE WEEKLY EDIT</span>
          <ScrambleText as="h2" persistKey={`product-section-title-${sectionId}`}>{title}</ScrambleText>
          {note ? <p>{note}</p> : null}
        </div>
        <div className="weekly-edit-board">
          {featureProduct ? <div className="weekly-edit-feature">
            <HomeProductCard product={featureProduct} index={0} variant={sectionId} />
          </div> : null}
          <div className="weekly-edit-side">
            <p>{homeProductSectionCopy[locale]?.weeklyNote ?? homeProductSectionCopy.en.weeklyNote}</p>
            <div className="weekly-edit-list">
              {weeklySupportProducts.map((product, index) => <HomeProductCard key={product.productId} product={product} index={index + 1} variant={sectionId} />)}
            </div>
          </div>
        </div>
        {viewAll ? <Link className="home-section-more weekly-edit-more" to={toLocalePath(viewAll.to)}>
          <span>{viewAll.labels?.[locale] ?? viewAll.labels?.en}</span>
        </Link> : null}
      </div>
    </section>
  }

  return <section className={`section-wrap product-feature-section section-${sectionId}`} id={`home-${sectionId}`}>
    <div className="home-product-section-title">
      <ScrambleText as="h2" persistKey={`product-section-title-${sectionId}`}>{title}</ScrambleText>
      {note ? <p>{note}</p> : null}
    </div>
    {visibleSubtabs.length > 0 ? <div className="home-section-subtabs" aria-label={`${title} categories`}>
      {visibleSubtabs.map((tab, index) => <button className={index === resolvedActiveTab ? 'is-active' : undefined} key={tab.label} type="button" onClick={() => handleTabClick(index)}>{tab.label}</button>)}
    </div> : null}
    <div className={`home-product-grid${isLoopSection ? ' is-looping' : ''}${sectionTabFilters.length > 0 ? ' has-tab-motion' : ''}`} key={`${sectionId}-${tabMotionKey}`}>
      {renderProducts.map((product, index) => <HomeProductCard key={`${product.productId}-${index}`} product={product} index={index} variant={sectionId} />)}
    </div>
    {viewAll ? <Link className="home-section-more" to={toLocalePath(viewAll.to)}>
      <span>{viewAll.labels?.[locale] ?? viewAll.labels?.en}</span>
    </Link> : null}
  </section>
}

function BuyerCollectionSection() {
  const { locale, toLocalePath } = useLocalePath()
  const copy = homeBuyerCollectionCopy[locale] ?? homeBuyerCollectionCopy.en

  return <section className="section-wrap buyer-collection-section" id="home-buyer-selection">
    <div className="buyer-collection-heading">
      <span className="buyer-heading-spark" aria-hidden="true">✦</span>
      <div>
        <ScrambleText as="h2" persistKey="buyer-concept-title">{copy.title}</ScrambleText>
        <p>{copy.note}</p>
      </div>
    </div>
    <div className="buyer-concept-viewport">
      <div className="buyer-concept-rail">
        {buyerConceptPanels.map((panel) => {
          const title = getLocalizedValue(panel.title, locale)
          const text = getLocalizedValue(panel.text, locale)
          const tags = getLocalizedValue(panel.tags, locale)

          return <Link className="buyer-concept-card" to={toLocalePath(panel.to)} key={panel.key}>
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
  const showcaseInteractionRef = useRef(0)
  const sectionNavAnchorRef = useRef(null)
  const sectionNavTriggerRef = useRef(null)
  const showcaseDragRef = useRef({
    didDrag: false,
    isDragging: false,
    scrollLeft: 0,
    startX: 0,
  })
  const [isShowcaseDragging, setIsShowcaseDragging] = useState(false)
  const [isShowcaseAutoplayPaused, setIsShowcaseAutoplayPaused] = useState(false)
  const [isSectionNavFixed, setIsSectionNavFixed] = useState(false)
  const [activeHomeSection, setActiveHomeSection] = useState(homeSectionNav[0].id)
  const { dataMode, homeShowcase, isApproved, products } = useCommerce()
  const { locale, toLocalePath } = useLocalePath()
  const copy = resolveLocaleCopy(homeCopy, locale)
  const showcaseControlCopy = resolveLocaleCopy(homeShowcaseControlCopy, locale)
  const showcasePanels = useMemo(() => (
    homeShowcase?.length
      ? homeShowcase.map(normalizeManagedShowcasePanel)
      : homeShowcasePanels
  ), [homeShowcase])
  const homeSourceProducts = getHomeSourceProducts({ products, mockProducts, dataMode })
  const homeProducts = selectAllowedHomeProducts(homeSourceProducts)
  const newProducts = selectNewArrivalProducts(homeProducts, homeSectionProductLimit['new-arrival'])
  const weeklyProducts = selectWeeklyBestProducts(homeProducts)
  const piercingCatalogProducts = selectPiercingCatalogProducts(homeProducts)
  const steadySelectionProducts = selectSteadySelectionProducts(homeProducts)
  const activeHomeSectionNav = useMemo(() => homeSectionNav.filter((item) => {
    if (item.id === 'new-arrival') return newProducts.length > 0
    if (item.id === 'weekly-pick') return weeklyProducts.length > 0
    if (item.id === 'buyer-selection') return buyerConceptPanels.length > 0
    if (item.id === 'piercing-catalog') return piercingCatalogProducts.length > 0
    if (item.id === 'steady-selection') return steadySelectionProducts.length > 0
    return true
  }), [
    newProducts.length,
    weeklyProducts.length,
    piercingCatalogProducts.length,
    steadySelectionProducts.length,
  ])
  const homeSectionNavItems = useMemo(() => {
    const activeIds = new Set(activeHomeSectionNav.map((item) => item.id))
    return homeSectionNav.map((item) => ({
      ...item,
      isDisabled: !activeIds.has(item.id),
    }))
  }, [activeHomeSectionNav])
  const activeHomeSectionIds = activeHomeSectionNav.map((item) => item.id).join('|')
  const firstActiveHomeSectionId = activeHomeSectionNav[0]?.id ?? homeSectionNav[0].id

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

  const scrollShowcase = useCallback((direction) => {
    const scroller = showcaseScrollerRef.current
    const step = getShowcaseStep()

    if (!scroller || !step) return

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const currentIndex = Math.round(scroller.scrollLeft / step)
    const nextPosition = (currentIndex + direction) * step
    const wrapThreshold = step * 0.35
    let target = Math.min(maxScroll, Math.max(0, nextPosition))

    if (direction > 0 && nextPosition > maxScroll + wrapThreshold) target = 0
    if (direction < 0 && nextPosition < 0) target = maxScroll

    scroller.scrollTo({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      left: target,
    })
  }, [getShowcaseStep])

  useEffect(() => {
    const scroller = showcaseScrollerRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (!scroller || reduceMotion.matches || isShowcaseAutoplayPaused) return undefined

    let timeoutId
    const schedule = (delay = homeShowcaseAutoplayDelay) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(advanceShowcase, delay)
    }
    const markInteraction = () => {
      showcaseInteractionRef.current = Date.now()
    }
    function advanceShowcase() {
      if (document.hidden || showcaseDragRef.current.isDragging || scroller.contains(document.activeElement)) {
        schedule(800)
        return
      }

      const remainingDelay = homeShowcaseAutoplayDelay - (Date.now() - showcaseInteractionRef.current)
      if (remainingDelay > 0) {
        schedule(remainingDelay)
        return
      }

      scrollShowcase(1)
      markInteraction()
      schedule()
    }

    markInteraction()
    schedule()
    scroller.addEventListener('wheel', markInteraction, { passive: true })
    document.addEventListener('visibilitychange', markInteraction)

    return () => {
      window.clearTimeout(timeoutId)
      scroller.removeEventListener('wheel', markInteraction)
      document.removeEventListener('visibilitychange', markInteraction)
    }
  }, [isShowcaseAutoplayPaused, scrollShowcase])

  useEffect(() => {
    if (!activeHomeSectionNav.some((item) => item.id === activeHomeSection)) {
      setActiveHomeSection(firstActiveHomeSectionId)
    }
  }, [activeHomeSection, activeHomeSectionIds, activeHomeSectionNav, firstActiveHomeSectionId])

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
      const currentSection = activeHomeSectionNav.reduce((current, item) => {
        const section = document.getElementById(`home-${item.id}`)
        if (!section) return current

        return section.getBoundingClientRect().top <= activeOffset ? item.id : current
      }, firstActiveHomeSectionId)

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
  }, [activeHomeSectionIds, activeHomeSectionNav, firstActiveHomeSectionId])

  const handleShowcasePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return

    const scroller = showcaseScrollerRef.current
    if (!scroller) return

    showcaseInteractionRef.current = Date.now()

    showcaseDragRef.current = {
      didDrag: false,
      hasCapture: false,
      isDragging: true,
      pointerId: event.pointerId,
      scrollLeft: scroller.scrollLeft,
      startX: event.clientX,
    }
    setIsShowcaseDragging(true)
  }

  const handleShowcasePointerMove = (event) => {
    const drag = showcaseDragRef.current
    const scroller = showcaseScrollerRef.current

    if (!drag.isDragging || !scroller) return

    const deltaX = event.clientX - drag.startX
    if (Math.abs(deltaX) <= 6) return

    drag.didDrag = true
    if (!drag.hasCapture) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      drag.hasCapture = true
    }

    scroller.scrollLeft = drag.scrollLeft - deltaX
    event.preventDefault()
  }

  const handleShowcasePointerEnd = (event) => {
    if (!showcaseDragRef.current.isDragging) return

    showcaseDragRef.current.isDragging = false
    setIsShowcaseDragging(false)
    if (showcaseDragRef.current.hasCapture) {
      event.currentTarget.releasePointerCapture?.(showcaseDragRef.current.pointerId ?? event.pointerId)
    }

    const scroller = showcaseScrollerRef.current
    const step = getShowcaseStep()
    if (scroller && step) {
      scroller.scrollLeft = Math.round(scroller.scrollLeft / step) * step
    }
  }

  const handleShowcaseClick = (event) => {
    if (!showcaseDragRef.current.didDrag) return

    event.preventDefault()
    event.stopPropagation()
    showcaseDragRef.current.didDrag = false
  }

  const handleShowcaseControl = (direction) => {
    showcaseInteractionRef.current = Date.now()
    scrollShowcase(direction)
  }

  const handleShowcaseAutoplayToggle = () => {
    showcaseInteractionRef.current = Date.now()
    setIsShowcaseAutoplayPaused((isPaused) => !isPaused)
  }

  return <main>
    <section className="home-main-portrait-section home-showcase-section">
      <div className="home-showcase-stage" role="region" aria-label="Noblesse piercing image showcase" aria-roledescription="carousel">
        <div
          aria-live="off"
          className={`home-showcase-grid${isShowcaseDragging ? ' is-dragging' : ''}`}
          onPointerCancel={handleShowcasePointerEnd}
          onPointerDown={handleShowcasePointerDown}
          onPointerLeave={handleShowcasePointerEnd}
          onPointerMove={handleShowcasePointerMove}
          onPointerUp={handleShowcasePointerEnd}
          ref={showcaseScrollerRef}
        >
          <div className="home-showcase-track">
          {showcasePanels.map((banner, index) => {
            const bannerTitle = getLocalizedValue(banner.title, locale)
            const bannerEyebrow = getLocalizedValue(banner.eyebrow, locale)
            const bannerText = getLocalizedValue(banner.text, locale)
            const label = banner.label || homeShowcaseLabels[index] || 'NOBLESSE'

            return <Link className="home-showcase-panel" key={banner.key} onClick={handleShowcaseClick} to={toLocalePath(banner.to)}>
              <img alt={bannerTitle} height="1200" loading={index === 0 ? 'eager' : 'lazy'} src={banner.image} srcSet={banner.imageSet?.card && banner.imageSet?.detail ? `${banner.imageSet.card} 600w, ${banner.imageSet.detail} 1200w` : undefined} style={{ objectPosition: `${banner.imagePosition?.x ?? 50}% ${banner.imagePosition?.y ?? 50}%` }} width="900" />
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
        <div className="home-showcase-controls" aria-label={showcaseControlCopy.group}>
          <button aria-label={showcaseControlCopy.previous} className="home-showcase-control home-showcase-control--previous" onClick={() => handleShowcaseControl(-1)} type="button">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button aria-label={isShowcaseAutoplayPaused ? showcaseControlCopy.play : showcaseControlCopy.pause} className="home-showcase-control home-showcase-control--autoplay" onClick={handleShowcaseAutoplayToggle} type="button">
            {isShowcaseAutoplayPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <button aria-label={showcaseControlCopy.next} className="home-showcase-control home-showcase-control--next" onClick={() => handleShowcaseControl(1)} type="button">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="home-showcase-categories" aria-label="피어싱 카테고리">
        {homeCategoryChips.map((category) => <Link className={!category.icon && !category.emoji ? 'is-text-only' : undefined} key={category.key ?? category.icon} to={toLocalePath(category.to)}>
          <CategoryChipIcon emoji={category.emoji} type={category.icon} />
          <b>{category.labels[locale] ?? category.labels.en}</b>
        </Link>)}
      </div>
    </section>

    <div className={`home-section-nav-anchor${isSectionNavFixed ? ' is-fixed' : ''}`} ref={sectionNavAnchorRef}>
      <div className="home-section-nav" aria-label="홈 제품 섹션 이동">
        {homeSectionNavItems.map((item) => <button key={item.id} aria-disabled={item.isDisabled ? 'true' : undefined} className={`${activeHomeSection === item.id ? 'is-active' : ''}${item.isDisabled ? ' is-disabled' : ''}`.trim() || undefined} disabled={item.isDisabled} type="button" onClick={() => scrollToHomeSection(item.id)}>
          {item.labels[locale] ?? item.labels.en}
        </button>)}
      </div>
    </div>
    {isSectionNavFixed ? <div className="home-section-nav-fixed" aria-label="고정 제품 섹션 이동">
      {homeSectionNavItems.map((item) => <button key={item.id} aria-disabled={item.isDisabled ? 'true' : undefined} className={`${activeHomeSection === item.id ? 'is-active' : ''}${item.isDisabled ? ' is-disabled' : ''}`.trim() || undefined} disabled={item.isDisabled} type="button" onClick={() => scrollToHomeSection(item.id)}>
        {item.labels[locale] ?? item.labels.en}
      </button>)}
    </div> : null}

    <ProductSection products={newProducts} sectionId="new-arrival" title={homeProductSectionCopy[locale]?.newTitle ?? homeProductSectionCopy.en.newTitle} note={homeProductSectionCopy[locale]?.newNote ?? homeProductSectionCopy.en.newNote} />
    <ProductSection products={weeklyProducts} sectionId="weekly-pick" title={homeProductSectionCopy[locale]?.weeklyTitle ?? homeProductSectionCopy.en.weeklyTitle} note={homeProductSectionCopy[locale]?.weeklyNote ?? homeProductSectionCopy.en.weeklyNote} />
    <BuyerCollectionSection />
    <ProductSection products={piercingCatalogProducts} sectionId="piercing-catalog" title={homeProductSectionCopy[locale]?.piercingTitle ?? homeProductSectionCopy.en.piercingTitle} note={homeProductSectionCopy[locale]?.piercingNote ?? homeProductSectionCopy.en.piercingNote} />
    <ProductSection products={steadySelectionProducts} sectionId="steady-selection" title={homeProductSectionCopy[locale]?.steadyTitle ?? homeProductSectionCopy.en.steadyTitle} note={homeProductSectionCopy[locale]?.steadyNote ?? homeProductSectionCopy.en.steadyNote} />

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
