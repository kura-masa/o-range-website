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
import { Member, Report, ReportHistory, ReportEmbedding, Idea } from './data'
import { generateEmbedding } from './gemini'

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
        teaser: typeof data.teaser === 'string' ? data.teaser : undefined,
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
      teaser: report.teaser ?? '',
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

// ========================================
// 履歴保存機能
// ========================================

/**
 * 週IDを生成（ISO 8601週番号形式: YYYY-Wxx）
 */
export function generateWeekId(date: Date = new Date()): string {
  // ISO 8601週番号を計算
  const tempDate = new Date(date.valueOf())
  const dayNum = (tempDate.getDay() + 6) % 7 // 月曜日=0, 日曜日=6
  tempDate.setDate(tempDate.getDate() - dayNum + 3) // 木曜日に移動
  const firstThursday = tempDate.valueOf()
  tempDate.setMonth(0, 1)
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7)
  }
  const weekNumber = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)
  const year = new Date(firstThursday).getFullYear()
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * 現在の報告を履歴として保存（埋め込みベクトル付き）
 */
export async function saveReportsToHistory(weekId?: string, generateEmbeddings: boolean = false): Promise<string> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    // 現在の報告を取得
    const currentReports = await getReports()
    
    if (currentReports.length === 0) {
      throw new Error('保存する報告がありません')
    }

    // 週IDを生成または使用
    const finalWeekId = weekId || generateWeekId()
    const savedAt = new Date().toISOString()

    let embeddings: ReportEmbedding[] | undefined = undefined

    // 埋め込み生成が有効な場合
    if (generateEmbeddings) {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (apiKey) {
        try {
          embeddings = await generateReportEmbeddings(currentReports, apiKey)
          console.log(`✅ Generated ${embeddings.length} embeddings`)
        } catch (error) {
          console.warn('⚠️ Failed to generate embeddings, saving without them:', error)
        }
      }
    }

    const historyData: ReportHistory = {
      weekId: finalWeekId,
      savedAt,
      reports: currentReports,
      embeddings,
    }

    // Firestoreはundefinedを許可しないため、undefinedフィールドを削除（再帰的に）
    const removeUndefined = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item))
      } else if (obj !== null && typeof obj === 'object') {
        const cleaned: any = {}
        Object.keys(obj).forEach((key) => {
          if (obj[key] !== undefined) {
            cleaned[key] = removeUndefined(obj[key])
          }
        })
        return cleaned
      }
      return obj
    }

    const firestoreData = removeUndefined(historyData)

    // reports_history コレクションに保存
    const docRef = doc(db, 'reports_history', finalWeekId)
    await setDoc(docRef, firestoreData)
    
    console.log(`✅ Saved reports history for week ${finalWeekId}`)
    return finalWeekId
  } catch (error) {
    console.error('❌ Error saving reports history:', error)
    throw error
  }
}

/**
 * 報告から埋め込みベクトルを生成
 */
async function generateReportEmbeddings(
  reports: Report[],
  apiKey: string
): Promise<ReportEmbedding[]> {
  const embeddings: ReportEmbedding[] = []

  for (const report of reports) {
    // 報告内容を結合してテキスト化
    const text = [
      `メンバー: ${report.nickname}`,
      `今試していること: ${report.currentTrial}`,
      `経過報告: ${report.progress}`,
      `結果報告・考察: ${report.result}`,
    ].join('\n')

    // 埋め込みを生成
    const embedding = await generateEmbedding(text, apiKey)

    embeddings.push({
      reportId: report.id,
      nickname: report.nickname,
      text,
      embedding,
    })
  }

  return embeddings
}

/**
 * 履歴一覧を取得（新しい順）
 */
export async function getReportsHistoryList(): Promise<ReportHistory[]> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return []
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    const historyRef = collection(db, 'reports_history')
    const snapshot = await getDocs(historyRef)
    
    const historyList = snapshot.docs.map(d => {
      const data = d.data() as any
      console.log(`📦 履歴データ ${d.id}:`, {
        weekId: data.weekId,
        savedAt: data.savedAt,
        reportsCount: data.reports?.length || 0,
        embeddingsCount: data.embeddings?.length || 0,
        hasEmbeddings: !!data.embeddings
      })
      return {
        weekId: data.weekId || d.id,
        savedAt: data.savedAt || '',
        reports: Array.isArray(data.reports) ? data.reports : [],
        embeddings: Array.isArray(data.embeddings) ? data.embeddings : undefined,
      } as ReportHistory
    })

    // 日付降順でソート
    historyList.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    
    console.log(`✅ Fetched ${historyList.length} history records`)
    return historyList
  } catch (error) {
    console.error('❌ Error fetching reports history:', error)
    throw error
  }
}

