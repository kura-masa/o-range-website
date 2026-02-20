'use client'

// Avoid SSR for this dynamic route to prevent server function failures.
// Render a static shell and let client fetch data from Firestore.
export const dynamic = 'force-static'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { Member } from '@/lib/data'
import { getMember, saveMember } from '@/lib/firestore'
import SaveButtons from '@/components/SaveButtons'
import ImageUploader from '@/components/ImageUploader'
import Image from 'next/image'

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { isEditMode, disableEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast } = useNotification()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.id) {
      loadMember(params.id)
    }
  }, [params?.id])

  const loadMember = async (id: string) => {
    setLoading(true)
    try {
      const data = await getMember(id)
      setMember(data)
      if (data) {
        console.log(`✅ Loaded member ${id} from Firebase`)
      }
    } catch (error) {
      console.error('Error loading member:', error)
      setMember(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (member) {
      try {
        await saveMember(member)
        setHasUnsavedChanges(false)
        showToast('success', 'プロフィールを保存しました')
      } catch (error) {
        console.error('Error saving:', error)
        showToast('error', '保存に失敗しました')
      }
    }
  }

  const handleSaveAndExit = async () => {
    await handleSave()
    disableEditMode()
  }

  const handleUpdate = (field: keyof Member, value: string) => {
    if (member) {
      setMember({ ...member, [field]: value })
      setHasUnsavedChanges(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400 text-sm">メンバーが見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* ヒーロー画像エリア */}
      <div className="relative w-full" style={{ minHeight: '55vw', maxHeight: '70vh' }}>
        {/* 戻るボタン */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 flex items-center gap-1 text-orange-primary text-sm font-semibold drop-shadow-lg hover:opacity-80 transition-opacity"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
        >
          ← 戻る
        </button>
        {isEditMode ? (
          <div className="w-full h-full" style={{ minHeight: '55vw', maxHeight: '70vh' }}>
            <ImageUploader
              currentImage={member.imageNo2}
              memberId={member.id}
              imageType="no2"
              onUploadSuccess={(url) => handleUpdate('imageNo2', url)}
              label="プロフィール画像"
              variant="overlay"
            />
          </div>
        ) : member.imageNo2 ? (
          <Image
            src={member.imageNo2}
            alt={member.name}
            fill
            className="object-cover object-top"
            priority
          />
        ) : (
          <div
            className="w-full flex items-center justify-center bg-[#1a1a2e]"
            style={{ minHeight: '55vw', maxHeight: '70vh' }}
          >
            <span className="text-gray-500 text-sm">準備中</span>
          </div>
        )}

        {/* 下部グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />
      </div>

      {/* コンテンツエリア */}
      <div className="px-5 -mt-6 relative z-10">
        {/* 名前 */}
        <div className="mb-4 text-center">
          {isEditMode ? (
            <input
              type="text"
              value={member.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              className="w-full bg-transparent border-b border-orange-primary text-4xl font-bold text-white text-center outline-none"
            />
          ) : (
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              {member.name}
            </h1>
          )}
        </div>

        {/* 基本情報 */}
        <div className="mb-8 space-y-1 text-sm text-gray-300 text-center">
          {/* 生年月日 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-primary">📅</span>
            {isEditMode ? (
              <input
                type="text"
                value={member.birthDate || ''}
                onChange={(e) => handleUpdate('birthDate', e.target.value)}
                className="bg-transparent border-b border-gray-600 text-sm text-white outline-none w-40 text-center"
                placeholder="例）2000年"
              />
            ) : (
              <span>生年月日：{member.birthDate || '未設定'}</span>
            )}
          </div>

          {/* 出身 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-primary">📍</span>
            {isEditMode ? (
              <input
                type="text"
                value={member.hometown || ''}
                onChange={(e) => handleUpdate('hometown', e.target.value)}
                className="bg-transparent border-b border-gray-600 text-sm text-white outline-none w-40 text-center"
                placeholder="例）宮崎県"
              />
            ) : (
              <span>出身：{member.hometown || '未設定'}</span>
            )}
          </div>

          {/* 趣味 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-primary">🎯</span>
            {isEditMode ? (
              <input
                type="text"
                value={member.hobbies || ''}
                onChange={(e) => handleUpdate('hobbies', e.target.value)}
                className="bg-transparent border-b border-gray-600 text-sm text-white outline-none w-40 text-center"
                placeholder="例）健康・読書"
              />
            ) : (
              <span>趣味：{member.hobbies || '未設定'}</span>
            )}
          </div>
        </div>

        {/* HOBBIES & VISION セクション */}
        <div className="mb-8">
          <h2
            className="text-xl font-black tracking-widest mb-2"
            style={{ color: '#FF8C42', textShadow: '0 0 12px rgba(255,140,66,0.6)' }}
          >
            HOBBIES &amp; VISION
          </h2>
          <div className="border-b-2 border-orange-primary mb-4 w-12" />
          {isEditMode ? (
            <textarea
              value={member.thoughts || ''}
              onChange={(e) => handleUpdate('thoughts', e.target.value)}
              className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 outline-none min-h-[120px] resize-none"
              placeholder="趣味・ビジョンを入力してください"
            />
          ) : (
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {member.thoughts || '未設定'}
            </div>
          )}
        </div>

        {/* CAREER & FUTURE セクション */}
        <div className="mb-8">
          <h2
            className="text-xl font-black tracking-widest mb-2"
            style={{ color: '#FF8C42', textShadow: '0 0 12px rgba(255,140,66,0.6)' }}
          >
            CAREER &amp; FUTURE
          </h2>
          <div className="border-b-2 border-orange-primary mb-4 w-12" />
          {isEditMode ? (
            <textarea
              value={member.career || ''}
              onChange={(e) => handleUpdate('career', e.target.value)}
              className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 outline-none min-h-[150px] resize-none"
              placeholder="経歴・今後の展開を入力してください"
            />
          ) : (
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {member.career ? (
                member.career.split('\n').map((line, i) =>
                  line.trim() ? (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className="text-orange-primary mt-0.5 flex-shrink-0">◎</span>
                      <span>{line}</span>
                    </div>
                  ) : null
                )
              ) : (
                <span className="text-gray-500">未設定</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && isEditMode && (
        <SaveButtons
          onSave={handleSave}
          onSaveAndExit={handleSaveAndExit}
        />
      )}
    </div>
  )
}
