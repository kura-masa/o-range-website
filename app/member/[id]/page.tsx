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
      // Firebaseから直接取得
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">読み込み中...</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">メンバーが見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <button
        onClick={() => router.push('/')}
        className="mb-4 text-orange-primary hover:text-orange-dark flex items-center"
      >
        ← 戻る
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* プロフィール画像No.2と基本情報 */}
        {/* スマホでも「画像(左) + テキスト(右)」を崩さないため flex-nowrap を明示 */}
        <div className="flex !flex-row !flex-nowrap gap-3 sm:gap-6 mb-6 items-start">
          {/* スマホ(w-24: 96px) / PC(sm:w-32: 128px) でサイズを分ける */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 relative">
            {isEditMode ? (
              <ImageUploader
                currentImage={member.imageNo2}
                memberId={member.id}
                imageType="no2"
                onUploadSuccess={(url) => handleUpdate('imageNo2', url)}
                label="プロフィール画像No.2"
                variant="overlay"
              />
            ) : member.imageNo2 ? (
              <Image
                src={member.imageNo2}
                alt={member.name}
                width={128}
                height={128}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-[10px] sm:text-sm text-center px-1">準備中</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            {/* スマホで文字が溢れないよう text-xl に調整 */}
            <h1 className="text-xl sm:text-2xl font-bold text-orange-primary mb-2 sm:mb-3 truncate">
              {isEditMode ? (
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => handleUpdate('name', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-base"
                />
              ) : (
                member.name
              )}
            </h1>

            {/* 行間を少し詰め、文字サイズをスマホ用に調整 */}
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex flex-row items-baseline gap-1">
                <span className="font-semibold text-gray-700 whitespace-nowrap">生年月日:&nbsp;</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={member.birthDate || ''}
                    onChange={(e) => handleUpdate('birthDate', e.target.value)}
                    className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
                    placeholder="例）1995年4月15日"
                  />
                ) : (
                  <span className="text-gray-600 truncate">{member.birthDate || '未設定'}</span>
                )}
              </div>

              <div className="flex flex-row items-baseline gap-1">
                <span className="font-semibold text-gray-700 whitespace-nowrap">出身:&nbsp;</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={member.hometown || ''}
                    onChange={(e) => handleUpdate('hometown', e.target.value)}
                    className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
                    placeholder="例）東京都"
                  />
                ) : (
                  <span className="text-gray-600 truncate">{member.hometown || '未設定'}</span>
                )}
              </div>

              <div className="flex flex-row items-baseline gap-1">
                <span className="font-semibold text-gray-700 whitespace-nowrap">趣味:&nbsp;</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={member.hobbies || ''}
                    onChange={(e) => handleUpdate('hobbies', e.target.value)}
                    className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
                    placeholder="例）読書、ランニング"
                  />
                ) : (
                  <span className="text-gray-600 truncate">{member.hobbies || '未設定'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 趣味や想い */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-orange-primary mb-3">趣味や想い</h2>
          {isEditMode ? (
            <textarea
              value={member.thoughts || ''}
              onChange={(e) => handleUpdate('thoughts', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 min-h-[100px]"
              placeholder="趣味や想いを入力してください"
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{member.thoughts || '未設定'}</p>
          )}
        </div>

        {/* 経歴と今後の展開 */}
        <div>
          <h2 className="text-xl font-semibold text-orange-primary mb-3">経歴と今後の展開</h2>
          {isEditMode ? (
            <textarea
              value={member.career || ''}
              onChange={(e) => handleUpdate('career', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 min-h-[150px]"
              placeholder="経歴と今後の展開を入力してください"
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{member.career || '未設定'}</p>
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
