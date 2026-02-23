'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'
import Image from 'next/image'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string // CSS object-position 例: "50% 30%"
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (position: string) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

// positionStr ("50% 30%") → { x: 50, y: 30 }
function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 }
  const parts = pos.split(' ')
  const x = parseFloat(parts[0]) || 50
  const y = parseFloat(parts[1]) || 50
  return { x, y }
}

export default function ImageUploader({
  currentImage,
  currentPosition,
  memberId,
  imageType,
  onUploadSuccess,
  onPositionChange,
  label,
  variant = 'default'
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(currentImage)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [positionOnly, setPositionOnly] = useState(false) // 位置のみ調整モード
  const [error, setError] = useState<string>('')

  // 位置調整 (0-100%)
  const [position, setPosition] = useState<{ x: number; y: number }>(parsePosition(currentPosition))
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)

  // currentPositionが外から変わったら同期
  useEffect(() => {
    setPosition(parsePosition(currentPosition))
  }, [currentPosition])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || '不正なファイルです')
      return
    }

    // ローカルプレビューのみ（まだアップロードしない）
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setPendingFile(file)
    // 新画像は中央から開始
    setPosition({ x: 50, y: 50 })
  }

  const handleConfirm = async () => {
    const posStr = `${Math.round(position.x)}% ${Math.round(position.y)}%`
    if (positionOnly || !pendingFile) {
      // 位置のみ変更
      onPositionChange?.(posStr)
      setPositionOnly(false)
      setPendingFile(null)
      return
    }
    setUploading(true)
    try {
      const downloadURL = await uploadMemberImage(memberId, pendingFile, imageType)
      onUploadSuccess(downloadURL)
      onPositionChange?.(posStr)
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

  const handleCancel = () => {
    setPreview(currentImage)
    setPendingFile(null)
    setPositionOnly(false)
    setPosition(parsePosition(currentPosition))
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ドラッグ処理（マウス）
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
    // ピクセル差をパーセント差に変換（ドラッグ方向を反転：右にドラッグ→画像が右へ→焦点は左へ）
    const dxPct = -(dx / rect.width) * 100
    const dyPct = -(dy / rect.height) * 100
    const newX = Math.min(100, Math.max(0, dragStartRef.current.posX + dxPct))
    const newY = Math.min(100, Math.max(0, dragStartRef.current.posY + dyPct))
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // タッチ処理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const dx = touch.clientX - dragStartRef.current.mouseX
    const dy = touch.clientY - dragStartRef.current.mouseY
    const dxPct = -(dx / rect.width) * 100
    const dyPct = -(dy / rect.height) * 100
    const newX = Math.min(100, Math.max(0, dragStartRef.current.posX + dxPct))
    const newY = Math.min(100, Math.max(0, dragStartRef.current.posY + dyPct))
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  useEffect(() => {
    if (isDragging) {
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
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const positionStyle = `${Math.round(position.x)}% ${Math.round(position.y)}%`
  const isAdjusting = pendingFile !== null || positionOnly

  // ---- オーバーレイモード（詳細ページのヒーロー画像など） ----
  if (variant === 'overlay') {
    return (
      <div className="relative w-full h-full" ref={containerRef}>
        {/* 画像表示 */}
        {preview ? (
          <div
            className="absolute inset-0"
            style={{ cursor: isAdjusting ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={isAdjusting ? handleMouseDown : undefined}
            onTouchStart={isAdjusting ? handleTouchStart : undefined}
          >
            {/* Next/Image は object-position をインラインスタイルで上書き */}
            <Image
              src={preview}
              alt={label}
              fill
              className="object-cover"
              style={{ objectPosition: positionStyle }}
              draggable={false}
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center">
            <span className="text-gray-500 text-sm">画像準備中</span>
          </div>
        )}

        {/* 調整中オーバーレイ */}
        {isAdjusting && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 十字線（焦点ガイド） */}
            <div
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
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
                  位置を調整
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-white text-xs flex-1">
                {uploading ? 'アップロード中...' : '画像をドラッグして位置を調整'}
              </span>
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

  // ---- compact / default モード（MemberCard など） ----
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
            <Image
              src={preview}
              alt={label}
              width={size}
              height={size}
              className="w-full h-full object-cover"
              style={{ objectPosition: positionStyle }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-xs text-center px-2">準備中</span>
            </div>
          )}

          {/* 調整中の十字ガイド */}
          {isAdjusting && (
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-80" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white opacity-90" />
            </div>
          )}
        </div>

        {/* ボタン類 */}
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
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-600">
                {uploading ? 'アップロード中...' : 'プレビューをドラッグして位置調整'}
              </p>
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
