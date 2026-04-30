'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import MemberCard from '@/components/MemberCard'
import SaveButtons from '@/components/SaveButtons'
import HamburgerMenu from '@/components/HamburgerMenu'
import { Member } from '@/lib/data'
import { getMembers, saveMembers } from '@/lib/firestore'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { isEditMode, disableEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast } = useNotification()
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

  const handleUpdateMember = (id: string, field: keyof Member, value: string | number) => {
    // Scale フィールドは number で保持
    const coerced: string | number =
      (field === 'imageNo1Scale' || field === 'imageNo2Scale') && typeof value === 'string'
        ? parseFloat(value)
        : value
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: coerced } : m)))
    setHasUnsavedChanges(true)
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
      <HamburgerMenu onMemberAutoAdded={loadMembers} />

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
                  onSave={handleSave}
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
