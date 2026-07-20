import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBodyJewelryGaugeMeasurement,
  formatBodyJewelryGaugeMeasurement,
  getBodyJewelryGaugePairByGauge,
  getBodyJewelryGaugePairByMillimeters,
  getResolvedBodyJewelryGaugePair,
  hasBodyJewelryGaugeConflict,
} from '../src/utils/bodyJewelryGauge.js'
import {
  createProductOptionPreset,
  formatSelectedProductOptions,
  getMissingRequiredProductOptions,
  getSelectedOptionSnapshots,
  productOptionCombinationKey,
  resolveProductOptionSelection,
  selectedOptionPairs,
} from '../src/utils/productOptions.js'
import {
  createPiercingDetailTemplate,
  getProductDetailBlockDraftIssues,
  normalizeProductDetailBlocks,
} from '../src/utils/productDetailBlocks.js'

const labels = (kr, en) => ({ kr, en, jp: en, 'zh-TW': en })

const optionGroups = [
  {
    id: 'color',
    type: 'swatch',
    required: true,
    labels: labels('색상', 'Color'),
    values: [
      { id: 'gold', labels: labels('골드', 'Gold'), swatch: '#D4AF37' },
      { id: 'pink', labels: labels('핑크', 'Pink'), swatch: '#E7A6B6' },
    ],
  },
  {
    id: 'bar-length',
    type: 'text',
    required: true,
    labels: labels('바 길이', 'Bar length'),
    values: [
      { id: '6mm', labels: labels('6mm', '6mm') },
      { id: '8mm', labels: labels('8mm', '8mm') },
    ],
  },
]

test('required product options stay incomplete until every group has a selected value', () => {
  assert.deepEqual(getMissingRequiredProductOptions(optionGroups, {}).map((group) => group.id), ['color', 'bar-length'])
  assert.deepEqual(getMissingRequiredProductOptions(optionGroups, { color: 'gold', 'bar-length': '6mm' }), [])
})

test('Gold plus 6mm and Pink plus 8mm produce separate stable inquiry combinations', () => {
  const gold = selectedOptionPairs({ color: 'gold', 'bar-length': '6mm' })
  const pink = selectedOptionPairs({ color: 'pink', 'bar-length': '8mm' })

  assert.equal(productOptionCombinationKey(gold), 'bar-length:6mm|color:gold')
  assert.equal(productOptionCombinationKey(pink), 'bar-length:8mm|color:pink')
  assert.notEqual(productOptionCombinationKey(gold), productOptionCombinationKey(pink))
})

test('option selections resolve localized snapshots for buyer and quote displays', () => {
  const product = { optionGroups }
  const resolved = resolveProductOptionSelection(product, {
    selectedOptions: [{ groupId: 'color', valueId: 'gold' }, { groupId: 'bar-length', valueId: '6mm' }],
  })
  const snapshots = getSelectedOptionSnapshots(optionGroups, resolved.selection)

  assert.deepEqual(formatSelectedProductOptions(snapshots, 'kr'), ['색상: 골드', '바 길이: 6mm'])
  assert.deepEqual(formatSelectedProductOptions(snapshots, 'en'), ['Color: Gold', 'Bar length: 6mm'])
})

test('body jewelry gauge values convert between millimeters and G without approximation', () => {
  assert.deepEqual(getBodyJewelryGaugePairByMillimeters('1.2mm'), { gauge: '16G', mm: '1.2' })
  assert.deepEqual(getBodyJewelryGaugePairByGauge('00g'), { gauge: '00G', mm: '10.0' })
  assert.equal(getBodyJewelryGaugePairByMillimeters('1.3'), null)

  const mismatch = { system: 'body-jewelry-gauge', mm: '1.2', gauge: '18G', authority: 'mm' }
  assert.equal(hasBodyJewelryGaugeConflict(mismatch), true)
  assert.deepEqual(getResolvedBodyJewelryGaugePair(mismatch, 'mm'), { gauge: '16G', mm: '1.2' })
  assert.deepEqual(getResolvedBodyJewelryGaugePair(mismatch, 'gauge'), { gauge: '18G', mm: '1.0' })
  assert.equal(getResolvedBodyJewelryGaugePair({ ...mismatch, mm: '1.3' }, 'mm'), null)
})

test('piercing presets include 4mm bar length and paired required gauge labels', () => {
  const barLength = createProductOptionPreset('barLength')
  const gauge = createProductOptionPreset('gauge')

  assert.deepEqual(barLength.values.map((value) => value.labels.kr), ['4mm', '6mm', '8mm', '10mm'])
  assert.equal(gauge.required, true)
  assert.deepEqual(gauge.values.map((value) => value.labels.kr), ['1.2mm / 16G', '1.0mm / 18G', '0.8mm / 20G'])
  assert.equal(formatBodyJewelryGaugeMeasurement(
    createBodyJewelryGaugeMeasurement(getBodyJewelryGaugePairByGauge('14G'), 'gauge')
  ), '1.6mm / 14G')
})

test('piercing detail template keeps safe fixed blocks and validates missing image references', () => {
  const template = createPiercingDetailTemplate(['image-1', 'image-2'])
  const normalized = normalizeProductDetailBlocks(template)

  assert.deepEqual(normalized.map((block) => block.type), ['heading', 'imageGrid', 'text', 'specTable', 'text', 'text', 'text', 'notice'])
  assert.deepEqual(getProductDetailBlockDraftIssues(normalized, [{ id: 'image-1' }, { id: 'image-2' }]), [])
  assert.match(getProductDetailBlockDraftIssues(normalized, [{ id: 'image-1' }]).join(' '), /연결 이미지/)
})
