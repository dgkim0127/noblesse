const materialAliases = new Map([
  ['silver 925', 'silver925'],
  ['silver925', 'silver925'],
  ['surgical steel', 'surgical'],
  ['brass', 'brass'],
  ['titanium', 'titanium'],
  ['acrylic', 'acrylic'],
])

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizedText(product) {
  const taxonomy = product?.taxonomy && typeof product.taxonomy === 'object' ? product.taxonomy : {}
  const specs = product?.specs && typeof product.specs === 'object' ? product.specs : {}

  return [
    product?.nameKo,
    product?.nameEn,
    product?.categoryId,
    product?.categoryNameKo,
    product?.material,
    taxonomy.categoryHint,
    taxonomy.productTypeHint,
    specs.sourceArchive,
  ].filter(Boolean).join(' ').replace(/[_-]+/g, ' ')
}

function isPiercingArchiveProduct(product) {
  return product?.taxonomy?.importSource === 'piercing-archive'
    || String(product?.code || product?.productId || '').startsWith('NPI-')
}

function inferBaseMaterial(product, text) {
  const declared = String(product?.material || '').trim().toLowerCase()
  if (materialAliases.has(declared)) return materialAliases.get(declared)
  if (/실버\s*925|925\s*실버|silver\s*925/i.test(text)) return 'silver925'
  if (/써지컬|서지컬|스테인리스|스텐|316\s*l/i.test(text)) return 'surgical'
  if (/티타늄|티탄|titanium/i.test(text)) return 'titanium'
  if (/신주|브라스|brass/i.test(text)) return 'brass'

  // The legacy piercing archive used plated brass heads/bodies unless another
  // material was written in the source archive. Acrylic/pearl/stone words in
  // those names describe the decoration rather than the base metal.
  return 'brass'
}

function inferDecorationMaterials(text) {
  const values = []
  if (/진주|펄/i.test(text)) values.push('pearl')
  if (/자개/i.test(text)) values.push('mother_of_pearl')
  if (/큐빅|큐|크리|지르코니아|(?:^|\W)cz(?:\W|$)|(?:^|\W)ab(?:\W|$)/i.test(text)) values.push('cubic')
  if (/오팔|에메랄드|에메|루비|사파이어|오닉스|아쿠아|터키|원석|캣츠/i.test(text)) values.push('synthetic_gem')
  if (/스톤/i.test(text)) values.push('stone')
  if (/미러\s*볼/i.test(text)) values.push('mirrorball')
  if (/스와로브스키.*반진주|반진주.*스와로브스키/i.test(text)) values.push('swarovski_half_pearl')
  if (/아크릴|클래이|클레이/i.test(text)) values.push('acrylic_applique')
  return unique(values)
}

function inferShapes(text) {
  const values = []
  if (/스파크|눈꽃|눈결정|설화|햇살|썬버스트|번개/i.test(text)) values.push('spark')
  if (/꽃|클로버|플라워|장미|데이지|해바라기|벚꽃|연꽃/i.test(text)) values.push('flower')
  if (/나비/i.test(text)) values.push('butterfly')
  if (/하트/i.test(text)) values.push('heart')
  if (/별|스타/i.test(text)) values.push('star')
  if (/초승|달(?!랑)/i.test(text)) values.push('moon')
  if (/리본|보우/i.test(text)) values.push('ribbon')
  if (/미러\s*볼|민자[^ ]*볼|금볼|납작볼|볼\s*\d|구형|구슬|원형|동글|원큐/i.test(text)) values.push('sphere')
  if (/사각|네모|스퀘어|직사각/i.test(text)) values.push('square')
  return unique(values)
}

