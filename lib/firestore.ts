// Firestore操作のヘルパー関数
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import app, { isFirebaseConfigured } from './firebase'
import { Member, Report } from './data'

// Firestoreインスタンスの取得
let db: Firestore | null = null

function getFirestoreInstance(): Firestore | null {
  if (typeof window === 'undefined' || !isFirebaseConfigured() || !app) {
    return null
  }
  
  if (!db) {
    db = getFirestore(app)
    console.log('✅ Firestore instance created')
  }
  
  return db
}

// Firestoreが利用可能かチェック
const useFirestore = () => isFirebaseConfigured() && typeof window !== 'undefined' && app !== null

// メンバーデータの取得
export async function getMembers(): Promise<Member[]> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return []
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const membersRef = collection(db, 'members')
    const snapshot = await getDocs(membersRef)
    const members = snapshot.docs.map(doc => {
      const data = doc.data() as any
      const imageNo1 = typeof data.imageNo1 === 'string' && data.imageNo1.startsWith('blob:') ? undefined : data.imageNo1
      const imageNo2 = typeof data.imageNo2 === 'string' && data.imageNo2.startsWith('blob:') ? undefined : data.imageNo2
      return {
        id: doc.id,
        name: data.name || '',
        nickname: data.nickname || '',
        tagline: data.tagline || '',
        imageNo1,
        imageNo2,
        birthDate: data.birthdate || data.birthDate || '',
        hometown: data.hometown || '',
        hobbies: data.hobbies || '',
        thoughts: data.thoughts || '',
        career: data.career || ''
      } as Member
    })
    console.log(`✅ Fetched ${members.length} members from Firestore`)
    return members
  } catch (error) {
    console.error('❌ Error fetching members:', error)
    throw error
  }
}

// 特定メンバーの取得
export async function getMember(id: string): Promise<Member | null> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return null
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const docRef = doc(db, 'members', id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as any
      const imageNo1 = typeof data.imageNo1 === 'string' && data.imageNo1.startsWith('blob:') ? undefined : data.imageNo1
      const imageNo2 = typeof data.imageNo2 === 'string' && data.imageNo2.startsWith('blob:') ? undefined : data.imageNo2
      const member = {
        id: docSnap.id,
        name: data.name || '',
        nickname: data.nickname || '',
        tagline: data.tagline || '',
        imageNo1,
        imageNo2,
        birthDate: data.birthdate || data.birthDate || '',
        hometown: data.hometown || '',
        hobbies: data.hobbies || '',
        thoughts: data.thoughts || '',
        career: data.career || ''
      } as Member
      console.log(`✅ Fetched member ${id} from Firestore`)
      return member
    }
    console.warn(`⚠️ Member ${id} not found in Firestore`)
    return null
  } catch (error) {
    console.error('❌ Error fetching member:', error)
    throw error
  }
}

// メンバーデータの保存/更新
export async function saveMember(member: Member): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    // Convert birthDate to birthdate for Firestore
    // サニタイズ: blob: URL は保存しない
    const sanitizeUrl = (url?: string) => (typeof url === 'string' && url.startsWith('blob:') ? undefined : url)
    const firestoreData: any = {
      ...member,
      imageNo1: sanitizeUrl(member.imageNo1),
      imageNo2: sanitizeUrl(member.imageNo2),
      birthdate: member.birthDate || '', // Save as 'birthdate' in Firestore
      // 空文字列をデフォルト値として設定
      name: member.name || '',
      nickname: member.nickname || '',
      tagline: member.tagline || '',
      hometown: member.hometown || '',
      hobbies: member.hobbies || '',
      thoughts: member.thoughts || '',
      career: member.career || '',
    }
    delete firestoreData.birthDate // Remove camelCase version

    // Firestore does not allow undefined values. Remove only undefined (not empty strings).
    Object.keys(firestoreData).forEach((key) => {
      if (firestoreData[key] === undefined) {
        delete firestoreData[key]
      }
    })
    
    const docRef = doc(db, 'members', member.id)
    await setDoc(docRef, firestoreData, { merge: true })
    console.log(`✅ Saved member ${member.id} to Firestore`)
  } catch (error) {
    console.error('❌ Error saving member:', error)
    throw error
  }
}

