'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string  // "60% 30%"
  currentScale?: number     // 1.5
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (pos: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

// 表示側で使う共通スタイル生成関数
export function buildImageStyle(
  position: string = '50% 50%',
  scale: number = 1
): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: position,
    transform: `scale(${scale})`,
    transformOrigin: 'center',
  }
}

export default function ImageUploader({
  currentImage,
  currentPosition = '50% 50%',
  currentScale = 1,
  memberId,
  imageType,
  onUploadSuccess,
  onPositionChange,
  onScaleChange,
  label,
  variant = 'default',
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(currentImage)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // エディタモーダルの状態
  const [editorOpen, setEditorOpen] = useState(false)
  const [position, setPosition] = useState(currentPosition)
  const [scale, setScale] = useState(currentScale)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ドラッグ用ref
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  // ピンチ用ref
  const lastPinchDist = useRef<number | null>(null)

  // scaleの最新値をuseEffect内から参照するためのref
  const scaleRef = useRef(scale)
  useEffect(() => { scaleRef.current = scale }, [scale])

  const containerRef = useRef<HTMLDivElement>(null)

  // position文字列をxとyに分解
  const parsePos = (pos: string) => {
    const parts = pos.split(' ')
    return {
      x: parseFloat(parts[0]) || 50,
      y: parseFloat(parts[1]) || 50,
    }
  }

  // ドラッグ開始
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  // ドラッグ中：ポインター移動量をobject-positionに反映
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }

    // ピクセル移動量をパーセントに変換（スケール考慮）
    // 右にドラッグ→画像の見える部分が右へ→object-position x が増える
    setPosition(prev => {
      const { x, y } = parsePos(prev)
      // 移動量を感度調整（スケールが大きいほど細かく動く）
      const sensitivity = 100 / scale
      const nx = Math.min(100, Math.max(0, x + (dx / rect.width) * sensitivity))
      const ny = Math.min(100, Math.max(0, y + (dy / rect.height) * sensitivity))
      return `${nx.toFixed(2)}% ${ny.toFixed(2)}%`
    })
  }, [scale])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // タッチ・ホイールイベントをuseEffectで登録（passive: false必須）
  useEffect(() => {
    if (!editorOpen) return
    const el = containerRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      // 1本指・2本指どちらもページスクロールを禁止
      e.preventDefault()
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      } else if (e.touches.length === 1) {
        dragging.current = true
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // ピンチズーム
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ratio = dist / lastPinchDist.current
        setScale(prev => Math.min(4, Math.max(0.5, prev * ratio)))
        lastPinchDist.current = dist
      } else if (e.touches.length === 1 && dragging.current) {
        // 1本指ドラッグ
        const rect = el.getBoundingClientRect()
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setPosition(prev => {
          const parts = prev.split(' ')
          const x = parseFloat(parts[0]) || 50
          const y = parseFloat(parts[1]) || 50
          const currentScale = scaleRef.current
          const sensitivity = 100 / currentScale
          const nx = Math.min(100, Math.max(0, x + (dx / rect.width) * sensitivity))
          const ny = Math.min(100, Math.max(0, y + (dy / rect.height) * sensitivity))
          return `${nx.toFixed(2)}% ${ny.toFixed(2)}%`
        })
      }
    }

    const handleTouchEnd = () => {
      dragging.current = false
      lastPinchDist.current = null
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.95 : 1.05
      setScale(prev => Math.min(4, Math.max(0.5, prev * delta)))
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    el.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('wheel', handleWheel)
    }
  }, [editorOpen])

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || '不正なファイルです')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setPendingFile(file)
    // 新しい画像のときは位置・スケールをリセット
    setPosition('50% 50%')
    setScale(1)
    setEditorOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 位置調節ボタン
  const handleOpenEditor = () => {
    if (!preview) return
    setPosition(currentPosition || '50% 50%')
    setScale(currentScale || 1)
    setEditorOpen(true)
  }

  // 確定
  const handleConfirm = async () => {
    if (pendingFile) {
      setUploading(true)
      try {
        const url = await uploadMemberImage(memberId, pendingFile, imageType)
        onUploadSuccess(url)
        setPreview(url)
        setPendingFile(null)
      } catch (err) {
        console.error('Upload error:', err)
        setError('アップロードに失敗しました')
        setPreview(currentImage)
        setPendingFile(null)
        setEditorOpen(false)
        return
      } finally {
        setUploading(false)
      }
    }
    onPositionChange?.(position)
    onScaleChange?.(scale)
    setEditorOpen(false)
  }

  // キャンセル
  const handleCancel = () => {
    if (pendingFile) {
      setPreview(currentImage)
      setPendingFile(null)
    }
    setPosition(currentPosition || '50% 50%')
    setScale(currentScale || 1)
    setEditorOpen(false)
    setError('')
  }

  // ボタンUI（横並び：「画像変更」「位置調節」）
  const renderButtons = (dark = false) => (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={
          dark
            ? 'px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50'
            : 'px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50'
        }
      >
        画像変更
      </button>
      {preview && (
        <button
          onClick={handleOpenEditor}
          className={
            dark
              ? 'px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600'
              : 'px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-400'
          }
        >
          位置調節
        </button>
      )}
    </div>
  )

  // フルスクリーンエディタモーダル
  const renderEditor = () => {
    if (!editorOpen || !preview) return null
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        {/* 画像がフルスクリーンで表示 */}
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="編集中"
            draggable={false}
            style={buildImageStyle(position, scale)}
          />
        </div>

        {/* 正方形の枠オーバーレイ（実際の表示領域） */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {/* 枠のサイズ: 画面短辺の80% */}
          <div
            className="relative"
            style={{
              width: 'min(80vw, 80vh)',
              height: 'min(80vw, 80vh)',
            }}
          >
            {/* 外側のマスク：上 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-screen h-screen bg-black opacity-60" />
            {/* 外側のマスク：下 */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen h-screen bg-black opacity-60" />
            {/* 外側のマスク：左 */}
            <div className="absolute right-full top-0 h-full w-screen bg-black opacity-60" />
            {/* 外側のマスク：右 */}
            <div className="absolute left-full top-0 h-full w-screen bg-black opacity-60" />
            {/* 枠線 */}
            <div className="absolute inset-0 border-4 border-white" />
            {/* 枠上の説明文 */}
            <div className="absolute bottom-full left-0 right-0 text-center pb-2">
              <span className="text-white text-sm font-medium drop-shadow">ズーム・移動できます</span>
            </div>
          </div>
        </div>

        {/* ボタン（確定・キャンセル） */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 pointer-events-auto">
          <button
            onClick={handleCancel}
            className="w-14 h-14 rounded-full bg-gray-800 text-white text-2xl flex items-center justify-center hover:bg-gray-700"
          >
            ✕
          </button>
          <button
            onClick={handleConfirm}
            disabled={uploading}
            className="w-14 h-14 rounded-full bg-orange-500 text-white text-2xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-50"
          >
            {uploading ? '…' : '✓'}
          </button>
        </div>

        {error && (
          <div className="absolute top-8 left-4 right-4 bg-red-600 text-white text-sm text-center py-2 px-4 rounded-lg">
            {error}
          </div>
        )}
      </div>
    )
  }

  // overlay バリアント（詳細ページのヒーロー画像など）
  if (variant === 'overlay') {
    return (
      <>
        <div className="relative w-full h-full">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={label}
              draggable={false}
              style={buildImageStyle(currentPosition, currentScale)}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-sm">画像準備中</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            {renderButtons(true)}
          </div>
          {error && (
            <div className="absolute bottom-14 left-2 right-2 bg-red-600 text-white text-xs p-2 rounded">
              {error}
            </div>
          )}
        </div>
        {renderEditor()}
      </>
    )
  }

  // compact / default バリアント（ランディングページのカードなど）
  return (
    <>
      <div className={variant === 'compact' ? 'flex flex-col gap-1' : 'space-y-2'}>
        {variant === 'default' && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className={variant === 'compact' ? 'w-20 h-20 relative bg-gray-200 rounded overflow-hidden' : 'w-32 h-32 relative bg-gray-200 rounded-lg overflow-hidden'}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={label}
              draggable={false}
              style={buildImageStyle(currentPosition, currentScale)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-xs">準備中</span>
            </div>
          )}
        </div>
        {renderButtons(false)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {variant === 'default' && (
          <p className="text-xs text-gray-500">JPEG、PNG、WebP形式 / 最大5MB</p>
        )}
      </div>
      {renderEditor()}
    </>
  )
}
