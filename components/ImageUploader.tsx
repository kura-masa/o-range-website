'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'

interface ImageUploaderProps {
  currentImage?: string
  currentPosition?: string  // "offsetX offsetY nw nh" 形式
  currentScale?: number     // ズーム倍率
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  onPositionChange?: (pos: string) => void
  onScaleChange?: (scale: number) => void
  label: string
  variant?: 'default' | 'compact' | 'overlay'
  frameAspect?: number  // 枠のアスペクト比 width/height（デフォルト1=正方形）
}

// offsetX, offsetY（枠幅基準の比率）+ scale + nw + nh → 表示用CSS
// containerAspect: コンテナのアスペクト比 width/height
export function buildImageStyle(
  position: string = '0 0',
  scale: number = 1,
  containerAspect: number = 1
): React.CSSProperties {
  const parts = (position || '0 0').split(' ')
  const offsetX = parseFloat(parts[0])
  const offsetY = parseFloat(parts[1])
  const nw = parts[2] ? parseFloat(parts[2]) : 0
  const nh = parts[3] ? parseFloat(parts[3]) : 0
  const safeOffX = isNaN(offsetX) ? 0 : offsetX
  const safeOffY = isNaN(offsetY) ? 0 : offsetY

  if (nw > 0 && nh > 0) {
    // コンテナサイズ：幅=W, 高さ=W/containerAspect
    // offsetX/Y は枠幅W基準
    // 画像の短辺が scale=1 のとき枠幅W にフィット
    // → 画像サイズ(px): imgW = nw/shortSide * scale * W, imgH = nh/shortSide * scale * W
    // → % 表示では width基準で計算（position:absoluteの%はコンテナサイズ基準）
    // コンテナ幅=100%, 高さ=100%（aspect-ratioで制御）
    // width:%はコンテナ幅基準、height:%はコンテナ高さ基準
    // コンテナ幅=W, コンテナ高さ=W/containerAspect
    // imgW(px) = nw/shortSide * scale * W → imgW(%) = nw/shortSide * scale * 100
    // imgH(px) = nh/shortSide * scale * W → imgH(%) = nh/shortSide * scale * containerAspect * 100
    const shortSide = Math.min(nw, nh)
    const imgWpct = (nw / shortSide) * scale * 100
    const imgHpct = (nh / shortSide) * scale * containerAspect * 100
    // 画像中心(px) = コンテナ中央 + offset*W
    // left(px) = imgCenter_x - imgW/2 = W/2 + offsetX*W - imgW/2
    // left(%) = 50 + offsetX*100 - imgWpct/2
    const leftPct = 50 + safeOffX * 100 - imgWpct / 2
    // top(px) = H/2 + offsetY*W - imgH/2 = (W/containerAspect)/2 + offsetY*W - imgH/2
    // top(%) = top(px) / (W/containerAspect) * 100
    //        = (50/containerAspect + offsetY*100 - imgHpct/(2*containerAspect)) * containerAspect
    //   ※ top(%)はコンテナ高さ基準
    // top(px) = W/2/containerAspect + offsetY*W - nh/shortSide*scale*W/2
    // top(%) = top(px) / (W/containerAspect) * 100
    //        = (1/2 + offsetY*containerAspect - nh/shortSide*scale*containerAspect/2) * 100
    const topPct = (0.5 + safeOffY * containerAspect - (nh / shortSide) * scale * containerAspect / 2) * 100
    return {
      position: 'absolute',
      left: `${leftPct.toFixed(6)}%`,
      top: `${topPct.toFixed(6)}%`,
      width: `${imgWpct.toFixed(6)}%`,
      height: `${imgHpct.toFixed(6)}%`,
      maxWidth: 'none',
      maxHeight: 'none',
      userSelect: 'none',
      pointerEvents: 'none',
    }
  }

  // 既存データ互換（nw/nh なし）: cx cy 形式として object-position で表示
  // cx, cy は 0〜1 の正規化座標（0.5 0.5 = 中央）
  const safeCx = isNaN(offsetX) ? 0.5 : Math.min(1, Math.max(0, offsetX))
  const safeCy = isNaN(offsetY) ? 0.5 : Math.min(1, Math.max(0, offsetY))
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${(safeCx * 100).toFixed(2)}% ${(safeCy * 100).toFixed(2)}%`,
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

export default function ImageUploader({
  currentImage,
  currentPosition = '0 0',
  currentScale = 1,
  memberId,
  imageType,
  onUploadSuccess,
  onPositionChange,
  onScaleChange,
  label,
  variant = 'default',
  frameAspect = 1,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(currentImage)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 画像自然サイズ
  const imgNaturalW = useRef(0)
  const imgNaturalH = useRef(0)
  // displayScale: 自然サイズ→px変換（scale=1時、短辺=枠幅FW）
  const displayScale = useRef(1)
  // 枠サイズ・位置（px）：枠幅FW、枠高FH = FW/frameAspect
  const frameW = useRef(0)
  const frameH = useRef(0)
  const frameCenterX = useRef(0)
  const frameCenterY = useRef(0)

  // 画像中心の画面座標（px）
  const imgCenterX = useRef(0)
  const imgCenterY = useRef(0)
  const scaleRef = useRef(1)

  // 表示更新用 state（全て同時更新して比率ずれ防止）
  const [editorState, setEditorState] = useState({
    imgCx: 0, imgCy: 0,
    scale: 1,
    nw: 0, nh: 0, ds: 1,
  })
  const [ready, setReady] = useState(false)

  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)

  const editorInitPos = useRef('0 0')
  const editorInitScale = useRef(1)
  const editorPreviewUrl = useRef('')

  const parsePos = useCallback((pos: string) => {
    const parts = (pos || '0 0').split(' ')
    const ox = parseFloat(parts[0])
    const oy = parseFloat(parts[1])
    return { offsetX: isNaN(ox) ? 0 : ox, offsetY: isNaN(oy) ? 0 : oy }
  }, [])

  // エディタ初期化
  useEffect(() => {
    if (!editorOpen) return
    setReady(false)

    const img = new window.Image()
    img.onload = () => {
      imgNaturalW.current = img.naturalWidth
      imgNaturalH.current = img.naturalHeight

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const screenW = window.innerWidth
          const screenH = window.innerHeight

          // 枠サイズ計算：frameAspectを考慮
          // 枠幅 = min(screenW*0.85, screenH*0.85*frameAspect)
          const maxFW = screenW * 0.85
          const maxFH = screenH * 0.75
          let fw: number, fh: number
          if (maxFW / frameAspect <= maxFH) {
            fw = maxFW
            fh = maxFW / frameAspect
          } else {
            fh = maxFH
            fw = maxFH * frameAspect
          }
          frameW.current = fw
          frameH.current = fh
          frameCenterX.current = screenW / 2
          frameCenterY.current = screenH / 2

          const nw = imgNaturalW.current
          const nh = imgNaturalH.current
          const shortSide = Math.min(nw, nh)
          // scale=1 のとき短辺=枠幅FW
          displayScale.current = fw / shortSide

          const s = editorInitScale.current
          scaleRef.current = s

          const parsed = parsePos(editorInitPos.current)
          // offsetX/Y（枠幅FW基準）→ 画像中心の画面座標
          imgCenterX.current = frameCenterX.current + parsed.offsetX * fw
          imgCenterY.current = frameCenterY.current + parsed.offsetY * fw

          setEditorState({
            imgCx: imgCenterX.current,
            imgCy: imgCenterY.current,
            scale: s,
            nw, nh,
            ds: displayScale.current,
          })
          setReady(true)
        })
      })
    }
    img.src = editorPreviewUrl.current
  }, [editorOpen, parsePos, frameAspect])

  // ドラッグ・ピンチ・ホイール
  useEffect(() => {
    if (!editorOpen) return
    const el = overlayRef.current
    if (!el) return

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      imgCenterX.current += dx
      imgCenterY.current += dy
      setEditorState(prev => ({ ...prev, imgCx: imgCenterX.current, imgCy: imgCenterY.current }))
    }

    const onMouseUp = () => { dragging.current = false }

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
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ratio = dist / lastPinchDist.current
        lastPinchDist.current = dist
        const prevScale = scaleRef.current
        const newScale = Math.min(8, Math.max(0.2, prevScale * ratio))
        const fcx = frameCenterX.current
        const fcy = frameCenterY.current
        imgCenterX.current = fcx + (imgCenterX.current - fcx) * (newScale / prevScale)
        imgCenterY.current = fcy + (imgCenterY.current - fcy) * (newScale / prevScale)
        scaleRef.current = newScale
        setEditorState(prev => ({ ...prev, imgCx: imgCenterX.current, imgCy: imgCenterY.current, scale: newScale }))
      } else if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        imgCenterX.current += dx
        imgCenterY.current += dy
        setEditorState(prev => ({ ...prev, imgCx: imgCenterX.current, imgCy: imgCenterY.current }))
      }
    }

    const onTouchEnd = () => {
      dragging.current = false
      lastPinchDist.current = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.95 : 1.05
      const prevScale = scaleRef.current
      const newScale = Math.min(8, Math.max(0.2, prevScale * delta))
      const fcx = frameCenterX.current
      const fcy = frameCenterY.current
      imgCenterX.current = fcx + (imgCenterX.current - fcx) * (newScale / prevScale)
      imgCenterY.current = fcy + (imgCenterY.current - fcy) * (newScale / prevScale)
      scaleRef.current = newScale
      setEditorState(prev => ({ ...prev, imgCx: imgCenterX.current, imgCy: imgCenterY.current, scale: newScale }))
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

  // 確定時: offsetX/Y（枠幅FW基準）を計算
  const computeOffset = useCallback(() => {
    const fw = frameW.current
    if (fw === 0) return { offsetX: 0, offsetY: 0 }
    const offsetX = (imgCenterX.current - frameCenterX.current) / fw
    const offsetY = (imgCenterY.current - frameCenterY.current) / fw
    return { offsetX, offsetY }
  }, [])

  const openEditor = (pos: string, s: number, imgUrl: string) => {
    editorInitPos.current = pos
    editorInitScale.current = s
    editorPreviewUrl.current = imgUrl
    setEditorOpen(true)
  }

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
    openEditor('0 0', 1, objectUrl)
  }

  const handleOpenEditor = () => {
    if (!preview) return
    openEditor(currentPosition || '0 0', currentScale || 1, preview)
  }

  const handleConfirm = async () => {
    const { offsetX, offsetY } = computeOffset()
    const nw = imgNaturalW.current
    const nh = imgNaturalH.current
    const posStr = `${offsetX.toFixed(8)} ${offsetY.toFixed(8)} ${nw} ${nh}`
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
        className="px-6 py-3 text-base bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
      >
        画像変更
      </button>
      {preview && (
        <button
          onClick={handleOpenEditor}
          className={
            dark
              ? 'px-6 py-3 text-base bg-gray-700 text-white rounded-lg hover:bg-gray-600'
              : 'px-6 py-3 text-base bg-gray-500 text-white rounded-lg hover:bg-gray-400'
          }
        >
          位置調節
        </button>
      )}
    </div>
  )

  const renderEditor = () => {
    if (!editorOpen || !preview) return null

    const { imgCx: icx, imgCy: icy, scale: s, nw, nh, ds } = editorState
    const isReady = ready && nw > 0 && nh > 0 && ds > 0

    // 画像表示サイズ（px）
    const dispW = nw * ds * s
    const dispH = nh * ds * s

    // 画像の left/top（画面座標）
    const imgLeft = icx - dispW / 2
    const imgTop = icy - dispH / 2

    // 枠の位置・サイズ（px）
    const fw = frameW.current
    const fh = frameH.current
    const frameLeft = frameCenterX.current - fw / 2
    const frameTop = frameCenterY.current - fh / 2
    const frameRight = frameLeft + fw
    const frameBottom = frameTop + fh

    return (
      <div className="fixed inset-0 z-50">
        {/* ドラッグ操作エリア */}
        <div
          ref={overlayRef}
          className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
          style={{ zIndex: 1 }}
        />
        {/* 黒背景 */}
        <div className="fixed inset-0 bg-black" style={{ zIndex: 0 }} />

        {/* 画像 1枚 */}
        {isReady && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="編集中"
            draggable={false}
            style={{
              position: 'fixed',
              left: `${imgLeft}px`,
              top: `${imgTop}px`,
              width: `${dispW}px`,
              height: `${dispH}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* 枠外を暗くする4枚のオーバーレイ */}
        <div className="fixed pointer-events-none" style={{ zIndex: 2, top: 0, left: 0, right: 0, height: `${frameTop}px`, background: 'rgba(0,0,0,0.65)' }} />
        <div className="fixed pointer-events-none" style={{ zIndex: 2, top: `${frameBottom}px`, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)' }} />
        <div className="fixed pointer-events-none" style={{ zIndex: 2, top: `${frameTop}px`, left: 0, width: `${frameLeft}px`, height: `${fh}px`, background: 'rgba(0,0,0,0.65)' }} />
        <div className="fixed pointer-events-none" style={{ zIndex: 2, top: `${frameTop}px`, left: `${frameRight}px`, right: 0, height: `${fh}px`, background: 'rgba(0,0,0,0.65)' }} />

        {/* 枠の白ボーダー */}
        <div className="fixed pointer-events-none" style={{
          zIndex: 3,
          left: `${frameLeft}px`,
          top: `${frameTop}px`,
          width: `${fw}px`,
          height: `${fh}px`,
          border: '2px solid white',
        }} />

        {/* ヘルプテキスト */}
        <div className="fixed top-4 left-0 right-0 text-center pointer-events-none" style={{ zIndex: 4 }}>
          <span className="text-white text-sm font-medium">ズーム・移動できます</span>
        </div>

        {/* ✕ / ✓ ボタン */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-8" style={{ zIndex: 10, pointerEvents: 'none' }}>
          <button
            onClick={handleCancel}
            style={{ pointerEvents: 'auto' }}
            className="w-14 h-14 rounded-full bg-gray-800 text-white text-2xl flex items-center justify-center hover:bg-gray-700"
          >
            ✕
          </button>
          <button
            onClick={handleConfirm}
            disabled={uploading}
            style={{ pointerEvents: 'auto' }}
            className="w-14 h-14 rounded-full bg-orange-500 text-white text-2xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-50"
          >
            {uploading ? '…' : '✓'}
          </button>
        </div>

        {error && (
          <div className="fixed top-12 left-4 right-4 bg-red-600 text-white text-sm text-center py-2 px-4 rounded-lg" style={{ zIndex: 4 }}>
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
              style={buildImageStyle(currentPosition, currentScale, frameAspect)}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-sm">画像準備中</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
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
              style={buildImageStyle(currentPosition, currentScale, 1)}
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
          <p className="text-xs text-gray-500">JPEG、PNG、WebP形式 / 最大20MB</p>
        )}
      </div>
      {renderEditor()}
    </>
  )
}
