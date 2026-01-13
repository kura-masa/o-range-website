'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotification } from '@/contexts/NotificationContext'
import { Member, Idea } from '@/lib/data'
import { getMembers, getIdeas, saveIdea, deleteIdea } from '@/lib/firestore'

export default function IdeasPage() {
  const { isAuthenticated, currentMemberId } = useAuth()
  const { showToast } = useNotification()
  const [members, setMembers] = useState<Member[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('my')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // 新規追加・編集用のフォーム状態
  const [formData, setFormData] = useState({
    memberId: '',
    ideaName: '',
    content: '',
    rejectionReason: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const membersData = await getMembers()
      setMembers(membersData)
      const ideasData = await getIdeas()
      // 新しい順にソート
      ideasData.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setIdeas(ideasData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('error', 'データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    if (members.length === 0) {
      showToast('error', 'メンバーが登録されていません。先にメンバーを追加してください。')
      return
    }
    
    // ログインユーザーのメンバーIDをデフォルトに設定
    const defaultMemberId = currentMemberId || members[0]?.id || ''
    setFormData({
      memberId: defaultMemberId,
      ideaName: '',
      content: '',
      rejectionReason: ''
    })
    setShowAddForm(true)
    setEditingId(null)
  }

  const handleEditClick = (idea: Idea) => {
    setFormData({
      memberId: idea.memberId,
      ideaName: idea.ideaName,
      content: idea.content,
      rejectionReason: idea.rejectionReason || ''
    })
    setEditingId(idea.id)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    if (!formData.ideaName.trim() || !formData.content.trim()) {
      showToast('error', 'アイデア名と内容は必須です')
      return
    }

    try {
      const member = members.find(m => m.id === formData.memberId)
      if (!member) {
        showToast('error', 'メンバーが見つかりません')
        return
      }

      if (editingId) {
        // 編集
        const updatedIdea: Idea = {
          ...ideas.find(i => i.id === editingId)!,
          memberId: formData.memberId,
          memberName: member.name,
          ideaName: formData.ideaName.trim(),
          content: formData.content.trim(),
          rejectionReason: formData.rejectionReason.trim() || undefined,
          updatedAt: new Date().toISOString()
        }
        await saveIdea(updatedIdea)
        setIdeas(prev => prev.map(i => i.id === editingId ? updatedIdea : i))
        showToast('success', 'アイデアを更新しました')
      } else {
        // 新規追加
        const newIdea: Idea = {
          id: `idea-${Date.now()}`,
          memberId: formData.memberId,
          memberName: member.name,
          ideaName: formData.ideaName.trim(),
          content: formData.content.trim(),
          rejectionReason: formData.rejectionReason.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await saveIdea(newIdea)
        setIdeas(prev => [newIdea, ...prev])
        showToast('success', 'アイデアを追加しました')
      }

      setShowAddForm(false)
      setEditingId(null)
    } catch (error) {
      console.error('Error saving idea:', error)
      showToast('error', '保存に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('このアイデアを削除しますか？')) {
      try {
        await deleteIdea(id)
        setIdeas(prev => prev.filter(i => i.id !== id))
        showToast('info', 'アイデアを削除しました')
      } catch (error) {
        console.error('Error deleting idea:', error)
        showToast('error', '削除に失敗しました')
      }
    }
  }

  // フィルター処理: 'my' = 自分のアイデアのみ、'all' = 全員
  const filteredIdeas = selectedMemberId === 'all'
    ? ideas
    : selectedMemberId === 'my' && currentMemberId
    ? ideas.filter(idea => idea.memberId === currentMemberId)
    : ideas.filter(idea => idea.memberId === selectedMemberId)
  
  // 自分のアイデアの数をカウント
  const myIdeasCount = currentMemberId 
    ? ideas.filter(i => i.memberId === currentMemberId).length 
    : 0

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-orange-primary mb-2">💡 アイデア宝庫</h1>
        {currentMemberId ? (
          <p className="text-gray-600 text-sm">あなたのアイデアメモ帳です</p>
        ) : (
          <p className="text-gray-600 text-sm">各メンバーのアイデアメモを記録・閲覧できます</p>
        )}
      </header>

      {/* コントロール */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        {/* メンバーフィルター */}
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
        >
          {currentMemberId && (
            <option value="my">📝 自分のアイデア ({myIdeasCount}件)</option>
          )}
          <option value="all">👥 全員のアイデア ({ideas.length}件)</option>
          {members.map(member => {
            const count = ideas.filter(i => i.memberId === member.id).length
            return (
              <option key={member.id} value={member.id}>
                {member.name} ({count}件)
              </option>
            )
          })}
        </select>

        {/* 追加ボタン */}
        {isAuthenticated && (
          <button
            onClick={handleAddClick}
            className="bg-orange-primary text-white px-6 py-2 rounded-lg hover:bg-orange-dark transition-colors whitespace-nowrap"
          >
            ➕ 追加
          </button>
        )}
      </div>

      {/* 追加・編集フォーム */}
      {showAddForm && isAuthenticated && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6 border-2 border-orange-primary">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? '✏️ アイデアを編集' : '➕ 新しいアイデアを追加'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メンバー</label>
              {members.length > 0 ? (
                <select
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
                >
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-red-600">メンバーが登録されていません</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">アイデア名 *</label>
              <input
                type="text"
                value={formData.ideaName}
                onChange={(e) => setFormData({ ...formData, ideaName: e.target.value })}
                placeholder="なんでも良いよ！"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder=""
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">不採用理由</label>
              <textarea
                value={formData.rejectionReason}
                onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                placeholder="そのアイデアがうまくいかない理由を書いてね。障壁とか、コストとか。"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-orange-primary text-white px-4 py-2 rounded-lg hover:bg-orange-dark transition-colors"
              >
                💾 保存
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アイデアリスト */}
      {filteredIdeas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg">
          <p className="text-gray-400 text-lg mb-2">📝</p>
          <p className="text-gray-500">まだアイデアがありません</p>
          {isAuthenticated && (
            <p className="text-gray-400 text-sm mt-2">「➕ 追加」ボタンから追加してください</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map(idea => {
            const isMyIdea = currentMemberId === idea.memberId
            return (
              <div 
                key={idea.id} 
                className={`rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border ${
                  isMyIdea 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{idea.ideaName}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {idea.memberName} • {new Date(idea.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {isAuthenticated && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(idea)}
                        className={`p-1 transition-colors ${
                          isMyIdea 
                            ? 'text-orange-400 hover:text-orange-600' 
                            : 'text-gray-400 hover:text-orange-primary'
                        }`}
                        title="編集"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="削除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                  {idea.content}
                </div>

                {idea.rejectionReason && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-red-600 mb-1">❌ 却下理由</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{idea.rejectionReason}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
