import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('admin account page redirects to the admin workspace', () => {
  const page = readWorkspaceFile('src/pages/AccountPage.jsx')

  assert.match(page, /import \{ Link, Navigate, useNavigate \} from 'react-router-dom'/)
  assert.match(page, /if \(isAdmin\) return <Navigate replace to=\{toLocalePath\('\/admin'\)\} \/>/)
})
