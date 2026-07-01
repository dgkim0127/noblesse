import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CatalogCard } from '../components/CatalogCard'
import { useCommerce } from '../commerce/commerceStore'
import {
  dedupeProducts,
  getFiltersFromSearchParams,
  getTaxonomyLabel,
  productMatchesTaxonomy,
  taxonomyLabels,
} from '../data/productTaxonomy'
import { getCatalogFilterOptionLabel, loadCatalogFilterOptions, subscribeCatalogFilterOptions } from '../services/catalogFilterOptions'
import { getLocaleContentKey, useLocalePath } from '../utils/locale'

const _productPageCopy = {
  kr: {
    eyebrow: '상품 목록',
    title: '피어싱 카탈로그',
    count: (count) => `${count}개 상품`,
    searchPlaceholder: '피어싱, 재질, 스타일을 검색해보세요',
    searchButton: '검색',
    clearFilters: '필터 초기화',
    filter: 'FILTER',
    home: '홈',
    material: '소재',
    category: '카테고리',
    collection: '컬렉션',
    status: '상태',
    all: '전체',
    newTag: '신상품',
    bestTag: '베스트',
    gridAria: '그리드 보기',
    listAria: '리스트 보기',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '필터를 초기화하거나 다른 카테고리를 선택해보세요.',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  en: {
    eyebrow: 'Product list',
    title: 'Piercing',
    count: (count) => `${count} products`,
    searchPlaceholder: 'Search piercing, material, or style',
    searchButton: 'Search',
    clearFilters: 'Clear filters',
    filter: 'FILTER',
    home: 'Home',
    material: 'Material',
    category: 'Category',
    collection: 'Collection',
    status: 'Status',
    all: 'All',
    newTag: 'New',
    bestTag: 'Best',
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
    filter: 'FILTER',
    home: 'ホーム',
    material: '素材',
    category: 'カテゴリー',
    collection: 'コレクション',
    status: 'ステータス',
    all: 'すべて',
    newTag: '新商品',
    bestTag: 'ベスト',
    gridAria: 'グリッド表示',
    listAria: 'リスト表示',
    emptyTitle: '条件に合う商品がありません。',
    emptyBody: 'フィルターを解除するか、別のカテゴリを選択してください。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  cn: {
    eyebrow: '商品列表',
    title: '穿孔商品目錄',
    count: (count) => `${count}件商品`,
    searchPlaceholder: '搜尋穿孔、材質或風格',
    searchButton: '搜尋',
    clearFilters: '清除篩選',
    filter: 'FILTER',
    home: '首頁',
    material: '材質',
    category: '分類',
    collection: '系列',
    status: '状態',
    all: '全部',
    newTag: '新品',
    bestTag: '精選',
    gridAria: '網格视圖',
    listAria: '列表视圖',
    emptyTitle: '没有符合條件的商品。',
    emptyBody: '請清除篩選或選擇其他分類。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
}

const _categoryLabels = {
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
    piercing: '穿孔飾品',
    earrings: '耳飾',
    barbell: '槓鈴',
    labret: '唇釘',
    'nose-piercing': '鼻釘',
    'belly-ring': '肚臍環',
    cubic: '鋯石',
    pearl: '珍珠',
    '14k-gold': '14K金',
    titanium: '鈦鋼',
    'surgical-steel': '医用鋼',
  },
}

const _tagLabels = {
  kr: { new: '신상품', best: '베스트' },
  en: { new: 'New', best: 'Best' },
  jp: { new: '新商品', best: 'ベスト' },
  cn: { new: '新品', best: '熱選' },
}

const _filterLabelNames = {
  kr: { Category: '카테고리', Collection: '컬렉션', Material: '재질', Color: '컬러', Tag: '태그', Search: '검색어' },
  en: { Category: 'Category', Collection: 'Collection', Material: 'Material', Color: 'Color', Tag: 'Tag', Search: 'Search' },
  jp: { Category: 'カテゴリ', Collection: 'コレクション', Material: '素材', Color: 'カラー', Tag: 'タグ', Search: '検索語' },
  cn: { Category: '分類', Collection: '系列', Material: '材質', Color: '顏色', Tag: '標籤', Search: '搜尋詞' },
}

const _collectionLabels = {
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
    'japan-buyer-picks': '日本精選',
    'us-buyer-picks': '美國精選',
    'minimal-piercing-line': '极簡穿孔系列',
    'premium-cubic-line': '高級鋯石系列',
    'export-best-items': '出口精選',
    'new-arrivals': '新品',
  },
}

const collectionPageLabels = {
  kr: {
    'buyer-consultation': '거래처 상담 라인',
    'japan-buyer-picks': '일본 셀렉션',
    'us-buyer-picks': '미국 셀렉션',
    'minimal-piercing-line': '미니멀 피어싱 라인',
    'premium-cubic-line': '프리미엄 큐빅 라인',
    'export-best-items': '수출 베스트 아이템',
    'new-arrivals': '신상품',
    steady: '스테디 셀렉션',
    'display-board': '진열 보드 셀렉션',
    'material-match': '소재 비교 보드',
  },
  en: {
    'buyer-consultation': 'Buyer Consultation Line',
    'japan-buyer-picks': 'Japan Selection',
    'us-buyer-picks': 'US Selection',
    'minimal-piercing-line': 'Minimal Piercing Line',
    'premium-cubic-line': 'Premium Cubic Line',
    'export-best-items': 'Export Best Items',
    'new-arrivals': 'New Arrivals',
    steady: 'Steady Selection',
    'display-board': 'Display Board',
    'material-match': 'Material Match Board',
  },
  jp: {
    'buyer-consultation': 'バイヤー相談ライン',
    'japan-buyer-picks': '日本セレクション',
    'us-buyer-picks': 'USセレクション',
    'minimal-piercing-line': 'ミニマルピアスライン',
    'premium-cubic-line': 'プレミアムキュービックライン',
    'export-best-items': '輸出ベストアイテム',
    'new-arrivals': '新商品',
    steady: '定番セレクション',
    'display-board': 'ディスプレイボード',
    'material-match': '素材比較ボード',
  },
  cn: {
    'buyer-consultation': '買家諮詢系列',
    'japan-buyer-picks': '日本精選',
    'us-buyer-picks': '美國精選',
    'minimal-piercing-line': '极簡穿孔系列',
    'premium-cubic-line': '高級鋯石系列',
    'export-best-items': '出口熱門單品',
    'new-arrivals': '新品',
    steady: '常青精選',
    'display-board': '陈列展示板',
    'material-match': '材質搭配板',
  },
}

const getCollectionPageLabel = (collectionId, locale) => (
  collectionPageLabels[getLocaleContentKey(locale)]?.[collectionId]
  || collectionPageLabels.en[collectionId]
  || _collectionLabels[getLocaleContentKey(locale)]?.[collectionId]
  || _collectionLabels.en?.[collectionId]
  || collectionId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
)

