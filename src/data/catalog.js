const timestamp = '2026-06-01T00:00:00.000Z'

const imageUrls = [
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1722410180651-efd51636f260?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1671644730555-916aa8d8157f?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1653227907864-560dce4c252d?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1603974372039-adc49044b6bd?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1512163143273-bde0e3cc7407?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1200&h=1500&q=88',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&h=1500&q=88',
]

const imageSet = (index) => {
  const card = imageUrls[index % imageUrls.length]
  return { thumb: card, card, detail: card, zoom: card }
}

export const mockUsers = {
  guest: {
    uid: '',
    email: '',
    companyName: '',
    contactName: 'Guest',
    country: '',
    preferredLanguage: 'kr',
    role: null,
    status: null,
    assignedMarket: '',
    currency: 'KRW',
    discountRate: 0,
  },
  pending: {
    uid: 'mock-pending-buyer',
    email: 'pending@example.jp',
    companyName: 'Osaka Piercing Studio',
    contactName: 'Sato Mio',
    country: 'JP',
    preferredLanguage: 'jp',
    role: 'buyer',
    status: 'pending',
    assignedMarket: 'JP',
    currency: 'JPY',
    discountRate: 0,
  },
  approved: {
    uid: 'mock-approved-buyer',
    email: 'buyer@example.jp',
    companyName: 'Tokyo Piercing Lab',
    contactName: 'Yamada Haruka',
    country: 'JP',
    preferredLanguage: 'jp',
    role: 'buyer',
    status: 'approved',
    assignedMarket: 'JP',
    currency: 'JPY',
    discountRate: 12,
  },
  admin: {
    uid: 'mock-admin',
    email: 'admin@noblesse.example',
    companyName: 'Noblesse Piercing',
    contactName: 'Noblesse Admin',
    country: 'KR',
    preferredLanguage: 'kr',
    role: 'admin',
    status: 'approved',
    assignedMarket: 'KR',
    currency: 'KRW',
    discountRate: 0,
  },
}

const productSeeds = [
  ['Silver Daily Piercing', '실버 데일리 피어싱', 'シルバーデイリーピアス', '银色日常冲孔饰品', 'piercing', 'Surgical Steel', ['Silver'], ['6mm', '8mm'], 20, 'silver', ['new-arrivals', 'steady-line']],
  ['Ring Piercing Line', '링 피어싱 라인', 'リングピアスライン', '环形冲孔饰品系列', 'belly-ring', 'Brass', ['Gold'], ['8mm'], 16, 'gold', ['weekly-best', 'export-best-items']],
  ['Tita Labret Line', '티타늄 라브렛 라인', 'チタンラブレットライン', '钛钢唇钉系列', 'labret', 'Titanium', ['Gold'], ['6mm'], 20, 'warm', ['new-arrivals', 'japan-buyer-picks']],
  ['Premium Cubic Piercing', '프리미엄 큐빅 피어싱', 'プレミアムキュービックピアス', '高级锆石冲孔饰品', 'cubic', 'Cubic', ['Clear', 'Pink'], ['6mm'], 12, 'cubic', ['weekly-best', 'premium-cubic-line']],
  ['Pearl Cubic Tiny Styles', '펄 큐빅 타이니 스타일', 'パールキュービックタイニースタイル', '珍珠锆石小巧款', 'pearl', 'Pearl', ['Rose Gold'], ['4mm', '5mm'], 12, 'pearl', ['buyer-selection', 'minimal-piercing-line']],
  ['Black Cross Chain Drop', '블랙 크로스 체인 드롭', 'ブラッククロスチェーンドロップ', '黑色十字链条垂坠款', 'earrings', 'Surgical Steel', ['Black', 'Silver'], ['20mm'], 16, 'black', ['new-arrivals', 'weekly-best']],
  ['Crystal Cubic Barbell', '크리스털 큐빅 바벨', 'クリスタルキュービックバーベル', '水晶锆石杠铃', 'barbell', 'Cubic', ['Clear', 'Pink'], ['6mm'], 16, 'cubic', ['premium-cubic-line', 'buyer-selection']],
  ['Surgical Steel Belly Ring', '써지컬 스틸 벨리 링', 'サージカルステンレスベリーリング', '医用钢脐环', 'belly-ring', 'Surgical Steel', ['Silver'], ['10mm'], 20, 'steel', ['steady-line', 'export-best-items']],
  ['Pearl Flower Piercing', '펄 플라워 피어싱', 'パールフラワーピアス', '珍珠花朵冲孔饰品', 'pearl', 'Pearl', ['Ivory'], ['5mm'], 12, 'pearl', ['weekly-best', 'buyer-selection']],
  ['Cubic Moon Labret', '큐빅 문 라브렛', 'キュービックムーンラブレット', '锆石月亮唇钉', 'labret', 'Cubic', ['Silver'], ['6mm'], 16, 'cubic', ['premium-cubic-line']],
  ['Steady Basic Barbell', '스테디 베이직 바벨', '定番ベーシックバーベル', '经典基础杠铃', 'barbell', 'Surgical Steel', ['Silver'], ['6mm', '8mm'], 20, 'silver', ['steady-line']],
  ['Ribbon Piercing Set', '리본 피어싱 세트', 'リボンピアスセット', '蝴蝶结冲孔饰品套装', 'piercing', 'Surgical Steel', ['Silver'], ['6mm'], 16, 'pink', ['new-arrivals']],
]

