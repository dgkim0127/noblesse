import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/styles/storefront-typography.css', 'utf8')

test('storefront typography stylesheet loads after the legacy application styles', () => {
  const appCssIndex = app.indexOf("import './App.css'")
  const typographyIndex = app.indexOf("import './styles/storefront-typography.css'")

  assert.ok(appCssIndex >= 0)
  assert.ok(typographyIndex > appCssIndex)
})

test('storefront typography uses fluid type roles and excludes admin routes', () => {
  for (const token of ['--type-caption', '--type-small', '--type-body', '--type-card', '--type-heading', '--type-display', '--type-hero']) {
    assert.match(css, new RegExp(token))
  }

  assert.match(css, /\.site-shell:not\(\.admin-route-shell\)/)
  assert.doesNotMatch(css, /\.admin-(?:shell|page|workspace)/)
})

test('mobile typography keeps readable fields and dedicated compact type scales', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /@media \(max-width: 390px\)/)
  assert.match(css, /\.auth-form input,[\s\S]*font-size: 1rem;/)
  assert.match(css, /\.primary-action,[\s\S]*font-size: var\(--type-body\);/)
  assert.match(css, /\.catalog-body h3,[\s\S]*font-size: var\(--type-card\)/)
})
