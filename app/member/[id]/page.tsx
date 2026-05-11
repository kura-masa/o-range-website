'use client'

// Avoid SSR for this dynamic route to prevent server function failures.
// Render a static shell and let client fetch data from Firestore.
export const dynamic = 'force-static'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { Member, ProfileSection, ContentBlock, SECTION_CATEGORIES, CUSTOM_CATEGORY } from '@/lib/data'
import { getMember, saveMember } from '@/lib/firestore'
import { uploadSectionImage, validateImageFile } from '@/lib/storage'
import ImageUploader, { buildImageStyle } from '@/components/ImageUploader'

const AUTO_SAVE_DEBOUNCE_MS = 1500
const UNDO_HISTORY_LIMIT = 20

// テキスト内の [表示テキスト](URL) をリンクに変換して描画
function renderTextWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // リンク前のテキスト
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    // リンク部分
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-400 underline underline-offset-2 hover:text-orange-300 transition-colors"
      >
        {match[1]}
      </a>
    )
    lastIndex = match.index + match[0].length
  }
  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : [text]
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, currentMemberId } = useAuth()
  const { isEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast } = useNotification()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [history, setHistory] = useState<Member[]>([])

  const lastSavedRef = useRef<Member | null>(null)
  const memberRef = useRef<Member | null>(null)
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const decodedId = params?.id ? decodeURIComponent(params.id) : ''
  const canEdit = isEditMode && currentMemberId === decodedId

  useEffect(() => {
    if (params?.id) {
      loadMember(decodeURIComponent(params.id))
    }
  }, [params?.id])

  // member の最新値を ref で保持（unmount時の保存に使用）
  useEffect(() => {
    memberRef.current = member
  }, [member])

  const loadMember = async (id: string) => {
    setLoading(true)
    try {
      const data = await getMember(id)
      setMember(data)
      lastSavedRef.current = data
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

  const performSave = async (target: Member) => {
    setSaveStatus('saving')
    try {
      await saveMember(target)
      // 直前の保存状態を履歴に積む（Undo用）
      if (lastSavedRef.current) {
        setHistory(prev => {
          const next = [...prev, lastSavedRef.current!]
          return next.length > UNDO_HISTORY_LIMIT ? next.slice(next.length - UNDO_HISTORY_LIMIT) : next
        })
      }
      lastSavedRef.current = target
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current)
      savedFlashTimerRef.current = setTimeout(() => {
        setSaveStatus(s => (s === 'saved' ? 'idle' : s))
      }, 2000)
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveStatus('error')
    }
  }

  // デバウンス自動保存
  useEffect(() => {
    if (!member || !lastSavedRef.current) return
    if (JSON.stringify(member) === JSON.stringify(lastSavedRef.current)) return

    setHasUnsavedChanges(true)
    const t = setTimeout(() => {
      performSave(member)
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member])

  // アンマウント時、未保存があれば fire-and-forget で保存
  useEffect(() => {
    return () => {
      const cur = memberRef.current
      const last = lastSavedRef.current
      if (cur && last && JSON.stringify(cur) !== JSON.stringify(last)) {
        saveMember(cur).catch((e) => console.error('Unmount save failed:', e))
      }
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current)
    }
  }, [])

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setMember(prev)
    // 状態を「直前の保存済み」に巻き戻すので、再保存を回避するため lastSaved も同期
    lastSavedRef.current = prev
    // ただし即座に Firestore へ反映するため明示的に保存
    performSave(prev)
    showToast('success', '直前の状態に戻しました')
  }

  const handleRetry = () => {
    if (!member) return
    performSave(member)
  }

  const handleUpdate = (field: keyof Member, value: string | number | boolean) => {
    setMember(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const handleUpdateSections = (updater: (prev: ProfileSection[]) => ProfileSection[]) => {
    setMember(prev => prev ? { ...prev, sections: updater(prev.sections || []) } : prev)
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
        {canEdit ? (
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
          {canEdit ? (
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

        {/* TEL / E-Mail（名前と基本情報の間） */}
        {canEdit ? (
          <div className="mb-4 space-y-2">
            {/* TEL 編集 */}
            <div className="flex items-center justify-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={member.showTel ?? false}
                  onChange={(e) => handleUpdate('showTel', e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-xs text-gray-400">表示</span>
              </label>
              <span className="text-orange-primary">📞</span>
              <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0">TEL:</span>
              <input
                type="text"
                value={member.tel || ''}
                onChange={(e) => handleUpdate('tel', e.target.value)}
                className="bg-transparent border-b border-gray-600 text-sm text-white outline-none w-48 text-center"
                placeholder="例）090-1234-5678"
              />
            </div>
            {/* E-Mail 編集 */}
            <div className="flex items-center justify-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={member.showEmail ?? false}
                  onChange={(e) => handleUpdate('showEmail', e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-xs text-gray-400">表示</span>
              </label>
              <span className="text-orange-primary">✉️</span>
              <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0">E-Mail:</span>
              <input
                type="text"
                value={member.email || ''}
                onChange={(e) => handleUpdate('email', e.target.value)}
                className="bg-transparent border-b border-gray-600 text-sm text-white outline-none w-48 text-center"
                placeholder="例）example@mail.com"
              />
            </div>
          </div>
        ) : (
          /* 表示モード: showTel / showEmail がtrueの場合のみ表示 */
          (member.showTel || member.showEmail) && (
            <div className="mb-4 space-y-1 text-sm text-gray-300 text-center">
              {member.showTel && member.tel && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-primary">📞</span>
                  <span>TEL：<span className="border-b border-white pb-0.5 px-1">{member.tel}</span></span>
                </div>
              )}
              {member.showEmail && member.email && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-primary">✉️</span>
                  <span>E-Mail：<span className="border-b border-white pb-0.5 px-1">{member.email}</span></span>
                </div>
              )}
            </div>
          )
        )}

        {/* 基本情報 */}
        <div className="mb-8 space-y-1 text-sm text-gray-300 text-center">
          {/* 生年月日 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-primary">📅</span>
            {canEdit ? (
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
            {canEdit ? (
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
            {canEdit ? (
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
        {(member.sections && member.sections.length > 0) || canEdit ? (
          <>
            {(member.sections || []).map((section, index) => (
              <div key={index} className="mb-8">
                {canEdit ? (
                  <>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <select
                        value={(SECTION_CATEGORIES as readonly string[]).includes(section.category) ? section.category : CUSTOM_CATEGORY}
                        onChange={(e) => {
                          handleUpdateSections(prev => {
                            const newSections = [...prev]
                            if (e.target.value === CUSTOM_CATEGORY) {
                              newSections[index] = { ...newSections[index], category: '' }
                            } else {
                              newSections[index] = { ...newSections[index], category: e.target.value }
                            }
                            return newSections
                          })
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
                            handleUpdateSections(prev => {
                              const newSections = [...prev]
                              newSections[index] = { ...newSections[index], category: e.target.value }
                              return newSections
                            })
                          }}
                          className="bg-[#111118] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-orange-primary font-bold outline-none flex-1 min-w-[120px]"
                          placeholder="タイトルを入力"
                        />
                      )}
                      {/* 並び替えボタン */}
                      <div className="flex items-center gap-0.5 ml-auto">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            handleUpdateSections(prev => {
                              const newSections = [...prev]
                              ;[newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
                              return newSections
                            })
                          }}
                          className="text-gray-400 hover:text-orange-primary disabled:text-gray-700 disabled:cursor-not-allowed text-sm px-1.5 py-1 rounded border border-gray-600 hover:border-orange-primary/50 disabled:border-gray-800 transition-colors"
                          title="上へ移動"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={index === (member.sections || []).length - 1}
                          onClick={() => {
                            handleUpdateSections(prev => {
                              const newSections = [...prev]
                              ;[newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
                              return newSections
                            })
                          }}
                          className="text-gray-400 hover:text-orange-primary disabled:text-gray-700 disabled:cursor-not-allowed text-sm px-1.5 py-1 rounded border border-gray-600 hover:border-orange-primary/50 disabled:border-gray-800 transition-colors"
                          title="下へ移動"
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateSections(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
                      >
                        ✕ 削除
                      </button>
                    </div>
                    {/* 箇条書きエディタ */}
                    <div className="w-full bg-[#111118] border border-gray-700 rounded-lg px-3 py-3 space-y-1">
                      {(() => {
                        const lines = section.content ? section.content.split('\n') : ['']
                        return lines.map((line, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-1.5 group">
                            <span className="text-orange-primary flex-shrink-0 text-sm select-none">◎</span>
                            <input
                              type="text"
                              value={line}
                              onChange={(e) => {
                                const newLines = [...lines]
                                newLines[lIdx] = e.target.value
                                handleUpdateSections(prev => {
                                  const newSections = [...prev]
                                  newSections[index] = { ...newSections[index], content: newLines.join('\n') }
                                  return newSections
                                })
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const input = e.target as HTMLInputElement
                                  const pos = input.selectionStart ?? line.length
                                  const before = line.slice(0, pos)
                                  const after = line.slice(pos)
                                  const newLines = [...lines]
                                  newLines[lIdx] = before
                                  newLines.splice(lIdx + 1, 0, after)
                                  handleUpdateSections(prev => {
                                    const newSections = [...prev]
                                    newSections[index] = { ...newSections[index], content: newLines.join('\n') }
                                    return newSections
                                  })
                                  // 次の行の先頭にフォーカス
                                  setTimeout(() => {
                                    const parent = (e.target as HTMLElement).closest('.space-y-1')
                                    const inputs = parent?.querySelectorAll<HTMLInputElement>('input[type="text"]')
                                    const next = inputs?.[lIdx + 1]
                                    if (next) {
                                      next.focus()
                                      next.setSelectionRange(0, 0)
                                    }
                                  }, 0)
                                } else if (e.key === 'Backspace' && line === '' && lines.length > 1) {
                                  e.preventDefault()
                                  const newLines = [...lines]
                                  newLines.splice(lIdx, 1)
                                  handleUpdateSections(prev => {
                                    const newSections = [...prev]
                                    newSections[index] = { ...newSections[index], content: newLines.join('\n') }
                                    return newSections
                                  })
                                  // 前の行にフォーカス
                                  setTimeout(() => {
                                    const parent = (e.target as HTMLElement).closest('.space-y-1')
                                    const inputs = parent?.querySelectorAll<HTMLInputElement>('input[type="text"]')
                                    const target = inputs?.[Math.max(0, lIdx - 1)]
                                    if (target) {
                                      target.focus()
                                      target.setSelectionRange(target.value.length, target.value.length)
                                    }
                                  }, 0)
                                }
                              }}
                              className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
                              placeholder="ここに書いてください"
                            />
                          </div>
                        ))
                      })()}
                    </div>
                    {/* リンク記法ヒント */}
                    <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <span>＊</span>
                      <span>リンクは <code className="bg-[#1a1a2e] px-1 py-0.5 rounded text-orange-400/70">[表示テキスト](URL)</code> の形式で埋め込めます</span>
                    </div>

                    {/* 画像ブロック一覧（編集モード） */}
                    {(section.blocks || []).map((block, bIdx) => (
                      <div key={bIdx} className="mt-3 bg-[#111118] border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-semibold">📷 画像ブロック {bIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateSections(prev => {
                                const newSections = [...prev]
                                const newBlocks = [...(newSections[index].blocks || [])]
                                newBlocks.splice(bIdx, 1)
                                newSections[index] = { ...newSections[index], blocks: newBlocks }
                                return newSections
                              })
                            }}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
                          >
                            ✕ 削除
                          </button>
                        </div>
                        {block.value ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={block.value}
                            alt={block.caption || '画像'}
                            className="w-full max-h-48 object-contain rounded mb-2 bg-black/30"
                          />
                        ) : (
                          <div className="w-full h-32 bg-[#0a0a0f] rounded flex items-center justify-center mb-2">
                            <label className="cursor-pointer px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors">
                              画像をアップロード
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const validation = validateImageFile(file)
                                  if (!validation.valid) {
                                    showToast('error', validation.error || '不正なファイルです')
                                    return
                                  }
                                  try {
                                    const url = await uploadSectionImage(member.id, file, index)
                                    handleUpdateSections(prev => {
                                      const newSections = [...prev]
                                      const newBlocks = [...(newSections[index].blocks || [])]
                                      newBlocks[bIdx] = { ...newBlocks[bIdx], value: url }
                                      newSections[index] = { ...newSections[index], blocks: newBlocks }
                                      return newSections
                                    })
                                    showToast('success', '画像をアップロードしました')
                                  } catch {
                                    showToast('error', '画像のアップロードに失敗しました')
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                        {/* 説明文入力 */}
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => {
                            handleUpdateSections(prev => {
                              const newSections = [...prev]
                              const newBlocks = [...(newSections[index].blocks || [])]
                              newBlocks[bIdx] = { ...newBlocks[bIdx], caption: e.target.value }
                              newSections[index] = { ...newSections[index], blocks: newBlocks }
                              return newSections
                            })
                          }}
                          className="w-full bg-[#0a0a0f] border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 outline-none mb-2"
                          placeholder="説明文（任意）"
                        />
                        {/* 説明文位置 */}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>説明文位置:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`caption-pos-${index}-${bIdx}`}
                              checked={(block.captionPosition || 'below') === 'above'}
                              onChange={() => {
                                handleUpdateSections(prev => {
                                  const newSections = [...prev]
                                  const newBlocks = [...(newSections[index].blocks || [])]
                                  newBlocks[bIdx] = { ...newBlocks[bIdx], captionPosition: 'above' }
                                  newSections[index] = { ...newSections[index], blocks: newBlocks }
                                  return newSections
                                })
                              }}
                              className="accent-orange-500"
                            />
                            上
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`caption-pos-${index}-${bIdx}`}
                              checked={(block.captionPosition || 'below') === 'below'}
                              onChange={() => {
                                handleUpdateSections(prev => {
                                  const newSections = [...prev]
                                  const newBlocks = [...(newSections[index].blocks || [])]
                                  newBlocks[bIdx] = { ...newBlocks[bIdx], captionPosition: 'below' }
                                  newSections[index] = { ...newSections[index], blocks: newBlocks }
                                  return newSections
                                })
                              }}
                              className="accent-orange-500"
                            />
                            下
                          </label>
                        </div>
                      </div>
                    ))}

                    {/* 画像追加ボタン */}
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateSections(prev => {
                          const newSections = [...prev]
                          const newBlocks: ContentBlock[] = [...(newSections[index].blocks || []), { type: 'image', value: '', caption: '', captionPosition: 'below' }]
                          newSections[index] = { ...newSections[index], blocks: newBlocks }
                          return newSections
                        })
                      }}
                      className="mt-2 w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-orange-primary hover:border-orange-primary/50 transition-colors text-xs font-semibold"
                    >
                      ＋ 画像を追加
                    </button>
                  </>
                ) : (
                  <>
                    <h2
                      className="text-xl font-black tracking-widest mb-1"
                      style={{ color: '#FF8C42', textShadow: '0 0 12px rgba(255,140,66,0.6)' }}
                    >
                      {section.category}
                    </h2>
                    <div className="border-b-2 border-orange-primary mb-2 w-500" />
                    <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {section.content ? (
                        section.content.split('\n').map((line, i) =>
                          line.trim() ? (
                            <div key={i} className="flex items-start gap-2 mb-1">
                              <span className="text-orange-primary mt-0.5 flex-shrink-0">◎</span>
                              <span>{renderTextWithLinks(line)}</span>
                            </div>
                          ) : null
                        )
                      ) : (
                        <span className="text-gray-500"></span>
                      )}
                    </div>

                    {/* 画像ブロック（表示モード） */}
                    {section.blocks && section.blocks.length > 0 && (
                      <div className="mt-3 space-y-4">
                        {section.blocks.map((block, bIdx) =>
                          block.type === 'image' && block.value ? (
                            <div key={bIdx} className="rounded-lg overflow-hidden">
                              {block.caption && block.captionPosition === 'above' && (
                                <p className="text-xs text-gray-400 mb-1 px-1">{block.caption}</p>
                              )}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={block.value}
                                alt={block.caption || '画像'}
                                className="w-full rounded-lg"
                              />
                              {block.caption && (block.captionPosition || 'below') === 'below' && (
                                <p className="text-sm text-gray-400 mt-1 px-1">{block.caption}</p>
                              )}
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* セクション追加ボタン（編集モード時のみ） */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  handleUpdateSections(prev => [...prev, { category: '趣味' as const, content: '' }])
                }}
                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-orange-primary hover:border-orange-primary/50 transition-colors text-sm font-semibold"
              >
                ＋ セクションを追加
              </button>
            )}
          </>
        ) : (
          <div className="mb-8 text-center text-gray-500 text-sm py-8">
            右上のボタンを押して「編集する」から追加できます
          </div>
        )}
      </div>

      {isAuthenticated && canEdit && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
          {/* 保存状態インジケータ */}
          <div
            className={`px-3 py-2 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              saveStatus === 'error'
                ? 'bg-red-600 text-white'
                : saveStatus === 'saving'
                ? 'bg-gray-700 text-gray-100'
                : saveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800/80 text-gray-300'
            }`}
          >
            {saveStatus === 'saving' && <><span className="animate-pulse">●</span> 保存中...</>}
            {saveStatus === 'saved' && <>✓ 保存しました</>}
            {saveStatus === 'error' && <>⚠ 保存に失敗</>}
            {saveStatus === 'idle' && <>自動保存ON</>}
          </div>
          {saveStatus === 'error' && (
            <button
              onClick={handleRetry}
              className="px-3 py-2 rounded-lg shadow-lg text-xs font-semibold bg-orange-primary text-white hover:bg-orange-dark transition-colors"
            >
              再試行
            </button>
          )}
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              title={`直前の状態に戻す（${history.length}件の履歴）`}
              className="px-3 py-2 rounded-lg shadow-lg text-xs font-semibold bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              ↶ 元に戻す
            </button>
          )}
        </div>
      )}
    </div>
  )
}
