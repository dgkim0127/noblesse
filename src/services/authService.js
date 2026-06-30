import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, hasFirebaseConfig } from '../firebase.js'
import { resolveEmailForSignIn } from './loginIdentifierResolver.js'

function requireAuth() {
  if (!hasFirebaseConfig || !auth) {
    const error = new Error('Firebase client configuration is required for login.')
    error.code = 'CONFIGURATION_ERROR'
    throw error
  }
  return auth
}

export function isAuthConfigured() {
  return hasFirebaseConfig && Boolean(auth)
}

export function subscribeAuthState(onChange) {
  if (!isAuthConfigured()) {
    onChange(null)
    return () => {}
  }

  return onAuthStateChanged(auth, onChange)
}

export async function signInWithCredentials(identifier, password, { remember = true, apiBaseUrl = '/api' } = {}) {
  const clientAuth = requireAuth()
  const safePassword = String(password || '')
  const email = await resolveEmailForSignIn(identifier, { apiBaseUrl })

  if (!email || !safePassword) {
    const error = new Error('ID and password are required.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  await setPersistence(clientAuth, remember ? browserLocalPersistence : browserSessionPersistence)
  return signInWithEmailAndPassword(clientAuth, email, safePassword)
}

export async function registerWithCredentials(email, password, { remember = true } = {}) {
  const clientAuth = requireAuth()
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
  if (!isAuthConfigured()) return
  await signOut(auth)
}

export async function getUserIdToken(user, forceRefresh = false) {
  if (!user?.getIdToken) return ''
  return user.getIdToken(forceRefresh)
}

export async function getCurrentUserIdToken(forceRefresh = false) {
  if (!isAuthConfigured() || !auth.currentUser) return ''
  return getUserIdToken(auth.currentUser, forceRefresh)
}
