import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isHybridCommerceMode } from '../firebase'

const requireAuth = () => {
  if (!isHybridCommerceMode || !auth) throw new Error('Firebase authentication is not configured.')
  return auth
}

export const signInBuyer = (email, password) => signInWithEmailAndPassword(requireAuth(), email, password)

export const registerBuyerAccount = async (email, password) => {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await sendEmailVerification(credential.user)
  return credential
}

export const signOutBuyer = () => signOut(requireAuth())
