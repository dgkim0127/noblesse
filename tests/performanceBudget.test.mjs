import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync('src/App.jsx', 'utf8')
const commerce = readFileSync('src/commerce/CommerceContext.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const budget = JSON.parse(readFileSync('performance-budget.json', 'utf8'))

test('account quote catalog detail and admin routes are loaded on demand', () => {
  for (const page of [
    'AccountPage',
    'HomePage',
    'InquiryListPage',
    'LoginPage',
    'MyInquiriesPage',
    'ProductDetailPage',
    'ProductsPage',
    'RegisterPage',
    'RequestQuotePage',
  ]) {
    assert.match(app, new RegExp(`lazyNamed\\(\\(\\) => import\\('\\./pages/${page}'\\)`))
    assert.doesNotMatch(app, new RegExp(`import \\{ ${page} \\} from`))
  }

  assert.match(app, /lazyNamed\(\(\) => import\('\.\/components\/AdminShell'\)/)
  assert.doesNotMatch(app, /import \{ AdminShell \} from/)
})

test('firebase authentication is split from the initial storefront shell', () => {
  assert.match(commerce, /import\('\.\.\/services\/authService'\)/)
  assert.doesNotMatch(commerce, /from '\.\.\/services\/authService'/)
})

test('mobile performance budget keeps initial payload and list rendering bounded', () => {
  assert.equal(budget.mobile.initialJavaScriptGzipKb, 250)
  assert.equal(budget.mobile.initialCssGzipKb, 50)
  assert.equal(budget.mobile.initialImageRequests, 12)
  assert.equal(budget.mobile.listZoomImageRequests, 0)
  assert.equal(budget.mobile.horizontalOverflowPx, 0)
})

test('home showcase auto-advances one image set without cloned carousel panels', () => {
  assert.match(home, /homeShowcase\?\.length/)
  assert.match(home, /homeShowcase\.map\(normalizeManagedShowcasePanel\)/)
  assert.match(home, /showcasePanels\.map/)
  assert.doesNotMatch(home, /showcaseLoopPanels/)
  assert.doesNotMatch(home, /\.\.\.homeShowcasePanels, \.\.\.homeShowcasePanels/)
  assert.match(home, /window\.setTimeout\(advanceShowcase, delay\)/)
  assert.match(home, /prefers-reduced-motion: reduce/)
  assert.match(home, /home-showcase-control--autoplay/)
  assert.match(home, /buyerConceptPanels\.map/)
  assert.doesNotMatch(home, /\.\.\.buyerConceptPanels/)
  assert.doesNotMatch(home, /setInterval\(slide/)
})

test('home defers alternate product images and serves responsive showcase images', () => {
  assert.match(home, /const \[shouldLoadAlternateImages, setShouldLoadAlternateImages\] = useState\(false\)/)
  assert.match(home, /const visibleCardImages = shouldLoadAlternateImages \? cardImages : cardImages\.slice\(0, 1\)/)
  assert.match(home, /onPointerEnter=\{revealAlternateImages\}/)
  assert.match(home, /\{visibleCardImages\.map/)
  assert.match(home, /sizes="\(max-width: 760px\)/)
  assert.match(home, /fetchPriority=\{index === 0 \? 'high' : 'auto'\}/)
})
