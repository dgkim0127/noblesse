import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean)

export const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-northeast3'
export const functions = app ? getFunctions(app, functionsRegion) : null
export const commerceMode = import.meta.env.VITE_NOBLESSE_COMMERCE_MODE || 'mock'
export const isHybridCommerceMode = commerceMode === 'hybrid' && Boolean(app && auth && functions)

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY

if (app && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export { firebaseConfig }
