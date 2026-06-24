import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSignInIdentifier } from '../src/services/authIdentifiers.js'

test('login identifier accepts email addresses unchanged', () => {
  assert.equal(normalizeSignInIdentifier(' buyer@example.com '), 'buyer@example.com')
})

test('login identifier maps bare ID to the default email domain', () => {
  assert.equal(normalizeSignInIdentifier('dgkim0127'), 'dgkim0127@gmail.com')
})
