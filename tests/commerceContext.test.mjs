import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const readSource = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('authenticated commerce state loads admin catalog prices through admin read API', () => {
  const source = readSource('src/commerce/CommerceContext.jsx')

  assert.match(source, /import \{ createAdminApi \} from '\.\.\/api\/adminApi'/)
  assert.match(source, /const adminApi = createAdminApi\(apiClient\)/)
  assert.match(source, /async function loadAdminProductPrices\(adminApi, token\)/)
  assert.match(source, /adminApi\.getPrices\(\{\s*active: true,\s*limit: adminPricePageLimit,\s*offset,\s*\}, token\)/)
  assert.match(source, /if \(isApprovedProfile\) \{[\s\S]*?buyerApi\.getProductPrices\(token\)[\s\S]*?\} else if \(isAdminProfile\) \{[\s\S]*?loadAdminProductPrices\(adminApi, token\)/)
  assert.doesNotMatch(source, /if \(isApprovedProfile \|\| isAdminProfile\) \{[\s\S]*?buyerApi\.getProductPrices\(token\)/)
  assert.match(source, /<CommerceContext\.Provider value=\{\{[\s\S]*?productPrices,/)
})
