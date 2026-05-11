'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Member } from '@/lib/data'
import { getMember, saveMember } from '@/lib/firestore'

interface LoginModalProps {
  onClose: () => void
  onSuccess: () => void
  redirectTo?: string // ログイン成功後に遷移するURL（オプション）
  onMemberAutoAdded?: () => void // メンバー自動追加後のコールバック
}

export default function LoginModal({ onClose, onSuccess, redirectTo, onMemberAutoAdded }: LoginModalProps) {
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
      const memberNames = [
        '河村航希',
        '村尾勇真',
        '谷口裕樹',
        '田熊杏菜',
        '倉永将宏',
        '加藤優翔',
        '竹原正育',
        'その他の人'
      ]

      // Firestoreのデータに関わらず、固定のリストをそのまま表示する
      const orderedData = memberNames.map(name => ({
        id: name,
        name: name
      } as Member))

      setMembers(orderedData)
      if (orderedData.length > 0) {
        setSelectedMemberId(orderedData[0].id)
      }
    } catch (error) {
      console.error('Error loading members:', error)
      setError('メンバー情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!id.trim()) {
      setError('パスワードを入力してください')
      return
    }

    if (members.length > 0 && !selectedMemberId) {
      setError('メンバーを選択してください')
      return
    }

    let loginMemberId = selectedMemberId
    let loginMemberName = ''

    if (members.length > 0) {
      const selectedMember = members.find(m => m.id === selectedMemberId)
      if (!selectedMember) {
        setError('選択されたメンバーが見つかりません')
        return
      }
      loginMemberName = selectedMember.name
    } else {
      // メンバーがいない場合は管理者としてログイン
      loginMemberId = 'admin'
      loginMemberName = '管理者'
    }

    const success = login(id, loginMemberId, loginMemberName)
    if (success) {
      // 「その他の人」以外を選択した場合、Firestoreにメンバーが未登録なら自動追加
      if (loginMemberName !== 'その他の人') {
        try {
          const existing = await getMember(loginMemberId)
          if (!existing) {
            const newMember: Member = {
              id: loginMemberId,
              name: loginMemberName,
              nickname: '',
              tagline: '',
              imageNo1: undefined,
              imageNo2: undefined,
              birthDate: '',
              hometown: '',
              hobbies: '',
              sections: [],
            }
            await saveMember(newMember)
            console.log(`✅ 自動でメンバー「${loginMemberName}」を追加しました`)
            onMemberAutoAdded?.()
          }
        } catch (err) {
          console.error('自動メンバー追加に失敗:', err)
        }
      }

      // ログイン成功後、redirectToが指定されていれば遷移
      if (redirectTo) {
        router.push(redirectTo)
      }
      onSuccess()
    } else {
      setError('パスワードが正しくありません')
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {members.length > 0 ? (
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
            ) : (
              <div className="bg-yellow-50 p-3 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  メンバーが登録されていません。<br />
                  管理者としてログインし、メンバーを追加してください。
                </p>
              </div>
            )}

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

      </div>
    </div>
  )
}
