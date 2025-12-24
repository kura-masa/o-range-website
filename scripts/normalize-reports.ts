/**
 * Normalize all documents in 'reports' collection to a consistent schema.
 * Fills missing fields with empty strings and removes undefined.
 *
 * Run:
 *  - npm run fix:reports
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function str(v: any): string { return typeof v === 'string' ? v : (v == null ? '' : String(v)) }

async function run() {
  console.log('🧹 Normalizing reports schema...')
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const snap = await getDocs(collection(db, 'reports'))
  let count = 0
  for (const d of snap.docs) {
    const data = d.data() as any
    const normalized: Record<string, any> = {
      id: str(data.id || d.id),
      nickname: str(data.nickname),
      currentTrial: str(data.currentTrial),
      progress: str(data.progress),
      result: str(data.result),
      updatedAt: new Date().toISOString(),
    }
    Object.keys(normalized).forEach((k) => { if (normalized[k] === undefined) delete normalized[k] })
    await setDoc(doc(db, 'reports', d.id), normalized, { merge: true })
    console.log(`  ✓ normalized ${d.id}`)
    count++
  }

  console.log(`✅ Done. Normalized ${count} report document(s).`)
}

run().catch((e) => { console.error('❌ Normalize reports failed:', e); process.exit(1) })
