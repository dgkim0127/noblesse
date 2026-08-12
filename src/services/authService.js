import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, getFirebaseAuth, hasFirebaseConfig } from '../firebase.js'
import { resolveEmailForSignIn } from './loginIdentifierResolver.js'

async function requireAuth() {
  const clientAuth = auth || await getFirebaseAuth()
  if (!clientAuth) {
    const error = new Error('Firebase client configuration is required for login.')
    error.code = 'CONFIGURATION_ERROR'
    throw error
  }
  return clientAuth
}

export function isAuthConfigured() {
  return hasFirebaseConfig && Boolean(auth)
}

export async function ensureAuthConfigured() {
  return Boolean(await getFirebaseAuth())
}

export function getCurrentAuthUser() {
  return isAuthConfigured() ? auth.currentUser : null
}

export function subscribeAuthState(onChange) {
  let disposed = false
  let unsubscribe = () => {}

  getFirebaseAuth().then((clientAuth) => {
    if (disposed) return
    if (!clientAuth) {
      onChange(null)
      return
    }
    unsubscribe = onAuthStateChanged(clientAuth, onChange)
  }).catch(() => {
    if (!disposed) onChange(null)
  })

  return () => {
    disposed = true
    unsubscribe()
  }
}

export async function signInWithCredentials(identifier, password, { remember = true, apiBaseUrl = '/api' } = {}) {
  const clientAuth = await requireAuth()
  const safePassword = String(password || '')
  const email = await resolveEmailForSignIn(identifier, {
    apiBaseUrl,
    fallbackEmailDomains: ['gmail.com']
  })

  if (!email || !safePassword) {
    const error = new Error('ID and password are required.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  await setPersistence(clientAuth, remember ? browserLocalPersistence : browserSessionPersistence)
  return signInWithEmailAndPassword(clientAuth, email, safePassword)
}

export async function registerWithCredentials(email, password, { remember = true } = {}) {
  const clientAuth = await requireAuth()
  const safeEmail = String(email || '').trim()
  const safePassword = String(password || '')

  if (!safeEmail || !safePassword) {
    const error = new Error('Email and password are required.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  await setPersistence(clientAuth, remember ? browserLocalPersistence : browserSessionPersistence)
  return createUserWithEmailAndPassword(clientAuth, safeEmail, safePassword)
}

export async function signOutCurrentUser() {
  const clientAuth = await getFirebaseAuth()
  if (!clientAuth) return
  await signOut(clientAuth)
}

export async function getUserIdToken(user, forceRefresh = false) {
  if (!user?.getIdToken) return ''
  return user.getIdToken(forceRefresh)
}

function waitForCurrentUser(clientAuth, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let unsubscribe = () => {}
    const timeoutId = setTimeout(() => {
      unsubscribe()
      resolve(clientAuth.currentUser || null)
    }, timeoutMs)

    unsubscribe = onAuthStateChanged(clientAuth, (user) => {
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(user)
    })
  })
}

export async function getCurrentUserIdToken(forceRefresh = false, { waitForAuth = true, timeoutMs = 3000 } = {}) {
  const clientAuth = await getFirebaseAuth()
  if (!clientAuth) return ''
  if (clientAuth.currentUser) return getUserIdToken(clientAuth.currentUser, forceRefresh)
  const user = waitForAuth ? await waitForCurrentUser(clientAuth, timeoutMs) : null
  return getUserIdToken(user, forceRefresh)
}
