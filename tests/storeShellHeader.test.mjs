import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('header renders the inquiry list as a cart-style action with an item count', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')
  const styles = readWorkspaceFile('src/App.css')

  assert.match(shell, /ShoppingCart/)
  assert.match(shell, /function InquiryListHeaderAction/)
  assert.match(shell, /className="inquiry-list-header-action"/)
  assert.match(shell, /className="inquiry-list-count"/)
  assert.match(styles, /\.inquiry-list-header-action/)
  assert.match(styles, /\.inquiry-list-count/)
})

test('admin my-inquiries header action opens the admin inquiry queue', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.match(shell, /const myInquiriesPath = isAdmin \? '\/admin\/inquiries' : '\/my-inquiries'/)
  assert.match(shell, /<IconAction className="header-side-icon" label=\{sideCopy\.myInquiries\} to=\{toLocalePath\(myInquiriesPath\)\}><Clock3 size=\{17\} \/><\/IconAction>/)
})

test('logged-in header has an explicit sign-out action that returns home', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.match(shell, /import \{[^}]*LogOut[^}]*\} from 'lucide-react'/)
  assert.match(shell, /const handleHeaderSignOut = async \(\) => \{[\s\S]*await signOut\(\)[\s\S]*navigate\(toLocalePath\('\/'\)\)[\s\S]*\}/)
  assert.match(shell, /\{!isGuest && <IconAction label=\{copy\.logout\} onClick=\{handleHeaderSignOut\}><LogOut size=\{18\} \/><\/IconAction>\}/)
})

test('login modal submit action keeps visible contrast in every button state', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')
  const styles = readWorkspaceFile('src/App.css')

  assert.match(shell, /className="primary-action login-submit-action"/)
  assert.match(styles, /\.login-modal \.login-submit-action \{[\s\S]*color: #fff;[\s\S]*background: #2a2457;[\s\S]*opacity: 1;/)
  assert.match(styles, /\.login-modal \.login-submit-action:disabled \{[\s\S]*color: #5f586a;[\s\S]*background: #e8e4ec;[\s\S]*opacity: 1;/)
})

test('header icon actions do not show browser title tooltips', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.doesNotMatch(shell, /title=\{label\}/)
  assert.doesNotMatch(shell, /title=\{copy\.search\}/)
  assert.match(shell, /aria-label=\{label\}/)
})

test('pending state does not render a visible header status strip', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.doesNotMatch(shell, /\{isPending && <div className="header-lower"/)
  assert.doesNotMatch(shell, /<NavLink to=\{toLocalePath\('\/approval-pending'\)\}>\{copy\.pending\}<\/NavLink>/)
})

test('mock preview controls are not rendered in the storefront shell', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.match(shell, /const shouldShowPreviewControls = false/)
  assert.match(shell, /\{shouldShowPreviewControls && isMockMode && !isPreviewBarHidden && <div className="preview-bar"/)
  assert.match(shell, /\{shouldShowPreviewControls && isMockMode && <button/)
})

test('admin routes do not run storefront scroll-collapse behavior', () => {
  const shell = readWorkspaceFile('src/components/StoreShell.jsx')

  assert.match(shell, /const isAdminRoute = \/\^\\\/admin\(\?:\\\/\|\$\)\//)
  assert.match(shell, /useEffect\(\(\) => \{\s+if \(isAdminRoute\) \{[\s\S]*setIsMarqueeCollapsed\(false\)[\s\S]*setIsHeaderCompact\(false\)[\s\S]*return undefined/)
  assert.match(shell, /useEffect\(\(\) => \{\s+if \(isAdminRoute\) return undefined\s+\s*let wheelLock = false/)
})
