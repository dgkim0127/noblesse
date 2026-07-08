import { getLocaleContentKey } from '../utils/locale.js'

export const taxonomyLocales = ['kr', 'en', 'jp', 'cn']

const getTaxonomyLocale = (locale) => getLocaleContentKey(locale)

export const taxonomyLabels = {
  kr: {
    home: '홈',
    title: '피어싱',
    products: (count) => `${count}개 상품`,
    all: '전체',
    reset: '초기화',
    apply: '상품검색',
    filter: 'FILTER',
    search: '검색어',
    activeFilters: '적용 필터',
    productGroup: '제품별',
    piercingType: '형태',
    baseMaterial: '소재',
    allSurgical: '올써지컬',
    decorationMaterials: '장식 소재',
    structures: '구조',
    styles: '스타일',
    shapes: '모양',
    saleType: '판매 방식',
    collection: '컬렉션',
    status: '상태',
    category: '카테고리',
    material: '소재',
    color: '색상',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '필터를 초기화하거나 다른 조건을 선택해보세요.',
    emptySmall: '선택한 분류 조건에 해당하는 상품이 없습니다.',
    groupMenu: '제품별',
    materialMenu: '소재별',
    styleMenu: '장식·스타일별',
    shapeMenu: '모양별',
  },
  en: {
    home: 'Home',
    title: 'Piercing',
    products: (count) => `${count} products`,
    all: 'All',
    reset: 'Reset',
    apply: 'Search products',
    filter: 'FILTER',
    search: 'Search',
    activeFilters: 'Active filters',
    productGroup: 'Products',
    piercingType: 'Type',
    baseMaterial: 'Material',
    allSurgical: 'All Surgical',
    decorationMaterials: 'Decoration',
    structures: 'Structure',
    styles: 'Style',
    shapes: 'Shape',
    saleType: 'Sale type',
    collection: 'Collection',
    status: 'Status',
    category: 'Category',
    material: 'Material',
    color: 'Color',
    emptyTitle: 'No products match this filter.',
    emptyBody: 'Reset filters or choose another condition.',
    emptySmall: 'No products found for this taxonomy selection.',
    groupMenu: 'Product',
    materialMenu: 'Material',
    styleMenu: 'Decoration & Style',
    shapeMenu: 'Shape',
  },
  jp: {
    home: 'ホーム',
    title: 'ピアス',
    products: (count) => `${count}点`,
    all: 'すべて',
    reset: 'リセット',
    apply: '商品検索',
    filter: 'FILTER',
    search: '検索語',
    activeFilters: '適用中の条件',
    productGroup: '商品別',
    piercingType: 'タイプ',
    baseMaterial: '素材',
    allSurgical: 'オールサージカル',
    decorationMaterials: '装飾素材',
    structures: '構造',
    styles: 'スタイル',
    shapes: '形',
    saleType: '販売方式',
    collection: 'コレクション',
    status: '状態',
    category: 'カテゴリー',
    material: '素材',
    color: 'カラー',
    emptyTitle: '条件に合う商品がありません。',
    emptyBody: '条件をリセットするか、別の条件を選んでください。',
    emptySmall: '選択した分類条件の商品はありません。',
    groupMenu: '商品別',
    materialMenu: '素材別',
    styleMenu: '装飾・スタイル別',
    shapeMenu: '形別',
  },
  cn: {
    home: '首頁',
    title: '穿孔',
    products: (count) => `${count}件商品`,
    all: '全部',
    reset: '重置',
    apply: '搜尋商品',
    filter: 'FILTER',
    search: '搜尋詞',
    activeFilters: '已選篩選',
    productGroup: '按產品',
    piercingType: '類型',
    baseMaterial: '材質',
    allSurgical: '全医用鋼',
    decorationMaterials: '裝飾材質',
    structures: '結構',
    styles: '風格',
    shapes: '造型',
    saleType: '銷售方式',
    collection: '系列',
    status: '状態',
    category: '分類',
    material: '材質',
    color: '顏色',
    emptyTitle: '没有符合條件的商品。',
    emptyBody: '請重置篩選或選擇其他條件。',
    emptySmall: '没有找到符合该分類條件的商品。',
    groupMenu: '按產品',
    materialMenu: '按材質',
    styleMenu: '按裝飾與風格',
    shapeMenu: '按造型',
  },
}

