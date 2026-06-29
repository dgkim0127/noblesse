import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { canonicalizeLocale } from '../src/utils/locale.js'

const root = process.cwd()
const readWorkspaceFile = (path) => readFileSync(join(root, path), 'utf8')

test('signup agreement contract keeps exactly three required agreements', () => {
  const source = readWorkspaceFile('src/services/agreementService.js')

  assert.match(source, /REQUIRED_AGREEMENT_KEYS = \[\s*'terms_of_service',\s*'buyer_terms',\s*'privacy_collection_use',\s*\]/)
  assert.match(source, /terms_of_service: 'terms-v1\.0'/)
  assert.match(source, /buyer_terms: 'buyer-terms-v1\.0'/)
  assert.match(source, /privacy_collection_use: 'privacy-v1\.0'/)
  assert.match(source, /marketing_updates: 'marketing-v1\.0'/)
})

test('required signup agreements must all be explicit boolean true', () => {
  const source = readWorkspaceFile('src/services/agreementService.js')

  assert.match(source, /terms_of_service: false/)
  assert.match(source, /buyer_terms: false/)
  assert.match(source, /privacy_collection_use: false/)
  assert.match(source, /marketing_updates: false/)
  assert.match(source, /REQUIRED_AGREEMENT_KEYS\.every\(\(key\) => agreements\[key\] === true\)/)
})

test('signup agreement snapshot sends required and optional consent without preselecting marketing', () => {
  const source = readWorkspaceFile('src/services/agreementService.js')

  assert.match(source, /const accepted = agreements\[key\] === true/)
  assert.match(source, /required: REQUIRED_AGREEMENT_KEYS\.includes\(key\)/)
  assert.match(source, /acceptedAt: accepted \? acceptedAt : null/)
  assert.match(source, /OPTIONAL_AGREEMENT_KEYS = \['marketing_updates'\]/)
})

test('register page blocks profile submission before required agreements', () => {
  const source = readWorkspaceFile('src/pages/RegisterPage.jsx')

  assert.match(source, /agreements\.age_confirmed === true && areRequiredAgreementsAccepted\(agreements\)/)
  assert.match(source, /disabled=\{!requiredAccepted\}/)
  assert.match(source, /buildAgreementSnapshot\(agreements\)/)
  assert.match(source, /await registerBuyer\(\{/)
  assert.doesNotMatch(source, /createUserWithEmailAndPassword/)
})

test('legacy cn signup route canonicalizes to Taiwan Chinese signup behavior', () => {
  const appSource = readWorkspaceFile('src/App.jsx')

  assert.equal(canonicalizeLocale('cn'), 'zh-TW')
  assert.match(appSource, /<Route path="\/:locale" element=\{<LocaleShell \/>\}>/)
  assert.match(appSource, /<Route path="register" element=\{<RegisterPage \/>\} \/>/)
})
