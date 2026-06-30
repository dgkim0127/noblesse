import { createAuthApi } from '../api/authApi.js'
import { createApiClient } from '../api/client.js'
import { isEmailIdentifier, isSafeLoginIdentifier, normalizeSignInIdentifier } from './authIdentifiers.js'

export async function resolveEmailForSignIn(identifier, { apiBaseUrl = '/api', resolveLoginIdentifier } = {}) {
  const value = normalizeSignInIdentifier(identifier)
  if (!value) return ''
  if (!isSafeLoginIdentifier(value)) {
    const error = new Error('Invalid login identifier.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  if (isEmailIdentifier(value)) return value

  const resolver = resolveLoginIdentifier || createAuthApi(createApiClient({ baseUrl: apiBaseUrl })).resolveLoginIdentifier
  const email = await resolver(value)
  if (!email) {
    const error = new Error('Invalid login credentials.')
    error.code = 'auth/invalid-credential'
    throw error
  }
  return email
}
