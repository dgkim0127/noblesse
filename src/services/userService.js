import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const isUserServiceAvailable = Boolean(db)

const marketByCountry = {
  JP: 'JP',
  Japan: 'JP',
  KR: 'KR',
  Korea: 'KR',
  'South Korea': 'KR',
  US: 'US',
  USA: 'US',
  'United States': 'US',
}

const currencyByMarket = {
  KR: 'KRW',
  JP: 'JPY',
  US: 'USD',
  GLOBAL: 'USD',
}

function inferAssignedMarket(country = '') {
  const normalized = String(country).trim()
  return marketByCountry[normalized] ?? marketByCountry[normalized.toUpperCase()] ?? 'GLOBAL'
}

function normalizePreferredLanguage(value = 'en') {
  const language = String(value).trim().toLowerCase()
  return ['ko', 'en', 'ja', 'zh'].includes(language) ? language : 'en'
}

function timestampValue() {
  return db ? serverTimestamp() : new Date().toISOString()
}

function pendingBuyerProfile(uid, email, formData = {}) {
  const assignedMarket = inferAssignedMarket(formData.country)
  return {
    uid,
    email,
    role: 'buyer',
    status: 'pending',
    companyName: formData.companyName ?? '',
    contactName: formData.contactName ?? '',
    country: formData.country ?? '',
    preferredLanguage: normalizePreferredLanguage(formData.preferredLanguage),
    assignedMarket,
    currency: currencyByMarket[assignedMarket] ?? 'USD',
    phone: formData.phone ?? '',
    messengerType: formData.messengerType ?? '',
    messengerId: formData.messengerId ?? '',
    salesChannel: formData.salesChannel ?? '',
    businessNumber: formData.businessNumber ?? '',
    requestMemo: formData.requestMemo ?? '',
    discountRate: 0,
    minOrderAmount: 0,
    createdAt: timestampValue(),
    updatedAt: timestampValue(),
    approvedAt: null,
    approvedBy: null,
  }
}

export async function getUserProfile(uid) {
  if (!db || !uid) return null
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createPendingBuyerProfile(uid, email, formData) {
  const profile = pendingBuyerProfile(uid, email, formData)
  if (!db) return profile
  await setDoc(doc(db, 'users', uid), profile)
  return profile
}

export async function updateUserProfile(uid, patch) {
  if (!db || !uid) return null
  const nextPatch = {
    ...patch,
    updatedAt: serverTimestamp(),
  }
  await updateDoc(doc(db, 'users', uid), nextPatch)
  return getUserProfile(uid)
}

export async function approveBuyer(uid, patch = {}) {
  return updateUserProfile(uid, {
    ...patch,
    role: 'buyer',
    status: 'approved',
    approvedAt: serverTimestamp(),
  })
}

export async function blockBuyer(uid, adminMemo = '') {
  return updateUserProfile(uid, {
    adminMemo,
    status: 'blocked',
  })
}
