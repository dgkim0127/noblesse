import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('home product sections do not backfill empty merchandising slots with unrelated products', () => {
  const page = readWorkspaceFile('src/pages/HomePage.jsx')

  assert.doesNotMatch(page, /_fillHomeSectionProducts/)
  assert.match(page, /const newProducts = homeProducts\.filter\(\(product\) => product\.isNew\)/)
  assert.match(page, /const weeklyProducts = homeProducts\.filter\(\(product\) => product\.isBest\)/)
  assert.match(page, /if \(products\.length === 0 \|\| sectionProducts\.length === 0\) return null/)
})

test('home navigation only includes sections with visible content', () => {
  const page = readWorkspaceFile('src/pages/HomePage.jsx')

  assert.match(page, /const activeHomeSectionNav = useMemo\(\(\) => homeSectionNav\.filter/)
  assert.match(page, /if \(item\.id === 'new-arrival'\) return newProducts\.length > 0/)
  assert.match(page, /if \(item\.id === 'weekly-pick'\) return weeklyProducts\.length > 0/)
  assert.match(page, /if \(item\.id === 'piercing-catalog'\) return piercingCatalogProducts\.length > 0/)
  assert.match(page, /if \(item\.id === 'steady-selection'\) return steadySelectionProducts\.length > 0/)
  assert.match(page, /\{activeHomeSectionNav\.map\(\(item\) => <button/)
})

test('home section tabs hide empty taxonomy filters instead of showing blank panels', () => {
  const page = readWorkspaceFile('src/pages/HomePage.jsx')

  assert.match(page, /const visibleSubtabs = sectionTabFilters\.length > 0/)
  assert.match(page, /\.filter\(\(tab\) => tab\.filter && products\.some\(\(product\) => productMatchesTabFilter\(product, tab\.filter\)\)\)/)
  assert.match(page, /\{visibleSubtabs\.map\(\(tab, index\) => <button/)
})