/**
 * 特定週の履歴を取得
 */
export async function getReportsHistory(weekId: string): Promise<ReportHistory | null> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return null
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    const docRef = doc(db, 'reports_history', weekId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as any
      const history: ReportHistory = {
        weekId: data.weekId || docSnap.id,
        savedAt: data.savedAt || '',
        reports: Array.isArray(data.reports) ? data.reports : [],
        embeddings: Array.isArray(data.embeddings) ? data.embeddings : undefined,
      }
      console.log(`✅ Fetched history for week ${weekId}`)
      return history
    }
    
    console.warn(`⚠️ History for week ${weekId} not found`)
    return null
  } catch (error) {
    console.error('❌ Error fetching history:', error)
    throw error
  }
}

/**
 * 全履歴から埋め込みベクトルを収集
 */
export async function getAllEmbeddings(): Promise<ReportEmbedding[]> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return []
  }

  try {
    const historyList = await getReportsHistoryList()
    const allEmbeddings: ReportEmbedding[] = []

    console.log(`📊 履歴データ詳細:`, historyList.map(h => ({
      weekId: h.weekId,
      embeddingsCount: h.embeddings?.length || 0,
      hasEmbeddings: !!h.embeddings
    })))

    for (const history of historyList) {
      console.log(`🔍 処理中の履歴: ${history.weekId}, embeddings:`, history.embeddings?.length || 0)
      
      if (history.embeddings && Array.isArray(history.embeddings)) {
        // 週IDを含めた形で追加
        history.embeddings.forEach((emb) => {
          allEmbeddings.push({
            ...emb,
            text: `[${history.weekId}] ${emb.text}`, // 週IDを追加
          })
        })
      } else {
        console.log(`⚠️ ${history.weekId} には埋め込みがありません`)
      }
    }

    console.log(`✅ Collected ${allEmbeddings.length} embeddings from history`)
    return allEmbeddings
  } catch (error) {
    console.error('❌ Error collecting embeddings:', error)
    return []
  }
}

// ========================================
// アイデア管理機能
// ========================================

/**
 * アイデアの取得
 */
export async function getIdeas(): Promise<Idea[]> {
  if (!useFirestore()) {
    console.warn('⚠️ Firebase not configured')
    return []
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const ideasRef = collection(db, 'ideas')
    const snapshot = await getDocs(ideasRef)
    const ideas = snapshot.docs.map(doc => {
      const data = doc.data() as any
      return {
        id: doc.id,
        memberId: data.memberId || '',
        memberName: data.memberName || '',
        ideaName: data.ideaName || '',
        content: data.content || '',
        rejectionReason: data.rejectionReason || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      } as Idea
    })
    console.log(`✅ Fetched ${ideas.length} ideas from Firestore`)
    return ideas
  } catch (error) {
    console.error('❌ Error fetching ideas:', error)
    throw error
  }
}

/**
 * アイデアの保存/更新
 */
export async function saveIdea(idea: Idea): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')
    
    const firestoreData: any = {
      memberId: idea.memberId || '',
      memberName: idea.memberName || '',
      ideaName: idea.ideaName || '',
      content: idea.content || '',
      rejectionReason: idea.rejectionReason || undefined,
      createdAt: idea.createdAt || new Date().toISOString(),
      updatedAt: idea.updatedAt || new Date().toISOString(),
    }
    
    // Remove undefined values
    Object.keys(firestoreData).forEach((key) => {
      if (firestoreData[key] === undefined) {
        delete firestoreData[key]
      }
    })
    
    const docRef = doc(db, 'ideas', idea.id)
    await setDoc(docRef, firestoreData, { merge: true })
    console.log(`✅ Saved idea ${idea.id} to Firestore`)
  } catch (error) {
    console.error('❌ Error saving idea:', error)
    throw error
  }
}

/**
 * アイデアの削除
 */
export async function deleteIdea(id: string): Promise<void> {
  if (!useFirestore()) {
    throw new Error('Firebase not configured')
  }

  try {
    const db = getFirestoreInstance()
    if (!db) throw new Error('Firestore not available')

    await deleteDoc(doc(db, 'ideas', id))
    console.log(`✅ Deleted idea ${id} from Firestore`)
  } catch (error) {
    console.error('❌ Error deleting idea:', error)
    throw error
  }
}
