// Firebase Storage操作のヘルパー関数
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage'
import app, { isFirebaseConfigured } from './firebase'

// Storageインスタンスの取得
let storage: FirebaseStorage | null = null

function getStorageInstance(): FirebaseStorage | null {
  if (typeof window === 'undefined' || !isFirebaseConfigured() || !app) {
    return null
  }
  
  if (!storage) {
    storage = getStorage(app)
    console.log('✅ Storage instance created')
  }
  
  return storage
}

// Storageが利用可能かチェック
const useStorage = () => isFirebaseConfigured() && typeof window !== 'undefined' && app !== null

// 画像をアップロード
export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  if (!useStorage()) {
    // Firebaseが未設定の状態で永続URLを返すと不整合が起きるため、明示的に失敗させる
    console.warn('Firebase Storage not configured. Aborting upload.')
    throw new Error('Firebase Storage not configured')
  }

  try {
    const storageInstance = getStorageInstance()
    if (!storageInstance) throw new Error('Storage not available')
    
    const storageRef = ref(storageInstance, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log(`✅ Uploaded image to ${path}`)
    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

// メンバーのプロフィール画像をアップロード
export async function uploadMemberImage(
  memberId: string,
  file: File,
  imageType: 'no1' | 'no2'
): Promise<string> {
  const path = `members/${memberId}/${imageType}_${Date.now()}.jpg`
  return uploadImage(file, path)
}

// 画像を削除
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!useStorage()) {
    console.warn('Firebase Storage not configured.')
    return
  }

  try {
    const storageInstance = getStorageInstance()
    if (!storageInstance) throw new Error('Storage not available')
    
    // Firebase StorageのURLから参照を取得
    const imageRef = ref(storageInstance, imageUrl)
    await deleteObject(imageRef)
    console.log(`✅ Deleted image from ${imageUrl}`)
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

// ファイルサイズとタイプの検証
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '画像形式はJPEG、PNG、WebPのみ対応しています'
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ファイルサイズは5MB以下にしてください'
    }
  }

  return { valid: true }
}
