import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), 'utf8')
}

test('admin auth token waits for Firebase auth hydration before failing closed', () => {
  const authService = readWorkspaceFile('src/services/authService.js')

  assert.match(authService, /function waitForCurrentUser\(timeoutMs = 3000\)/)
  assert.match(authService, /onAuthStateChanged\(auth, \(user\) =>/)
  assert.match(authService, /if \(auth\.currentUser\) return getUserIdToken\(auth\.currentUser, forceRefresh\)/)
  assert.match(authService, /const user = waitForAuth \? await waitForCurrentUser\(timeoutMs\) : null/)
})
