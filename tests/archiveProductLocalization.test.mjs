import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { adaptApiProduct } from '../src/services/apiProductAdapter.js'
import { createArchiveProductLocalization } from '../src/utils/archiveProductLocalization.js'

test('archive product names are localized into English, Japanese, and Taiwan Traditional Chinese', () => {
  assert.deepEqual(createArchiveProductLocalization('4방 초록클로버 바벨').nameEn, '4-Stone Green Clover Barbell')
  assert.equal(createArchiveProductLocalization('4방 초록클로버 바벨').nameJa, '4石 グリーン クローバー バーベル')
  assert.equal(createArchiveProductLocalization('4방 초록클로버 바벨').nameZhTw, '4石 綠色 四葉草 穿刺桿')

  const parts = createArchiveProductLocalization('부자재 ㄷ자 바1.2x10mm(50개)')
  assert.match(parts.nameEn, /Parts ㄷ-Shaped Bar/)
  assert.match(parts.nameJa, /パーツ ㄷ字型 バー/)
  assert.match(parts.nameZhTw, /配件 ㄷ字型 桿/)
})

test('every archive product receives non-Korean localized display names', () => {
  const manifest = JSON.parse(readFileSync('backend/src/data/piercing-import-manifest.json', 'utf8'))

  for (const record of manifest.records) {
    const localized = createArchiveProductLocalization(record.proposedProduct.nameKo)
    for (const value of [localized.nameEn, localized.nameJa, localized.nameZhTw]) {
      assert.ok(value)
      assert.doesNotMatch(value.replaceAll('ㄷ', ''), /\p{Script=Hangul}/u)
      assert.notEqual(value, record.proposedProduct.nameKo)
    }
  }
})

test('API adapter replaces archive Korean fallbacks and supplies localized descriptions', () => {
  const product = adaptApiProduct({
    code: 'NPI-TEST000001',
    nameKo: '민자 나비넥타이',
    nameEn: '민자 나비넥타이',
    nameJa: null,
    nameZhTw: null,
  })

  assert.equal(product.nameEn, 'Plain Bow Tie')
  assert.equal(product.nameJa, 'プレーン 蝶ネクタイ')
  assert.equal(product.nameZhTw, '素面 領結')
  assert.match(product.descriptionEn, /wholesale catalog inquiries/)
  assert.match(product.descriptionJa, /B2B卸売カタログ/)
  assert.match(product.descriptionZhTw, /B2B 批發目錄/)
})
