import assert from 'node:assert/strict'
import test from 'node:test'
import {
  currencyMinorUnits,
  formatCurrency,
  getDisplayCurrency,
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
  assert.equal(getDisplayCurrency({ locale: 'cn' }), 'CNY')
  assert.equal(getDisplayCurrency({ locale: 'kr', viewer: { currency: 'CNY', assignedMarket: 'CN' } }), 'CNY')
})

test('market currency pairs reject cross-market fallback combinations', () => {
  for (const [market, currency] of [['KR', 'KRW'], ['JP', 'JPY'], ['US', 'USD'], ['CN', 'CNY'], ['GLOBAL', 'USD']]) {
    assert.equal(isValidMarketCurrencyPair(market, currency), true)
    assert.equal(validateMarketCurrencyPair(market, currency), true)
  }

  for (const [market, currency] of [['CN', 'JPY'], ['JP', 'CNY'], ['KR', 'USD'], ['US', 'KRW']]) {
    assert.equal(isValidMarketCurrencyPair(market, currency), false)
    assert.equal(validateMarketCurrencyPair(market, currency), false)
  }
})

test('currency formatter keeps minor units explicit', () => {
  assert.equal(currencyMinorUnits.KRW, 0)
  assert.equal(currencyMinorUnits.JPY, 0)
  assert.equal(currencyMinorUnits.USD, 2)
  assert.equal(currencyMinorUnits.CNY, 2)
  assert.match(formatCurrency(1200.56, 'KRW'), /1,201/)
  assert.match(formatCurrency(1200.56, 'JPY'), /1,201/)
  assert.match(formatCurrency(12, 'USD'), /12\.00/)
  assert.match(formatCurrency(12, 'CNY', { showCode: true }), /CNY$/)
})
