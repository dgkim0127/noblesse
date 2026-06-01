import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { auth, db, isFirebaseConfigured, storage } from '../firebase'

const requireFirebase = () => {
  if (!isFirebaseConfigured || !auth || !db || !storage) {
    throw new Error('Firebase 환경 변수가 설정되지 않았습니다.')
  }
}

export const loginWithEmail = async ({ email, password }) => {
  requireFirebase()
  return signInWithEmailAndPassword(auth, email, password)
}

export const logout = async () => {
  if (auth) await signOut(auth)
}

export const registerMemberApplication = async ({ email, password, application, documentFile }) => {
  requireFirebase()
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const uid = credential.user.uid
  let documentPath = ''

  if (documentFile) {
    documentPath = `member-documents/${uid}/${Date.now()}-${documentFile.name}`
    await uploadBytes(ref(storage, documentPath), documentFile)
  }

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    role: 'member',
    status: 'pending',
    companyName: application.companyName,
    contactName: application.contactName,
    phone: application.phone,
    country: application.country,
    discountRate: 0,
    minOrderAmount: 300000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'memberApplications', uid), {
    uid,
    email,
    ...application,
    documentPath,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return credential
}
