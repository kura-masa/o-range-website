'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string  // "cx cy" 形式: 画像の中心として表示したい点（画像の自然サイズに対する0〜1の比率）
  currentScale?: number     // ズーム倍率
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (pos: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
}

// 正規化座標(cx, cy: 0〜1) + scale → コンテナ内でその点を中心に表示するCSSを返す
// コンテナはoverflow:hiddenで、画像はabsolute配置
export function buildImageStyle(
  position: string = '0.5 0.5',
  scale: number = 1
): React.CSSProperties {
  const parts = (position || '0.5 0.5').split(' ')
  const cx = parseFloat(parts[0])
  const cy = parseFloat(parts[1])
  const safeCx = isNaN(cx) ? 0.5 : cx
  const safeCy = isNaN(cy) ? 0.5 : cy

  // 画像をコンテナ全体にobject-cover相当で表示し、
  // cx, cy の点がコンテナ中央に来るように object-position を使う
  // （object-fit: cover + object-position: cx*100% cy*100% はコンテナ比率非依存）
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${(safeCx * 100).toFixed(2)}% ${(safeCy * 100).toFixed(2)}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${(safeCx * 100).toFixed(2)}% ${(safeCy * 100).toFixed(2)}%`,
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

export default function ImageUploader({
  currentImage,
  currentPosition = '0.5 0.5',
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

  // 編集中の状態（ref で管理して useEffect 内から参照）
  // cx, cy: 0〜1 の正規化座標（画像の「中心として見せたい点」）
  const cxRef = useRef(0.5)
  const cyRef = useRef(0.5)
  const scaleRef = useRef(1)

  // 表示更新用の state
  const [cx, setCx] = useState(0.5)
  const [cy, setCy] = useState(0.5)
  const [scale, setScale] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ドラッグ用
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)

  const parsePos = useCallback((pos: string) => {
    const parts = (pos || '0.5 0.5').split(' ')
    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    return {
      cx: isNaN(x) ? 0.5 : x,
      cy: isNaN(y) ? 0.5 : y,
    }
  }, [])

  const openEditor = useCallback((pos: string, s: number) => {
    const parsed = parsePos(pos)
    cxRef.current = parsed.cx
    cyRef.current = parsed.cy
    scaleRef.current = s
    setCx(parsed.cx)
    setCy(parsed.cy)
    setScale(s)
    setEditorOpen(true)
  }, [parsePos])

  useEffect(() => {
    if (!editorOpen) return
    const el = containerRef.current
    if (!el) return

    // マウス
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
      // 右にドラッグ → cx を減らす（右の内容が見えるように）
      // scale が大きいほど細かく動く
      cxRef.current = Math.min(1, Math.max(0, cxRef.current - (dx / rect.width) / scaleRef.current))
      cyRef.current = Math.min(1, Math.max(0, cyRef.current - (dy / rect.height) / scaleRef.current))
      setCx(cxRef.current)
      setCy(cyRef.current)
    }

    const onMouseUp = () => { dragging.current = false }

    // タッチ
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
      const rect = el.getBoundingClientRect()
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ratio = dist / lastPinchDist.current
        lastPinchDist.current = dist
        scaleRef.current = Math.min(4, Math.max(0.5, scaleRef.current * ratio))
        setScale(scaleRef.current)
      } else if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        cxRef.current = Math.min(1, Math.max(0, cxRef.current - (dx / rect.width) / scaleRef.current))
        cyRef.current = Math.min(1, Math.max(0, cyRef.current - (dy / rect.height) / scaleRef.current))
        setCx(cxRef.current)
        setCy(cyRef.current)
      }
    }

    const onTouchEnd = () => {
      dragging.current = false
      lastPinchDist.current = null
    }

    // ホイール
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.95 : 1.05
      scaleRef.current = Math.min(4, Math.max(0.5, scaleRef.current * delta))
      setScale(scaleRef.current)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    openEditor('0.5 0.5', 1)
  }

  const handleOpenEditor = () => {
    if (!preview) return
    openEditor(currentPosition || '0.5 0.5', currentScale || 1)
  }

  const handleConfirm = async () => {
    const posStr = `${cxRef.current.toFixed(4)} ${cyRef.current.toFixed(4)}`
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
    onPositionChange?.(posStr)
    onScaleChange?.(scaleRef.current)
    setEditorOpen(false)
  }

  const handleCancel = () => {
    if (pendingFile) {
      setPreview(currentImage)
      setPendingFile(null)
    }
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

    const pct = (v: number) => `${(v * 100).toFixed(2)}%`

    const editorImgStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: `${pct(cx)} ${pct(cy)}`,
      transform: `scale(${scale})`,
      transformOrigin: `${pct(cx)} ${pct(cy)}`,
      userSelect: 'none',
      pointerEvents: 'none',
    }

    return (
      <div className="fixed inset-0 z-50 bg-black touch-none">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="編集中"
            draggable={false}
            style={editorImgStyle}
          />
        </div>

        {/* 正方形枠オーバーレイ */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div
            style={{ width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)' }}
            className="relative"
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/60" style={{ width: '200vw', height: '200vh' }} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 bg-black/60" style={{ width: '200vw', height: '200vh' }} />
            <div className="absolute right-full top-0 bg-black/60" style={{ width: '200vw', height: '100%' }} />
            <div className="absolute left-full top-0 bg-black/60" style={{ width: '200vw', height: '100%' }} />
            <div className="absolute inset-0 border-4 border-white" />
            <div className="absolute bottom-full left-0 right-0 text-center pb-2">
              <span className="text-white text-sm font-medium">ズーム・移動できます</span>
            </div>
          </div>
        </div>

        {/* ✕ / ✓ ボタン */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 z-10">
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
        <div className="relative w-full h-full overflow-hidden">
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
