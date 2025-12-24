/**
 * Upsert dummy data for member3 and member4 into Firestore
 *
 * How to run:
 * 1) Ensure .env.local has valid Firebase web config
 * 2) npm i -D ts-node
 * 3) npx ts-node scripts/seed-members-3-4.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const nowIso = () => new Date().toISOString()

async function run() {
  console.log('🔥 Seeding member3 and member4 into Firestore...')
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const dummyMembers = [
    {
      id: 'member3',
      name: 'メンバー3',
      nickname: 'Member 3',
      tagline: '挑戦し続ける新世代',
      birthdate: '1995-03-15',
      hometown: '大阪府',
      hobbies: 'ランニング / 写真 / コーヒー',
      thoughts: '日常の小さな成功体験を積み重ねることを大切にしています。',
      career: '2017-2020: スタートアップ勤務\n2020-現在: プロジェクトマネージャー',
      imageNo1: '',
      imageNo2: '',
    },
    {
      id: 'member4',
      name: 'メンバー4',
      nickname: 'Member 4',
      tagline: 'チームで成果を最大化',
      birthdate: '1992-07-22',
      hometown: '福岡県',
      hobbies: '映画 / キャンプ / ボードゲーム',
      thoughts: '仕組みを作って皆が活躍できる場を増やしたい。',
      career: '2014-2018: SIer勤務\n2019-現在: テックリード',
      imageNo1: '',
      imageNo2: '',
    },
  ] as const

  for (const m of dummyMembers) {
    const { id, ...data } = m
    await setDoc(doc(db, 'members', id), {
      ...data,
      // add server-agnostic audit fields
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }, { merge: true })
    console.log(`  ✓ upserted ${id}`)
  }

  console.log('✅ Done! Open Firestore Console to verify data.')
}

run().catch((e) => {
  console.error('❌ Error seeding members:', e)
  process.exit(1)
})