export const mockProducts = productSeeds.map(([
  nameEn,
  nameKo,
  nameJa,
  nameZh,
  categoryId,
  material,
  colors,
  sizes,
  moqDefault,
  tone,
  collectionIds,
], index) => ({
  productId: `NB-${String(index + 1).padStart(3, '0')}`,
  code: `NB-${String(index + 1).padStart(3, '0')}`,
  categoryId,
  collectionIds,
  nameKo,
  nameEn,
  nameJa,
  nameZh,
  material,
  colors,
  sizes,
  moqDefault,
  leadTime: '7-14 days',
  origin: 'KR',
  imageSet: imageSet(index),
  imageAlt: {
    ko: `${nameKo} 상품 이미지`,
    en: `${nameEn} product image`,
    ja: `${nameJa} 商品画像`,
    zh: `${nameZh} 商品图片`,
  },
  isVisible: true,
  isExportAvailable: true,
  isNew: index < 8,
  isBest: [3, 5, 8, 10].includes(index),
  badge: index === 7 ? 'B2B' : index === 8 ? 'BEST' : 'NEW',
  sortOrder: (index + 1) * 10,
  descriptionKo: `${nameKo} 디자인의 국내·해외 B2B 카탈로그용 피어싱입니다.`,
  descriptionEn: `${nameEn} for domestic and international B2B catalog inquiries.`,
  descriptionJa: `${nameJa} は国内・海外B2Bカタログ向けの商品です。`,
  descriptionZh: `${nameZh} 适用于国内及海外B2B目录咨询。`,
  tone,
  createdAt: timestamp,
  updatedAt: timestamp,
}))

const markets = [
  { market: 'KR', currency: 'KRW', multiplier: 1, minOrderAmount: 300000 },
  { market: 'JP', currency: 'JPY', multiplier: 0.11, minOrderAmount: 30000 },
  { market: 'US', currency: 'USD', multiplier: 0.00072, minOrderAmount: 250 },
  { market: 'CN', currency: 'CNY', multiplier: 0.0052, minOrderAmount: 1800 },
  { market: 'GLOBAL', currency: 'USD', multiplier: 0.00072, minOrderAmount: 300 },
]

export const mockProductPrices = mockProducts.flatMap((product, index) => {
  const basePriceKrw = 9680 + index * 1450
  return markets.map(({ market, currency, multiplier, minOrderAmount }) => ({
    productId: product.productId,
    market,
    currency,
    wholesalePrice: currency === 'KRW' ? basePriceKrw : Number((basePriceKrw * multiplier).toFixed(currency === 'JPY' ? 0 : 2)),
    retailPrice: currency === 'KRW' ? basePriceKrw * 3 : Number((basePriceKrw * multiplier * 3).toFixed(currency === 'JPY' ? 0 : 2)),
    moq: product.moqDefault,
    minOrderAmount,
    visibleTo: 'approved_only',
    isActive: true,
    updatedAt: timestamp,
  }))
})

export const mockCategories = [
  ['piercing', '피어싱', 'Piercing', 'ピアス', '冲孔饰品'],
  ['earrings', '이어링', 'Earrings', 'イヤリング', '耳饰'],
  ['barbell', '바벨', 'Barbells', 'バーベル', '杠铃'],
  ['labret', '라브렛', 'Labrets', 'ラブレット', '唇钉'],
  ['belly-ring', '링 피어싱', 'Belly Rings', 'ベリーリング', '脐环'],
  ['cubic', '큐빅', 'Cubic', 'キュービック', '锆石'],
  ['pearl', '펄', 'Pearl', 'パール', '珍珠'],
  ['surgical-steel', '써지컬 스틸', 'Surgical Steel', 'サージカルステンレス', '医用钢'],
].map(([categoryId, nameKo, nameEn, nameJa, nameZh], index) => ({
  categoryId,
  nameKo,
  nameEn,
  nameJa,
  nameZh,
  slug: categoryId,
  coverUrl: imageSet(index).card,
  isVisible: true,
  sortOrder: (index + 1) * 10,
  createdAt: timestamp,
  updatedAt: timestamp,
}))

export const mockCollections = [
  ['new-arrivals', '신상품', 'New Arrivals', '新商品', '新品'],
  ['weekly-best', '주간 추천', 'Weekly Best', '週間おすすめ', '每周推荐'],
  ['buyer-selection', '바이어 셀렉션', 'Buyer Selection', 'バイヤーセレクション', '买手精选'],
  ['premium-cubic-line', '프리미엄 큐빅 라인', 'Premium Cubic Line', 'プレミアムキュービックライン', '高级锆石系列'],
  ['steady-line', '스테디 라인', 'Steady Line', '定番ライン', '经典系列'],
  ['export-best-items', '수출 베스트 아이템', 'Export Best Items', '輸出ベストアイテム', '出口热销款'],
  ['japan-buyer-picks', '일본 바이어 셀렉션', 'Japan Buyer Picks', '日本バイヤー向け', '日本买手精选'],
  ['minimal-piercing-line', '미니멀 피어싱 라인', 'Minimal Piercing Line', 'ミニマルピアスライン', '极简冲孔饰品系列'],
].map(([collectionId, titleKo, titleEn, titleJa, titleZh], index) => ({
  collectionId,
  titleKo,
  titleEn,
  titleJa,
  titleZh,
  slug: collectionId,
  coverUrl: imageSet(index).card,
  productIds: mockProducts.filter((product) => product.collectionIds.includes(collectionId)).map((product) => product.productId),
  isVisible: true,
  sortOrder: (index + 1) * 10,
  createdAt: timestamp,
  updatedAt: timestamp,
}))

export const mockInquiries = []

export const mockBanners = []

export const mockCatalogFiles = []
