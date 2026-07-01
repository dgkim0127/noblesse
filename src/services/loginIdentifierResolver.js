import { createAuthApi } from '../api/authApi.js'
import { createApiClient } from '../api/client.js'
import { isEmailIdentifier, isSafeLoginIdentifier, normalizeSignInIdentifier } from './authIdentifiers.js'

function isUnresolvedIdentifierError(error) {
  return error?.status === 401 || error?.code === 'UNAUTHORIZED' || error?.code === 'auth/invalid-credential'
}

function buildFallbackEmail(identifier, fallbackEmailDomains = []) {
  const domain = fallbackEmailDomains
    .map((value) => String(value || '').trim().toLowerCase())
    .find((value) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value))
  return domain ? `${identifier}@${domain}` : ''
}

export async function resolveEmailForSignIn(
  identifier,
  { apiBaseUrl = '/api', resolveLoginIdentifier, fallbackEmailDomains = [] } = {}
) {
  const value = normalizeSignInIdentifier(identifier)
  if (!value) return ''
  if (!isSafeLoginIdentifier(value)) {
    const error = new Error('Invalid login identifier.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  if (isEmailIdentifier(value)) return value

  const resolver = resolveLoginIdentifier || createAuthApi(createApiClient({ baseUrl: apiBaseUrl })).resolveLoginIdentifier
  let email = ''
  try {
    email = await resolver(value)
  } catch (error) {
    if (!isUnresolvedIdentifierError(error)) throw error
  }
  if (!email) {
    const fallbackEmail = buildFallbackEmail(value, fallbackEmailDomains)
    if (fallbackEmail) return fallbackEmail

    const error = new Error('Invalid login credentials.')
    error.code = 'auth/invalid-credential'
    throw error
  }
  return email
}
