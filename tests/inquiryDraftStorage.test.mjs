import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearInquiryDraft,
  getInquiryDraftStorageKey,
  loadInquiryDraft,
  normalizeInquiryDraftItems,
  saveInquiryDraft,
} from '../src/commerce/inquiryDraftStorage.js'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
    values,
  }
}

const item = {
  productId: 'product-1',
  color: 'Gold',
  size: '6mm',
  selectedOptions: [
    { groupId: 'color', valueId: 'gold' },
    { groupId: 'bar-length', valueId: '6mm' },
    { groupId: 'gauge', valueId: '16g' },
  ],
  quantity: 1,
}

test('inquiry draft survives a provider reload for the same buyer only', () => {
  const storage = createStorage()

  saveInquiryDraft(storage, 'buyer-a', [item])

  assert.deepEqual(loadInquiryDraft(storage, 'buyer-a'), [item])
  assert.deepEqual(loadInquiryDraft(storage, 'buyer-b'), [])
})

test('inquiry draft persistence keeps only safe item fields', () => {
  assert.deepEqual(normalizeInquiryDraftItems([{
    ...item,
    ignored: 'not persisted',
    selectedOptions: [...item.selectedOptions, { groupId: '', valueId: 'bad' }],
  }]), [item])
  assert.deepEqual(normalizeInquiryDraftItems([{ productId: '', quantity: 1 }]), [])
  assert.deepEqual(normalizeInquiryDraftItems([{ productId: 'product-1', quantity: 0 }]), [])
})

test('empty, submitted, or signed-out inquiry drafts are removed', () => {
  const storage = createStorage()
  const key = getInquiryDraftStorageKey('buyer-a')

  saveInquiryDraft(storage, 'buyer-a', [item])
  saveInquiryDraft(storage, 'buyer-a', [])
  assert.equal(storage.values.has(key), false)

  saveInquiryDraft(storage, 'buyer-a', [item])
  clearInquiryDraft(storage, 'buyer-a')
  assert.equal(storage.values.has(key), false)
})
