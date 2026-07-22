const groupLabels = {
  color: { kr: '색상', en: 'Color', jp: 'カラー', 'zh-TW': '顏色' },
  length: { kr: '바 길이', en: 'Bar length', jp: 'バーの長さ', 'zh-TW': '耳針長度' },
  gauge: { kr: '바 두께 (게이지)', en: 'Bar thickness (gauge)', jp: 'バーの太さ（ゲージ）', 'zh-TW': '耳針粗細（規格）' },
}

const sampleProducts = [
  ['NB-DEMO-CLOVER-BARBELL', ['4방 클로버 바벨', 'Four-way Clover Barbell', '四方向クローバーバーベル', '四向四葉草直桿耳飾'], ['골드', 'Gold', 'ゴールド', '金色'], '6mm', '1.2mm / 16G', 3, 1800],
  ['NB-DEMO-OPAL-HEART-LABRET', ['오팔 하트 라블렛', 'Opal Heart Labret', 'オパールハートラブレット', '蛋白石愛心平底耳飾'], ['핑크 오팔', 'Pink Opal', 'ピンクオパール', '粉紅蛋白石'], '8mm', '1.2mm / 16G', 2, 2200],
  ['NB-DEMO-TINY-STAR-BARBELL', ['미니 스타 바벨', 'Tiny Star Barbell', 'ミニスターバーベル', '迷你星星直桿耳飾'], ['실버', 'Silver', 'シルバー', '銀色'], '4mm', '1.0mm / 18G', 4, 1500],
  ['NB-DEMO-FLAT-DISC-LABRET', ['티타늄 플랫 디스크 라블렛', 'Titanium Flat Disc Labret', 'チタンフラットディスクラブレット', '鈽金屬平面圓片耳飾'], ['실버', 'Silver', 'シルバー', '銀色'], '6mm', '1.2mm / 16G', 5, 2600],
  ['NB-DEMO-SEGMENT-RING', ['원터치 세그먼트 링', 'One-touch Segment Ring', 'ワンタッチセグメントリング', '快扣式圓環耳飾'], ['골드', 'Gold', 'ゴールド', '金色'], '10mm', '1.0mm / 18G', 2, 3200],
  ['NB-DEMO-PEARL-FLOWER', ['진주 플라워 피어싱', 'Pearl Flower Piercing', 'パールフラワーピアス', '珍珠花朵耳飾'], ['아이보리', 'Ivory', 'アイボリー', '象牙白'], '6mm', '0.8mm / 20G', 6, 2400, 4, 'partial'],
  ['NB-DEMO-CRYSTAL-MOON', ['크리스탈 문 라블렛', 'Crystal Moon Labret', 'クリスタルムーンラブレット', '水晶月亮平底耳飾'], ['화이트', 'White', 'ホワイト', '白色'], '8mm', '1.2mm / 16G', 3, 2100],
  ['NB-DEMO-CROSS-CHAIN', ['블랙 크로스 체인 피어싱', 'Black Cross Chain Piercing', 'ブラッククロスチェーンピアス', '黑色十字鏈條耳飾'], ['블랙', 'Black', 'ブラック', '黑色'], '8mm', '1.2mm / 16G', 2, 2800],
  ['NB-DEMO-CLICKER-RING', ['클리커 링 피어싱', 'Clicker Ring Piercing', 'クリッカーリングピアス', '扣式圓環耳飾'], ['로즈 골드', 'Rose Gold', 'ローズゴールド', '玫瑰金'], '10mm', '1.0mm / 18G', 4, 3400],
  ['NB-DEMO-TITANIUM-HOOP', ['티타늄 노즈 후프', 'Titanium Nose Hoop', 'チタンノーズフープ', '鈽金屬鼻環'], ['실버', 'Silver', 'シルバー', '銀色'], '8mm', '0.8mm / 20G', 3, 2300],
  ['NB-DEMO-TEARDROP-STUD', ['큐빅 티어드롭 스터드', 'Cubic Teardrop Stud', 'キュービックティアドロップスタッド', '鋯石水滴耳釘'], ['아쿠아', 'Aqua', 'アクア', '水藍色'], '6mm', '1.0mm / 18G', 2, 2900, 0, 'cancelled'],
  ['NB-DEMO-MINI-PEARL', ['미니 펄 바벨', 'Mini Pearl Barbell', 'ミニパールバーベル', '迷你珍珠直桿耳飾'], ['아이보리', 'Ivory', 'アイボリー', '象牙白'], '4mm', '0.8mm / 20G', 5, 1700],
  ['NB-DEMO-SPIKE-BARBELL', ['스파이크 바벨', 'Spike Barbell', 'スパイクバーベル', '尖錐直桿耳飾'], ['블랙', 'Black', 'ブラック', '黑色'], '10mm', '1.2mm / 16G', 3, 2500],
  ['NB-DEMO-BUTTERFLY-OPAL', ['버터플라이 오팔 라블렛', 'Butterfly Opal Labret', 'バタフライオパールラブレット', '蝴蝶蛋白石平底耳飾'], ['핑크', 'Pink', 'ピンク', '粉紅色'], '6mm', '1.0mm / 18G', 4, 3100],
  ['NB-DEMO-CLOVER-RING', ['클로버 크리스탈 링', 'Clover Crystal Ring', 'クローバークリスタルリング', '四葉草水晶圓環耳飾'], ['골드', 'Gold', 'ゴールド', '金色'], '8mm', '1.2mm / 16G', 2, 3600],
]

