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
  assert.equal(localeMeta['zh-TW'].flag, '🇹🇼')
  assert.equal(localeMeta['zh-TW'].languageLabel, '繁體中文（台灣）')
})

test('legacy Chinese locale identifiers migrate to zh-TW', () => {
  for (const legacyLocale of ['cn', 'zh-CN', 'zh-Hans', 'chinese']) {
    assert.equal(canonicalizeLocale(legacyLocale), 'zh-TW')
    assert.equal(getLocaleContentKey(legacyLocale), 'cn')
  }
  assert.equal(getLocaleFromPathname('/cn/products'), 'zh-TW')
  assert.equal(getLocaleFromPathname('/zh-CN/register'), 'zh-TW')
  assert.equal(buildLocalizedPath('/products?tag=new', 'cn', true), '/zh-TW/products?tag=new')
  assert.equal(languagePreferenceKey, 'noblesse:locale')
})

test('Taiwan locale does not change CN market or CNY currency behavior', () => {
  assert.equal(getDisplayCurrency({ locale: 'zh-TW' }), 'CNY')
  assert.equal(getDisplayCurrency({ locale: 'cn' }), 'CNY')
})

test('Taiwan locale displays Traditional Chinese terms', () => {
  assert.equal(localizeText('中国 简体中文 登录 搜索 价格 产品 管理员', 'zh-TW'), '台灣 繁體中文 登入 搜尋 價格 商品 管理員')
})
