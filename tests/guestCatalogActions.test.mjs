import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const catalogCard = readFileSync('src/components/CatalogCard.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')

test('guest catalog card actions open the sign-up or sign-in modal', () => {
  assert.match(catalogCard, /const memberActionNoticeCopy =/)
  assert.match(catalogCard, /new CustomEvent\('noblesse:open-login-modal', \{[\s\S]*detail: \{ notice: memberActionNotice \}/)
  assert.match(catalogCard, /const handleAddInquiryClick = \(\) => \{[\s\S]*viewerState === 'guest'[\s\S]*openMemberAccessModal\(\)/)
  assert.match(catalogCard, /const handleFavoriteClick = \(\) => \{[\s\S]*viewerState === 'guest'[\s\S]*openMemberAccessModal\(\)/)
  assert.match(catalogCard, /disabled=\{addActionDisabled\}/)
})

test('guest home card actions use the same membership modal', () => {
  assert.match(home, /const memberActionNoticeCopy =/)
  assert.match(home, /const openMemberAccessModal = \(\) => \{[\s\S]*noblesse:open-login-modal/)
  assert.match(home, /const handleFavoriteClick = \(event\) => \{[\s\S]*viewerState === 'guest'[\s\S]*openMemberAccessModal\(\)/)
  assert.match(home, /const handleInquiryActionClick = \(event\) => \{[\s\S]*viewerState === 'guest'[\s\S]*openMemberAccessModal\(\)/)
})
