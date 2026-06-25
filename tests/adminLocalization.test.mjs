import assert from 'node:assert/strict'
import test from 'node:test'
import { adminCopy, adminLocales, getAdminRuntimeKind } from '../src/pages/admin/adminCopy.js'
import { supportedLocales } from '../src/utils/locale.js'

function flattenShape(value, prefix = '') {
  if (Array.isArray(value)) return [`${prefix}[]`]
  if (!value || typeof value !== 'object') return [prefix]
  return Object.keys(value).flatMap((key) => flattenShape(value[key], prefix ? `${prefix}.${key}` : key))
}

test('admin localization covers every supported locale', () => {
  assert.deepEqual(adminLocales.toSorted(), supportedLocales.toSorted())
  assert.deepEqual(adminLocales.toSorted(), ['en', 'jp', 'kr', 'zh-TW'])
  assert.equal(adminCopy.cn, undefined)
})

test('admin localization keys are complete across locales', () => {
  const enShape = flattenShape(adminCopy.en).sort()
  for (const locale of supportedLocales) {
    assert.deepEqual(flattenShape(adminCopy[locale]).sort(), enShape, locale)
  }
})

test('admin Taiwan locale exposes localized management labels', () => {
  assert.equal(typeof adminCopy['zh-TW'].shell.nav.dashboard, 'string')
  assert.equal(typeof adminCopy['zh-TW'].shell.nav.catalogEntry, 'string')
  assert.equal(adminCopy['zh-TW'].shell.badge.production, adminCopy['zh-TW'].shell.badge.production.trim())
  assert.notEqual(adminCopy['zh-TW'].shell.badge.production, adminCopy.en.shell.badge.production)
  assert.equal(adminCopy.en.shell.badge.staging, 'Staging API')
  assert.notEqual(adminCopy.kr.shell.badge.production, adminCopy.kr.shell.badge.staging)
})

test('admin runtime kind treats release API as production', () => {
  assert.equal(getAdminRuntimeKind({ dataMode: 'api', isProd: true, apiBaseUrl: '/api', stagingLabel: 'release-api' }), 'production')
  assert.equal(getAdminRuntimeKind({ dataMode: 'api', isProd: true, apiBaseUrl: 'https://noblesse.web.app/api', stagingLabel: 'production' }), 'production')
  assert.equal(getAdminRuntimeKind({ dataMode: 'api', isProd: false, apiBaseUrl: 'https://staging.example.test/api', stagingLabel: 'staging' }), 'staging')
  assert.equal(getAdminRuntimeKind({ dataMode: 'mock', isProd: false, apiBaseUrl: '/api', stagingLabel: 'development' }), 'development')
})