export const taxonomyValueLabels = {
  productGroup: {
    piercing: { kr: '피어싱', en: 'Piercing', jp: 'ピアス', cn: '穿孔' },
    parts: { kr: '부자재', en: 'Parts', jp: 'パーツ', cn: '配件' },
  },
  piercingType: {
    ball: { kr: '볼 피어싱', en: 'Ball Piercing', jp: 'ボールピアス', cn: '球形穿孔' },
    ring: { kr: '링 피어싱', en: 'Ring Piercing', jp: 'リングピアス', cn: '環形穿孔' },
  },
  baseMaterial: {
    silver925: { kr: '실버925', en: 'Silver 925', jp: 'シルバー925', cn: '925銀' },
    surgical: { kr: '써지컬 스틸', en: 'Surgical Steel', jp: 'サージカルステンレス', cn: '医用鋼' },
    brass: { kr: '써지컬 바', en: 'Surgical Bar', jp: 'サージカルバー', cn: '医用鋼桿' },
    titanium: { kr: '티타늄', en: 'Titanium', jp: 'チタン', cn: '鈦' },
    acrylic: { kr: '아크릴', en: 'Acrylic', jp: 'アクリル', cn: '亞克力' },
    other: { kr: '기타', en: 'Other', jp: 'その他', cn: '其他' },
  },
  allSurgical: {
    true: { kr: '올써지컬', en: 'All Surgical', jp: 'オールサージカル', cn: '全医用鋼' },
  },
  decorationMaterials: {
    pearl: { kr: '진주', en: 'Pearl', jp: 'パール', cn: '珍珠' },
    mother_of_pearl: { kr: '자개', en: 'Mother of Pearl', jp: 'シェル', cn: '贝母' },
    cubic: { kr: '큐빅', en: 'Cubic', jp: 'キュービック', cn: '鋯石' },
    synthetic_gem: { kr: '합성 원석', en: 'Synthetic Gem', jp: '合成石', cn: '合成宝石' },
    stone: { kr: '스톤', en: 'Stone', jp: 'ストーン', cn: '石' },
    mirrorball: { kr: '미러볼', en: 'Mirror Ball', jp: 'ミラーボール', cn: '鏡面球' },
    swarovski_half_pearl: { kr: '스와 반구 진주', en: 'Swarovski Half Pearl', jp: '半球パール', cn: '半圆珍珠' },
    acrylic_applique: { kr: '아크릴 붙임', en: 'Acrylic Applique', jp: 'アクリル装飾', cn: '亞克力贴飾' },
  },
  partType: {
    transparent_piercing: { kr: '투명 피어싱', en: 'Clear Piercing', jp: '透明ピアス', cn: '透明穿孔' },
    other_parts: { kr: '기타 부자재', en: 'Other Parts', jp: 'その他パーツ', cn: '其他配件' },
  },
  structures: {
    barbell: { kr: '바벨', en: 'Barbell', jp: 'バーベル', cn: '直桿' },
    internal: { kr: '인터널', en: 'Internal', jp: 'インターナル', cn: '內螺紋' },
    basic_barbell: { kr: '기본 바벨', en: 'Basic Barbell', jp: '基本バーベル', cn: '基础直桿' },
    two_ball_ring: { kr: '볼과 링', en: 'Two Ball Ring', jp: 'ボールリング', cn: '雙球環' },
    straight_bar: { kr: '일자 바', en: 'Straight Bar', jp: 'ストレートバー', cn: '直桿配件' },
    banana_bar: { kr: '바나나 바', en: 'Banana Bar', jp: 'バナナバー', cn: '弯桿' },
    d_bar: { kr: 'D자 바', en: 'D Bar', jp: 'Dバー', cn: 'D形桿' },
    internal_bar: { kr: '인터널 바', en: 'Internal Bar', jp: 'インターナルバー', cn: '內螺紋桿' },
    internal_head: { kr: '인터널 헤드', en: 'Internal Head', jp: 'インターナルヘッド', cn: '內螺紋頭' },
    ball_part: { kr: '볼', en: 'Ball Part', jp: 'ボール', cn: '球配件' },
  },
  styles: {
    plain: { kr: '민자', en: 'Plain', jp: 'プレーン', cn: '素面' },
    epoxy: { kr: '에폭시', en: 'Epoxy', jp: 'エポキシ', cn: '滴胶' },
    coated: { kr: '코팅', en: 'Coated', jp: 'コーティング', cn: '镀层' },
    laser_cut: { kr: '레이저 커팅', en: 'Laser Cut', jp: 'レーザーカット', cn: '激光切割' },
    cubic_setting: { kr: '큐빅 물림', en: 'Cubic Setting', jp: 'キュービック留め', cn: '鋯石镶嵌' },
    drop: { kr: '드롭', en: 'Drop', jp: 'ドロップ', cn: '垂墜' },
    antique: { kr: '엔틱', en: 'Antique', jp: 'アンティーク', cn: '複古' },
    double_pearl: { kr: '양쪽 진주', en: 'Double Pearl', jp: '両側パール', cn: '雙珍珠' },
    single_pearl: { kr: '한쪽 진주', en: 'Single Pearl', jp: '片側パール', cn: '單珍珠' },
    heart_pearl: { kr: '하트 진주', en: 'Heart Pearl', jp: 'ハートパール', cn: '愛心珍珠' },
  },
  shapes: {
    spark: { kr: '스파크', en: 'Spark', jp: 'スパーク', cn: '闪光' },
    flower: { kr: '꽃', en: 'Flower', jp: '花', cn: '花' },
    butterfly: { kr: '나비', en: 'Butterfly', jp: '蝶', cn: '蝴蝶' },
    heart: { kr: '하트', en: 'Heart', jp: 'ハート', cn: '愛心' },
    star: { kr: '별', en: 'Star', jp: '星', cn: '星星' },
    moon: { kr: '달', en: 'Moon', jp: '月', cn: '月亮' },
    ribbon: { kr: '리본', en: 'Ribbon', jp: 'リボン', cn: '蝴蝶結' },
    sphere: { kr: '구', en: 'Sphere', jp: '球', cn: '球形' },
    square: { kr: '사각', en: 'Square', jp: '四角', cn: '方形' },
  },
  saleType: {
    single: { kr: '낱개 판매', en: 'Single', jp: '単品', cn: '單件' },
    bundle: { kr: '묶음 판매', en: 'Bundle', jp: 'セット', cn: '組合' },
  },
  status: {
    new: { kr: '신상품', en: 'New', jp: '新商品', cn: '新品' },
    best: { kr: '베스트', en: 'Best', jp: 'ベスト', cn: '熱銷' },
  },
}

