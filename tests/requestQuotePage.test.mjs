import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const source = readFileSync(join(process.cwd(), 'src/pages/RequestQuotePage.jsx'), 'utf8')

test('request quote summary renders every localized selected option', () => {
  assert.match(source, /formatSelectedProductOptions\(row\.selectedOptions, locale\)/)
  assert.match(source, /const visibleOptions = optionSummary\.length \? optionSummary : legacySummary/)
  assert.match(source, /\[\.\.\.visibleOptions, `\$\{row\.quantity\} pcs`\]\.join\(' \/ '\)/)
  assert.match(source, /<QuoteLine[\s\S]*?locale=\{locale\}/)
})
