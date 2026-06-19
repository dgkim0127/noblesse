import assert from 'node:assert/strict'
import test from 'node:test'
import { getInquiryKey, getInquiryRoutePath } from '../src/commerce/inquiryKeys.js'

test('inquiry key supports backend inquiry id', () => {
  assert.equal(getInquiryKey({ id: '4bb5f7b3-9f3a-4d6a-b1ad-e8a0f5d4a651' }), '4bb5f7b3-9f3a-4d6a-b1ad-e8a0f5d4a651')
})

test('inquiry key keeps existing mock inquiry id first', () => {
  assert.equal(getInquiryKey({ inquiryId: 'INQ-20260619-001', id: 'uuid-1', inquiryNumber: 'INQ-visible' }), 'INQ-20260619-001')
})

test('inquiry key falls back to inquiry number', () => {
  assert.equal(getInquiryKey({ inquiryNumber: 'INQ-20260619-002' }), 'INQ-20260619-002')
})

test('inquiry route path encodes selected inquiry key', () => {
  assert.equal(getInquiryRoutePath({ inquiryNumber: 'INQ 20260619/002' }), '/my-inquiries/INQ%2020260619%2F002')
})

test('inquiry route path falls back to list when no key exists', () => {
  assert.equal(getInquiryRoutePath(null), '/my-inquiries')
  assert.equal(getInquiryRoutePath({}), '/my-inquiries')
})