function inferStyles(text, productType, decorations) {
  const values = []
  if (/민자/i.test(text)) values.push('plain')
  if (/에폭|애폭|에폭시/i.test(text)) values.push('epoxy')
  if (/코팅/i.test(text)) values.push('coated')
  if (/레이저|레이져|컷팅|커팅/i.test(text)) values.push('laser_cut')
  if (productType === '드롭' || /드롭|달랑|흔들/i.test(text)) values.push('drop')
  if (/앤틱|엔틱|antique/i.test(text)) values.push('antique')

  const hasSetting = /[3-8]\s*발|물림|세팅|큐빅\s*헤드|잼\s*스톤|한큐/i.test(text)
  if (hasSetting && decorations.some((value) => ['cubic', 'stone', 'synthetic_gem'].includes(value))) {
    values.push('cubic_setting')
  }

  const hasPearl = decorations.includes('pearl')
  if (hasPearl && /두\s*진주|더블\s*진주|2\s*진주/i.test(text)) values.push('double_pearl')
  else if (hasPearl) values.push('single_pearl')
  if (hasPearl && /하트/i.test(text)) values.push('heart_pearl')
  return unique(values)
}

function inferStructures(text, { isParts, piercingType, productType, styles }) {
  const values = []
  const isRing = piercingType === 'ring'
  const isBarbell = !isParts && !isRing && (
    ['바벨', '피어싱', '드롭', '라블렛', '라브렛'].includes(productType)
    || /바벨|라블렛|라브렛/i.test(text)
  )

  if (isBarbell) values.push('barbell')
  if (/인터널|이너널|라블랫|라블렛|라브렛/i.test(text)) values.push('internal')
  if (isBarbell && styles.includes('plain')) values.push('basic_barbell')
  if (isRing && /투\s*볼|두\s*볼|2\s*볼|양\s*볼/i.test(text)) values.push('two_ball_ring')
  if (/일자\s*바|스트레이트\s*바/i.test(text)) values.push('straight_bar')
  if (/바나나\s*바/i.test(text)) values.push('banana_bar')
  if (/ㄷ자\s*바|(?:^|\s)d\s*바/i.test(text)) values.push('d_bar')
  if (/(?:인터널|라블랫|라블렛|라브렛).*바/i.test(text)) values.push('internal_bar')
  if (/인터널.*헤드/i.test(text)) values.push('internal_head')
  if (!/미러\s*볼/i.test(text) && /민자[^ ]*볼|금볼|납작볼|볼\s*파츠|볼\s*\d/i.test(text)) values.push('ball_part')
  return unique(values)
}

export function inferPiercingArchiveTaxonomy(product) {
  if (!isPiercingArchiveProduct(product)) return null

  const text = normalizedText(product)
  const productType = String(product?.taxonomy?.productTypeHint || '').trim()
  const categoryHint = String(product?.taxonomy?.categoryHint || '').trim()
  const isParts = categoryHint === 'parts' || /부자재|파츠|뒷볼|뒤꼭지/i.test(text)
  const isRing = categoryHint === 'piercing-ring' || productType === '링' || /(?:^|\s)링(?:\s|$|\()/i.test(text)
  const decorations = inferDecorationMaterials(text)
  const styles = inferStyles(text, productType, decorations)
  const baseMaterial = inferBaseMaterial(product, text)

  return {
    productGroup: isParts ? 'parts' : 'piercing',
    piercingType: isRing ? 'ring' : (isParts ? undefined : 'ball'),
    baseMaterial,
    allSurgical: /올\s*써지컬|전체\s*써지컬|통\s*써지컬/i.test(text),
    decorationMaterials: decorations,
    partType: isParts ? ['other_parts'] : [],
    structures: inferStructures(text, {
      isParts,
      piercingType: isRing ? 'ring' : 'ball',
      productType,
      styles,
    }),
    styles,
    shapes: inferShapes(text),
    saleType: /세트|셋트|묶음|붂음|모음|모듬|한판|\(\s*\d+\s*개\s*\)/i.test(text) ? 'bundle' : 'single',
    inferenceSource: 'piercing-archive',
  }
}
