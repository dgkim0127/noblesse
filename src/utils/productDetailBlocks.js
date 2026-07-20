import { productOptionLocales } from './productOptions.js'

export const productDetailBlockTypes = [
  ['heading', '제목'],
  ['text', '본문·목록'],
  ['image', '전체 이미지'],
  ['imageText', '이미지 + 문구'],
  ['imageGrid', '이미지 그리드'],
  ['specTable', '상품 사양표'],
  ['notice', '안내문'],
  ['divider', '구분선'],
]

const supportedTypes = new Set(productDetailBlockTypes.map(([value]) => value))

function makeId(prefix = 'block') {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${value}`.slice(0, 64)
}

function emptyLocalizedBlock() {
  return { title: '', body: '', caption: '', bullets: [] }
}

function normalizeTranslations(translations = {}) {
  return Object.fromEntries(productOptionLocales.map((locale) => {
    const value = translations?.[locale] || {}
    return [locale, {
      title: String(value.title || ''),
      body: String(value.body || ''),
      caption: String(value.caption || ''),
      bullets: Array.isArray(value.bullets) ? value.bullets.map(String).slice(0, 20) : [],
    }]
  }))
}

export function createProductDetailBlock(type = 'text') {
  return {
    id: makeId(type),
    type: supportedTypes.has(type) ? type : 'text',
    visible: true,
    layout: 'stacked',
    imageIds: [],
    specKeys: [],
    translations: Object.fromEntries(productOptionLocales.map((locale) => [locale, emptyLocalizedBlock()])),
  }
}

export function normalizeProductDetailBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks.slice(0, 30).map((block) => ({
    id: String(block?.id || makeId(block?.type || 'block')).slice(0, 64),
    type: supportedTypes.has(block?.type) ? block.type : 'text',
    visible: block?.visible !== false,
    layout: ['imageLeft', 'imageRight', 'stacked'].includes(block?.layout) ? block.layout : 'stacked',
    imageIds: Array.isArray(block?.imageIds) ? block.imageIds.map(String).filter(Boolean).slice(0, 8) : [],
    specKeys: Array.isArray(block?.specKeys) ? block.specKeys.map(String).filter(Boolean).slice(0, 20) : [],
    translations: normalizeTranslations(block?.translations),
  }))
}

const titles = {
  features: { kr: '상품 특징', en: 'Product features', jp: '商品の特徴', 'zh-TW': '商品特色' },
  wearing: { kr: '착용과 크기', en: 'Fit and sizing', jp: '着用とサイズ', 'zh-TW': '佩戴與尺寸' },
  material: { kr: '소재와 마감', en: 'Material and finish', jp: '素材と仕上げ', 'zh-TW': '材質與表面處理' },
  closure: { kr: '잠금 방식', en: 'Closure', jp: '留め具', 'zh-TW': '扣合方式' },
  care: { kr: '관리법', en: 'Care guide', jp: 'お手入れ', 'zh-TW': '保養方式' },
  quote: { kr: '견적 안내', en: 'Quote information', jp: '見積もりのご案内', 'zh-TW': '報價說明' },
}

function translatedTitle(key) {
  return Object.fromEntries(productOptionLocales.map((locale) => [locale, { ...emptyLocalizedBlock(), title: titles[key][locale] }]))
}

export function createPiercingDetailTemplate(imageIds = []) {
  const heading = createProductDetailBlock('heading')
  heading.translations = translatedTitle('features')
  const gallery = createProductDetailBlock('imageGrid')
  gallery.imageIds = imageIds.slice(0, 3)
  const wearing = createProductDetailBlock('text')
  wearing.translations = translatedTitle('wearing')
  const specs = createProductDetailBlock('specTable')
  specs.specKeys = ['gauge', 'barLength', 'ballSize', 'closureType']
  const material = createProductDetailBlock('text')
  material.translations = translatedTitle('material')
  const closure = createProductDetailBlock('text')
  closure.translations = translatedTitle('closure')
  const care = createProductDetailBlock('text')
  care.translations = translatedTitle('care')
  const quote = createProductDetailBlock('notice')
  quote.translations = Object.fromEntries(productOptionLocales.map((locale) => [locale, {
    ...emptyLocalizedBlock(),
    title: titles.quote[locale],
    body: {
      kr: '선택한 옵션과 수량을 견적 리스트에 담아 요청해 주세요. 최종 단가와 납기는 담당자가 확인한 뒤 안내합니다.',
      en: 'Add the selected options and quantity to the Inquiry List. Final pricing and lead time are confirmed by our team.',
      jp: '選択したオプションと数量を見積もりリストに追加してください。最終価格と納期は担当者が確認します。',
      'zh-TW': '請將所選選項與數量加入報價清單。最終單價與交期將由專人確認。',
    }[locale],
  }]))
  return [heading, gallery, wearing, specs, material, closure, care, quote]
}

export function getProductDetailBlockDraftIssues(blocks = [], images = []) {
  const normalized = normalizeProductDetailBlocks(blocks)
  const imageIds = new Set(images.map((image) => String(image?.id || image?.existingId || '')).filter(Boolean))
  const issues = []
  const ids = new Set()
  normalized.filter((block) => block.visible).forEach((block, blockIndex) => {
    if (ids.has(block.id)) issues.push(`${blockIndex + 1}번 상세 블록 ID 중복`)
    ids.add(block.id)
    const requiredKeys = block.type === 'heading'
      ? ['title']
      : ['text', 'notice'].includes(block.type)
        ? ['title', 'body', 'bullets']
        : block.type === 'imageText'
          ? ['title', 'body', 'caption']
          : ['image', 'imageGrid'].includes(block.type)
            ? ['caption']
            : []
    requiredKeys.forEach((key) => {
      const hasAny = productOptionLocales.some((locale) => {
        const value = block.translations[locale][key]
        return Array.isArray(value) ? value.some((item) => item.trim()) : value.trim()
      })
      if (!hasAny) return
      productOptionLocales.forEach((locale) => {
        const value = block.translations[locale][key]
        const complete = Array.isArray(value) ? value.some((item) => item.trim()) : value.trim()
        if (!complete) issues.push(`${blockIndex + 1}번 상세 블록 ${locale} 번역`)
      })
    })
    if (['image', 'imageText', 'imageGrid'].includes(block.type) && !block.imageIds.length) issues.push(`${blockIndex + 1}번 상세 블록 이미지`)
    block.imageIds.forEach((imageId) => {
      if (!imageIds.has(imageId)) issues.push(`${blockIndex + 1}번 상세 블록 연결 이미지`)
    })
    if (block.type === 'specTable' && !block.specKeys.length) issues.push(`${blockIndex + 1}번 상세 블록 사양`)
  })
  return [...new Set(issues)]
}
