'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'
import Image from 'next/image'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string  // "50% 30%"
  currentScale?: number     // 1.0 = 等倍, 1.5 = 1.5倍
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (position: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

// "50% 30%" → { x: 50, y: 30 }
function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 }
  const parts = pos.split(' ')
  return {
    x: parseFloat(parts[0]) || 50,
    y: parseFloat(parts[1]) || 50,
  }
}

// transform スタイルを生成
// object-position の代わりに transform を使うことでズームも実現
function buildTransform(x: number, y: number, scale: number): string {
  // (x%, y%) を中心として scale 倍
  // translate で中心をずらす: x=50%,y=50% のとき translate(0, 0)
  const tx = (50 - x) * (scale - 1) / scale  // 簡易近似
  const ty = (50 - y) * (scale - 1) / scale
  return `scale(${scale}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`
}

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
  const [positionOnly, setPositionOnly] = useState(false)
  const [error, setError] = useState<string>('')

  const [position, setPosition] = useState(parsePosition(currentPosition))
  const [scale, setScale] = useState(currentScale ?? 1)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  // ピンチ用
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPinchScaleRef = useRef<number>(1)

  // 外部から currentPosition/currentScale が変わったら同期
  useEffect(() => {
    setPosition(parsePosition(currentPosition))
  }, [currentPosition])

  useEffect(() => {
    setScale(currentScale ?? 1)
  }, [currentScale])

  const isAdjusting = pendingFile !== null || positionOnly

  // ----- ファイル選択 -----
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
    setPosition({ x: 50, y: 50 })
    setScale(1)
    setPositionOnly(false)
  }

  // ----- 確定 -----
  const handleConfirm = async () => {
    const posStr = `${Math.round(position.x)}% ${Math.round(position.y)}%`
    if (positionOnly || !pendingFile) {
      onPositionChange?.(posStr)
      onScaleChange?.(scale)
      setPositionOnly(false)
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
      setPositionOnly(false)
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました')
      setPreview(currentImage)
      setPendingFile(null)
      setPositionOnly(false)
    } finally {
      setUploading(false)
    }
  }

  // ----- キャンセル -----
  const handleCancel = () => {
    setPreview(currentImage)
    setPendingFile(null)
    setPositionOnly(false)
    setPosition(parsePosition(currentPosition))
    setScale(currentScale ?? 1)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ----- マウスドラッグ -----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.mouseX
    const dy = e.clientY - dragStartRef.current.mouseY
    // ドラッグ方向は「画像が動く方向」に合わせる（右にドラッグ → 画像が右へ → position.x が下がる）
    const dxPct = -(dx / rect.width) * 100
    const dyPct = -(dy / rect.height) * 100
    setPosition({
      x: Math.min(100, Math.max(0, dragStartRef.current.posX + dxPct)),
      y: Math.min(100, Math.max(0, dragStartRef.current.posY + dyPct)),
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // ----- マウスホイールでズーム -----
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isAdjusting) return
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setScale(prev => Math.min(4, Math.max(1, +(prev + delta).toFixed(2))))
  }, [isAdjusting])

  // ----- タッチドラッグ -----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
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
      lastPinchScaleRef.current = scale
    }
  }, [position, scale])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging && e.touches.length !== 2) return
    e.preventDefault()

    if (e.touches.length === 2) {
      // ピンチズーム
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (lastPinchDistRef.current !== null) {
        const ratio = dist / lastPinchDistRef.current
        const newScale = Math.min(4, Math.max(1, +(lastPinchScaleRef.current * ratio).toFixed(2)))
        setScale(newScale)
      }
    } else if (e.touches.length === 1 && isDragging && dragStartRef.current && containerRef.current) {
      // 1本指ドラッグ
      const touch = e.touches[0]
      const rect = containerRef.current.getBoundingClientRect()
      const dx = touch.clientX - dragStartRef.current.mouseX
      const dy = touch.clientY - dragStartRef.current.mouseY
      const dxPct = -(dx / rect.width) * 100
      const dyPct = -(dy / rect.height) * 100
      setPosition({
        x: Math.min(100, Math.max(0, dragStartRef.current.posX + dxPct)),
        y: Math.min(100, Math.max(0, dragStartRef.current.posY + dyPct)),
      })
    }
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
    lastPinchDistRef.current = null
  }, [])

  // グローバルイベント登録
  useEffect(() => {
    if (isDragging || isAdjusting) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, isAdjusting, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // ホイールイベント（passive: false が必要なため ref で登録）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // transform スタイル
  const transform = buildTransform(position.x, position.y, scale)

  // ==================== OVERLAY ====================
  if (variant === 'overlay') {
    return (
      <div className="relative w-full h-full overflow-hidden" ref={containerRef}>
        {/* 画像 */}
        {preview ? (
          <div
            className="absolute inset-0"
            style={{
              cursor: isAdjusting ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onMouseDown={isAdjusting ? handleMouseDown : undefined}
            onTouchStart={isAdjusting ? handleTouchStart : undefined}
          >
            <div
              className="absolute inset-0 origin-center"
              style={{ transform }}
            >
              <Image
                src={preview}
                alt={label}
                fill
                className="object-cover"
                draggable={false}
                priority
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center">
            <span className="text-gray-500 text-sm">画像準備中</span>
          </div>
        )}

        {/* 調整中: 十字ガイド */}
        {isAdjusting && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-70" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-70" />
              <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white opacity-90" />
            </div>
          </div>
        )}

        {/* コントロールバー */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-3 py-2 flex items-center gap-2 flex-wrap z-10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!isAdjusting ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-orange-primary text-white rounded-lg hover:bg-orange-dark disabled:bg-gray-400 transition-colors"
              >
                画像を選択
              </button>
              {preview && (
                <button
                  onClick={() => setPositionOnly(true)}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  位置・ズームを調整
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-white text-xs flex-1 min-w-0">
                {uploading
                  ? 'アップロード中...'
                  : 'ドラッグで移動・ピンチ/ホイールでズーム'}
              </span>
              {/* ズームスライダー */}
              <div className="flex items-center gap-1">
                <span className="text-white text-xs">🔍</span>
                <input
                  type="range"
                  min={100}
                  max={400}
                  step={5}
                  value={Math.round(scale * 100)}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="w-24 accent-orange-primary"
                  title="ズーム"
                />
                <span className="text-white text-xs w-10">{Math.round(scale * 100)}%</span>
              </div>
              <button
                onClick={handleConfirm}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {uploading ? '...' : '確定'}
              </button>
              <button
                onClick={handleCancel}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-600 text-xs p-2 rounded z-10">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ==================== COMPACT / DEFAULT ====================
  const size = variant === 'compact' ? 80 : 128

  return (
    <div className={variant === 'compact' ? '' : 'space-y-2'}>
      {variant === 'default' && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className={variant === 'compact' ? 'flex flex-col items-start gap-2' : 'flex flex-col items-start gap-3'}>
        {/* プレビュー + ドラッグエリア */}
        <div
          ref={containerRef}
          className={`relative overflow-hidden rounded-lg bg-gray-200 ${variant === 'compact' ? 'w-20 h-20' : 'w-32 h-32'}`}
          style={{ cursor: isAdjusting ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={isAdjusting ? handleMouseDown : undefined}
          onTouchStart={isAdjusting ? handleTouchStart : undefined}
        >
          {preview ? (
            <div
              className="absolute inset-0 origin-center"
              style={{ transform }}
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

          {/* 十字ガイド */}
          {isAdjusting && (
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-80" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
            </div>
          )}
        </div>

        {/* ボタン・スライダー */}
        <div className="flex flex-col items-start gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!isAdjusting ? (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={
                  variant === 'compact'
                    ? 'px-2 py-1 text-xs bg-orange-primary text-white rounded hover:bg-orange-dark disabled:bg-gray-300'
                    : 'px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-dark disabled:bg-gray-300 transition-colors'
                }
              >
                {uploading ? 'アップロード中...' : variant === 'compact' ? '画像変更' : '画像を選択'}
              </button>
              {preview && (
                <button
                  onClick={() => setPositionOnly(true)}
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
          ) : (
            <div className="flex flex-col gap-1.5 w-full">
              <p className="text-xs text-gray-600">
                {uploading ? 'アップロード中...' : 'ドラッグ移動 / ホイールでズーム'}
              </p>
              {/* ズームスライダー */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">🔍</span>
                <input
                  type="range"
                  min={100}
                  max={400}
                  step={5}
                  value={Math.round(scale * 100)}
                  onChange={(e) => setScale(Number(e.target.value) / 100)}
                  className="w-full accent-orange-primary"
                  title="ズーム"
                />
                <span className="text-xs text-gray-600 w-10">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleConfirm}
                  disabled={uploading}
                  className={
                    variant === 'compact'
                      ? 'px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300'
                      : 'px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors'
                  }
                >
                  確定
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className={
                    variant === 'compact'
                      ? 'px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600'
                      : 'px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
                  }
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {variant === 'default' && !isAdjusting && (
            <p className="text-xs text-gray-500">
              JPEG、PNG、WebP形式<br />最大5MB
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
