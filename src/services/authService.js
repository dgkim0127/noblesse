import {
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'

export const isAuthAvailable = Boolean(auth)

export async function signInWithEmailAndPassword(email, password) {
  if (!auth) return { user: null, mock: true }
  const credential = await firebaseSignInWithEmailAndPassword(auth, email, password)
  return { user: credential.user, mock: false }
}

export async function createUserWithEmailAndPassword(email, password) {
  if (!auth) return { user: null, mock: true }
  const credential = await firebaseCreateUserWithEmailAndPassword(auth, email, password)
  return { user: credential.user, mock: false }
}

export async function signOut() {
  if (!auth) return { mock: true }
  await firebaseSignOut(auth)
  return { mock: false }
}

export function onAuthStateChanged(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return firebaseOnAuthStateChanged(auth, callback)
}
