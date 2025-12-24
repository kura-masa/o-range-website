/**
 * Firebase初期データセットアップスクリプト
 * 
 * このスクリプトを実行して、Firestoreに初期データを投入します。
 * 
 * 実行方法:
 * 1. .env.localにFirebase設定を追加
 * 2. npm install ts-node -D
 * 3. npx ts-node scripts/init-firebase.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore'
import { getInitialMembers, getInitialReports } from '../lib/data'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

async function initializeFirestore() {
  console.log('🔥 Firestore初期化を開始します...')

  // Firebase初期化
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  try {
    // メンバーデータを投入
    console.log('📝 メンバーデータを投入中...')
    const members = getInitialMembers()
    
    for (const member of members) {
      const { id, ...data } = member
      await setDoc(doc(db, 'members', id), {
        ...data,
        order: members.indexOf(member), // 順序を保持
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log(`  ✓ ${member.name}`)
    }

    // 経過報告データを投入
    console.log('📝 経過報告データを投入中...')
    const reports = getInitialReports()
    
    for (const report of reports) {
      const { id, ...data } = report
      await setDoc(doc(db, 'reports', id), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log(`  ✓ ${report.nickname}`)
    }

    console.log('✅ 初期データの投入が完了しました！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// スクリプト実行
initializeFirestore()
