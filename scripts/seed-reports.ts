/**
 * Seed reports collection based on existing members.
 * For each member document, create/merge a report document with same id.
 *
 * Run:
 *  - npm run seed:reports
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

async function run() {
  console.log('🔥 Seeding reports from members...')
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const membersSnap = await getDocs(collection(db, 'members'))
  let created = 0
  for (const d of membersSnap.docs) {
    const m = d.data() as any
    const id = d.id
    const nickname = typeof m.nickname === 'string' && m.nickname.trim() !== '' ? m.nickname : (m.name || id)

    const reportDoc = doc(db, 'reports', id)
    await setDoc(reportDoc, {
      id,
      nickname: String(nickname || id),
      currentTrial: '',
      progress: '',
      result: '',
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    console.log(`  ✓ upserted report for ${id} (${nickname})`)
    created++
  }
  console.log(`✅ Done. Upserted ${created} report doc(s).`)
}

run().catch((e) => { console.error('❌ Seed reports failed:', e); process.exit(1) })
