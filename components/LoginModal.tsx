'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { getMembers } from '@/lib/firestore'
import { Member } from '@/lib/data'

interface LoginModalProps {
  onClose: () => void
  onSuccess: () => void
  redirectTo?: string // ログイン成功後に遷移するURL（オプション）
}

export default function LoginModal({ onClose, onSuccess, redirectTo }: LoginModalProps) {
  const [id, setId] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const data = await getMembers()
      setMembers(data)
      if (data.length > 0) {
        setSelectedMemberId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading members:', error)
      setError('メンバー情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!id.trim()) {
      setError('IDを入力してください')
      return
    }

    if (!selectedMemberId) {
      setError('メンバーを選択してください')
      return
    }

    const selectedMember = members.find(m => m.id === selectedMemberId)
    if (!selectedMember) {
      setError('選択されたメンバーが見つかりません')
      return
    }

    const success = login(id, selectedMemberId, selectedMember.name)
    if (success) {
      // ログイン成功後、redirectToが指定されていれば遷移
      if (redirectTo) {
        router.push(redirectTo)
      }
      onSuccess()
    } else {
      setError('IDが正しくありません')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-orange-primary mb-4">ログイン</h2>

        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">メンバーが登録されていません</p>
            <p className="text-sm text-gray-400 mb-4">
              先にランディングページでメンバーを追加してください
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-2">
                あなたは誰ですか？
              </label>
              <select
                id="member"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
                placeholder="パスワードを入力してください"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-dark transition-colors"
              >
                ログイン
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1">デモ用パスワード:</p>
          <p>admin / orange-admin / o-range</p>
        </div>
      </div>
    </div>
  )
}
