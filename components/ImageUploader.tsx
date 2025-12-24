'use client'

import { useState, useRef } from 'react'
import { uploadMemberImage, validateImageFile } from '@/lib/storage'
import Image from 'next/image'

interface ImageUploaderProps {
  currentImage?: string
  memberId: string
  imageType: 'no1' | 'no2'
  onUploadSuccess: (url: string) => void
  label: string
  variant?: 'default' | 'compact'
}

export default function ImageUploader({
  currentImage,
  memberId,
  imageType,
  onUploadSuccess,
  label,
  variant = 'default'
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(currentImage)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // ファイルの検証
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || '不正なファイルです')
      return
    }

    // プレビュー表示
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    // アップロード
    setUploading(true)
    try {
      const downloadURL = await uploadMemberImage(memberId, file, imageType)
      onUploadSuccess(downloadURL)
      setPreview(downloadURL)
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました')
      setPreview(currentImage)
    } finally {
      setUploading(false)
    }
  }

  const size = variant === 'compact' ? 80 : 128

  return (
    <div className={variant === 'compact' ? '' : 'space-y-2'}>
      {variant === 'default' && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      
      <div className={variant === 'compact' ? 'flex flex-col items-start gap-2' : 'flex flex-col items-start gap-3'}>
        {/* 画像プレビュー */}
        <div className={variant === 'compact' ? 'w-20 h-20' : 'w-32 h-32'}>
          {preview ? (
            <Image
              src={preview}
              alt={label}
              width={size}
              height={size}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-xs text-center px-2">準備中</span>
            </div>
          )}
        </div>

        {/* アップロードボタン（画像の下に配置） */}
        <div className="flex flex-col items-start gap-2">
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
              variant === 'compact'
                ? 'px-2 py-1 text-xs bg-orange-primary text-white rounded hover:bg-orange-dark disabled:bg-gray-300 disabled:cursor-not-allowed'
                : 'px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
            }
          >
            {uploading ? 'アップロード中...' : variant === 'compact' ? '画像変更' : '画像を選択'}
          </button>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {variant === 'default' && (
            <p className="text-xs text-gray-500">
              JPEG、PNG、WebP形式<br />
              最大5MB
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
