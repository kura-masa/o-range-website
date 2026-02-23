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

// ==================== フルスクリーン編集モーダル ====================
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

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPinchScaleRef = useRef<number>(initialScale)
  const positionRef = useRef(position)
  const scaleRef = useRef(scale)

  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // マウスダウン
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

  // マウス移動（グローバル）
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
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
    setScale(prev => Math.min(4, Math.max(1, +(prev + delta).toFixed(2))))
  }, [])

  // タッチ開始
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

  // タッチ移動（グローバル）
  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (lastPinchDistRef.current !== null) {
        const ratio = dist / lastPinchDistRef.current
        setScale(Math.min(4, Math.max(1, +(lastPinchScaleRef.current * ratio).toFixed(2))))
      }
    } else if (e.touches.length === 1 && dragStartRef.current && containerRef.current) {
      const t = e.touches[0]
      const rect = containerRef.current.getBoundingClientRect()
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

  // グローバルイベント登録
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

  // ホイール登録
  useEffect(() => {
    const el = containerRef.current
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 画像エリア */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
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

      {/* ボタンエリア */}
      <div className="flex items-center justify-between px-6 py-4 bg-black bg-opacity-90 safe-area-bottom">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-700 text-white text-xl hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          ✕
        </button>

        {uploading && (
          <span className="text-white text-sm">アップロード中...</span>
        )}

        <button
          onClick={() => onConfirm(position, scale)}
          disabled={uploading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-orange-primary text-white text-xl hover:bg-orange-dark disabled:opacity-50 transition-colors"
        >
          ✓
        </button>
      </div>
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

  // 外部から currentImage が変わったら同期
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
    // inputをリセット（同じファイルを再選択できるように）
    e.target.value = ''
  }

  const handleConfirm = async (position: { x: number; y: number }, scale: number) => {
    const posStr = `${Math.round(position.x)}% ${Math.round(position.y)}%`
    if (!pendingFile) {
      // 位置のみ変更
      onPositionChange?.(posStr)
      onScaleChange?.(scale)
      setShowEditor(false)
      return
    }
    setUploading(true)
    try {
      const downloadURL = await uploadMemberImage(memberId, pendingFile, imageType)
      onUploadSuccess(downloadURL)
      onPositionChange?.(posStr)
      onScaleChange?.(scale)
      setPreview(downloadURL)
      setPendingFile(null)
      setShowEditor(false)
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました')
      setPreview(currentImage)
      setPendingFile(null)
      setShowEditor(false)
    } finally {
      setUploading(false)
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

  // ==================== OVERLAY ====================
  if (variant === 'overlay') {
    return (
      <>
        {/* 通常表示：現在の画像 + ボタン */}
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

          {/* ボタン */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={openFileSelector}
              className="px-4 py-2 text-sm bg-orange-primary text-white rounded-full shadow-lg hover:bg-orange-dark transition-colors"
            >
              画像を選択
            </button>
            {preview && (
              <button
                onClick={() => setShowEditor(true)}
                className="px-4 py-2 text-sm bg-black bg-opacity-60 text-white rounded-full shadow-lg hover:bg-opacity-80 transition-colors"
              >
                位置・ズーム
              </button>
            )}
          </div>

          {error && (
            <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-600 text-xs p-2 rounded z-10">
              {error}
            </div>
          )}
        </div>

        {/* フルスクリーン編集モーダル */}
        {showEditor && editorSrc && (
          <EditorModal
            src={editorSrc}
            initialPosition={pendingFile ? { x: 50, y: 50 } : initPos}
            initialScale={pendingFile ? 1 : initScale}
            uploading={uploading}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
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

        <div className={variant === 'compact' ? 'flex flex-col items-start gap-2' : 'flex flex-col items-start gap-3'}>
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
          <div className="flex flex-col items-start gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={openFileSelector}
                disabled={uploading}
                className={
                  variant === 'compact'
                    ? 'px-2 py-1 text-xs bg-orange-primary text-white rounded hover:bg-orange-dark disabled:bg-gray-300'
                    : 'px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-dark disabled:bg-gray-300 transition-colors'
                }
              >
                {uploading ? '...' : variant === 'compact' ? '変更' : '画像を選択'}
              </button>
              {preview && (
                <button
                  onClick={() => setShowEditor(true)}
                  disabled={uploading}
                  className={
                    variant === 'compact'
                      ? 'px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600'
                      : 'px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
                  }
                >
                  位置調整
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {variant === 'default' && (
              <p className="text-xs text-gray-500">
                JPEG、PNG、WebP形式<br />最大5MB
              </p>
            )}
          </div>
        </div>
      </div>

      {/* フルスクリーン編集モーダル */}
      {showEditor && editorSrc && (
        <EditorModal
          src={editorSrc}
          initialPosition={pendingFile ? { x: 50, y: 50 } : initPos}
          initialScale={pendingFile ? 1 : initScale}
          uploading={uploading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