const localeIndex = { kr: 0, en: 1, jp: 2, 'zh-TW': 3 }

function labels(values) {
  return { kr: values[0], en: values[1], jp: values[2], 'zh-TW': values[3] }
}

function option(groupId, valueId, valueLabels) {
  return {
    groupId,
    valueId,
    groupLabels: groupLabels[groupId],
    valueLabels,
  }
}

export function isAdminQuoteSampleMode(searchParams, hostname = '') {
  const requested = searchParams?.get?.('sampleItems') === '15'
  const safeHost = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.includes('noblesse--admin-quote-responsive-ux-')
  return requested && safeHost
}

export function createAdminQuoteSampleQuote(sourceQuote) {
  if (!sourceQuote) return null
  return {
    ...sourceQuote,
    quoteNumber: 'DEMO-15-ITEMS',
    companyName: 'Noblesse Sample Buyer',
    status: 'draft',
    workflowStatus: 'picking',
    workflowNote: '',
    currentDocumentId: null,
    currentRevision: null,
  }
}

export function createAdminQuoteSampleItems(sourceItems = [], locale = 'kr') {
  const sourceItem = sourceItems[0] || {}
  const languageIndex = localeIndex[locale] ?? 0

  return sampleProducts.map(([productCode, names, colorValues, length, gauge, quantity, price, prepared = quantity, status = 'ready'], index) => ({
    ...sourceItem,
    id: `admin-quote-sample-item-${String(index + 1).padStart(2, '0')}`,
    productCode,
    productName: names[languageIndex],
    productImage: sourceItem.productImage ? { ...sourceItem.productImage, altText: names[languageIndex] } : null,
    requestedQuantity: quantity,
    confirmedQuantity: prepared,
    requestedPriceSnapshot: price,
    confirmedUnitPrice: price,
    fulfillmentStatus: status,
    cancellationReason: status === 'partial' ? 'quantity_shortage' : status === 'cancelled' ? 'out_of_stock' : '',
    cancellationNote: '',
    itemNote: '',
    color: '',
    size: '',
    selectedOptions: [
      option('color', `color-${index + 1}`, labels(colorValues)),
      option('length', `length-${length}`, labels([length, length, length, length])),
      option('gauge', `gauge-${gauge.replaceAll(' ', '')}`, labels([gauge, gauge, gauge, gauge])),
    ],
  }))
}
