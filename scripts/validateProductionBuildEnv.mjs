import { fileURLToPath } from 'node:url'

export const productionApiBaseUrl = 'https://noblesse.web.app/api'

export const requiredProductionBuildEnv = [
  'VITE_API_BASE_URL',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export function validateProductionBuildEnv(env = process.env) {
  const missing = requiredProductionBuildEnv.filter((name) => !String(env[name] || '').trim())
  if (missing.length > 0) {
    return { ok: false, code: 'MISSING_PRODUCTION_BUILD_ENV', missing }
  }

  const apiBaseUrl = String(env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
  if (apiBaseUrl !== productionApiBaseUrl) {
    return { ok: false, code: 'INVALID_PRODUCTION_API_BASE_URL' }
  }

  const joined = requiredProductionBuildEnv.map((name) => String(env[name] || '')).join(' ')
  if (/staging|localhost|127\.0\.0\.1/i.test(joined)) {
    return { ok: false, code: 'UNSAFE_PRODUCTION_BUILD_ENV' }
  }

  return { ok: true, code: 'PRODUCTION_BUILD_ENV_READY' }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = validateProductionBuildEnv()
  if (!result.ok) {
    const suffix = result.missing?.length ? `: ${result.missing.join(', ')}` : ''
    console.error(`${result.code}${suffix}`)
    process.exit(1)
  }

  console.log(result.code)
}