const cleanTaxonomyLabels = {
  kr: {
    home: '홈',
    title: '피어싱',
    products: (count) => `${count}개 상품`,
    all: '전체',
    reset: '초기화',
    apply: '상품 검색',
    filter: 'FILTER',
    search: '검색어',
    activeFilters: '적용 필터',
    productGroup: '상품군',
    piercingType: '형태',
    baseMaterial: '기본 소재',
    allSurgical: '전체 서지컬',
    decorationMaterials: '장식 소재',
    structures: '구조',
    styles: '스타일',
    shapes: '모양',
    saleType: '판매 방식',
    collection: '컬렉션',
    status: '상태',
    category: '카테고리',
    material: '소재',
    color: '색상',
    emptyTitle: '조건에 맞는 상품이 없습니다.',
    emptyBody: '필터를 초기화하거나 다른 조건을 선택해보세요.',
    emptySmall: '선택한 분류 조건에 해당하는 상품이 없습니다.',
    groupMenu: '상품군',
    materialMenu: '소재별',
    styleMenu: '장식·스타일',
    shapeMenu: '모양별',
  },
  jp: {
    home: 'ホーム',
    title: 'ピアス',
    products: (count) => `${count}点の商品`,
    all: 'すべて',
    reset: 'リセット',
    apply: '商品を検索',
    filter: 'FILTER',
    search: '検索語',
    activeFilters: '適用中のフィルター',
    productGroup: '商品群',
    piercingType: 'タイプ',
    baseMaterial: '基本素材',
    allSurgical: 'オールサージカル',
    decorationMaterials: '装飾素材',
    structures: '構造',
    styles: 'スタイル',
    shapes: 'モチーフ',
    saleType: '販売方式',
    collection: 'コレクション',
    status: 'ステータス',
    category: 'カテゴリー',
    material: '素材',
    color: 'カラー',
    emptyTitle: '条件に合う商品がありません。',
    emptyBody: 'フィルターをリセットするか、別の条件を選択してください。',
    emptySmall: '選択した分類条件に該当する商品がありません。',
    groupMenu: '商品群',
    materialMenu: '素材別',
    styleMenu: '装飾・スタイル',
    shapeMenu: 'モチーフ別',
  },
  cn: {
    home: '首頁',
    title: '耳飾',
    products: (count) => `${count}件商品`,
    all: '全部',
    reset: '重設',
    apply: '搜尋商品',
    filter: 'FILTER',
    search: '搜尋字詞',
    activeFilters: '已套用篩選',
    productGroup: '商品群',
    piercingType: '類型',
    baseMaterial: '基本材質',
    allSurgical: '全醫療鋼',
    decorationMaterials: '裝飾材質',
    structures: '結構',
    styles: '風格',
    shapes: '造型',
    saleType: '販售方式',
    collection: '系列',
    status: '狀態',
    category: '分類',
    material: '材質',
    color: '顏色',
    emptyTitle: '沒有符合條件的商品。',
    emptyBody: '請重設篩選條件或選擇其他條件。',
    emptySmall: '所選分類條件目前沒有商品。',
    groupMenu: '商品群',
    materialMenu: '材質別',
    styleMenu: '裝飾與風格',
    shapeMenu: '造型別',
  },
}

