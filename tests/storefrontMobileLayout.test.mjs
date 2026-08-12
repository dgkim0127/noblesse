import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync('src/App.jsx', 'utf8')
const account = readFileSync('src/pages/AccountPage.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const mobile = readFileSync('src/styles/storefront-mobile.css', 'utf8')

test('mobile overrides load last and stay scoped away from admin routes', () => {
  const typographyIndex = app.indexOf("import './styles/storefront-typography.css'")
  const mobileIndex = app.indexOf("import './styles/storefront-mobile.css'")

  assert.ok(typographyIndex >= 0)
  assert.ok(mobileIndex > typographyIndex)
  assert.match(mobile, /@media \(max-width: 760px\)/)
  assert.match(mobile, /\.site-shell:not\(\.admin-route-shell\)/)
  assert.match(mobile, /> \.top-marquee \{[\s\S]*display: none !important/)
})

test('mobile header uses two rows before scroll and one compact row after scroll', () => {
  assert.match(mobile, /grid-template-rows: 44px 48px !important/)
  assert.match(mobile, /grid-row: 2 !important;[\s\S]*display: block !important/)
  assert.match(mobile, /button\.header-guest-my-action,[\s\S]*button\.header-logout-action \{[\s\S]*display: none !important/)
  assert.match(mobile, /\.has-compact-header \.header-main,[\s\S]*grid-template-rows: 48px !important/)
  assert.match(mobile, /\.has-compact-header \.header-actions button\.compact-search-action,[\s\S]*display: inline-grid !important/)
  assert.match(mobile, /\.has-compact-header > \.site-header,[\s\S]*position: fixed !important/)
  assert.match(mobile, /\.has-compact-header \{[\s\S]*padding-top: 116px !important/)
})

test('mobile showcase renders one 4 by 5 card with synchronized dots', () => {
  assert.match(home, /const \[activeShowcaseIndex, setActiveShowcaseIndex\] = useState\(0\)/)
  assert.match(home, /onScroll=\{handleShowcaseScroll\}/)
  assert.match(home, /className="home-showcase-dots"/)
  assert.match(home, /onClick=\{\(\) => scrollShowcaseToIndex\(index\)\}/)
  assert.match(home, /sizes="\(max-width: 760px\) calc\(100vw - 24px\)/)
  assert.match(mobile, /--showcase-reference-card: calc\(100vw - 24px\) !important/)
  assert.match(mobile, /aspect-ratio: 4 \/ 5 !important/)
  assert.match(mobile, /scroll-snap-type: x mandatory !important/)
})

test('mobile tabs meet touch sizing and account owns the sign-out action', () => {
  assert.match(mobile, /\.home-showcase-categories a \{[\s\S]*min-height: 44px !important/)
  assert.match(mobile, /\.home-section-nav button,[\s\S]*min-height: 44px !important/)
  assert.match(account, /className="account-mobile-logout"/)
  assert.match(account, /await signOut\(\)[\s\S]*navigate\(toLocalePath\('\/'\)\)/)
})
