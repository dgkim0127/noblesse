import {
  BadgeCheck,
  CircleDot,
  Grid3X3,
  PackageCheck,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react'

export const ALL_OPTION = '전체'
export const SALE_STATUS = '판매중'
export const SOLD_OUT_STATUS = '품절'
export const HIDDEN_STATUS = '숨김'

export const fallbackProducts = [
  {
    id: 'KZ-P-1004',
    ko: '실버 베이직 볼 바벨',
    ja: 'シルバー ベーシック ボールバーベル',
    category: '바벨',
    subcategory: '스트레이트',
    material: 'Surgical Steel',
    size: '6mm',
    gauge: '16G',
    wholesale: 1250,
    retail: 3900,
    vat: true,
    moq: 20,
    status: SALE_STATUS,
    tone: 'silver',
    rank: 1,
    isNew: true,
    tags: ['베스트', 'MOQ특가'],
    description: '매일 착용하기 좋은 베이직 바벨입니다. 깔끔한 실버 톤으로 다양한 스타일에 자연스럽게 어울립니다.',
  },
  {
    id: 'KZ-H-2418',
    ko: '오팔 하트 큐빅 라블렛',
    ja: 'オパール ハート キュービック ラブレット',
    category: '라블렛',
    subcategory: '하트',
    material: 'Titanium',
    size: '4mm',
    gauge: '14G',
    wholesale: 2680,
    retail: 7900,
    vat: true,
    moq: 12,
    status: SALE_STATUS,
    tone: 'opal',
    rank: 2,
    isNew: true,
    tags: ['추천', '베스트'],
    description: '은은한 오팔 컬러와 하트 디테일을 더한 포인트 라블렛입니다.',
  },
  {
    id: 'KZ-R-0682',
    ko: '골드 원터치 세그먼트 링',
    ja: 'ゴールド ワンタッチ セグメントリング',
    category: '링',
    subcategory: '원터치',
    material: '316L',
    size: '8mm',
    gauge: '18G',
    wholesale: 1820,
    retail: 5900,
    vat: false,
    moq: 16,
    status: SOLD_OUT_STATUS,
    tone: 'gold',
    rank: 4,
    isRestocked: true,
    tags: ['재입고'],
    description: '간결한 원터치 구조로 활용도가 높은 세그먼트 링입니다.',
  },
  {
    id: 'KZ-C-5520',
    ko: '블랙 크로스 체인 드롭',
    ja: 'ブラック クロス チェーンドロップ',
    category: '체인',
    subcategory: '드롭',
    material: 'Surgical Steel',
    size: '12mm',
    gauge: '16G',
    wholesale: 3350,
    retail: 9900,
    vat: true,
    moq: 8,
    status: HIDDEN_STATUS,
    tone: 'black',
    rank: 3,
    isRestocked: true,
    tags: ['체인', '추천'],
    description: '블랙 메탈과 체인 드롭을 조합한 스타일링 포인트 상품입니다.',
  },
]

export const fallbackOptions = [
  { id: 'OPT-P-1004-S', productId: 'KZ-P-1004', label: '실버 · 6mm · 16G', color: '실버', size: '6mm', gauge: '16G', material: 'Surgical Steel', baseWholesalePrice: 1250, moq: 20, stockStatus: 'in_stock' },
  { id: 'OPT-P-1004-M', productId: 'KZ-P-1004', label: '실버 · 8mm · 16G', color: '실버', size: '8mm', gauge: '16G', material: 'Surgical Steel', baseWholesalePrice: 1380, moq: 20, stockStatus: 'in_stock' },
  { id: 'OPT-H-2418-W', productId: 'KZ-H-2418', label: '화이트 오팔 · 4mm · 14G', color: '화이트 오팔', size: '4mm', gauge: '14G', material: 'Titanium', baseWholesalePrice: 2680, moq: 12, stockStatus: 'in_stock' },
  { id: 'OPT-H-2418-P', productId: 'KZ-H-2418', label: '핑크 오팔 · 4mm · 14G', color: '핑크 오팔', size: '4mm', gauge: '14G', material: 'Titanium', baseWholesalePrice: 2840, moq: 12, stockStatus: 'ask' },
  { id: 'OPT-R-0682-G', productId: 'KZ-R-0682', label: '골드 · 8mm · 18G', color: '골드', size: '8mm', gauge: '18G', material: '316L', baseWholesalePrice: 1820, moq: 16, stockStatus: 'sold_out' },
  { id: 'OPT-C-5520-B', productId: 'KZ-C-5520', label: '블랙 · 12mm · 16G', color: '블랙', size: '12mm', gauge: '16G', material: 'Surgical Steel', baseWholesalePrice: 3350, moq: 8, stockStatus: 'ask' },
]

export const fallbackBuyers = [
  {
    id: 'tokyo-piercing-lab',
    name: 'Tokyo Piercing Lab',
    contactName: 'Yamada Haruka',
    grade: 'A',
    discount: 12,
    minOrder: 300000,
    status: '승인',
    memberType: '도매 회원',
    role: 'member',
    approvalStatus: 'approved',
  },
]

export const fallbackOrders = [
  {
    id: 'KZ-20260601-10001',
    orderNumber: 'KZ-20260601-10001',
    status: 'checking',
    createdAtLabel: '2026.06.01',
    totalQuantity: 64,
    finalAmount: 110651,
    items: [
      { productId: 'KZ-P-1004', productName: '실버 베이직 볼 바벨', optionLabel: '실버 · 6mm · 16G', quantity: 40, subtotal: 48400 },
      { productId: 'KZ-H-2418', productName: '오팔 하트 큐빅 라블렛', optionLabel: '화이트 오팔 · 4mm · 14G', quantity: 24, subtotal: 62251 },
    ],
  },
]

export const defaultSettings = {
  exchangeRate: 10.72,
  exchangeAdjust: 1.8,
}

export const recommendedKeywords = ['16G 바벨', '오팔 라블렛', '원터치 링', 'Surgical Steel', 'MOQ 10개 이하']

export const sortOptions = [
  { value: 'recommended', label: '추천순' },
  { value: 'newest', label: '신상품순' },
  { value: 'priceAsc', label: '낮은 도매가순' },
  { value: 'priceDesc', label: '높은 도매가순' },
  { value: 'moqAsc', label: 'MOQ 낮은순' },
]

export const moqOptions = [
  { value: 'all', label: 'MOQ 전체' },
  { value: 'low', label: 'MOQ 12개 이하' },
  { value: 'mid', label: 'MOQ 20개 이하' },
]

export const statusOptions = [
  { value: 'all', label: '상태 전체' },
  { value: SALE_STATUS, label: '판매중' },
  { value: SOLD_OUT_STATUS, label: '품절' },
]

export const shortcutItems = [
  { label: '전체', icon: Grid3X3, type: 'category', value: ALL_OPTION },
  { label: '바벨', icon: CircleDot, type: 'category', value: '바벨' },
  { label: '라블렛', icon: Sparkles, type: 'category', value: '라블렛' },
  { label: '링', icon: CircleDot, type: 'category', value: '링' },
  { label: '체인', icon: PackageCheck, type: 'category', value: '체인' },
  { label: '신상품', icon: Sparkles, type: 'sort', value: 'newest' },
  { label: '베스트', icon: TrendingUp, type: 'sort', value: 'recommended' },
  { label: '재입고', icon: RotateCcw, type: 'tag', value: '재입고' },
  { label: 'MOQ 특가', icon: Tag, type: 'moq', value: 'low' },
]

export const featuredSectionMeta = [
  { id: 'deal', title: '오늘의 도매 혜택', icon: Tag },
  { id: 'best', title: '실시간 베스트', icon: TrendingUp },
  { id: 'new', title: '신상품', icon: Sparkles },
  { id: 'moq', title: 'MOQ 낮은 상품', icon: PackageCheck },
  { id: 'recommend', title: '거래처 추천', icon: BadgeCheck },
  { id: 'recent', title: '최근 담은 상품', icon: ShoppingCart },
]
