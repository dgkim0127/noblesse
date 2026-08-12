import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const requiredFirebaseConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

const buildFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function normalizeFirebaseConfig(value = {}) {
  return Object.fromEntries(requiredFirebaseConfigKeys.map((key) => [key, String(value?.[key] || '').trim()]))
}

function isCompleteFirebaseConfig(value) {
  return requiredFirebaseConfigKeys.every((key) => Boolean(value?.[key]))
}

async function loadHostingFirebaseConfig() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return null

  try {
    const response = await window.fetch('/__/firebase/init.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null

    const config = normalizeFirebaseConfig(await response.json())
    return isCompleteFirebaseConfig(config) ? config : null
  } catch {
    return null
  }
}

export let firebaseConfig = normalizeFirebaseConfig(buildFirebaseConfig)
export let hasFirebaseConfig = isCompleteFirebaseConfig(firebaseConfig)
export let app = null
export let auth = null
export let db = null
export let storage = null

function initializeFirebase(config) {
  if (!isCompleteFirebaseConfig(config)) return null

  firebaseConfig = config
  hasFirebaseConfig = true
  app = getApps()[0] || initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  return auth
}

export const firebaseReady = hasFirebaseConfig
  ? Promise.resolve(initializeFirebase(firebaseConfig))
  : loadHostingFirebaseConfig().then((config) => config ? initializeFirebase(config) : null)

export async function getFirebaseAuth() {
  await firebaseReady
  return auth
}
