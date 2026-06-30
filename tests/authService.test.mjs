import assert from 'node:assert/strict'
import test from 'node:test'
import { isSafeLoginIdentifier, normalizeSignInIdentifier } from '../src/services/authIdentifiers.js'
import { resolveEmailForSignIn } from '../src/services/loginIdentifierResolver.js'

test('login identifier accepts email addresses unchanged', () => {
  assert.equal(normalizeSignInIdentifier(' buyer@example.com '), 'buyer@example.com')
})

test('login identifier keeps bare ID unchanged for backend resolution', () => {
  assert.equal(normalizeSignInIdentifier('dgkim0127'), 'dgkim0127')
})

test('login identifier rejects unsafe ID values', () => {
  assert.equal(isSafeLoginIdentifier('dgkim0127'), true)
  assert.equal(isSafeLoginIdentifier('two words'), false)
  assert.equal(isSafeLoginIdentifier('bad\nid'), false)
})

test('email sign-in bypasses backend resolver', async () => {
  const email = await resolveEmailForSignIn(' buyer@example.com ', {
    async resolveLoginIdentifier() {
      throw new Error('resolver should not run for email')
    }
  })

  assert.equal(email, 'buyer@example.com')
})

test('ID sign-in resolves email through backend without password', async () => {
  const calls = []
  const email = await resolveEmailForSignIn('dgkim0127', {
    async resolveLoginIdentifier(identifier) {
      calls.push(identifier)
      return 'admin@example.test'
    }
  })

  assert.deepEqual(calls, ['dgkim0127'])
  assert.equal(email, 'admin@example.test')
})

test('ID sign-in maps empty resolver response to generic Firebase credential failure', async () => {
  await assert.rejects(
    () => resolveEmailForSignIn('missing', { async resolveLoginIdentifier() { return '' } }),
    { code: 'auth/invalid-credential' }
  )
})
