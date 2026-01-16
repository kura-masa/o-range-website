'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import MemberCard from '@/components/MemberCard'
import SaveButtons from '@/components/SaveButtons'
import HamburgerMenu from '@/components/HamburgerMenu'
import { Member } from '@/lib/data'
import { getMembers, saveMembers, saveMember } from '@/lib/firestore'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { isEditMode, disableEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast, confirmAction } = useNotification()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    setLoading(true)
    try {
      // Firebaseから直接取得（Firestoreが優先）
      const data = await getMembers()
      setMembers(data)
      console.log(`✅ Loaded ${data.length} members from Firebase`)
    } catch (error) {
      console.error('Error loading members:', error)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Firestoreに保存
      await saveMembers(members)
      setHasUnsavedChanges(false)
      showToast('success', 'メンバー情報を保存しました')
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    }
  }

  const handleSaveAndExit = async () => {
    try {
      await saveMembers(members)
      setHasUnsavedChanges(false)
      showToast('success', 'メンバー情報を保存して編集モードを終了しました')
      disableEditMode()
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    }
  }

  const handleUpdateMember = (id: string, field: keyof Member, value: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
    setHasUnsavedChanges(true)
  }

  const handleAddMember = async () => {
    // 既存のメンバーIDから次の番号を取得
    const existingIds = members
      .map(m => m.id)
      .filter(id => id.startsWith('member-'))
      .map(id => parseInt(id.replace('member-', ''), 10))
      .filter(num => !isNaN(num))

    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
    const id = `member-${String(nextNumber).padStart(5, '0')}`

    const newMember: Member = {
      id,
      name: '準備中',
      nickname: '準備中',
      tagline: '準備中です',
      imageNo1: undefined,
      imageNo2: undefined,
      birthDate: '準備中',
      hometown: '準備中',
      hobbies: '準備中',
      thoughts: '準備中',
      career: '準備中',
    }

    try {
      // 追加時に即Firestoreへ保存（自動保存）
      await saveMember(newMember)
      setMembers((prev) => [...prev, newMember])
      // 追加直後は未保存フラグは立てない（以降の編集で立つ）

      // 新しく追加されたメンバーまでスクロール
      setTimeout(() => {
        const newMemberElement = document.getElementById(`member-${id}`)
        if (newMemberElement) {
          newMemberElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    } catch (e) {
      console.error('Error auto-saving new member:', e)
      showToast('error', 'メンバーの追加に失敗しました')
    }
  }

  const handleDeleteMember = (id: string) => {
    const target = members.find((m) => m.id === id)
    const label = target?.name ? `「${target.name}」` : 'このメンバー'

    confirmAction({
      title: 'メンバーの削除',
      message: `${label} を削除しますか？（保存ボタンを押すまで確定されません）`,
      confirmLabel: '削除する',
      variant: 'danger',
      onConfirm: () => {
        setMembers((prev) => prev.filter((m) => m.id !== id))
        setHasUnsavedChanges(true)
        showToast('info', 'メンバーを削除リストに追加しました（保存して確定してください）')
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <>
      <HamburgerMenu onAddMember={handleAddMember} />

      <div className="max-w-6xl mx-auto px-2 py-3 pb-24">
        <header className="mb-3 text-center">
          <h1 className="mt-1 text-3xl font-bold text-orange-primary">O-rangeメンバー</h1>
        </header>

        {members.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">まだメンバーがいません</p>
            {isAuthenticated && (
              <p className="text-gray-400 text-sm">ハンバーガーメニューから「メンバー追加」してください</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {members.map((member) => (
              <div key={member.id} id={`member-${member.id}`}>
                <MemberCard
                  member={member}
                  isEditing={isEditMode}
                  onUpdate={handleUpdateMember}
                  onDelete={handleDeleteMember}
                />
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && isEditMode && (
          <SaveButtons
            onSave={handleSave}
            onSaveAndExit={handleSaveAndExit}
          />
        )}
      </div>
    </>
  )
}
