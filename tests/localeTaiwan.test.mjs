import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLocalizedPath,
  canonicalizeLocale,
  getLocaleContentKey,
  getLocaleFromPathname,
  languagePreferenceKey,
  localeMeta,
  localizeText,
  supportedLocales,
  taiwanLocale,
} from '../src/utils/locale.js'
import { getDisplayCurrency } from '../src/config/currency.js'

test('Taiwan Traditional Chinese is the only active Chinese UI locale', () => {
  assert.equal(taiwanLocale, 'zh-TW')
  assert.deepEqual(supportedLocales, ['kr', 'en', 'jp', 'zh-TW'])
  assert.equal(supportedLocales.includes('cn'), false)
  assert.equal(typeof localeMeta['zh-TW'].flag, 'string')
  assert.equal(typeof localeMeta['zh-TW'].languageLabel, 'string')
})

test('legacy Chinese locale identifiers migrate to zh-TW', () => {
  for (const legacyLocale of ['cn', 'zh-CN', 'zh-Hans', 'chinese']) {
    assert.equal(canonicalizeLocale(legacyLocale), 'zh-TW')
    assert.equal(getLocaleContentKey(legacyLocale), 'cn')
  }
  assert.equal(getLocaleFromPathname('/cn/products'), 'zh-TW')
  assert.equal(getLocaleFromPathname('/zh-TW/products/NB-4WAY-GREEN-CLOVER-BARBELL'), 'zh-TW')
  assert.equal(getLocaleFromPathname('/zh-CN/register'), 'zh-TW')
  assert.equal(buildLocalizedPath('/products?tag=new', 'cn', true), '/zh-TW/products?tag=new')
  assert.equal(buildLocalizedPath('/products/NB-4WAY-GREEN-CLOVER-BARBELL', 'zh-TW', true), '/zh-TW/products/NB-4WAY-GREEN-CLOVER-BARBELL')
  assert.equal(languagePreferenceKey, 'noblesse:locale')
})

test('Taiwan locale maps active Chinese UI to TW market currency behavior', () => {
  assert.equal(getDisplayCurrency({ locale: 'zh-TW' }), 'TWD')
  assert.equal(getDisplayCurrency({ locale: 'cn' }), 'TWD')
})

test('Taiwan locale leaves unmapped neutral text unchanged', () => {
  assert.equal(localizeText('Noblesse', 'zh-TW'), 'Noblesse')
})
