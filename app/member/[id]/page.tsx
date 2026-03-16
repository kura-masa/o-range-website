'use client'

// Avoid SSR for this dynamic route to prevent server function failures.
// Render a static shell and let client fetch data from Firestore.
export const dynamic = 'force-static'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { Member, ProfileSection, SECTION_CATEGORIES, CUSTOM_CATEGORY } from '@/lib/data'
import { getMember, saveMember } from '@/lib/firestore'
import SaveButtons from '@/components/SaveButtons'
import ImageUploader, { buildImageStyle } from '@/components/ImageUploader'

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

  const handleUpdate = (field: keyof Member, value: string | number) => {
    if (member) {
      setMember({ ...member, [field]: value })
      setHasUnsavedChanges(true)
    }
  }

  const handleUpdateSections = (newSections: ProfileSection[]) => {
    if (member) {
      setMember({ ...member, sections: newSections })
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
      {/* ヒーロー画像エリア（16:9固定） */}
      <div className="relative w-full aspect-video">
        {/* 戻るボタン */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 flex items-center gap-1 text-orange-primary text-sm font-semibold drop-shadow-lg hover:opacity-80 transition-opacity"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
        >
          ← 戻る
        </button>
        {isEditMode ? (
          <div className="absolute inset-0">
            <ImageUploader
              currentImage={member.imageNo2}
              currentPosition={member.imageNo2Position}
              currentScale={member.imageNo2Scale}
              memberId={member.id}
              imageType="no2"
              onUploadSuccess={(url) => handleUpdate('imageNo2', url)}
              onPositionChange={(pos) => handleUpdate('imageNo2Position', pos)}
              onScaleChange={(s) => handleUpdate('imageNo2Scale', s)}
              label="プロフィール画像"
              variant="overlay"
              frameAspect={16 / 9}
            />
          </div>
        ) : member.imageNo2 ? (
          <div className="absolute inset-0 overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.imageNo2}
              alt={member.name}
              draggable={false}
              style={buildImageStyle(member.imageNo2Position, member.imageNo2Scale, 16 / 9)}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
            <span className="text-gray-500 text-sm">準備中</span>
          </div>
        )}

        {/* 下部グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f] pointer-events-none" />
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

        {/* プロフィールセクション（選択式） */}
        {(member.sections && member.sections.length > 0) || isEditMode ? (
          <>
            {(member.sections || []).map((section, index) => (
              <div key={index} className="mb-8">
                {isEditMode ? (
                  <>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <select
                        value={(SECTION_CATEGORIES as readonly string[]).includes(section.category) ? section.category : CUSTOM_CATEGORY}
                        onChange={(e) => {
                          const newSections = [...(member.sections || [])]
                          if (e.target.value === CUSTOM_CATEGORY) {
                            newSections[index] = { ...newSections[index], category: '' }
                          } else {
                            newSections[index] = { ...newSections[index], category: e.target.value }
                          }
                          handleUpdateSections(newSections)
                        }}
                        className="bg-[#111118] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-orange-primary font-bold outline-none"
                      >
                        {SECTION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value={CUSTOM_CATEGORY}>✏️ 自由入力</option>
                      </select>
                      {!(SECTION_CATEGORIES as readonly string[]).includes(section.category) && (
                        <input
                          type="text"
                          value={section.category}
                          onChange={(e) => {
                            const newSections = [...(member.sections || [])]
                            newSections[index] = { ...newSections[index], category: e.target.value }
                            handleUpdateSections(newSections)
                          }}
                          className="bg-[#111118] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-orange-primary font-bold outline-none flex-1 min-w-[120px]"
                          placeholder="タイトルを入力"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newSections = (member.sections || []).filter((_, i) => i !== index)
                          handleUpdateSections(newSections)
                        }}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
                      >
                        ✕ 削除
                      </button>
                    </div>
                    <textarea
                      value={section.content}
                      onChange={(e) => {
                        const newSections = [...(member.sections || [])]
                        newSections[index] = { ...newSections[index], content: e.target.value }
                        handleUpdateSections(newSections)
                      }}
                      className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 outline-none min-h-[120px] resize-none"
                      placeholder="内容を入力してください"
                    />
                  </>
                ) : (
                  <>
                    <h2
                      className="text-xl font-black tracking-widest mb-2"
                      style={{ color: '#FF8C42', textShadow: '0 0 12px rgba(255,140,66,0.6)' }}
                    >
                      {section.category}
                    </h2>
                    <div className="border-b-2 border-orange-primary mb-4 w-12" />
                    <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {section.content ? (
                        section.content.split('\n').map((line, i) =>
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
                  </>
                )}
              </div>
            ))}

            {/* セクション追加ボタン（編集モード時のみ） */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  const newSections = [...(member.sections || []), { category: '趣味' as const, content: '' }]
                  handleUpdateSections(newSections)
                }}
                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-orange-primary hover:border-orange-primary/50 transition-colors text-sm font-semibold"
              >
                ＋ セクションを追加
              </button>
            )}
          </>
        ) : (
          <div className="mb-8 text-center text-gray-500 text-sm py-8">
            セクションが設定されていません
          </div>
        )}
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
