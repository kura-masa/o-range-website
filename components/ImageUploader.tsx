'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'
import Image from 'next/image'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string  // "50% 30%"
  currentScale?: number     // 1.0 = 等倍
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (position: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 }
  const parts = pos.split(' ')
  return {
    x: parseFloat(parts[0]) || 50,
    y: parseFloat(parts[1]) || 50,
  }
}

function buildTransform(x: number, y: number, scale: number): string {
  const tx = ((50 - x) * (scale - 1) / scale).toFixed(2)
  const ty = ((50 - y) * (scale - 1) / scale).toFixed(2)
  return `scale(${scale}) translate(${tx}%, ${ty}%)`
}

// ==================== 編集モーダル ====================
interface EditorModalProps {
  src: string
  initialPosition: { x: number; y: number }
  initialScale: number
  uploading: boolean
  onConfirm: (position: { x: number; y: number }, scale: number) => void
  onCancel: () => void
}

function EditorModal({ src, initialPosition, initialScale, uploading, onConfirm, onCancel }: EditorModalProps) {
  const [position, setPosition] = useState(initialPosition)
  const [scale, setScale] = useState(initialScale)
  const [isDragging, setIsDragging] = useState(false)

  const frameRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPinchScaleRef = useRef<number>(initialScale)
  const positionRef = useRef(position)
  const scaleRef = useRef(scale)

  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // マウス
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !frameRef.current) return
    const rect = frameRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.mouseX
    const dy = e.clientY - dragStartRef.current.mouseY
    setPosition({
      x: Math.min(100, Math.max(0, dragStartRef.current.posX - (dx / rect.width) * 100)),
      y: Math.min(100, Math.max(0, dragStartRef.current.posY - (dy / rect.height) * 100)),
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // ホイールズーム
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setScale(prev => Math.min(4, Math.max(0.5, +(prev + delta).toFixed(2))))
  }, [])

  // タッチ
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        mouseX: t.clientX,
        mouseY: t.clientY,
        posX: positionRef.current.x,
        posY: positionRef.current.y,
      }
      lastPinchDistRef.current = null
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      dragStartRef.current = null
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      lastPinchDistRef.current = dist
      lastPinchScaleRef.current = scaleRef.current
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (lastPinchDistRef.current !== null) {
        const ratio = dist / lastPinchDistRef.current
        setScale(Math.min(4, Math.max(0.5, +(lastPinchScaleRef.current * ratio).toFixed(2))))
      }
    } else if (e.touches.length === 1 && dragStartRef.current && frameRef.current) {
      const t = e.touches[0]
      const rect = frameRef.current.getBoundingClientRect()
      const dx = t.clientX - dragStartRef.current.mouseX
      const dy = t.clientY - dragStartRef.current.mouseY
      setPosition({
        x: Math.min(100, Math.max(0, dragStartRef.current.posX - (dx / rect.width) * 100)),
        y: Math.min(100, Math.max(0, dragStartRef.current.posY - (dy / rect.height) * 100)),
      })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
    lastPinchDistRef.current = null
  }, [])

  // グローバルイベント
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // フレームにホイール登録
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // スクロール禁止
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const transform = buildTransform(position.x, position.y, scale)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">

      {/* 枠外ラベル */}
      <p className="text-white text-sm mb-3 select-none opacity-80">
        ズーム・移動できます
      </p>

      {/* 正方形の太枠（実際の表示領域）*/}
      {/* 画面の短辺の80%を枠サイズとする */}
      <div
        ref={frameRef}
        className="relative overflow-hidden"
        style={{
          width: 'min(80vw, 80vh)',
          height: 'min(80vw, 80vh)',
          border: '4px solid white',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          background: 'black',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="absolute inset-0 origin-center select-none"
          style={{ transform }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="編集中"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-8 mt-6">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-700 text-white text-2xl hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          ✕
        </button>

        {uploading && (
          <span className="text-white text-sm">アップロード中...</span>
        )}

        <button
          onClick={() => onConfirm(position, scale)}
          disabled={uploading}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-orange-500 text-white text-2xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          ✓
        </button>
      </div>
    </div>
  )
}

// ==================== ボタン群（横並び）====================
interface ImageButtonsProps {
  uploading: boolean
  hasPreview: boolean
  compact?: boolean
  onSelectFile: () => void
  onAdjust: () => void
}

function ImageButtons({ uploading, hasPreview, compact, onSelectFile, onAdjust }: ImageButtonsProps) {
  const base = compact
    ? 'px-2 py-1 text-xs rounded'
    : 'px-4 py-2 text-sm rounded-full'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onSelectFile}
        disabled={uploading}
        className={`${base} bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow`}
      >
        画像変更
      </button>
      {hasPreview && (
        <button
          onClick={onAdjust}
          disabled={uploading}
          className={`${base} bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50 transition-colors shadow`}
        >
          位置調節
        </button>
      )}
    </div>
  )
}

