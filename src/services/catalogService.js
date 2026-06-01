import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, isFirebaseConfigured } from '../firebase'

const requireDb = () => {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase 환경 변수가 설정되지 않았습니다.')
  return db
}

const readCollection = async (name, sortField = 'sortOrder') => {
  const snapshot = await getDocs(query(collection(requireDb(), name), orderBy(sortField)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export const loadPublicCatalog = async () => {
  const [products, categories, banners] = await Promise.all([
    readCollection('products'),
    readCollection('categories'),
    readCollection('banners'),
  ])
  return { products, categories, banners }
}

export const loadMemberCatalog = async () => readCollection('productOptions')

export const loadUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(requireDb(), 'users', uid))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export const submitOrderRequest = async ({ items, requestMemo }) => {
  if (!functions) throw new Error('Firebase Functions가 설정되지 않았습니다.')
  const submit = httpsCallable(functions, 'submitOrderRequest')
  const result = await submit({ items, requestMemo })
  return result.data
}
