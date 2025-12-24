/**
 * Normalize all documents in 'members' collection to a consistent schema.
 * - Fills missing fields with empty string ''
 * - Converts birthDate -> birthdate (Firestore uses 'birthdate')
 * - Removes undefined and blob: URLs
 *
 * How to run:
 * 1) Ensure .env.local contains valid Firebase web config
 * 2) npm i -D ts-node typescript
 * 3) npx ts-node scripts/normalize-members.ts
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

function cleanUrl(v: any): string {
  if (typeof v !== 'string') return ''
  if (v.startsWith('blob:')) return ''
  return v
}

function str(v: any, fallback: string = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

async function run() {
  console.log('🧹 Normalizing members schema...')
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const snap = await getDocs(collection(db, 'members'))
  let count = 0
  for (const d of snap.docs) {
    const data = d.data() as any
    const normalized: Record<string, any> = {
      id: str(data.id || d.id),
      name: str(data.name),
      nickname: str(data.nickname),
      tagline: str(data.tagline),
      birthdate: str(data.birthdate ?? data.birthDate),
      hometown: str(data.hometown),
      hobbies: str(data.hobbies),
      thoughts: str(data.thoughts),
      career: str(data.career),
      imageNo1: cleanUrl(data.imageNo1),
      imageNo2: cleanUrl(data.imageNo2),
      // preserve timestamps if present
      createdAt: str(data.createdAt || ''),
      updatedAt: new Date().toISOString(),
    }

    // Remove keys that are still undefined (shouldn't be after str/clean)
    Object.keys(normalized).forEach((k) => {
      if (normalized[k] === undefined) delete normalized[k]
    })

    await setDoc(doc(db, 'members', d.id), normalized, { merge: true })
    count++
    console.log(`  ✓ normalized ${d.id}`)
  }

  console.log(`✅ Done. Normalized ${count} member document(s).`)
}

run().catch((e) => {
  console.error('❌ Normalize failed:', e)
  process.exit(1)
})
