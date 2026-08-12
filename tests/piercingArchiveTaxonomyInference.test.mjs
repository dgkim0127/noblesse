import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getProductTaxonomy } from '../src/data/productTaxonomy.js'
import { inferPiercingArchiveTaxonomy } from '../src/data/productTaxonomyInference.js'

function archiveProduct(nameKo, {
  code = 'NPI-TEST000001',
  categoryHint = 'piercing',
  material = null,
  productTypeHint = '바벨',
  sourceArchive = '',
  taxonomy = {},
} = {}) {
  return {
    code,
    nameKo,
    material,
    specs: { sourceArchive },
    taxonomy: {
      categoryHint,
      importSource: 'piercing-archive',
      productTypeHint,
      ...taxonomy,
    },
  }
}

test('archive inference maps product wording into every visible filter family', () => {
  const clover = inferPiercingArchiveTaxonomy(archiveProduct('4방 초록클로버 바벨', {
    sourceArchive: '4방_초록클로버_바벨_에메랄드,크리_1,800.zip',
  }))

  assert.equal(clover.productGroup, 'piercing')
  assert.equal(clover.piercingType, 'ball')
  assert.equal(clover.baseMaterial, 'brass')
  assert.ok(clover.structures.includes('barbell'))
  assert.ok(clover.decorationMaterials.includes('cubic'))
  assert.ok(clover.decorationMaterials.includes('synthetic_gem'))
  assert.ok(clover.shapes.includes('flower'))
  assert.equal(clover.saleType, 'single')

  const silverStar = inferPiercingArchiveTaxonomy(archiveProduct('민자 쁘띠별', {
    material: 'Silver 925',
    sourceArchive: '민자_쁘띠별_실버925_6바,8바.zip',
  }))
  assert.equal(silverStar.baseMaterial, 'silver925')
  assert.ok(silverStar.styles.includes('plain'))
  assert.ok(silverStar.structures.includes('basic_barbell'))
  assert.ok(silverStar.shapes.includes('star'))
})

test('archive inference separates ring, parts, decoration, finish, shape, and pack sale', () => {
  const ring = inferPiercingArchiveTaxonomy(archiveProduct('n방 링', {
    categoryHint: 'piercing-ring',
    productTypeHint: '링',
  }))
  assert.equal(ring.piercingType, 'ring')
  assert.ok(!ring.structures.includes('barbell'))

  const parts = inferPiercingArchiveTaxonomy(archiveProduct('부자재 인터널용 사각 큐빅헤드', {
    sourceArchive: '부자재_인터널용_사각큐빅헤드_3mm(5개)_5,000.zip',
  }))
  assert.equal(parts.productGroup, 'parts')
  assert.equal(parts.saleType, 'bundle')
  assert.ok(parts.structures.includes('internal'))
  assert.ok(parts.structures.includes('internal_head'))
  assert.ok(parts.styles.includes('cubic_setting'))
  assert.ok(parts.decorationMaterials.includes('cubic'))
  assert.ok(parts.shapes.includes('square'))

  const pearlDrop = inferPiercingArchiveTaxonomy(archiveProduct('자개 진주 드롭', {
    productTypeHint: '드롭',
  }))
  assert.deepEqual(pearlDrop.decorationMaterials, ['pearl', 'mother_of_pearl'])
  assert.ok(pearlDrop.styles.includes('drop'))

  const epoxy = inferPiercingArchiveTaxonomy(archiveProduct('에폭 화이트꽃 바벨'))
  assert.ok(epoxy.styles.includes('epoxy'))
  assert.ok(epoxy.shapes.includes('flower'))
})

test('reviewed taxonomy remains authoritative over inferred archive values', () => {
  const product = archiveProduct('민자 별 바벨', {
    taxonomy: {
      baseMaterial: 'titanium',
      structures: ['internal'],
      styles: ['coated'],
      shapes: ['heart'],
      saleType: 'bundle',
    },
  })
  const taxonomy = getProductTaxonomy(product)

  assert.equal(taxonomy.baseMaterial, 'titanium')
  assert.deepEqual(taxonomy.structures, ['internal'])
  assert.deepEqual(taxonomy.styles, ['coated'])
  assert.deepEqual(taxonomy.shapes, ['heart'])
  assert.equal(taxonomy.saleType, 'bundle')

  const intentionallyEmpty = getProductTaxonomy(archiveProduct('민자 별 바벨', {
    taxonomy: { shapes: [] },
  }))
  assert.deepEqual(intentionallyEmpty.shapes, [])
})

test('all 743 archive records receive supported filter values from the source manifest', () => {
  const manifest = JSON.parse(readFileSync('backend/src/data/piercing-import-manifest.json', 'utf8'))
  const classified = manifest.records.map((record) => inferPiercingArchiveTaxonomy({
    ...record.proposedProduct,
    specs: { sourceArchive: record.archiveName },
    taxonomy: {
      categoryHint: record.proposedProduct.categoryHint,
      importSource: 'piercing-archive',
      productTypeHint: record.proposedProduct.productType,
    },
  }))

  assert.equal(classified.length, 743)
  assert.ok(classified.every((taxonomy) => taxonomy.productGroup))
  assert.ok(classified.every((taxonomy) => taxonomy.baseMaterial))
  assert.ok(classified.every((taxonomy) => taxonomy.saleType))
  assert.equal(classified.filter((taxonomy) => taxonomy.productGroup === 'parts').length, 83)
  assert.equal(classified.filter((taxonomy) => taxonomy.piercingType === 'ring').length, 56)
  assert.equal(classified.filter((taxonomy) => taxonomy.baseMaterial === 'silver925').length, 86)
  assert.equal(classified.filter((taxonomy) => taxonomy.baseMaterial === 'acrylic').length, 1)
  assert.ok(classified.filter((taxonomy) => taxonomy.baseMaterial === 'titanium').length >= 10)
  assert.ok(classified.filter((taxonomy) => taxonomy.styles.includes('laser_cut')).length >= 8)
  assert.ok(classified.filter((taxonomy) => taxonomy.shapes.includes('flower')).length >= 90)
  assert.ok(classified.filter((taxonomy) => taxonomy.decorationMaterials.includes('cubic')).length >= 180)
})

test('empty adapter arrays do not suppress archive inference', () => {
  const taxonomy = getProductTaxonomy({
    ...archiveProduct('1방 하트 바벨', { sourceArchive: '1방_하트_바벨_크리_1,500.zip' }),
    decorationMaterials: [],
    structures: [],
    styles: [],
    shapes: [],
  })

  assert.ok(taxonomy.structures.includes('barbell'))
  assert.ok(taxonomy.decorationMaterials.includes('cubic'))
  assert.ok(taxonomy.shapes.includes('heart'))
})
