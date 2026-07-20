import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = process.cwd()
const budget = JSON.parse(await readFile(join(root, 'performance-budget.json'), 'utf8'))
const indexHtml = await readFile(join(root, 'dist', 'index.html'), 'utf8')

const assetPaths = (pattern) => [...indexHtml.matchAll(pattern)].map((match) => match[1].replace(/^\//, ''))
const scriptPaths = assetPaths(/<script[^>]+src="([^"]+\.js)"/g)
const stylePaths = assetPaths(/<link[^>]+href="([^"]+\.css)"/g)

async function gzipKilobytes(paths) {
  let total = 0
  for (const assetPath of paths) {
    const source = await readFile(join(root, 'dist', assetPath))
    total += gzipSync(source).byteLength
  }
  return Math.round((total / 1024) * 100) / 100
}

const measured = {
  initialJavaScriptGzipKb: await gzipKilobytes(scriptPaths),
  initialCssGzipKb: await gzipKilobytes(stylePaths),
}

const failures = []
for (const key of ['initialJavaScriptGzipKb', 'initialCssGzipKb']) {
  if (measured[key] > budget.mobile[key]) {
    failures.push(`${key} ${measured[key]}KB exceeds ${budget.mobile[key]}KB`)
  }
}

if (failures.length > 0) {
  console.error(`PERFORMANCE_BUDGET_EXCEEDED: ${failures.join('; ')}`)
  process.exit(1)
}

console.log(`PERFORMANCE_BUDGET_OK: js=${measured.initialJavaScriptGzipKb}KB css=${measured.initialCssGzipKb}KB`)
