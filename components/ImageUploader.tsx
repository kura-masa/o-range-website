'use client'

import { useState, useRef, useEffect } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string
  currentScale?: number
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (pos: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

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
  const [editorOpen, setEditorOpen] = useState(false)
  const [position, setPosition] = useState(currentPosition)
  const [scale, setScale] = useState(currentScale)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // refで最新値を保持（useEffect内から参照するため）
  const positionRef = useRef(position)
  const scaleRef = useRef(scale)
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // ドラッグ・ピンチ用ref
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)

  // 全てのインタラクションをuseEffectで管理（passive:false必須）
  useEffect(() => {
    if (!editorOpen) return
    const el = containerRef.current
    if (!el) return

    // --- マウスイベント ---
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      const s = scaleRef.current
      const parts = positionRef.current.split(' ')
      const x = parseFloat(parts[0]) || 50
      const y = parseFloat(parts[1]) || 50
      const sensitivity = 100 / s
      const nx = Math.min(100, Math.max(0, x + (dx / rect.width) * sensitivity))
      const ny = Math.min(100, Math.max(0, y + (dy / rect.height) * sensitivity))
      const newPos = `${nx.toFixed(2)}% ${ny.toFixed(2)}%`
      positionRef.current = newPos
      setPosition(newPos)
    }

    const onMouseUp = () => { dragging.current = false }

    // --- タッチイベント ---
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2) {
        dragging.current = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      } else if (e.touches.length === 1) {
        lastPinchDist.current = null
        dragging.current = true
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // ピンチズーム
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ratio = dist / lastPinchDist.current
        lastPinchDist.current = dist
        const newScale = Math.min(4, Math.max(0.5, scaleRef.current * ratio))
        scaleRef.current = newScale
        setScale(newScale)
      } else if (e.touches.length === 1 && dragging.current) {
        // 1本指ドラッグ
        const rect = el.getBoundingClientRect()
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        const s = scaleRef.current
        const parts = positionRef.current.split(' ')
        const x = parseFloat(parts[0]) || 50
        const y = parseFloat(parts[1]) || 50
        const sensitivity = 100 / s
        const nx = Math.min(100, Math.max(0, x + (dx / rect.width) * sensitivity))
        const ny = Math.min(100, Math.max(0, y + (dy / rect.height) * sensitivity))
        const newPos = `${nx.toFixed(2)}% ${ny.toFixed(2)}%`
        positionRef.current = newPos
        setPosition(newPos)
      }
    }

    const onTouchEnd = () => {
      dragging.current = false
      lastPinchDist.current = null
    }

    // --- ホイール ---
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.95 : 1.05
      const newScale = Math.min(4, Math.max(0.5, scaleRef.current * delta))
      scaleRef.current = newScale
      setScale(newScale)
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [editorOpen])

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
    setPosition('50% 50%')
    setScale(1)
    positionRef.current = '50% 50%'
    scaleRef.current = 1
    setEditorOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenEditor = () => {
    if (!preview) return
    setPosition(currentPosition || '50% 50%')
    setScale(currentScale || 1)
    positionRef.current = currentPosition || '50% 50%'
    scaleRef.current = currentScale || 1
    setEditorOpen(true)
  }

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
    onPositionChange?.(positionRef.current)
    onScaleChange?.(scaleRef.current)
    setEditorOpen(false)
  }

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
        className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
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

  const renderEditor = () => {
    if (!editorOpen || !preview) return null
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* フルスクリーン画像 + ドラッグ領域 */}
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="編集中"
            draggable={false}
            style={buildImageStyle(position, scale)}
          />
        </div>

        {/* 正方形枠オーバーレイ */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div
            style={{ width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)' }}
            className="relative"
          >
            {/* 上マスク */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/60" style={{ width: '200vw', height: '200vh' }} />
            {/* 下マスク */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 bg-black/60" style={{ width: '200vw', height: '200vh' }} />
            {/* 左マスク */}
            <div className="absolute right-full top-0 bg-black/60" style={{ width: '200vw', height: '100%' }} />
            {/* 右マスク */}
            <div className="absolute left-full top-0 bg-black/60" style={{ width: '200vw', height: '100%' }} />
            {/* 枠線 */}
            <div className="absolute inset-0 border-4 border-white" />
            {/* 説明文 */}
            <div className="absolute bottom-full left-0 right-0 text-center pb-2">
              <span className="text-white text-sm font-medium">ズーム・移動できます</span>
            </div>
          </div>
        </div>

        {/* ✕ 確定ボタン */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 pointer-events-auto z-10">
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
          <div className="absolute top-8 left-4 right-4 bg-red-600 text-white text-sm text-center py-2 px-4 rounded-lg z-10">
            {error}
          </div>
        )}
      </div>
    )
  }

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

  return (
    <>
      <div className={variant === 'compact' ? 'flex flex-col gap-1' : 'space-y-2'}>
        {variant === 'default' && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className={variant === 'compact'
          ? 'w-20 h-20 relative bg-gray-200 rounded overflow-hidden'
          : 'w-32 h-32 relative bg-gray-200 rounded-lg overflow-hidden'
        }>
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
