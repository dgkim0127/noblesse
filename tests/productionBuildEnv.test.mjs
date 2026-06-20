import assert from 'node:assert/strict'
import test from 'node:test'
import { productionApiBaseUrl, requiredProductionBuildEnv, validateProductionBuildEnv } from '../scripts/validateProductionBuildEnv.mjs'

function validEnv(overrides = {}) {
  return {
    VITE_API_BASE_URL: productionApiBaseUrl,
    VITE_FIREBASE_API_KEY: 'public-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'pors-piercing-pos',
    VITE_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '112481687440',
    VITE_FIREBASE_APP_ID: '1:112481687440:web:7f363f389fd55608258515',
    ...overrides,
  }
}

test('production build env requires exact production API base and Firebase client config', () => {
  const result = validateProductionBuildEnv(validEnv())
  assert.equal(result.ok, true)
  assert.equal(result.code, 'PRODUCTION_BUILD_ENV_READY')
})

test('production build env fails closed when Firebase client config is missing', () => {
  const env = validEnv({ VITE_FIREBASE_API_KEY: '' })
  const result = validateProductionBuildEnv(env)
  assert.equal(result.ok, false)
  assert.equal(result.code, 'MISSING_PRODUCTION_BUILD_ENV')
  assert.deepEqual(result.missing, ['VITE_FIREBASE_API_KEY'])
})

test('production build env rejects staging or non-production API base URLs', () => {
  const result = validateProductionBuildEnv(validEnv({ VITE_API_BASE_URL: 'https://staging.example.com/api' }))
  assert.equal(result.ok, false)
  assert.equal(result.code, 'INVALID_PRODUCTION_API_BASE_URL')
})

test('production build env required key list stays explicit', () => {
  assert.deepEqual(requiredProductionBuildEnv, [
    'VITE_API_BASE_URL',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ])
})
