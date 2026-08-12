import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')

test('Firebase falls back to Hosting runtime config without persisting or logging its values', () => {
  const firebase = read('src/firebase.js')

  assert.match(firebase, /window\.fetch\('\/__\/firebase\/init\.json'/)
  assert.match(firebase, /cache: 'no-store'/)
  assert.match(firebase, /isCompleteFirebaseConfig\(config\)/)
  assert.match(firebase, /export const firebaseReady/)
  assert.match(firebase, /export async function getFirebaseAuth/)
  assert.doesNotMatch(firebase, /localStorage|sessionStorage|console\./)
})

test('authentication waits for runtime Firebase initialization before deciding configuration is missing', () => {
  const auth = read('src/services/authService.js')
  const commerce = read('src/commerce/CommerceContext.jsx')

  assert.match(auth, /const clientAuth = auth \|\| await getFirebaseAuth\(\)/)
  assert.match(auth, /export async function ensureAuthConfigured/)
  assert.match(auth, /getFirebaseAuth\(\)\.then/)
  assert.match(commerce, /if \(!await authService\.ensureAuthConfigured\(\)\)/)
})
