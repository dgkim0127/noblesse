import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveRegistrationCredential } from '../src/services/registrationCredential.js'

function authService(overrides = {}) {
  return {
    getCurrentAuthUser: () => null,
    registerWithCredentials: async () => ({ user: { uid: 'new-user', email: 'buyer@example.test' } }),
    signInWithCredentials: async () => ({ user: { uid: 'existing-user', email: 'buyer@example.test' } }),
    ...overrides,
  }
}

test('registration creates a new Firebase account when the email is unused', async () => {
  const result = await resolveRegistrationCredential({
    authService: authService(),
    email: 'buyer@example.test',
    password: 'Password1!',
  })

  assert.equal(result.credential.user.uid, 'new-user')
  assert.equal(result.existingFirebaseAccount, false)
})

test('registration reuses the signed-in account when the email matches', async () => {
  let createCalls = 0
  const result = await resolveRegistrationCredential({
    authService: authService({
      getCurrentAuthUser: () => ({ uid: 'current-user', email: 'Buyer@Example.test' }),
      registerWithCredentials: async () => {
        createCalls += 1
        return null
      },
    }),
    email: 'buyer@example.test',
    password: 'Password1!',
  })

  assert.equal(result.credential.user.uid, 'current-user')
  assert.equal(result.existingFirebaseAccount, true)
  assert.equal(createCalls, 0)
})

test('registration blocks a different signed-in account before creating another account', async () => {
  await assert.rejects(
    resolveRegistrationCredential({
      authService: authService({
        getCurrentAuthUser: () => ({ uid: 'current-user', email: 'other@example.test' }),
      }),
      email: 'buyer@example.test',
      password: 'Password1!',
    }),
    (error) => error?.code === 'REGISTRATION_SESSION_CONFLICT'
  )
})

test('registration signs in and resumes when Firebase reports an existing email', async () => {
  const result = await resolveRegistrationCredential({
    authService: authService({
      registerWithCredentials: async () => {
        const error = new Error('already used')
        error.code = 'auth/email-already-in-use'
        throw error
      },
    }),
    email: 'buyer@example.test',
    password: 'Password1!',
    apiBaseUrl: 'https://example.test/api',
  })

  assert.equal(result.credential.user.uid, 'existing-user')
  assert.equal(result.existingFirebaseAccount, true)
})

test('registration preserves the duplicate error when existing-account sign-in fails', async () => {
  await assert.rejects(
    resolveRegistrationCredential({
      authService: authService({
        registerWithCredentials: async () => {
          const error = new Error('already used')
          error.code = 'auth/email-already-in-use'
          throw error
        },
        signInWithCredentials: async () => {
          throw new Error('wrong password')
        },
      }),
      email: 'buyer@example.test',
      password: 'WrongPassword1!',
    }),
    (error) => error?.code === 'auth/email-already-in-use'
  )
})
