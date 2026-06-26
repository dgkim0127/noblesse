import assert from 'node:assert/strict'
import test from 'node:test'
import {
  currencyMinorUnits,
  formatAdminPriceBook,
  formatCurrency,
  formatCurrencyAmount,
  formatMarketLabel,
  getDisplayCurrency,
  getMarketDisplay,
  isValidMarketCurrencyPair,
  marketCurrency,
  supportedCurrencies,
  supportedMarkets,
} from '../src/config/currency.js'
import {
  CURRENCIES,
  CURRENCY_BY_MARKET,
  MARKETS,
  validateMarketCurrencyPair,
} from '../backend/src/config/pricing.js'

test('frontend and backend pricing mappings stay in parity', () => {
  assert.deepEqual(supportedMarkets, MARKETS)
  assert.deepEqual(supportedCurrencies, CURRENCIES)
  assert.deepEqual(marketCurrency, CURRENCY_BY_MARKET)
})

test('locale and buyer currency choose display currency deterministically', () => {
  assert.equal(getDisplayCurrency({ locale: 'kr' }), 'KRW')
  assert.equal(getDisplayCurrency({ locale: 'jp' }), 'JPY')
  assert.equal(getDisplayCurrency({ locale: 'en' }), 'USD')
  assert.equal(getDisplayCurrency({ locale: 'zh-TW' }), 'TWD')
  assert.equal(getDisplayCurrency({ locale: 'cn' }), 'TWD')
  assert.equal(getDisplayCurrency({ locale: 'kr', viewer: { currency: 'TWD', assignedMarket: 'TW' } }), 'TWD')
})

test('market currency pairs reject cross-market fallback combinations', () => {
  for (const [market, currency] of [['KR', 'KRW'], ['JP', 'JPY'], ['US', 'USD'], ['TW', 'TWD'], ['GLOBAL', 'USD']]) {
    assert.equal(isValidMarketCurrencyPair(market, currency), true)
    assert.equal(validateMarketCurrencyPair(market, currency), true)
  }

  for (const [market, currency] of [['TW', 'JPY'], ['JP', 'TWD'], ['KR', 'USD'], ['US', 'KRW']]) {
    assert.equal(isValidMarketCurrencyPair(market, currency), false)
    assert.equal(validateMarketCurrencyPair(market, currency), false)
  }
})

test('currency formatter keeps minor units explicit', () => {
  assert.equal(currencyMinorUnits.KRW, 0)
  assert.equal(currencyMinorUnits.JPY, 0)
  assert.equal(currencyMinorUnits.USD, 2)
  assert.equal(currencyMinorUnits.TWD, 2)
  assert.match(formatCurrency(1200.56, 'KRW'), /1,201/)
  assert.match(formatCurrency(1200.56, 'JPY'), /1,201/)
  assert.match(formatCurrency(12, 'USD'), /12\.00/)
  assert.match(formatCurrency(12, 'TWD', { showCode: true }), /TWD$/)
})

test('currency formatter keeps missing values unavailable instead of zero', () => {
  assert.equal(formatCurrency(null, 'KRW'), null)
  assert.equal(formatCurrency(undefined, 'JPY'), null)
  assert.equal(formatCurrency('', 'USD'), null)
  assert.equal(formatCurrencyAmount(Number.NaN, 'TWD'), null)
  assert.match(formatCurrency(0, 'USD'), /0\.00/)
  assert.equal(formatCurrencyAmount(0, 'KRW'), '0')
})

test('admin price display uses suffix units and readable amounts', () => {
  assert.equal(formatCurrencyAmount(11000, 'KRW'), '11,000')
  assert.deepEqual(formatAdminPriceBook({ currency: 'KRW', wholesalePrice: 11000 }), {
    amount: '11,000',
    currency: 'KRW',
    flagLabel: 'Korea',
    flagSrc: '/flags/kr.svg',
    market: 'KR',
    symbol: '\u20a9',
  })
  assert.deepEqual(formatAdminPriceBook({ currency: 'USD', wholesalePrice: 8.8 }), {
    amount: '8.80',
    currency: 'USD',
    flagLabel: 'United States',
    flagSrc: '/flags/us.svg',
    market: 'US',
    symbol: '$',
  })
  assert.deepEqual(formatAdminPriceBook({ currency: 'TWD', wholesalePrice: 258.5 }), {
    amount: '258.50',
    currency: 'TWD',
    flagLabel: 'Taiwan',
    flagSrc: '/flags/tw.svg',
    market: 'TW',
    symbol: 'NT$',
  })
})

test('market display uses flag assets instead of visible market codes', () => {
  assert.deepEqual(getMarketDisplay('KR'), { flagSrc: '/flags/kr.svg', label: 'Korea' })
  assert.deepEqual(getMarketDisplay('JP'), { flagSrc: '/flags/jp.svg', label: 'Japan' })
  assert.deepEqual(getMarketDisplay('US'), { flagSrc: '/flags/us.svg', label: 'United States' })
  assert.deepEqual(getMarketDisplay('TW'), { flagSrc: '/flags/tw.svg', label: 'Taiwan' })
  assert.equal(formatMarketLabel('GLOBAL'), 'Global')
})