const cleanTaxonomyValueLabels = {
  productGroup: {
    piercing: { kr: '피어싱', en: 'Piercing', jp: 'ピアス', cn: '耳飾' },
    parts: { kr: '부자재', en: 'Parts', jp: 'パーツ', cn: '配件' },
  },
  piercingType: {
    ball: { kr: '볼 피어싱', en: 'Ball Piercing', jp: 'ボールピアス', cn: '球型耳飾' },
    ring: { kr: '링 피어싱', en: 'Ring Piercing', jp: 'リングピアス', cn: '環型耳飾' },
  },
  baseMaterial: {
    silver925: { kr: '실버925', en: 'Silver 925', jp: 'シルバー925', cn: '925銀' },
    surgical: { kr: '서지컬 스틸', en: 'Surgical Steel', jp: 'サージカルステンレス', cn: '醫療鋼' },
    brass: { kr: '신주/브라스', en: 'Brass', jp: '真鍮', cn: '黃銅' },
    titanium: { kr: '티타늄', en: 'Titanium', jp: 'チタン', cn: '鈦金屬' },
    acrylic: { kr: '아크릴', en: 'Acrylic', jp: 'アクリル', cn: '壓克力' },
    other: { kr: '기타', en: 'Other', jp: 'その他', cn: '其他' },
  },
  allSurgical: {
    true: { kr: '전체 서지컬', en: 'All Surgical', jp: 'オールサージカル', cn: '全醫療鋼' },
  },
  decorationMaterials: {
    pearl: { kr: '진주', en: 'Pearl', jp: 'パール', cn: '珍珠' },
    mother_of_pearl: { kr: '자개', en: 'Mother of Pearl', jp: 'シェル', cn: '貝母' },
    cubic: { kr: '큐빅', en: 'Cubic', jp: 'キュービック', cn: '鋯石' },
    synthetic_gem: { kr: '합성석', en: 'Synthetic Gem', jp: '人工石', cn: '合成寶石' },
    stone: { kr: '스톤', en: 'Stone', jp: 'ストーン', cn: '石材' },
    mirrorball: { kr: '미러볼', en: 'Mirror Ball', jp: 'ミラーボール', cn: '鏡面球' },
    swarovski_half_pearl: { kr: '스와로브스키 반구 진주', en: 'Swarovski Half Pearl', jp: 'スワロフスキー半丸パール', cn: '施華洛世奇半珠' },
    acrylic_applique: { kr: '아크릴 장식', en: 'Acrylic Applique', jp: 'アクリル装飾', cn: '壓克力裝飾' },
  },
  partType: {
    transparent_piercing: { kr: '투명 피어싱', en: 'Clear Piercing', jp: '透明ピアス', cn: '透明耳飾' },
    other_parts: { kr: '기타 부자재', en: 'Other Parts', jp: 'その他パーツ', cn: '其他配件' },
  },
  structures: {
    barbell: { kr: '바벨', en: 'Barbell', jp: 'バーベル', cn: '槓鈴' },
    internal: { kr: '인터널', en: 'Internal', jp: 'インターナル', cn: '內螺紋' },
    basic_barbell: { kr: '기본 바벨', en: 'Basic Barbell', jp: 'ベーシックバーベル', cn: '基本槓鈴' },
    two_ball_ring: { kr: '투볼 링', en: 'Two Ball Ring', jp: 'ツーボールリング', cn: '雙球環' },
    straight_bar: { kr: '일자 바', en: 'Straight Bar', jp: 'ストレートバー', cn: '直桿' },
    banana_bar: { kr: '바나나 바', en: 'Banana Bar', jp: 'バナナバー', cn: '香蕉桿' },
    d_bar: { kr: 'D형 바', en: 'D Bar', jp: 'Dバー', cn: 'D型桿' },
    internal_bar: { kr: '인터널 바', en: 'Internal Bar', jp: 'インターナルバー', cn: '內螺紋桿' },
    internal_head: { kr: '인터널 헤드', en: 'Internal Head', jp: 'インターナルヘッド', cn: '內螺紋頭' },
    ball_part: { kr: '볼 파츠', en: 'Ball Part', jp: 'ボールパーツ', cn: '球形配件' },
  },
  styles: {
    plain: { kr: '민자', en: 'Plain', jp: 'プレーン', cn: '素面' },
    epoxy: { kr: '에폭시', en: 'Epoxy', jp: 'エポキシ', cn: '環氧' },
    coated: { kr: '코팅', en: 'Coated', jp: 'コーティング', cn: '鍍層' },
    laser_cut: { kr: '레이저 컷', en: 'Laser Cut', jp: 'レーザーカット', cn: '雷射切割' },
    cubic_setting: { kr: '큐빅 세팅', en: 'Cubic Setting', jp: 'キュービックセッティング', cn: '鋯石鑲嵌' },
    drop: { kr: '드롭', en: 'Drop', jp: 'ドロップ', cn: '垂墜' },
    antique: { kr: '앤틱', en: 'Antique', jp: 'アンティーク', cn: '復古' },
    double_pearl: { kr: '더블 진주', en: 'Double Pearl', jp: 'ダブルパール', cn: '雙珍珠' },
    single_pearl: { kr: '싱글 진주', en: 'Single Pearl', jp: 'シングルパール', cn: '單珍珠' },
    heart_pearl: { kr: '하트 진주', en: 'Heart Pearl', jp: 'ハートパール', cn: '愛心珍珠' },
  },
  shapes: {
    spark: { kr: '스파크', en: 'Spark', jp: 'スパーク', cn: '閃耀' },
    flower: { kr: '꽃', en: 'Flower', jp: '花', cn: '花朵' },
    butterfly: { kr: '나비', en: 'Butterfly', jp: '蝶', cn: '蝴蝶' },
    heart: { kr: '하트', en: 'Heart', jp: 'ハート', cn: '愛心' },
    star: { kr: '별', en: 'Star', jp: '星', cn: '星星' },
    moon: { kr: '달', en: 'Moon', jp: '月', cn: '月亮' },
    ribbon: { kr: '리본', en: 'Ribbon', jp: 'リボン', cn: '蝴蝶結' },
    sphere: { kr: '구형', en: 'Sphere', jp: '球体', cn: '球形' },
    square: { kr: '사각', en: 'Square', jp: '四角', cn: '方形' },
  },
  saleType: {
    single: { kr: '단품', en: 'Single', jp: '単品', cn: '單品' },
    bundle: { kr: '세트/묶음', en: 'Bundle', jp: 'セット', cn: '組合' },
  },
  status: {
    new: { kr: '신상품', en: 'New', jp: '新商品', cn: '新品' },
    best: { kr: '베스트', en: 'Best', jp: 'ベスト', cn: '精選' },
  },
}

