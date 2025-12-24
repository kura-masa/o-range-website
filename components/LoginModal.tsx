'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface LoginModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!id.trim()) {
      setError('IDを入力してください')
      return
    }

    const success = login(id)
    if (success) {
      onSuccess()
    } else {
      setError('IDが正しくありません')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-orange-primary mb-4">管理者ログイン</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
              ID
            </label>
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
              placeholder="IDを入力してください"
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
              送信
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1">デモ用ID:</p>
          <p>admin / orange-admin / o-range</p>
        </div>
      </div>
    </div>
  )
}
