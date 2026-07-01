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

test('ID sign-in can fall back to a configured default email domain', async () => {
  const email = await resolveEmailForSignIn('dgkim0127', {
    fallbackEmailDomains: ['gmail.com'],
    async resolveLoginIdentifier() {
      const error = new Error('not found')
      error.status = 401
      error.code = 'UNAUTHORIZED'
      throw error
    }
  })

  assert.equal(email, 'dgkim0127@gmail.com')
})

test('ID sign-in does not fall back for network resolver failures', async () => {
  await assert.rejects(
    () => resolveEmailForSignIn('dgkim0127', {
      fallbackEmailDomains: ['gmail.com'],
      async resolveLoginIdentifier() {
        const error = new Error('network unavailable')
        error.code = 'NETWORK_ERROR'
        throw error
      }
    }),
    { code: 'NETWORK_ERROR' }
  )
})