for (const [locale, labels] of Object.entries(cleanTaxonomyLabels)) {
  Object.assign(taxonomyLabels[locale], labels)
}

for (const [dimension, values] of Object.entries(cleanTaxonomyValueLabels)) {
  taxonomyValueLabels[dimension] = { ...(taxonomyValueLabels[dimension] || {}), ...values }
}

export const taxonomyDimensions = [
  { key: 'productGroup', param: 'group', multi: false, values: ['piercing', 'parts'] },
  { key: 'piercingType', param: 'type', multi: false, values: ['ball', 'ring'] },
  { key: 'baseMaterial', param: 'baseMaterial', aliases: ['materialBase'], multi: false, values: ['silver925', 'surgical', 'brass', 'titanium', 'acrylic', 'other'] },
  { key: 'allSurgical', param: 'allSurgical', multi: false, values: ['true'] },
  { key: 'decorationMaterials', param: 'decoration', multi: true, values: ['pearl', 'mother_of_pearl', 'cubic', 'synthetic_gem', 'stone', 'mirrorball', 'swarovski_half_pearl', 'acrylic_applique'] },
  { key: 'partType', param: 'partType', multi: true, values: ['transparent_piercing', 'other_parts'] },
  { key: 'structures', param: 'structure', multi: true, values: ['barbell', 'internal', 'basic_barbell', 'two_ball_ring', 'straight_bar', 'banana_bar', 'd_bar', 'internal_bar', 'internal_head', 'ball_part'] },
  { key: 'styles', param: 'style', multi: true, values: ['plain', 'epoxy', 'coated', 'laser_cut', 'cubic_setting', 'drop', 'antique', 'double_pearl', 'single_pearl', 'heart_pearl'] },
  { key: 'shapes', param: 'shape', multi: true, values: ['spark', 'flower', 'butterfly', 'heart', 'star', 'moon', 'ribbon', 'sphere', 'square'] },
  { key: 'saleType', param: 'saleType', multi: false, values: ['single', 'bundle'] },
]

