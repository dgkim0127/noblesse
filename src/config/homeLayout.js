export const homeLayoutLocales = ['kr', 'en', 'jp', 'zh-TW']

const localized = (kr, en, jp, zhTw) => ({ kr, en, jp, 'zh-TW': zhTw })

export const defaultHomeLayout = {
  version: 1,
  header: {
    showMarquee: true,
    marquee: localized(
      'SILVER 925 & Surgical Piercing & Brass Piercing · 실버 & 써지컬 & 신주 피어싱 · Allergy-conscious materials · Since 2010',
      'SILVER 925 & Surgical Piercing & Brass Piercing · Allergy-conscious materials · Since 2010',
      'SILVER 925 & サージカル & 真鍮ピアス · Allergy-conscious materials · Since 2010',
      'SILVER 925 & 外科鋼 & 黃銅穿孔飾品 · Allergy-conscious materials · Since 2010',
    ),
  },
  sections: [
    { id: 'showcase', type: 'showcase', visible: true, title: localized('메인 스냅', 'Main showcase', 'メインスナップ', '主視覺輪播'), note: localized('홈 첫 화면의 이미지 슬라이드입니다.', 'The image carousel at the top of the home page.', 'ホーム上部の画像スライドです。', '首頁上方的圖片輪播。') },
    { id: 'categories', type: 'categories', visible: true, title: localized('카테고리 바로가기', 'Category shortcuts', 'カテゴリーショートカット', '分類捷徑'), note: localized('주요 소재와 모양으로 이동합니다.', 'Shortcuts to key materials and shapes.', '主な素材と形に移動します。', '前往主要材質與造型。') },
    { id: 'new-arrival', type: 'productCollection', visible: true, title: localized('신상품', 'New Arrival', '新商品', '新品'), note: localized('새롭게 준비한 신규 라인과 이번 주 추천 아이템입니다.', 'New lines and recommended pieces prepared for this week.', '今週のために用意した新しいラインとおすすめアイテムです。', '本週準備的新品系列和推薦單品。'), layout: 'grid', productSource: { rule: 'new', limit: 8, pinnedProductIds: [], excludedProductIds: [] } },
    { id: 'weekly-pick', type: 'productCollection', visible: true, title: localized('WEEKLY BEST', 'Weekly Best', '週間ベスト', '每週精選'), note: localized('이번 주 거래처 문의가 모인 스타일을 한눈에 정리했습니다.', 'A focused edit of styles drawing buyer inquiries this week.', '今週の取引先お問い合わせが集まったスタイルをまとめました。', '整理本週買家諮詢較多的重點款式。'), layout: 'feature', productSource: { rule: 'weekly', limit: 5, pinnedProductIds: [], excludedProductIds: [] } },
    { id: 'buyer-selection', type: 'buyerBoards', visible: true, title: localized('바이어 셀렉션', 'Buyer Selection', 'バイヤーセレクション', '買家精選'), note: localized('국내·해외 거래처 상담 흐름에 맞춰 정리한 B2B 컨셉 보드입니다.', 'B2B concept boards arranged for domestic and global buyer consultations.', '国内外の取引先相談に合わせて整理したB2Bコンセプトボードです。', '根據國內外客戶洽談流程整理的 B2B 概念看板。'), layout: 'rail' },
    { id: 'piercing-catalog', type: 'productCollection', visible: true, title: localized('피어싱', 'Piercing', 'ピアス', '穿孔'), note: localized('피어싱=귀족, 더이상 말이 필요한가요?', 'Piercing = Noblesse. Need we say more?', 'ピアス＝貴族。これ以上の説明が必要ですか？', '穿孔 = 貴族，還需要更多說明嗎？'), layout: 'grid', productSource: { rule: 'piercing', limit: 8, pinnedProductIds: [], excludedProductIds: [] } },
    { id: 'steady-selection', type: 'productCollection', visible: true, title: localized('스테디 셀렉션', 'Steady Selection', '定番セレクション', '常青精選'), note: localized('꾸준히 찾는 데일리 라인을 모았습니다.', 'Daily lines buyers keep coming back for.', '毎日選ばれる定番ラインを集めました。', '匯集買家持續選擇的日常系列。'), layout: 'grid', productSource: { rule: 'steady', limit: 8, pinnedProductIds: [], excludedProductIds: [] } },
    { id: 'campaign', type: 'campaign', visible: true, eyebrow: localized('B2B QUOTE', 'B2B QUOTE', 'B2B QUOTE', 'B2B QUOTE'), title: localized('거래처 맞춤 견적을 요청하세요', 'Request a buyer-specific quote', '取引先向け見積をご依頼ください', '申請買家專屬報價'), note: localized('수량, 색상, 납기 조건을 확인해 공식 견적을 안내합니다.', 'We review quantity, color and lead-time requirements before issuing a formal quote.', '数量、カラー、納期条件を確認して正式なお見積をご案内します。', '確認數量、顏色與交期條件後提供正式報價。'), ctaLabel: localized('견적 요청', 'Request Quote', '見積依頼', '申請報價'), ctaPath: '/register', ctaApprovedPath: '/request-quote' },
    { id: 'support', type: 'support', visible: true, title: localized('이용 안내', 'Buyer support', 'ご利用案内', '買家支援'), note: localized('최근 본 상품, 상담 안내, 회사 정보를 확인합니다.', 'Recently viewed products, buyer support and company information.', '最近見た商品、相談案内、会社情報を確認します。', '查看最近瀏覽、買家支援與公司資訊。') },
  ],
}

