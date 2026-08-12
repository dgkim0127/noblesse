import assert from 'node:assert/strict'
import test from 'node:test'
import {
  comparePiercingStoneCountAscending,
  getPiercingStoneCount,
} from '../src/utils/piercingStoneCount.js'

test('stone count reads the leading 방 count from product names and archive metadata', () => {
  assert.equal(getPiercingStoneCount({ nameKo: '18방 큐리본' }), 18)
  assert.equal(getPiercingStoneCount({ nameKo: '큐빅 리본', specs: { sourceArchive: '3방_큐빅리본.zip' } }), 3)
  assert.equal(getPiercingStoneCount({ nameKo: '큐빅 리본' }), null)
})

test('stone count sorting places low counts first and unknown counts last', () => {
  const products = [
    { nameKo: '방수 미확인', sortOrder: 0 },
    { nameKo: '18방 큐리본', sortOrder: 1 },
    { nameKo: '1방 네모', sortOrder: 2 },
    { nameKo: '4방 클로버', sortOrder: 3 },
    { nameKo: '2방 새싹', sortOrder: 4 },
  ]

  assert.deepEqual(
    [...products].sort(comparePiercingStoneCountAscending).map((product) => product.nameKo),
    ['1방 네모', '2방 새싹', '4방 클로버', '18방 큐리본', '방수 미확인'],
  )
})