export const taxonomyMenus = [
  { key: 'groupMenu', dimensions: ['productGroup', 'piercingType'] },
  { key: 'materialMenu', dimensions: ['baseMaterial', 'allSurgical'] },
  { key: 'styleMenu', dimensions: ['structures', 'styles', 'decorationMaterials'] },
  { key: 'shapeMenu', dimensions: ['shapes'] },
]

const materialMap = {
  'Silver 925': 'silver925',
  'Surgical Steel': 'surgical',
  Brass: 'brass',
  Titanium: 'titanium',
  Acrylic: 'acrylic',
}

const mockTaxonomySeeds = [
  { baseMaterial: 'surgical', structures: ['barbell', 'basic_barbell'], styles: ['plain'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'titanium', structures: ['internal'], decorationMaterials: ['cubic', 'synthetic_gem'], styles: ['cubic_setting'], shapes: ['heart'], saleType: 'single' },
  { baseMaterial: 'other', piercingType: 'ring', structures: ['two_ball_ring'], styles: ['coated'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'surgical', decorationMaterials: ['stone'], structures: ['barbell'], styles: ['drop', 'antique'], shapes: ['ribbon', 'heart'], saleType: 'single' },
  { baseMaterial: 'titanium', structures: ['internal', 'internal_head'], styles: ['plain'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['pearl'], structures: ['barbell'], styles: ['single_pearl'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['cubic'], structures: ['barbell'], styles: ['cubic_setting'], shapes: ['spark'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['synthetic_gem'], structures: ['barbell'], styles: ['cubic_setting'], shapes: ['star'], saleType: 'single' },
  { baseMaterial: 'titanium', piercingType: 'ring', structures: ['two_ball_ring'], styles: ['plain'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'surgical', piercingType: 'ring', allSurgical: true, structures: ['two_ball_ring'], styles: ['laser_cut'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['pearl', 'mother_of_pearl'], structures: ['barbell'], styles: ['drop', 'double_pearl'], shapes: ['flower'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['cubic'], structures: ['internal'], styles: ['cubic_setting'], shapes: ['moon'], saleType: 'single' },
  { baseMaterial: 'other', structures: ['barbell', 'basic_barbell'], styles: ['plain'], shapes: ['sphere'], saleType: 'bundle' },
  { baseMaterial: 'titanium', structures: ['barbell'], styles: ['plain'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'surgical', allSurgical: true, structures: ['straight_bar', 'barbell'], styles: ['laser_cut'], shapes: ['square'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['pearl', 'acrylic_applique'], structures: ['barbell'], styles: ['heart_pearl'], shapes: ['flower'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['cubic', 'stone'], structures: ['barbell'], styles: ['drop', 'cubic_setting'], shapes: ['spark'], saleType: 'single' },
  { baseMaterial: 'other', decorationMaterials: ['synthetic_gem'], structures: ['barbell'], styles: ['cubic_setting'], shapes: ['flower'], saleType: 'single' },
  { baseMaterial: 'titanium', piercingType: 'ring', structures: ['two_ball_ring'], styles: ['plain'], shapes: ['sphere'], saleType: 'single' },
  { baseMaterial: 'surgical', allSurgical: true, structures: ['barbell'], styles: ['epoxy', 'coated'], shapes: ['spark'], saleType: 'single' },
]

export function getTaxonomyLabel(dimensionKey, value, locale = 'kr') {
  const contentLocale = getTaxonomyLocale(locale)
  return taxonomyValueLabels[dimensionKey]?.[value]?.[contentLocale] || taxonomyValueLabels[dimensionKey]?.[value]?.en || value
}

export function getDimensionLabel(dimensionKey, locale = 'kr') {
  const contentLocale = getTaxonomyLocale(locale)
  return taxonomyLabels[contentLocale]?.[dimensionKey] || taxonomyLabels.en[dimensionKey] || dimensionKey
}

export function createProductTaxonomy({ categoryId, material, collectionIds = [], index = 0 } = {}) {
  const seed = mockTaxonomySeeds[index] || {}
  const baseMaterial = seed.baseMaterial || materialMap[material] || 'other'
  const collectionStyles = collectionIds.includes('premium-cubic-line') ? ['cubic_setting'] : []
  const collectionDecorations = collectionIds.includes('premium-cubic-line') ? ['cubic'] : []
  const piercingType = seed.piercingType || (['belly-ring', 'nose-piercing'].includes(categoryId) ? 'ring' : 'ball')

  return {
    productGroup: seed.productGroup || 'piercing',
    piercingType,
    baseMaterial,
    allSurgical: Boolean(seed.allSurgical),
    decorationMaterials: [...new Set([...(seed.decorationMaterials || []), ...collectionDecorations])],
    structures: [...new Set(seed.structures || [])],
    styles: [...new Set([...(seed.styles || []), ...collectionStyles])],
    shapes: [...new Set(seed.shapes || [])],
    saleType: seed.saleType || 'single',
    needsManualReview: false,
  }
}

export function getProductTaxonomy(product) {
  return product.taxonomy || {
    productGroup: product.productGroup || 'piercing',
    piercingType: product.piercingType || 'ball',
    baseMaterial: product.baseMaterial || materialMap[product.material] || 'other',
    allSurgical: Boolean(product.allSurgical),
    decorationMaterials: product.decorationMaterials || [],
    structures: product.structures || [],
    styles: product.styles || [],
    shapes: product.shapes || [],
    saleType: product.saleType || 'single',
  }
}

function asArray(value) {
  if (value === undefined || value === null || value === '') return []
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean)
}

function taxonomyHasValue(product, dimension, value) {
  const taxonomy = getProductTaxonomy(product)
  if (dimension.key === 'allSurgical') return value === 'true' ? taxonomy.allSurgical : !taxonomy.allSurgical
  const productValue = taxonomy[dimension.key]
  return Array.isArray(productValue) ? productValue.includes(value) : productValue === value
}

export function productMatchesTaxonomy(product, filters = {}) {
  return taxonomyDimensions.every((dimension) => {
    const values = asArray(filters[dimension.key])
    if (!values.length) return true
    return values.some((value) => taxonomyHasValue(product, dimension, value))
  })
}

export function dedupeProducts(products) {
  const seen = new Set()
  return products.filter((product) => {
    const id = product.productId || product.id || product.code
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function countTaxonomyValue(products, filters, dimensionKey, value) {
  const next = { ...filters }
  const current = asArray(next[dimensionKey])
  next[dimensionKey] = current.includes(value) ? current : [...current, value]
  return dedupeProducts(products).filter((product) => product.isVisible && productMatchesTaxonomy(product, next)).length
}

export function getTaxonomyQueryParams(filters = {}) {
  const params = new URLSearchParams()
  taxonomyDimensions.forEach((dimension) => {
    asArray(filters[dimension.key]).forEach((value) => params.append(dimension.param, value))
  })
  return params
}

export function getFiltersFromSearchParams(searchParams, routeParams = {}) {
  const filters = {}
  taxonomyDimensions.forEach((dimension) => {
    const values = [
      ...searchParams.getAll(dimension.param),
      ...(dimension.aliases || []).flatMap((alias) => searchParams.getAll(alias)),
    ].filter((value) => dimension.values.includes(value))
    if (values.length) filters[dimension.key] = dimension.multi ? [...new Set(values)] : values[values.length - 1]
  })

  if (routeParams.piercingType && taxonomyValueLabels.piercingType[routeParams.piercingType]) {
    filters.piercingType = routeParams.piercingType
    filters.entryBasis = filters.entryBasis || 'piercingType'
  }
  if (routeParams.baseMaterial && taxonomyValueLabels.baseMaterial[routeParams.baseMaterial]) {
    filters.baseMaterial = routeParams.baseMaterial
    filters.entryBasis = 'baseMaterial'
  }
  if (routeParams.shape && taxonomyValueLabels.shapes[routeParams.shape]) {
    filters.shapes = [routeParams.shape, ...asArray(filters.shapes)].filter((value, index, array) => array.indexOf(value) === index)
    filters.entryBasis = 'shape'
  }

  return filters
}

export function getTaxonomyBreadcrumb(filters = {}, locale = 'kr') {
  const contentLocale = getTaxonomyLocale(locale)
  const copy = taxonomyLabels[contentLocale] || taxonomyLabels.kr
  const crumbs = [{ label: copy.home, to: '/' }]
  if (filters.entryBasis === 'shape' && asArray(filters.shapes)[0]) crumbs.push({ label: `${getTaxonomyLabel('shapes', asArray(filters.shapes)[0], contentLocale)} ${contentLocale === 'kr' ? '아이템' : copy.title}` })
  else if (filters.baseMaterial) crumbs.push({ label: `${getTaxonomyLabel('baseMaterial', filters.baseMaterial, locale)} ${copy.title}` })
  else if (asArray(filters.shapes)[0]) crumbs.push({ label: `${getTaxonomyLabel('shapes', asArray(filters.shapes)[0], contentLocale)} ${contentLocale === 'kr' ? '아이템' : copy.title}` })
  else crumbs.push({ label: copy.title })

  if (filters.productGroup === 'parts') crumbs.push({ label: getTaxonomyLabel('productGroup', 'parts', contentLocale) })
  if (filters.piercingType) crumbs.push({ label: getTaxonomyLabel('piercingType', filters.piercingType, contentLocale) })
  return crumbs
}

export function getTaxonomyTitle(filters = {}, locale = 'kr') {
  const contentLocale = getTaxonomyLocale(locale)
  const copy = taxonomyLabels[contentLocale] || taxonomyLabels.kr
  const parts = []
  if (filters.baseMaterial) parts.push(getTaxonomyLabel('baseMaterial', filters.baseMaterial, contentLocale))
  asArray(filters.shapes).slice(0, 2).forEach((value) => parts.push(getTaxonomyLabel('shapes', value, contentLocale)))
  if (filters.piercingType) parts.push(getTaxonomyLabel('piercingType', filters.piercingType, contentLocale))
  if (!parts.length) return copy.title
  return parts.join(' ')
}

export function getAppliedTaxonomyChips(filters = {}, locale = 'kr') {
  return taxonomyDimensions.flatMap((dimension) => asArray(filters[dimension.key]).map((value) => ({
    key: dimension.key,
    value,
    label: getDimensionLabel(dimension.key, locale),
    text: getTaxonomyLabel(dimension.key, value, locale),
  })))
}

export const homeTaxonomyLinks = {
  silver925: '/material/silver925',
  brassBarbell: '/material/brass?structure=barbell',
  dropAntique: '/products?style=drop&style=antique',
  allSurgical: '/products?allSurgical=true',
  pearlAcrylic: '/products?decoration=pearl&decoration=mother_of_pearl&baseMaterial=acrylic',
  mirrorballStone: '/products?decoration=mirrorball&decoration=stone',
  ring: '/piercing/ring',
  flower: '/shape/flower',
  butterfly: '/shape/butterfly',
  heart: '/shape/heart',
  star: '/shape/star',
  moon: '/shape/moon',
  ribbon: '/shape/ribbon',
  spark: '/shape/spark',
}