const defaultsById = new Map(defaultHomeLayout.sections.map((section) => [section.id, section]))

export function cloneHomeLayout(value = defaultHomeLayout) {
  return JSON.parse(JSON.stringify(value))
}

export function getHomeLayoutLocaleKey(locale) {
  return locale === 'zh-TW' || locale === 'cn' ? 'zh-TW' : homeLayoutLocales.includes(locale) ? locale : 'en'
}

export function getHomeLayoutText(value, locale, fallback = '') {
  const key = getHomeLayoutLocaleKey(locale)
  return value?.[key] ?? value?.en ?? fallback
}

function normalizeLocalized(value, fallback) {
  return Object.fromEntries(homeLayoutLocales.map((locale) => [locale, String(value?.[locale] ?? fallback?.[locale] ?? '')]))
}

export function normalizeHomeLayout(value) {
  const source = value && typeof value === 'object' ? value : {}
  const sourceSections = Array.isArray(source.sections) ? source.sections : []
  const sourceById = new Map(sourceSections.map((section) => [section?.id, section]))
  const orderedIds = [
    ...sourceSections.map((section) => section?.id).filter((id) => defaultsById.has(id)),
    ...defaultHomeLayout.sections.map((section) => section.id).filter((id) => !sourceById.has(id)),
  ]
  const sections = [...new Set(orderedIds)].map((id) => {
    const fallback = defaultsById.get(id)
    const current = sourceById.get(id) || {}
    const section = {
      ...cloneHomeLayout(fallback),
      ...current,
      id,
      type: fallback.type,
      visible: id === 'showcase' ? true : current.visible !== false,
      title: normalizeLocalized(current.title, fallback.title),
      note: normalizeLocalized(current.note, fallback.note),
    }
    if (fallback.productSource) {
      section.productSource = {
        ...fallback.productSource,
        ...(current.productSource || {}),
        pinnedProductIds: [...(current.productSource?.pinnedProductIds || [])],
        excludedProductIds: [...(current.productSource?.excludedProductIds || [])],
      }
    }
    if (fallback.type === 'campaign') {
      section.eyebrow = normalizeLocalized(current.eyebrow, fallback.eyebrow)
      section.ctaLabel = normalizeLocalized(current.ctaLabel, fallback.ctaLabel)
    }
    return section
  })
  const showcaseIndex = sections.findIndex((section) => section.id === 'showcase')
  if (showcaseIndex > 0) sections.unshift(sections.splice(showcaseIndex, 1)[0])
  return {
    version: 1,
    header: {
      showMarquee: source.header?.showMarquee !== false,
      marquee: normalizeLocalized(source.header?.marquee, defaultHomeLayout.header.marquee),
    },
    sections,
  }
}

export function selectConfiguredProducts(allProducts, ruleProducts, source = {}, { applyLimit = true } = {}) {
  const excluded = new Set(source.excludedProductIds || [])
  const byId = new Map((allProducts || []).map((product) => [product.productId, product]))
  const pinned = (source.pinnedProductIds || []).map((id) => byId.get(id)).filter(Boolean)
  const candidates = [...pinned, ...(ruleProducts || [])]
  const seen = new Set()
  const unique = candidates.filter((product) => {
    if (!product?.productId || excluded.has(product.productId) || seen.has(product.productId)) return false
    seen.add(product.productId)
    return true
  })
  if (!applyLimit) return unique
  const limit = Math.max(1, Math.min(12, Number(source.limit) || unique.length || 1))
  return unique.slice(0, limit)
}
