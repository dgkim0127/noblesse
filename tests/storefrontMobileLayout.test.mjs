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
  assert.match(mobile, /:where\(html, body\):has\(\.site-shell:not\(\.admin-route-shell\)\)[\s\S]*scrollbar-width: none !important/)
  assert.match(mobile, /:where\(html, body\):has\(\.site-shell:not\(\.admin-route-shell\)\)::\-webkit-scrollbar[\s\S]*display: none !important/)
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
  assert.match(home, /sizes="\(max-width: 760px\) 100vw/)
  assert.match(mobile, /--showcase-reference-card: 100vw !important/)
  assert.match(mobile, /\.home-showcase-grid \{[\s\S]*padding: 0 !important;[\s\S]*scroll-padding-inline: 0 !important/)
  assert.match(mobile, /\.home-showcase-panel \{[\s\S]*flex: 0 0 100vw !important;[\s\S]*width: 100vw !important/)
  assert.match(mobile, /aspect-ratio: 4 \/ 5 !important/)
  assert.match(mobile, /scroll-snap-type: x mandatory !important/)
})

test('mobile tabs stay compact and account owns the sign-out action', () => {
  assert.match(mobile, /\.home-showcase-categories \{[\s\S]*display: grid !important;[\s\S]*grid-auto-flow: column !important;[\s\S]*grid-template-rows: repeat\(2, 38px\) !important/)
  assert.match(mobile, /\.home-showcase-categories a \{[\s\S]*width: 108px !important;[\s\S]*min-height: 38px !important/)
  assert.match(mobile, /\.home-showcase-categories a \.home-category-icon,[\s\S]*width: 18px !important;[\s\S]*height: 18px !important/)
  assert.match(mobile, /\.home-showcase-categories a b \{[\s\S]*max-width: calc\(100% - 23px\) !important;[\s\S]*text-overflow: ellipsis !important/)
  assert.match(mobile, /\.home-section-nav button,[\s\S]*min-height: 44px !important/)
  assert.match(account, /className="account-mobile-logout"/)
  assert.match(account, /await signOut\(\)[\s\S]*navigate\(toLocalePath\('\/'\)\)/)
})

test('product cards use a localized product badge instead of a generic B2B label', () => {
  assert.match(home, /const defaultProductBadgeLabel = \{[\s\S]*kr: '피어싱',[\s\S]*en: 'PIERCING'/)
  assert.match(home, /productBadge\.toUpperCase\(\) !== 'B2B'[\s\S]*resolveLocaleCopy\(defaultProductBadgeLabel, locale, 'en'\)/)
})

test('mobile language flag stays centered with a corner dropdown cue', () => {
  assert.match(mobile, /\.language-dropdown-trigger \.flag-icon \{[\s\S]*left: 50% !important;[\s\S]*translate\(-50%, -50%\)/)
  assert.match(mobile, /\.language-dropdown-trigger svg \{[\s\S]*right: 1px !important;[\s\S]*bottom: 3px !important/)
})

test('mobile brand keeps every locale name visible and vertically centered', () => {
  assert.match(mobile, /\.brand \{[\s\S]*max-width: 132px !important/)
  assert.match(mobile, /\.brand \.brand-name-window \{[\s\S]*display: inline-grid !important;[\s\S]*align-items: center !important;[\s\S]*max-width: 86px !important/)
  assert.match(mobile, /@media \(max-width: 360px\)[\s\S]*\.brand \.brand-name-window \{[\s\S]*max-width: 78px !important/)
})