const productListCopy = {
  kr: {
    title: '피어싱',
    count: (count) => `${count}개 상품`,
    searchPlaceholder: '피어싱, 재질, 스타일을 검색해보세요',
    searchButton: '검색',
    clearFilters: '초기화',
    selectedFilters: '선택 조건',
    noSelectedFilters: '선택 조건 없음',
    filter: 'FILTER',
    home: '홈',
    material: '소재',
    category: '카테고리',
    collection: '컬렉션',
    status: '상태',
    all: '전체',
    newTag: '신상품',
    bestTag: '베스트',
    gridAria: '그리드 보기',
    listAria: '리스트 보기',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '필터를 초기화하거나 다른 카테고리를 선택해보세요.',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  en: {
    title: 'Piercing',
    count: (count) => `${count} products`,
    searchPlaceholder: 'Search piercing, material, or style',
    searchButton: 'Search',
    clearFilters: 'Reset',
    selectedFilters: 'Selected',
    noSelectedFilters: 'No selected filters',
    filter: 'FILTER',
    home: 'Home',
    material: 'Material',
    category: 'Category',
    collection: 'Collection',
    status: 'Status',
    all: 'All',
    newTag: 'New',
    bestTag: 'Best',
    gridAria: 'Grid view',
    listAria: 'List view',
    emptyTitle: 'No products match this filter.',
    emptyBody: 'Clear filters or choose another category.',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  jp: {
    title: 'ピアス',
    count: (count) => `${count}点`,
    searchPlaceholder: 'ピアス、素材、スタイルを検索',
    searchButton: '検索',
    clearFilters: 'リセット',
    selectedFilters: '選択条件',
    noSelectedFilters: '選択条件なし',
    filter: 'FILTER',
    home: 'ホーム',
    material: '素材',
    category: 'カテゴリー',
    collection: 'コレクション',
    status: 'ステータス',
    all: 'すべて',
    newTag: '新商品',
    bestTag: 'ベスト',
    gridAria: 'グリッド表示',
    listAria: 'リスト表示',
    emptyTitle: '条件に合う商品がありません。',
    emptyBody: 'フィルターを解除するか、別のカテゴリーを選択してください。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
  cn: {
    title: '穿孔',
    count: (count) => `${count}件商品`,
    searchPlaceholder: '搜尋穿孔、材質或風格',
    searchButton: '搜尋',
    clearFilters: '重置',
    selectedFilters: '已選條件',
    noSelectedFilters: '未選擇篩選',
    filter: 'FILTER',
    home: '首頁',
    material: '材質',
    category: '分類',
    collection: '系列',
    status: '状態',
    all: '全部',
    newTag: '新品',
    bestTag: '精選',
    gridAria: '網格视圖',
    listAria: '列表视圖',
    emptyTitle: '没有符合條件的商品。',
    emptyBody: '請重置篩選或選擇其他分類。',
    emptySmall: 'No products found for this filter. Try another category or clear filters.',
  },
}

const productListUiCopy = {
  kr: {
    categoryMessage: (count) => `선택한 조건에 맞는 피어싱 ${count}개를 확인해보세요.`,
    sort: '상품정렬',
    total: (count) => `총 ${count}개`,
    sortOptions: [
      { value: 'new', label: '신상품순' },
      { value: 'best', label: '베스트순' },
      { value: 'name', label: '상품명순' },
      { value: 'price-low', label: '낮은가격순' },
      { value: 'price-high', label: '높은가격순' },
    ],
    tabs: {
      all: '전체',
      ball: '볼피어싱',
      ring: '링피어싱',
      labret: '라블렛',
      drop: '드롭',
      antique: '엔틱',
      set: '피어싱 세트',
    },
  },
  en: {
    categoryMessage: (count) => `Browse ${count} piercing items for this selection.`,
    sort: 'Sort products',
    total: (count) => `${count} total`,
    sortOptions: [
      { value: 'new', label: 'Newest' },
      { value: 'best', label: 'Best' },
      { value: 'name', label: 'Name' },
      { value: 'price-low', label: 'Lowest price' },
      { value: 'price-high', label: 'Highest price' },
    ],
    tabs: {
      all: 'All',
      ball: 'Ball Piercing',
      ring: 'Ring Piercing',
      labret: 'Labret',
      drop: 'Drop',
      antique: 'Antique',
      set: 'Piercing Set',
    },
  },
  jp: {
    categoryMessage: (count) => `選択条件に合うピアスを${count}点表示しています。`,
    sort: '商品並び替え',
    total: (count) => `全${count}点`,
    sortOptions: [
      { value: 'new', label: '新着順' },
      { value: 'best', label: '人気順' },
      { value: 'name', label: '商品名順' },
      { value: 'price-low', label: '価格が低い順' },
      { value: 'price-high', label: '価格が高い順' },
    ],
    tabs: {
      all: 'すべて',
      ball: 'ボールピアス',
      ring: 'リングピアス',
      labret: 'ラブレット',
      drop: 'ドロップ',
      antique: 'アンティーク',
      set: 'ピアスセット',
    },
  },
  cn: {
    categoryMessage: (count) => `已顯示符合條件的 ${count} 個穿孔商品。`,
    sort: '商品排序',
    total: (count) => `共 ${count} 個`,
    sortOptions: [
      { value: 'new', label: '新品優先' },
      { value: 'best', label: '熱門優先' },
      { value: 'name', label: '按商品名' },
      { value: 'price-low', label: '價格從低到高' },
      { value: 'price-high', label: '價格從高到低' },
    ],
    tabs: {
      all: '全部',
      ball: '球形穿孔',
      ring: '環形穿孔',
      labret: '唇釘',
      drop: '垂墜',
      antique: '複古',
      set: '穿孔套裝',
    },
  },
}

const productPrimaryTabs = [
  { key: 'all', clear: true },
  { key: 'ball', param: 'type', value: 'ball' },
  { key: 'ring', param: 'type', value: 'ring' },
  { key: 'labret', legacyCategory: 'labret' },
  { key: 'drop', param: 'style', value: 'drop' },
  { key: 'antique', param: 'style', value: 'antique' },
  { key: 'set', param: 'saleType', value: 'bundle' },
]

const productTabSets = {
  all: [
    { key: 'all', clear: true },
    { key: 'bundleSale', param: 'saleType', value: 'bundle' },
    { key: 'barbell', param: 'structure', value: 'barbell', multi: true },
    { key: 'dropAntique', param: 'style', values: ['drop', 'antique'] },
    { key: 'pearlAcrylic', param: 'decoration', values: ['pearl', 'mother_of_pearl', 'acrylic_applique'] },
    { key: 'mirrorStone', param: 'decoration', values: ['mirrorball', 'stone'] },
    { key: 'parts', param: 'group', value: 'parts' },
  ],
  silver925: [
    { key: 'all', clear: true },
    { key: 'bundleSale', param: 'saleType', value: 'bundle' },
    { key: 'barbell', param: 'structure', value: 'barbell', multi: true },
    { key: 'pearlShell', param: 'decoration', values: ['pearl', 'mother_of_pearl'] },
    { key: 'plainLine', param: 'style', value: 'plain', multi: true },
    { key: 'cubicLine', param: 'style', value: 'cubic_setting', multi: true },
    { key: 'epoxy', param: 'style', value: 'epoxy', multi: true },
    { key: 'coating', param: 'style', value: 'coated', multi: true },
    { key: 'syntheticGem', param: 'decoration', value: 'synthetic_gem', multi: true },
    { key: 'stone', param: 'decoration', value: 'stone', multi: true },
  ],
  brass: [
    { key: 'all', clear: true },
    { key: 'barbell', param: 'structure', value: 'barbell', multi: true },
    { key: 'pearlShell', param: 'decoration', values: ['pearl', 'mother_of_pearl'] },
    { key: 'plainLine', param: 'style', value: 'plain', multi: true },
    { key: 'cubicLine', param: 'style', value: 'cubic_setting', multi: true },
    { key: 'epoxy', param: 'style', value: 'epoxy', multi: true },
    { key: 'coating', param: 'style', value: 'coated', multi: true },
    { key: 'syntheticGem', param: 'decoration', value: 'synthetic_gem', multi: true },
    { key: 'stone', param: 'decoration', value: 'stone', multi: true },
    { key: 'dropAntique', param: 'style', values: ['drop', 'antique'] },
    { key: 'pearlAcrylic', param: 'decoration', values: ['pearl', 'mother_of_pearl', 'acrylic_applique'] },
    { key: 'mirrorStone', param: 'decoration', values: ['mirrorball', 'stone'] },
  ],
  surgical: [
    { key: 'all', clear: true },
    { key: 'laserCut', param: 'style', value: 'laser_cut', multi: true },
    { key: 'barbellLine', param: 'structure', value: 'barbell', multi: true },
    { key: 'internal', param: 'structure', value: 'internal', multi: true },
    { key: 'basicBarbell', param: 'structure', value: 'basic_barbell', multi: true },
    { key: 'twoBallRing', param: 'structure', value: 'two_ball_ring', multi: true },
    { key: 'cubicSetting', param: 'style', value: 'cubic_setting', multi: true },
  ],
  parts: [
    { key: 'all', clear: true },
    { key: 'straightBar', param: 'structure', value: 'straight_bar', multi: true },
    { key: 'bananaBar', param: 'structure', value: 'banana_bar', multi: true },
    { key: 'internalBar', param: 'structure', value: 'internal_bar', multi: true },
    { key: 'internalHead', param: 'structure', value: 'internal_head', multi: true },
    { key: 'ballPart', param: 'structure', value: 'ball_part', multi: true },
    { key: 'transparentPiercing', param: 'partType', value: 'transparent_piercing', multi: true },
    { key: 'dBar', param: 'structure', value: 'd_bar', multi: true },
    { key: 'titaniumPart', param: 'baseMaterial', value: 'titanium' },
    { key: 'otherParts', param: 'partType', value: 'other_parts', multi: true },
  ],
}

const productTabControlledParams = ['type', 'style', 'saleType', 'category', 'structure', 'decoration', 'allSurgical', 'partType']

const productMaterialTabs = [
  { key: 'all', value: '' },
  { key: 'silver925', value: 'silver925' },
  { key: 'brass', value: 'brass' },
  { key: 'surgical', value: 'surgical' },
  { key: 'parts', param: 'group', value: 'parts' },
]

const _productShapeTabs = [
  { key: 'all', clear: true },
  { key: 'spark', value: 'spark' },
  { key: 'flower', value: 'flower' },
  { key: 'butterfly', value: 'butterfly' },
  { key: 'heart', value: 'heart' },
  { key: 'star', value: 'star' },
  { key: 'moon', value: 'moon' },
  { key: 'ribbon', value: 'ribbon' },
]

const productPrimaryLegacyCategories = productPrimaryTabs
  .map((tab) => tab.legacyCategory)
  .filter(Boolean)

const _productFilterGroups = [
  {
    key: 'material',
    label: '소재별',
    options: [
      { label: '925실버', dimension: 'baseMaterial', param: 'baseMaterial', value: 'silver925' },
      { label: '써지컬', dimension: 'baseMaterial', param: 'baseMaterial', value: 'surgical' },
      { label: '올써지컬', dimension: 'allSurgical', param: 'allSurgical', value: 'true' },
      { label: '신주', dimension: 'baseMaterial', param: 'baseMaterial', value: 'brass' },
      { label: '티타늄', dimension: 'baseMaterial', param: 'baseMaterial', value: 'titanium' },
      { label: '아크릴', dimension: 'baseMaterial', param: 'baseMaterial', value: 'acrylic' },
    ],
  },
  {
    key: 'category',
    label: '카테고리',
    options: [
      { label: '바벨', dimension: 'structures', param: 'structure', value: 'barbell', multi: true },
      { label: '링', dimension: 'piercingType', param: 'type', value: 'ring' },
      { label: '드롭', dimension: 'styles', param: 'style', value: 'drop', multi: true },
      { label: '엔틱', dimension: 'styles', param: 'style', value: 'antique', multi: true },
      { label: '부자재', dimension: 'productGroup', param: 'group', value: 'parts' },
      { label: '기본 묶음', dimension: 'saleType', param: 'saleType', value: 'bundle' },
    ],
  },
  {
    key: 'decoration',
    label: '장식별',
    options: [
      { label: '진주', dimension: 'decorationMaterials', param: 'decoration', value: 'pearl', multi: true },
      { label: '자개', dimension: 'decorationMaterials', param: 'decoration', value: 'mother_of_pearl', multi: true },
      { label: '큐빅', dimension: 'decorationMaterials', param: 'decoration', value: 'cubic', multi: true },
      { label: '에폭', dimension: 'styles', param: 'style', value: 'epoxy', multi: true },
      { label: '합성 원석', dimension: 'decorationMaterials', param: 'decoration', value: 'synthetic_gem', multi: true },
      { label: '스톤', dimension: 'decorationMaterials', param: 'decoration', value: 'stone', multi: true },
      { label: '미러볼', dimension: 'decorationMaterials', param: 'decoration', value: 'mirrorball', multi: true },
    ],
  },
  {
    key: 'structure',
    label: '구조·가공',
    options: [
      { label: '민자', dimension: 'styles', param: 'style', value: 'plain', multi: true },
      { label: '코팅', dimension: 'styles', param: 'style', value: 'coated', multi: true },
      { label: '레이저 커팅', dimension: 'styles', param: 'style', value: 'laser_cut', multi: true },
      { label: '인터널', dimension: 'structures', param: 'structure', value: 'internal', multi: true },
      { label: '기본 바벨', dimension: 'structures', param: 'structure', value: 'basic_barbell', multi: true },
      { label: '투볼 링', dimension: 'structures', param: 'structure', value: 'two_ball_ring', multi: true },
      { label: '큐빅 물림', dimension: 'styles', param: 'style', value: 'cubic_setting', multi: true },
    ],
  },
  {
    key: 'shape',
    label: '모양별',
    options: [
      { label: '스파크', dimension: 'shapes', param: 'shape', value: 'spark', multi: true },
      { label: '꽃', dimension: 'shapes', param: 'shape', value: 'flower', multi: true },
      { label: '나비', dimension: 'shapes', param: 'shape', value: 'butterfly', multi: true },
      { label: '하트', dimension: 'shapes', param: 'shape', value: 'heart', multi: true },
      { label: '별', dimension: 'shapes', param: 'shape', value: 'star', multi: true },
      { label: '달', dimension: 'shapes', param: 'shape', value: 'moon', multi: true },
      { label: '리본', dimension: 'shapes', param: 'shape', value: 'ribbon', multi: true },
      { label: '구', dimension: 'shapes', param: 'shape', value: 'sphere', multi: true },
      { label: '사각', dimension: 'shapes', param: 'shape', value: 'square', multi: true },
    ],
  },
]

const _legacyProductFilterGroups = [
  {
    key: 'material',
    label: '소재별',
    options: [
      { label: '925실버', dimension: 'baseMaterial', param: 'baseMaterial', value: 'silver925' },
      { label: '써지컬', dimension: 'baseMaterial', param: 'baseMaterial', value: 'surgical' },
      { label: '올써지컬', dimension: 'allSurgical', param: 'allSurgical', value: 'true' },
      { label: '신주', dimension: 'baseMaterial', param: 'baseMaterial', value: 'brass' },
      { label: '티타늄', dimension: 'baseMaterial', param: 'baseMaterial', value: 'titanium' },
      { label: '아크릴', dimension: 'baseMaterial', param: 'baseMaterial', value: 'acrylic' },
    ],
  },
  {
    key: 'category',
    label: '카테고리',
    options: [
      { label: '바벨', dimension: 'structures', param: 'structure', value: 'barbell', multi: true },
      { label: '링', dimension: 'piercingType', param: 'type', value: 'ring' },
      { label: '드롭', dimension: 'styles', param: 'style', value: 'drop', multi: true },
      { label: '엔틱', dimension: 'styles', param: 'style', value: 'antique', multi: true },
      { label: '부자재', dimension: 'productGroup', param: 'group', value: 'parts' },
      { label: '기본 묶음', dimension: 'saleType', param: 'saleType', value: 'bundle' },
    ],
  },
  {
    key: 'decoration',
    label: '장식별',
    options: [
      { label: '진주', dimension: 'decorationMaterials', param: 'decoration', value: 'pearl', multi: true },
      { label: '자개', dimension: 'decorationMaterials', param: 'decoration', value: 'mother_of_pearl', multi: true },
      { label: '큐빅', dimension: 'decorationMaterials', param: 'decoration', value: 'cubic', multi: true },
      { label: '에폭', dimension: 'styles', param: 'style', value: 'epoxy', multi: true },
      { label: '합성 원석', dimension: 'decorationMaterials', param: 'decoration', value: 'synthetic_gem', multi: true },
      { label: '스톤', dimension: 'decorationMaterials', param: 'decoration', value: 'stone', multi: true },
      { label: '미러볼', dimension: 'decorationMaterials', param: 'decoration', value: 'mirrorball', multi: true },
    ],
  },
  {
    key: 'structure',
    label: '구조·가공',
    options: [
      { label: '민자', dimension: 'styles', param: 'style', value: 'plain', multi: true },
      { label: '코팅', dimension: 'styles', param: 'style', value: 'coated', multi: true },
      { label: '레이저 커팅', dimension: 'styles', param: 'style', value: 'laser_cut', multi: true },
      { label: '인터널', dimension: 'structures', param: 'structure', value: 'internal', multi: true },
      { label: '기본 바벨', dimension: 'structures', param: 'structure', value: 'basic_barbell', multi: true },
      { label: '투볼 링', dimension: 'structures', param: 'structure', value: 'two_ball_ring', multi: true },
      { label: '큐빅 물림', dimension: 'styles', param: 'style', value: 'cubic_setting', multi: true },
    ],
  },
  {
    key: 'shape',
    label: '모양별',
    options: [
      { label: '스파크', dimension: 'shapes', param: 'shape', value: 'spark', multi: true },
      { label: '꽃', dimension: 'shapes', param: 'shape', value: 'flower', multi: true },
      { label: '나비', dimension: 'shapes', param: 'shape', value: 'butterfly', multi: true },
      { label: '하트', dimension: 'shapes', param: 'shape', value: 'heart', multi: true },
      { label: '별', dimension: 'shapes', param: 'shape', value: 'star', multi: true },
      { label: '달', dimension: 'shapes', param: 'shape', value: 'moon', multi: true },
      { label: '리본', dimension: 'shapes', param: 'shape', value: 'ribbon', multi: true },
      { label: '구', dimension: 'shapes', param: 'shape', value: 'sphere', multi: true },
      { label: '사각', dimension: 'shapes', param: 'shape', value: 'square', multi: true },
    ],
  },
]

const productFilterGroups = [
  {
    key: 'material',
    label: '소재',
    options: [
      { label: '실버925', dimension: 'baseMaterial', param: 'baseMaterial', value: 'silver925' },
      { label: '써지컬 바', dimension: 'baseMaterial', param: 'baseMaterial', value: 'brass' },
      { label: '써지컬', dimension: 'baseMaterial', param: 'baseMaterial', value: 'surgical' },
      { label: '부자재', dimension: 'productGroup', param: 'group', value: 'parts' },
    ],
  },
  {
    key: 'category',
    label: '카테고리',
    options: [
      { label: '바벨', dimension: 'structures', param: 'structure', value: 'barbell', multi: true },
      { label: '링', dimension: 'piercingType', param: 'type', value: 'ring' },
      { label: '드롭', dimension: 'styles', param: 'style', value: 'drop', multi: true },
      { label: '엔틱', dimension: 'styles', param: 'style', value: 'antique', multi: true },
      { label: '기본 묶음', dimension: 'saleType', param: 'saleType', value: 'bundle' },
    ],
  },
  {
    key: 'decoration',
    label: '장식',
    options: [
      { label: '진주', dimension: 'decorationMaterials', param: 'decoration', value: 'pearl', multi: true },
      { label: '자개', dimension: 'decorationMaterials', param: 'decoration', value: 'mother_of_pearl', multi: true },
      { label: '큐빅', dimension: 'decorationMaterials', param: 'decoration', value: 'cubic', multi: true },
      { label: '에폭', dimension: 'styles', param: 'style', value: 'epoxy', multi: true },
      { label: '합성 원석', dimension: 'decorationMaterials', param: 'decoration', value: 'synthetic_gem', multi: true },
      { label: '스톤', dimension: 'decorationMaterials', param: 'decoration', value: 'stone', multi: true },
      { label: '미러볼', dimension: 'decorationMaterials', param: 'decoration', value: 'mirrorball', multi: true },
      { label: '볼', dimension: 'structures', param: 'structure', value: 'ball_part', multi: true },
      { label: '아크릴', dimension: 'decorationMaterials', param: 'decoration', value: 'acrylic_applique', multi: true },
    ],
  },
  {
    key: 'structure',
    label: '구조·가공',
    options: [
      { label: '민자', dimension: 'styles', param: 'style', value: 'plain', multi: true },
      { label: '코팅', dimension: 'styles', param: 'style', value: 'coated', multi: true },
      { label: '레이저 커팅', dimension: 'styles', param: 'style', value: 'laser_cut', multi: true },
      { label: '인터널', dimension: 'structures', param: 'structure', value: 'internal', multi: true },
      { label: '기본 바벨', dimension: 'structures', param: 'structure', value: 'basic_barbell', multi: true },
      { label: '투볼 링', dimension: 'structures', param: 'structure', value: 'two_ball_ring', multi: true },
      { label: '큐빅 물림', dimension: 'styles', param: 'style', value: 'cubic_setting', multi: true },
    ],
  },
  {
    key: 'shape',
    label: '모양',
    options: [
      { label: '스파크', dimension: 'shapes', param: 'shape', value: 'spark', multi: true },
      { label: '꽃', dimension: 'shapes', param: 'shape', value: 'flower', multi: true },
      { label: '나비', dimension: 'shapes', param: 'shape', value: 'butterfly', multi: true },
      { label: '하트', dimension: 'shapes', param: 'shape', value: 'heart', multi: true },
      { label: '별', dimension: 'shapes', param: 'shape', value: 'star', multi: true },
      { label: '달', dimension: 'shapes', param: 'shape', value: 'moon', multi: true },
      { label: '리본', dimension: 'shapes', param: 'shape', value: 'ribbon', multi: true },
      { label: '구', dimension: 'shapes', param: 'shape', value: 'sphere', multi: true },
      { label: '사각', dimension: 'shapes', param: 'shape', value: 'square', multi: true },
    ],
  },
]

const productFilterSearchCopy = {
  kr: {
    recent: '최근 검색어',
    clear: '검색 기록 지우기',
    empty: '최근 검색 기록이 없습니다.',
    recommended: '추천 검색어 기반 상품',
    popular: '인기 검색어',
    recommendedTerms: ['티타늄 라블렛', '14K 골드 피어싱', '큐빅 바벨'],
    popularTerms: ['티타늄 라블렛', '써지컬 스틸 바벨', '14K 골드 피어싱', '큐빅 바벨', '원터치 링', '진주 피어싱', '노즈 피어싱', '배꼽 링', '하트 라블렛', '체인 드롭 피어싱'],
  },
  en: {
    recent: 'Recent searches',
    clear: 'Clear search history',
    empty: 'No recent searches yet.',
    recommended: 'Recommended searches',
    popular: 'Popular searches',
    recommendedTerms: ['Titanium labret', '14K gold piercing', 'Cubic barbell'],
    popularTerms: ['Titanium labret', 'Surgical steel barbell', '14K gold piercing', 'Cubic barbell', 'One-touch ring', 'Pearl piercing', 'Nose piercing', 'Belly ring', 'Heart labret', 'Chain drop piercing'],
  },
  jp: {
    recent: '最近の検索',
    clear: '検索履歴を削除',
    empty: '最近の検索履歴はありません。',
    recommended: 'おすすめ検索',
    popular: '人気検索',
    recommendedTerms: ['チタンラブレット', '14Kゴールドピアス', 'キュービックバーベル'],
    popularTerms: ['チタンラブレット', 'サージカルバーベル', '14Kゴールドピアス', 'キュービックバーベル', 'ワンタッチリング', 'パールピアス', 'ノーズピアス', 'へそピアス', 'ハートラブレット', 'チェーンドロップピアス'],
  },
  cn: {
    recent: '最近搜尋',
    clear: '清除搜尋記錄',
    empty: '暫無最近搜尋記錄。',
    recommended: '推薦搜尋',
    popular: '熱門搜尋',
    recommendedTerms: ['鈦鋼唇釘', '14K金穿孔', '鋯石直桿'],
    popularTerms: ['鈦鋼唇釘', '医用鋼直桿', '14K金穿孔', '鋯石直桿', '一觸式環', '珍珠穿孔', '鼻釘', '肚臍環', '愛心唇釘', '鏈條垂墜穿孔'],
  },
}

const productFilterGroupLabelCopy = {
  kr: {
    material: '소재',
    category: '카테고리',
    decoration: '장식',
    structure: '구조·가공',
    shape: '모양',
    price: '가격대',
  },
  en: {
    material: 'Material',
    category: 'Category',
    decoration: 'Decoration',
    structure: 'Structure',
    shape: 'Shape',
    price: 'Price',
  },
  jp: {
    material: '素材',
    category: 'カテゴリー',
    decoration: '装飾',
    structure: '構造・加工',
    shape: '形',
    price: '価格帯',
  },
  cn: {
    material: '材質',
    category: '分類',
    decoration: '裝飾',
    structure: '結構·工藝',
    shape: '造型',
    price: '價格區間',
  },
}

const productFilterPriceCopy = {
  kr: {
    under: (value) => `${Number(value).toLocaleString('ko-KR')}원 이하`,
    min: (value) => `${Number(value).toLocaleString('ko-KR')}원 이상`,
    max: (value) => `${Number(value).toLocaleString('ko-KR')}원 이하`,
    minPlaceholder: '최소금액',
    maxPlaceholder: '최대금액',
    apply: '적용',
  },
  en: {
    under: (value) => `Under KRW ${Number(value).toLocaleString('en-US')}`,
    min: (value) => `From KRW ${Number(value).toLocaleString('en-US')}`,
    max: (value) => `Up to KRW ${Number(value).toLocaleString('en-US')}`,
    minPlaceholder: 'Min',
    maxPlaceholder: 'Max',
    apply: 'Apply',
  },
  jp: {
    under: (value) => `${Number(value).toLocaleString('ja-JP')}ウォン以下`,
    min: (value) => `${Number(value).toLocaleString('ja-JP')}ウォン以上`,
    max: (value) => `${Number(value).toLocaleString('ja-JP')}ウォン以下`,
    minPlaceholder: '最小金額',
    maxPlaceholder: '最大金額',
    apply: '適用',
  },
  cn: {
    under: (value) => `${Number(value).toLocaleString('zh-CN')}韓元以下`,
    min: (value) => `${Number(value).toLocaleString('zh-CN')}韓元以上`,
    max: (value) => `${Number(value).toLocaleString('zh-CN')}韓元以下`,
    minPlaceholder: '最低金額',
    maxPlaceholder: '最高金額',
    apply: '應用',
  },
}

const productMaterialDisplayLabels = {
  kr: {
    silver925: '실버925',
    surgical: '써지컬 스틸',
    brass: '써지컬 바',
    titanium: '티타늄',
    acrylic: '아크릴',
    other: '기타소재',
  },
  en: {
    silver925: 'Silver 925',
    surgical: 'Surgical Steel',
    brass: 'Brass',
    titanium: 'Titanium',
    acrylic: 'Acrylic',
    other: 'Other Material',
  },
  jp: {
    silver925: 'シルバー925',
    surgical: 'サージカルステンレス',
    brass: '真鍮',
    titanium: 'チタン',
    acrylic: 'アクリル',
    other: 'その他素材',
  },
  cn: {
    silver925: '925銀',
    surgical: '医用鋼',
    brass: '黄銅',
    titanium: '鈦',
    acrylic: '亞克力',
    other: '其他材質',
  },
}

const _productBreadcrumbCopy = {
  kr: { home: '홈', parts: '부자재', piercing: '피어싱' },
  en: { home: 'Home', parts: 'Parts', piercing: 'Piercing' },
  jp: { home: 'ホーム', parts: 'パーツ', piercing: 'ピアス' },
  cn: { home: '首頁', parts: '配件', piercing: '穿孔' },
}

const productCleanBreadcrumbCopy = {
  kr: { home: '홈', parts: '부자재', piercing: '피어싱', shapeMenu: '모양별', all: '전체' },
  en: { home: 'Home', parts: 'Parts', piercing: 'Piercing', shapeMenu: 'Shape', all: 'All' },
  jp: { home: 'ホーム', parts: 'パーツ', piercing: 'ピアス', shapeMenu: '形別', all: 'すべて' },
  cn: { home: '首頁', parts: '配件', piercing: '穿孔', shapeMenu: '按造型', all: '全部' },
}

const productShapeLabelCopy = {
  kr: { spark: '스파크', flower: '꽃', butterfly: '나비', heart: '하트', star: '별', moon: '달', ribbon: '리본' },
  en: { spark: 'Spark', flower: 'Flower', butterfly: 'Butterfly', heart: 'Heart', star: 'Star', moon: 'Moon', ribbon: 'Ribbon' },
  jp: { spark: 'スパーク', flower: '花', butterfly: '蝶', heart: 'ハート', star: '星', moon: '月', ribbon: 'リボン' },
  cn: { spark: '闪光', flower: '花朵', butterfly: '蝴蝶', heart: '愛心', star: '星星', moon: '月亮', ribbon: '蝴蝶結' },
}

const productMaterialTabCopy = {
  kr: { all: '전체', silver925: '실버925', brass: '써지컬 바', surgical: '써지컬', parts: '부자재' },
  en: { all: 'All', silver925: 'Silver 925', brass: 'Surgical Bar', surgical: 'Surgical', parts: 'Parts' },
  jp: { all: 'すべて', silver925: 'シルバー925', brass: 'サージカルバー', surgical: 'サージカル', parts: 'パーツ' },
  cn: { all: '全部', silver925: '925銀', brass: '医用鋼桿', surgical: '医用鋼', parts: '配件' },
}

const productTabLabelCopy = {
  kr: {
    all: '전체',
    bundleSale: '기본 묶음 판매',
    barbell: '바벨',
    pearlShell: '진주·자개',
    plainLine: '민자라인',
    cubicLine: '큐빅라인',
    epoxy: '에폭',
    coating: '코팅',
    syntheticGem: '합성 원석',
    stone: '스톤',
    dropAntique: '드롭&엔틱',
    pearlAcrylic: '진주&아크릴',
    mirrorStone: '미러볼&스톤',
    laserCut: '레이저 커팅',
    barbellLine: '바벨라인',
    internal: '인터널',
    basicBarbell: '기본바벨',
    twoBallRing: '투볼링',
    cubicSetting: '큐빅물림',
    straightBar: '일자바',
    bananaBar: '바나나바',
    internalBar: '인터널 바',
    internalHead: '인터널 헤드',
    ballPart: '볼',
    transparentPiercing: '투명 피어싱',
    dBar: 'ㄷ 자바',
    titaniumPart: '티타늄',
    otherParts: '기타 부자재',
    parts: '부자재',
  },
  en: {
    all: 'All',
    bundleSale: 'Basic Bundles',
    barbell: 'Barbell',
    pearlShell: 'Pearl & Shell',
    plainLine: 'Plain Line',
    cubicLine: 'Cubic Line',
    epoxy: 'Epoxy',
    coating: 'Coating',
    syntheticGem: 'Synthetic Gem',
    stone: 'Stone',
    dropAntique: 'Drop & Antique',
    pearlAcrylic: 'Pearl & Acrylic',
    mirrorStone: 'Mirror Ball & Stone',
    laserCut: 'Laser Cut',
    barbellLine: 'Barbell Line',
    internal: 'Internal',
    basicBarbell: 'Basic Barbell',
    twoBallRing: 'Two Ball Ring',
    cubicSetting: 'Cubic Setting',
    straightBar: 'Straight Bar',
    bananaBar: 'Banana Bar',
    internalBar: 'Internal Bar',
    internalHead: 'Internal Head',
    ballPart: 'Ball',
    transparentPiercing: 'Clear Piercing',
    dBar: 'D Bar',
    titaniumPart: 'Titanium',
    otherParts: 'Other Parts',
    parts: 'Parts',
  },
  jp: {
    all: 'すべて',
    bundleSale: '基本セット',
    barbell: 'バーベル',
    pearlShell: 'パール・シェル',
    plainLine: 'プレーンライン',
    cubicLine: 'キュービックライン',
    epoxy: 'エポキシ',
    coating: 'コーティング',
    syntheticGem: '合成石',
    stone: 'ストーン',
    dropAntique: 'ドロップ&アンティーク',
    pearlAcrylic: 'パール&アクリル',
    mirrorStone: 'ミラーボール&ストーン',
    laserCut: 'レーザーカット',
    barbellLine: 'バーベルライン',
    internal: 'インターナル',
    basicBarbell: '基本バーベル',
    twoBallRing: 'ツーボールリング',
    cubicSetting: 'キュービック留め',
    straightBar: 'ストレートバー',
    bananaBar: 'バナナバー',
    internalBar: 'インターナルバー',
    internalHead: 'インターナルヘッド',
    ballPart: 'ボール',
    transparentPiercing: '透明ピアス',
    dBar: 'Dバー',
    titaniumPart: 'チタン',
    otherParts: 'その他パーツ',
    parts: 'パーツ',
  },
  cn: {
    all: '全部',
    bundleSale: '基础套裝',
    barbell: '直桿',
    pearlShell: '珍珠·贝母',
    plainLine: '素面系列',
    cubicLine: '鋯石系列',
    epoxy: '滴胶',
    coating: '镀层',
    syntheticGem: '合成宝石',
    stone: '石',
    dropAntique: '垂墜&複古',
    pearlAcrylic: '珍珠&亞克力',
    mirrorStone: '鏡面球&石',
    laserCut: '激光切割',
    barbellLine: '直桿系列',
    internal: '內螺紋',
    basicBarbell: '基础直桿',
    twoBallRing: '雙球環',
    cubicSetting: '鋯石镶嵌',
    straightBar: '一字桿',
    bananaBar: '香蕉桿',
    internalBar: '內螺紋桿',
    internalHead: '內螺紋頭',
    ballPart: '球',
    transparentPiercing: '透明穿孔',
    dBar: 'D形桿',
    titaniumPart: '鈦',
    otherParts: '其他配件',
    parts: '配件',
  },
}

const getShapeTabLabel = (shape, locale) => {
  const contentLocale = getLocaleContentKey(locale)
  return productShapeLabelCopy[contentLocale]?.[shape] || getTaxonomyLabel('shapes', shape, contentLocale)
}

const getFilterGroupLabel = (group, locale) => (
  productFilterGroupLabelCopy[getLocaleContentKey(locale)]?.[group.key]
  || productFilterGroupLabelCopy.kr[group.key]
  || group.label
)

const getFilterOptionLabel = (option, locale) => (
  option.managed
  ? option.label
  :
  getTaxonomyLabel(option.dimension, option.value, locale)
  || option.label
)

const hasText = (value, query) => String(value ?? '').toLowerCase().includes(query)

const getKrWholesalePrice = (productPrices, productId) => {
  const price = (productPrices || []).find((item) => item.productId === productId && item.market === 'KR' && item.currency === 'KRW' && item.isActive !== false)
  return Number.isFinite(Number(price?.wholesalePrice)) ? Number(price.wholesalePrice) : null
}

const parsePriceInput = (value) => {
  const normalized = String(value ?? '').replace(/[^\d]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const isFilterOptionActive = (searchParams, option) => searchParams.getAll(option.param).includes(option.value)

export function ProductsPage() {
  const { dataError, dataStatus, productPrices, products } = useCommerce()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const routeParams = useParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortMode, setSortMode] = useState('new')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [managedFilterOptions, setManagedFilterOptions] = useState(() => loadCatalogFilterOptions())
  const { locale, toLocalePath } = useLocalePath()
  const contentLocale = getLocaleContentKey(locale)
  const copy = { ...(productListCopy[contentLocale] ?? productListCopy.kr), ...(taxonomyLabels[contentLocale] ?? taxonomyLabels.kr) }
  const uiCopy = productListUiCopy[contentLocale] ?? productListUiCopy.en
  useEffect(() => subscribeCatalogFilterOptions(setManagedFilterOptions), [])

  const routeCollection = routeParams.collectionId ?? ''
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const collection = routeCollection || (searchParams.get('collection') ?? '')
  const material = searchParams.get('material') ?? ''
  const color = searchParams.get('color') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const pricePreset = searchParams.get('priceMax') ?? ''
  const priceMin = searchParams.get('priceMin') ?? ''
  const priceMax = searchParams.get('priceMaxCustom') ?? ''
  const taxonomyFilters = getFiltersFromSearchParams(searchParams, routeParams)
  const hasTaxonomyFilters = Object.entries(taxonomyFilters).some(([key, value]) => (
    key !== 'entryBasis' && (Array.isArray(value) ? value.length : Boolean(value))
  ))
  const managedCategories = managedFilterOptions.categories.filter((item) => item.isVisible)
  const managedCollections = managedFilterOptions.collections.filter((item) => item.isVisible)
  const managedCategoryLabels = new Map(managedCategories.map((item) => [item.id, getCatalogFilterOptionLabel(item, locale)]))
  const managedCollectionLabels = new Map(managedCollections.map((item) => [item.id, getCatalogFilterOptionLabel(item, locale)]))
  const isShapeEntry = taxonomyFilters.entryBasis === 'shape'
  const shouldApplyLegacyCategory = Boolean(category && (!hasTaxonomyFilters || productPrimaryLegacyCategories.includes(category)))

  const normalizedQuery = q.trim().toLowerCase()
  const filtered = dedupeProducts(products).filter((product) => {
    if (!product.isVisible) return false
    if (!productMatchesTaxonomy(product, taxonomyFilters)) return false
    if (shouldApplyLegacyCategory && product.categoryId !== category) return false
    if (collection && !product.collectionIds.includes(collection)) return false
    if (material && product.material !== material) return false
    if (color && !product.colors.includes(color)) return false
    if (tag === 'new' && !product.isNew) return false
    if (tag === 'best' && !product.isBest) return false
    if (tag && !['new', 'best'].includes(tag)) return false
    if (pricePreset || priceMin || priceMax) {
      const price = getKrWholesalePrice(productPrices, product.productId)
      const min = parsePriceInput(priceMin)
      const max = parsePriceInput(priceMax) ?? parsePriceInput(pricePreset)
      if (price === null) return false
      if (min !== null && price < min) return false
      if (max !== null && price > max) return false
    }

    if (!normalizedQuery) return true

    return [
      product.code,
      product.nameKo,
      product.nameEn,
      product.nameJa,
      product.material,
    ].some((value) => hasText(value, normalizedQuery))
  })

  const sortedProducts = [...filtered].sort((a, b) => {
    if (sortMode === 'best') return Number(b.isBest) - Number(a.isBest) || a.sortOrder - b.sortOrder
    if (sortMode === 'name') return String(a.nameKo || a.nameEn).localeCompare(String(b.nameKo || b.nameEn), 'ko')
    if (sortMode === 'price-low' || sortMode === 'price-high') {
      const priceA = getKrWholesalePrice(productPrices, a.productId) ?? Number.POSITIVE_INFINITY
      const priceB = getKrWholesalePrice(productPrices, b.productId) ?? Number.POSITIVE_INFINITY
      return sortMode === 'price-low' ? priceA - priceB : priceB - priceA
    }
    return Number(b.isNew) - Number(a.isNew) || a.sortOrder - b.sortOrder
  })

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

  const applyProductTab = (tab) => {
    if (isShapeEntry) {
      const shapePath = `/shape/${activeShapeValue}`
      if (!tab.value && !tab.legacyCategory && !tab.values) {
        navigate(toLocalePath(shapePath))
      } else if (tab.param === 'type') {
        navigate(toLocalePath(`${shapePath}/piercing/${tab.value}`))
      } else {
        const next = new URLSearchParams()
        if (tab.legacyCategory) {
          next.set('category', tab.legacyCategory)
        } else if (tab.values) {
          tab.values.forEach((value) => next.append(tab.param, value))
        } else if (tab.value) {
          next.set(tab.param, tab.value)
        }
        navigate(toLocalePath(`${shapePath}?${next.toString()}`))
      }
      return
    }

    const next = new URLSearchParams(searchParams)
    productTabControlledParams.forEach((param) => next.delete(param))
    if (activeMaterialTab === 'parts') next.delete('baseMaterial')

    const applyTabFilter = (filter) => {
      if (filter.values) {
        filter.values.forEach((value) => next.append(filter.param, value))
      } else if (filter.value) {
        next.set(filter.param, filter.value)
      }
    }

    if (tab.legacyCategory) {
      next.set('category', tab.legacyCategory)
    } else if (tab.filters) {
      tab.filters.forEach(applyTabFilter)
    } else if (tab.values) {
      tab.values.forEach((value) => next.append(tab.param, value))
    } else if (tab.value) {
      next.set(tab.param, tab.value)
    }

    setSearchParams(next)
  }

  const applyMaterialTab = (tab) => {
    const next = new URLSearchParams(searchParams)
    next.delete('baseMaterial')
    next.delete('materialBase')
    next.delete('group')

    if (tab.param === 'group' && tab.value) {
      next.set('group', tab.value)
    } else if (tab.value) {
      next.set('baseMaterial', tab.value)
    }

    setSearchParams(next)
  }

  const toggleProductFilterOption = (option) => {
    const next = new URLSearchParams(searchParams)
    const currentValues = next.getAll(option.param)
    next.delete(option.param)

    if (option.multi) {
      const values = currentValues.includes(option.value)
        ? currentValues.filter((item) => item !== option.value)
        : [...currentValues, option.value]
      values.forEach((value) => next.append(option.param, value))
    } else if (!currentValues.includes(option.value)) {
      next.set(option.param, option.value)
    }

    setSearchParams(next)
  }

  const clearProductFilterGroup = (group) => {
    const next = new URLSearchParams(searchParams)
    group.options.forEach((option) => next.delete(option.param))
    setSearchParams(next)
  }

  const setPricePreset = (max) => {
    const next = new URLSearchParams(searchParams)
    if (next.get('priceMax') === String(max)) {
      next.delete('priceMax')
    } else {
      next.set('priceMax', String(max))
      next.delete('priceMin')
      next.delete('priceMaxCustom')
    }
    setSearchParams(next)
  }

  const submitPriceRange = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const min = parsePriceInput(formData.get('priceMin'))
    const max = parsePriceInput(formData.get('priceMaxCustom'))
    const next = new URLSearchParams(searchParams)
    next.delete('priceMax')
    min === null ? next.delete('priceMin') : next.set('priceMin', String(min))
    max === null ? next.delete('priceMaxCustom') : next.set('priceMaxCustom', String(max))
    setSearchParams(next)
  }

  const clearPriceFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('priceMax')
    next.delete('priceMin')
    next.delete('priceMaxCustom')
    setSearchParams(next)
  }

  const activeShapeValue = isShapeEntry ? (taxonomyFilters.shapes || [])[0] : ''
  const materialTabLabels = productMaterialTabCopy[contentLocale] ?? productMaterialTabCopy.kr
  const activeMaterialTab = taxonomyFilters.productGroup === 'parts' ? 'parts' : taxonomyFilters.baseMaterial || 'all'
  const productTabs = isShapeEntry ? productPrimaryTabs : productTabSets[activeMaterialTab] || productTabSets.all
  const showMaterialTabs = !isShapeEntry && activeMaterialTab === 'all'
  const productTabLabels = productTabLabelCopy[contentLocale] ?? productTabLabelCopy.kr
  const isProductTabActive = (tab) => {
    if (tab.legacyCategory) return shouldApplyLegacyCategory && category === tab.legacyCategory
    const filterMatches = (filter) => {
      const expectedValues = filter.values || [filter.value]
      const currentValues = searchParams.getAll(filter.param)
      if (filter.param === 'type' && taxonomyFilters.piercingType) currentValues.push(taxonomyFilters.piercingType)
      if (filter.param === 'saleType' && taxonomyFilters.saleType) currentValues.push(taxonomyFilters.saleType)
      if (filter.param === 'style') currentValues.push(...(taxonomyFilters.styles || []))
      if (filter.param === 'structure') currentValues.push(...(taxonomyFilters.structures || []))
      if (filter.param === 'decoration') currentValues.push(...(taxonomyFilters.decorationMaterials || []))
      if (filter.param === 'partType') currentValues.push(...(taxonomyFilters.partType || []))
      if (filter.param === 'baseMaterial' && taxonomyFilters.baseMaterial) currentValues.push(taxonomyFilters.baseMaterial)
      if (filter.param === 'group' && taxonomyFilters.productGroup) currentValues.push(taxonomyFilters.productGroup)
      return expectedValues.every((value) => currentValues.includes(value))
    }
    if (tab.filters) return tab.filters.every(filterMatches)
    if (tab.values) return filterMatches(tab)
    if (tab.param && tab.value) return filterMatches(tab)
    return false
  }
  const activeProductTab = productTabs.find((tab) => !tab.clear && isProductTabActive(tab))?.key ?? 'all'

  const submitSearch = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setFilter('q', String(formData.get('q') ?? '').trim())
  }

  const applySearchSuggestion = (term) => {
    setFilter('q', term)
  }

  const activePrimaryLabel = activeProductTab === 'all' ? '' : productTabLabels[activeProductTab] || uiCopy.tabs[activeProductTab]
  const sortOptions = uiCopy.sortOptions ?? productListUiCopy.en.sortOptions
  const activeSortLabel = sortOptions.find((option) => option.value === sortMode)?.label ?? sortOptions[0].label
  const materialLabels = productMaterialDisplayLabels[contentLocale] ?? productMaterialDisplayLabels.kr
  const breadcrumbCopy = productCleanBreadcrumbCopy[contentLocale] ?? productCleanBreadcrumbCopy.kr
  const filterSearchCopy = productFilterSearchCopy[contentLocale] ?? productFilterSearchCopy.kr
  const priceCopy = productFilterPriceCopy[contentLocale] ?? productFilterPriceCopy.kr
  const visibleProductFilterGroups = [
    ...productFilterGroups,
    managedCategories.length > 0 && {
      key: 'managedCategories',
      label: copy.category,
      options: managedCategories.map((item) => ({
        label: managedCategoryLabels.get(item.id) ?? item.id,
        dimension: 'category',
        param: 'category',
        value: item.id,
        managed: true,
      })),
    },
    managedCollections.length > 0 && {
      key: 'managedCollections',
      label: copy.collection,
      options: managedCollections.map((item) => ({
        label: managedCollectionLabels.get(item.id) ?? item.id,
        dimension: 'collection',
        param: 'collection',
        value: item.id,
        managed: true,
      })),
    },
  ].filter(Boolean)
  const selectedFilterChips = [
    ...visibleProductFilterGroups.flatMap((group) => group.options
      .filter((option) => isFilterOptionActive(searchParams, option))
      .map((option) => getFilterOptionLabel(option, locale))),
    ...(pricePreset ? [priceCopy.under(pricePreset)] : []),
    ...(priceMin ? [priceCopy.min(priceMin)] : []),
    ...(priceMax ? [priceCopy.max(priceMax)] : []),
    ...(q ? [q] : []),
  ]
  const materialBreadcrumbLabel = taxonomyFilters.baseMaterial ? materialLabels[taxonomyFilters.baseMaterial] : ''
  const isStandaloneMaterialTitle = ['brass'].includes(taxonomyFilters.baseMaterial) || taxonomyFilters.productGroup === 'parts'
  const activeShapeLabel = activeShapeValue ? getShapeTabLabel(activeShapeValue, locale) : ''
  const collectionPageLabel = collection ? (managedCollectionLabels.get(collection) ?? getCollectionPageLabel(collection, locale)) : ''
  const isCollectionEntry = Boolean(collection)
  const breadcrumbItems = [
    { label: breadcrumbCopy.home, to: '/' },
    ...(isCollectionEntry
      ? [
        { label: collectionPageLabel },
      ]
      : isShapeEntry
      ? [
        ...(activeShapeLabel ? [{ label: activeShapeLabel, to: `/shape/${activeShapeValue}` }] : []),
        ...(activePrimaryLabel ? [{ label: activePrimaryLabel }] : []),
      ]
      : [
        ...(taxonomyFilters.productGroup === 'parts' ? [{ label: breadcrumbCopy.parts, to: '/products?group=parts' }] : []),
        ...(materialBreadcrumbLabel ? [{ label: materialBreadcrumbLabel, to: `/products?baseMaterial=${taxonomyFilters.baseMaterial}` }] : []),
        { label: breadcrumbCopy.piercing, to: '/products' },
        ...(activePrimaryLabel ? [{ label: activePrimaryLabel }] : []),
      ]),
  ]
  const pageTitle = isCollectionEntry
    ? collectionPageLabel
    : isShapeEntry
    ? (activeShapeLabel || breadcrumbCopy.piercing)
    : activePrimaryLabel || (taxonomyFilters.productGroup === 'parts'
      ? breadcrumbCopy.parts
      : materialBreadcrumbLabel
        ? (isStandaloneMaterialTitle ? materialBreadcrumbLabel : `${materialBreadcrumbLabel} ${breadcrumbCopy.piercing}`)
        : breadcrumbCopy.piercing)
  return <main className="content product-list-content">
    <div className={`product-page-head${isFilterOpen ? ' has-filter-open' : ''}`}>
      <div className="product-breadcrumb" aria-label="Breadcrumb">
        {breadcrumbItems.map((crumb, index) => <span className="product-breadcrumb-item" key={`${crumb.label}-${index}`}>
          {index > 0 && <span aria-hidden="true" className="product-breadcrumb-separator">&gt;</span>}
          {crumb.to ? <Link to={toLocalePath(crumb.to)}>{crumb.label}</Link> : <strong>{crumb.label}</strong>}
        </span>)}
      </div>

      <div className="page-title product-page-title">
        <div><h1>{pageTitle}</h1></div>
        <span>{copy.products(filtered.length)}</span>
      </div>

      <nav className="product-primary-tabs" aria-label={copy.category}>
        {productTabs.map((tab) => <button className={activeProductTab === tab.key ? 'active' : ''} key={tab.key} type="button" onClick={() => applyProductTab(tab)}>
          {productTabLabels[tab.key] || uiCopy.tabs[tab.key] || tab.key}
        </button>)}
      </nav>

      {showMaterialTabs ? <nav className="product-material-tabs" aria-label={copy.material}>
        {productMaterialTabs.map((tab) => <button className={activeMaterialTab === tab.key ? 'active' : ''} key={tab.key} type="button" onClick={() => applyMaterialTab(tab)}>
          {materialTabLabels[tab.key]}
        </button>)}
      </nav> : null}

      <div className={`product-filter-control${isFilterOpen ? ' is-open' : ''}`}>
        <button className="product-filter-trigger" type="button" aria-expanded={isFilterOpen} aria-controls="product-filter-panel" onClick={() => setIsFilterOpen((current) => !current)}>
          <span className="filter-toggle-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <b>{copy.filter}</b>
        </button>
        {isFilterOpen ? <section className="product-filter-popover" id="product-filter-panel" aria-label={copy.filter}>
          <div className="product-filter-header">
            <form className="product-filter-search product-filter-head-search" onSubmit={submitSearch}>
              <Search size={17} />
              <input key={q} name="q" defaultValue={q} placeholder={copy.searchPlaceholder} />
              <button type="submit">{copy.searchButton}</button>
            </form>
            <div className="product-filter-search-popover" aria-label={filterSearchCopy.recommended}>
              <section>
                <div className="product-filter-search-title-row">
                  <h2>{filterSearchCopy.recent}</h2>
                  <button type="button">{filterSearchCopy.clear}</button>
                </div>
                <p>{filterSearchCopy.empty}</p>
              </section>
              <section>
                <h2>{filterSearchCopy.recommended}</h2>
                <div className="product-filter-recommended-searches">
                  {filterSearchCopy.recommendedTerms.map((term) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySearchSuggestion(term)}>{term}</button>)}
                </div>
              </section>
              <section>
                <h2>{filterSearchCopy.popular}</h2>
                <div className="product-filter-popular-searches">
                  {filterSearchCopy.popularTerms.map((term, index) => <button key={term} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySearchSuggestion(term)}>
                    <b>{index + 1}</b>
                    <span>{index % 3 === 1 ? '▲' : index % 3 === 2 ? '▼' : '-'}</span>
                    {term}
                  </button>)}
                </div>
              </section>
            </div>
          </div>

          {visibleProductFilterGroups.map((group) => {
            const hasActiveOption = group.options.some((option) => isFilterOptionActive(searchParams, option))
            return <div className="product-filter-row" key={group.key}>
              <span>{getFilterGroupLabel(group, locale)}</span>
              <div>
                <button className={!hasActiveOption ? 'active' : ''} type="button" onClick={() => clearProductFilterGroup(group)}>{copy.all}</button>
                {group.options.map((option) => {
                  const active = isFilterOptionActive(searchParams, option)
                  return <button className={active ? 'active' : ''} key={`${option.param}-${option.value}`} type="button" onClick={() => toggleProductFilterOption(option)}>
                    {getFilterOptionLabel(option, locale)}
                  </button>
                })}
              </div>
            </div>
          })}

          <div className="product-filter-row product-filter-price-row">
            <span>{productFilterGroupLabelCopy[contentLocale]?.price ?? productFilterGroupLabelCopy.kr.price}</span>
            <div>
              <button className={!pricePreset && !priceMin && !priceMax ? 'active' : ''} type="button" onClick={clearPriceFilters}>{copy.all}</button>
              <button className={pricePreset === '2500' ? 'active' : ''} type="button" onClick={() => setPricePreset(2500)}>{priceCopy.under(2500)}</button>
              <button className={pricePreset === '5000' ? 'active' : ''} type="button" onClick={() => setPricePreset(5000)}>{priceCopy.under(5000)}</button>
              <button className={pricePreset === '10000' ? 'active' : ''} type="button" onClick={() => setPricePreset(10000)}>{priceCopy.under(10000)}</button>
              <form className="product-filter-price-range" onSubmit={submitPriceRange}>
                <input aria-label={priceCopy.minPlaceholder} defaultValue={priceMin} inputMode="numeric" name="priceMin" placeholder={priceCopy.minPlaceholder} />
                <span>~</span>
                <input aria-label={priceCopy.maxPlaceholder} defaultValue={priceMax} inputMode="numeric" name="priceMaxCustom" placeholder={priceCopy.maxPlaceholder} />
                <button type="submit">{priceCopy.apply}</button>
              </form>
            </div>
          </div>
          <div className="product-filter-footer">
            <div className="product-filter-selected" aria-live="polite">
              <b>{copy.selectedFilters}</b>
              {selectedFilterChips.length > 0
                ? <div>
                  {selectedFilterChips.map((label) => <span key={label}>{label}</span>)}
                </div>
                : <p>{copy.noSelectedFilters}</p>}
            </div>
            <Link className="product-filter-reset" to={toLocalePath('/products')}><X size={15} />{copy.clearFilters}</Link>
          </div>
        </section> : null}
      </div>
    </div>

    <div className="product-tools">
      <div className="product-sort-select">
        <span className="product-sort-label">{uiCopy.sort}</span>
        <div className={`product-sort-dropdown${isSortOpen ? ' is-open' : ''}`}>
          <button className="product-sort-button" type="button" aria-haspopup="listbox" aria-expanded={isSortOpen} onClick={() => setIsSortOpen((current) => !current)}>
            {activeSortLabel}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {isSortOpen ? <div className="product-sort-menu" role="listbox" aria-label={uiCopy.sort}>
            {sortOptions.map((option) => <button className={sortMode === option.value ? 'active' : ''} key={option.value} type="button" role="option" aria-selected={sortMode === option.value} onClick={() => {
              setSortMode(option.value)
              setIsSortOpen(false)
            }}>
              {option.label}
            </button>)}
          </div> : null}
        </div>
        <b className="product-total-count">{uiCopy.total(filtered.length)}</b>
      </div>
    </div>

    {sortedProducts.length > 0
      ? <div className="catalog-grid product-results">{sortedProducts.map((product) => <CatalogCard key={product.productId} product={product} />)}</div>
      : <section className="empty product-empty"><h2>{copy.emptyTitle}</h2><p>{copy.emptyBody}</p><small>{copy.emptySmall}</small><Link className="secondary-action" to={toLocalePath('/products')}>{copy.clearFilters}</Link></section>}
  </main>
}