// ==================== メインコンポーネント ====================
export default function ImageUploader({
  currentImage,
  currentPosition,
  currentScale,
  memberId,
  imageType,
  onUploadSuccess,
  onPositionChange,
  onScaleChange,
  label,
  variant = 'default'
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(currentImage)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [error, setError] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pendingFile) setPreview(currentImage)
  }, [currentImage, pendingFile])

  const openFileSelector = () => fileInputRef.current?.click()

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
    setShowEditor(true)
    e.target.value = ''
  }

  const handleConfirm = async (pos: { x: number; y: number }, sc: number) => {
    const posStr = `${Math.round(pos.x)}% ${Math.round(pos.y)}%`
    if (!pendingFile) {
      onPositionChange?.(posStr)
      onScaleChange?.(sc)
      setShowEditor(false)
      return
    }
    setUploading(true)
    try {
      const downloadURL = await uploadMemberImage(memberId, pendingFile, imageType)
      onUploadSuccess(downloadURL)
      onPositionChange?.(posStr)
      onScaleChange?.(sc)
      setPreview(downloadURL)
      setPendingFile(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました')
      setPreview(currentImage)
      setPendingFile(null)
    } finally {
      setUploading(false)
      setShowEditor(false)
    }
  }

  const handleCancel = () => {
    setPreview(currentImage)
    setPendingFile(null)
    setShowEditor(false)
    setError('')
  }

  const editorSrc = preview || currentImage || ''
  const initPos = parsePosition(currentPosition)
  const initScale = currentScale ?? 1

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp"
      onChange={handleFileSelect}
      className="hidden"
    />
  )

  const modal = showEditor && editorSrc ? (
    <EditorModal
      src={editorSrc}
      initialPosition={pendingFile ? { x: 50, y: 50 } : initPos}
      initialScale={pendingFile ? 1 : initScale}
      uploading={uploading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  // ==================== OVERLAY ====================
  if (variant === 'overlay') {
    return (
      <>
        <div className="relative w-full h-full overflow-hidden">
          {preview ? (
            <div
              className="absolute inset-0 origin-center"
              style={{ transform: buildTransform(initPos.x, initPos.y, initScale) }}
            >
              <Image src={preview} alt={label} fill className="object-cover" priority draggable={false} />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center">
              <span className="text-gray-500 text-sm">画像準備中</span>
            </div>
          )}

          {/* ボタン：右下に横並び */}
          <div className="absolute bottom-3 right-3 z-10">
            {fileInput}
            <ImageButtons
              uploading={uploading}
              hasPreview={!!preview}
              onSelectFile={openFileSelector}
              onAdjust={() => setShowEditor(true)}
            />
          </div>

          {error && (
            <div className="absolute top-2 left-2 right-2 bg-red-900 bg-opacity-80 text-red-200 text-xs p-2 rounded z-10">
              {error}
            </div>
          )}
        </div>
        {modal}
      </>
    )
  }

  // ==================== COMPACT / DEFAULT ====================
  const size = variant === 'compact' ? 80 : 128

  return (
    <>
      <div className={variant === 'compact' ? '' : 'space-y-2'}>
        {variant === 'default' && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}

        <div className={`flex ${variant === 'compact' ? 'flex-col gap-2' : 'flex-col gap-3'} items-start`}>
          {/* サムネイル */}
          <div
            className={`relative overflow-hidden rounded-lg bg-gray-200 ${variant === 'compact' ? 'w-20 h-20' : 'w-32 h-32'}`}
          >
            {preview ? (
              <div
                className="absolute inset-0 origin-center"
                style={{ transform: buildTransform(initPos.x, initPos.y, initScale) }}
              >
                <Image
                  src={preview}
                  alt={label}
                  width={size}
                  height={size}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500 text-xs text-center px-2">準備中</span>
              </div>
            )}
          </div>

          {/* ボタン */}
          {fileInput}
          <ImageButtons
            uploading={uploading}
            hasPreview={!!preview}
            compact={variant === 'compact'}
            onSelectFile={openFileSelector}
            onAdjust={() => setShowEditor(true)}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          {variant === 'default' && (
            <p className="text-xs text-gray-500">JPEG・PNG・WebP / 最大5MB</p>
          )}
        </div>
      </div>
      {modal}
    </>
  )
}
