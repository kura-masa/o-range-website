'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotification } from '@/contexts/NotificationContext'
import { Member, Idea } from '@/lib/data'
import { getMembers, getIdeas, saveIdea, deleteIdea } from '@/lib/firestore'
import { generateIdeaTitle } from '@/lib/gemini-client'

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
    if (!currentMemberId) {
      showToast('error', 'ログインしてください')
      return
    }

    setFormData({
      content: '',
      rejectionReason: ''
    })
    setShowAddForm(true)
    setEditingId(null)
  }

  const handleEditClick = (idea: Idea) => {
    setFormData({
      content: idea.content,
      rejectionReason: idea.rejectionReason || ''
    })
    setEditingId(idea.id)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    if (!formData.content.trim()) {
      showToast('error', '内容は必須です')
      return
    }

    if (!currentMemberId) {
      showToast('error', 'ログインしてください')
      return
    }

    try {
      const member = members.find(m => m.id === currentMemberId)
      if (!member) {
        showToast('error', 'メンバーが見つかりません')
        return
      }

      if (editingId) {
        // 編集 - タイトルを「更新中...」にして即座に保存
        const existingIdea = ideas.find(i => i.id === editingId)
        if (!existingIdea) {
          showToast('error', 'アイデアが見つかりません')
          return
        }

        const temporaryUpdatedIdea: Idea = {
          ...existingIdea,
          ideaName: 'アイデア名自動生成中...',
          content: formData.content.trim(),
          rejectionReason: formData.rejectionReason.trim() || undefined,
          updatedAt: new Date().toISOString()
        }
        
        // 即座にFirestoreに保存
        await saveIdea(temporaryUpdatedIdea)
        
        // UIを即座に更新してフォームを閉じる
        setIdeas(prev => prev.map(i => i.id === editingId ? temporaryUpdatedIdea : i))
        setShowAddForm(false)
        const currentEditingId = editingId
        setEditingId(null)
        showToast('success', 'アイデアを更新しました')
        
        // バックグラウンドでタイトル生成
        generateIdeaTitle(formData.content.trim())
          .then(async (generatedTitle) => {
            const finalUpdatedIdea: Idea = {
              ...temporaryUpdatedIdea,
              ideaName: generatedTitle,
              updatedAt: new Date().toISOString()
            }
            
            // Firestoreを更新
            await saveIdea(finalUpdatedIdea)
            
            // UIをリアルタイムで更新
            setIdeas(prev => prev.map(i => i.id === currentEditingId ? finalUpdatedIdea : i))
          })
          .catch((error) => {
            console.error('タイトル生成エラー:', error)
            // エラー時はフォールバックタイトルを使用
            const fallbackIdea: Idea = {
              ...temporaryUpdatedIdea,
              ideaName: formData.content.trim().substring(0, 30) + '...',
              updatedAt: new Date().toISOString()
            }
            saveIdea(fallbackIdea)
            setIdeas(prev => prev.map(i => i.id === currentEditingId ? fallbackIdea : i))
          })
      } else {
        // 新規追加 - フォームを即座に閉じて、仮タイトルで表示
        const timestamp = Date.now()
        const ideaId = `idea-${timestamp}`
        const temporaryIdea: Idea = {
          id: ideaId,
          memberId: currentMemberId,
          memberName: member.name,
          ideaName: 'アイデア名自動生成中...',
          content: formData.content.trim(),
          rejectionReason: formData.rejectionReason.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // 即座にFirestoreに保存
        await saveIdea(temporaryIdea)
        
        // UIを即座に更新してフォームを閉じる
        setIdeas(prev => [temporaryIdea, ...prev])
        setShowAddForm(false)
        setEditingId(null)
        showToast('success', 'アイデアを保存しました')
        
        // バックグラウンドでタイトル生成
        generateIdeaTitle(formData.content.trim())
          .then(async (generatedTitle) => {
            const updatedIdea: Idea = {
              ...temporaryIdea,
              ideaName: generatedTitle,
              updatedAt: new Date().toISOString()
            }
            
            // Firestoreを更新
            await saveIdea(updatedIdea)
            
            // UIをリアルタイムで更新
            setIdeas(prev => prev.map(i => i.id === ideaId ? updatedIdea : i))
          })
          .catch((error) => {
            console.error('タイトル生成エラー:', error)
            // エラー時はフォールバックタイトルを使用
            const fallbackIdea: Idea = {
              ...temporaryIdea,
              ideaName: formData.content.trim().substring(0, 30) + '...',
              updatedAt: new Date().toISOString()
            }
            saveIdea(fallbackIdea)
            setIdeas(prev => prev.map(i => i.id === ideaId ? fallbackIdea : i))
          })
      }
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
      {/* ヘッダー（フォーム非表示時のみ） */}
      {!showAddForm && (
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">あなたのアイデアメモ帳です</h1>
        </header>
      )}

      {/* フィルター（フォーム非表示時のみ表示） */}
      {!showAddForm && (
        <div className="mb-6">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent"
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
        </div>
      )}

      {/* 右下の追加ボタン（フローティング・フォーム非表示時のみ） */}
      {isAuthenticated && !showAddForm && (
        <button
          onClick={handleAddClick}
          className="fixed bottom-6 right-6 bg-orange-primary text-white w-14 h-14 rounded-full shadow-lg hover:bg-orange-dark transition-all hover:scale-110 flex items-center justify-center z-50"
          title="新しいアイデアを追加"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* 追加・編集フォーム */}
      {showAddForm && isAuthenticated && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6 border-2 border-orange-primary">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent resize-none"
                style={{ height: 'calc(50vh - 60px)', minHeight: '200px' }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">実行時の障壁を書いてください</label>
              <textarea
                value={formData.rejectionReason}
                onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                placeholder="例：相当なやる気が必要、すでにあった、お金がかかる、現在の技術的に不可能、市場がない、など"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-transparent resize-none"
                style={{ height: 'calc(25vh - 20px)', minHeight: '100px' }}
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

      {/* アイデアリスト（フォーム非表示時のみ） */}
      {!showAddForm && (
        filteredIdeas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <p className="text-gray-400 text-lg mb-2">📝</p>
            <p className="text-gray-500">あなたのアイデアをメモできます</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredIdeas.map(idea => {
              const isMyIdea = currentMemberId === idea.memberId
              return (
                <div
                  key={idea.id}
                  className={`rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border ${isMyIdea
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
                          className={`p-1 transition-colors ${isMyIdea
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
                      <p className="text-xs font-semibold mb-1">障壁</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{idea.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
