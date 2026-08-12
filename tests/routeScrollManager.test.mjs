import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const source = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8')

test('new routes start at the top while browser back restores the saved position', () => {
  assert.match(source, /function RouteScrollManager\(\)/)
  assert.match(source, /useNavigationType\(\)/)
  assert.match(source, /window\.history\.scrollRestoration = 'manual'/)
  assert.match(source, /navigationType === 'POP' \? positions\.get\(locationKey\) : 0/)
  assert.match(source, /window\.scrollTo\(\{ left: 0, top: savedTop \?\? 0, behavior: 'auto' \}\)/)
  assert.match(source, /positions\.set\(locationKey, window\.scrollY/)
  assert.match(source, /<BrowserRouter><RouteScrollManager \/>/)
})

test('hash navigation still targets the requested section', () => {
  assert.match(source, /document\.getElementById\(decodeURIComponent\(location\.hash\.slice\(1\)\)\)/)
  assert.match(source, /target\.scrollIntoView\(\)/)
})
