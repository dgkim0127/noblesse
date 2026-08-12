import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  getExplicitCatalogProductTabKey,
  isCatalogProductTabExplicitlySelected,
} from '../src/utils/catalogProductTabs.js'

const tabs = [
  { key: 'all', clear: true },
  { key: 'cubicLine', param: 'decoration', value: 'cubic' },
  { key: 'syntheticGem', param: 'decoration', value: 'synthetic_gem' },
  { key: 'dropAntique', param: 'style', values: ['drop', 'antique'] },
]

test('direct decoration query keeps the synthetic gem tab and breadcrumb label active', () => {
  const searchParams = new URLSearchParams('baseMaterial=silver925&decoration=synthetic_gem')

  assert.equal(getExplicitCatalogProductTabKey(tabs, searchParams), 'syntheticGem')
  assert.equal(isCatalogProductTabExplicitlySelected(tabs[1], searchParams), false)
  assert.equal(isCatalogProductTabExplicitlySelected(tabs[2], searchParams), true)
})

test('compound tabs require every value to be present in the URL', () => {
  assert.equal(getExplicitCatalogProductTabKey(tabs, new URLSearchParams('style=drop')), '')
  assert.equal(
    getExplicitCatalogProductTabKey(tabs, new URLSearchParams('style=drop&style=antique')),
    'dropAntique',
  )
})

test('silver and brass cubic line tabs filter cubic products instead of the narrower setting style', () => {
  const page = readFileSync('src/pages/ProductsPage.jsx', 'utf8')
  const cubicDecorationTabs = page.match(/key: 'cubicLine', param: 'decoration', value: 'cubic'/g) || []

  assert.equal(cubicDecorationTabs.length, 2)
  assert.doesNotMatch(page, /key: 'cubicLine', param: 'style', value: 'cubic_setting'/)
  assert.match(page, /key: 'cubicSetting', param: 'style', value: 'cubic_setting'/)
})
