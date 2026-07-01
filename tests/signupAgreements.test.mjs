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

test('register phone field stores a country-aware international number', () => {
  const source = readWorkspaceFile('src/pages/RegisterPage.jsx')

  assert.match(source, /const phoneProfilesByCountryIndex = \[/)
  assert.match(source, /dialCode: '\+82'/)
  assert.match(source, /dialCode: '\+81'/)
  assert.match(source, /dialCode: '\+886'/)
  assert.match(source, /name="phoneLocal"/)
  assert.match(source, /<input name="phone" type="hidden" value=\{normalizedPhoneValue\} \/>/)
  assert.match(source, /phone: formData\.get\('phone'\)/)
})

test('register agreement details use localized article and table structure outside Korean', () => {
  const source = readWorkspaceFile('src/pages/RegisterPage.jsx')

  assert.match(source, /const localizedAgreementDetailOverrides = \{/)
  assert.match(source, /resolveLocaleCopy\(localizedAgreementDetailOverrides\[document\.key\], locale\)/)
  assert.match(source, /\?\?\s*resolveLocaleCopy\(localizedAgreementSections\[document\.key\], locale, 'en'\)/)

  assert.match(source, /Article 1 Purpose/)
  assert.match(source, /第1条 目的/)
  assert.match(source, /第1條 目的/)
  assert.match(source, /Article 7 Nature of Quote Inquiry/)
  assert.match(source, /第7条 見積お問い合わせの性格/)
  assert.match(source, /第7條 報價詢問性質/)

  assert.match(source, /Personal Information Collection and Use Consent/)
  assert.match(source, /個人情報の収集・利用同意/)
  assert.match(source, /個人資訊蒐集及使用同意/)
  assert.match(source, /columns: \['Purpose', 'Items', 'Retention Period'\]/)
  assert.match(source, /columns: \['目的', '項目', '保有期間'\]/)
  assert.match(source, /columns: \['目的', '項目', '保存期間'\]/)
})