// 経過報告の取得
export async function getReports(): Promise<Report[]> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return []
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const reportsRef = collection(db, 'reports')
    const snapshot = await getDocs(reportsRef)
    const reports = snapshot.docs.map(d => {
      const data = d.data() as any
      return {
        id: d.id,
        nickname: typeof data.nickname === 'string' ? data.nickname : '',
        currentTrial: typeof data.currentTrial === 'string' ? data.currentTrial : '',
        progress: typeof data.progress === 'string' ? data.progress : '',
        result: typeof data.result === 'string' ? data.result : '',
      } as Report
    })
    console.log(`✅ Fetched ${reports.length} reports from Firestore`)
    return reports
  } catch (error) {
    console.error('❌ Error fetching reports:', error)
    throw error
  }
}

// 経過報告の保存/更新
export async function saveReport(report: Report): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const firestoreData: Record<string, any> = {
      id: report.id,
      nickname: report.nickname ?? '',
      currentTrial: report.currentTrial ?? '',
      progress: report.progress ?? '',
      result: report.result ?? '',
    }
    Object.keys(firestoreData).forEach((k) => {
      if (firestoreData[k] === undefined) delete firestoreData[k]
    })

    const docRef = doc(db, 'reports', report.id)
    await setDoc(docRef, firestoreData, { merge: true })
    console.log(`✅ Saved report ${report.id} to Firestore`)
  } catch (error) {
    console.error('❌ Error saving report:', error)
    throw error
  }
}

// 単体削除
export async function deleteMember(id: string): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  const db = getFirestoreInstance()
  if (!db) throw new Error('Firestore not available')

  await deleteDoc(doc(db, 'members', id))
  console.log(`✅ Deleted member ${id} from Firestore`)
}

export async function deleteReport(id: string): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  const db = getFirestoreInstance()
  if (!db) throw new Error('Firestore not available')

  await deleteDoc(doc(db, 'reports', id))
  console.log(`✅ Deleted report ${id} from Firestore`)
}

// 複数メンバーを一括保存（削除差分も反映）
export async function saveMembers(members: Member[]): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    // まずは「今回渡された配列にない既存ドキュメント」を削除
    const existingSnapshot = await getDocs(collection(db, 'members'))
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id))
    const nextIds = new Set(members.map((m) => m.id))

    const deletePromises: Promise<void>[] = []
    existingIds.forEach((id) => {
      if (!nextIds.has(id)) {
        deletePromises.push(deleteMember(id))
      }
    })

    const savePromises = members.map((member) => saveMember(member))
    await Promise.all([...deletePromises, ...savePromises])
    console.log(`✅ Saved ${members.length} members to Firestore (deleted ${deletePromises.length})`)
  } catch (error) {
    console.error('❌ Error saving members:', error)
    throw error
  }
}

// 複数レポートを一括保存（削除差分も反映）
export async function saveReports(reports: Report[]): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    const existingSnapshot = await getDocs(collection(db, 'reports'))
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id))
    const nextIds = new Set(reports.map((r) => r.id))

    const deletePromises: Promise<void>[] = []
    existingIds.forEach((id) => {
      if (!nextIds.has(id)) {
        deletePromises.push(deleteReport(id))
      }
    })

    const savePromises = reports.map((report) => saveReport(report))
    await Promise.all([...deletePromises, ...savePromises])
    console.log(`✅ Saved ${reports.length} reports to Firestore (deleted ${deletePromises.length})`)
  } catch (error) {
    console.error('❌ Error saving reports:', error)
    throw error
  }
}
