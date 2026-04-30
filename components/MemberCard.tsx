'use client'

import { useState } from 'react'
import { Member } from '@/lib/data'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ImageUploader, { buildImageStyle } from './ImageUploader'

interface MemberCardProps {
  member: Member
  isEditing: boolean
  onUpdate: (id: string, field: keyof Member, value: string) => void
  onSave?: () => void  // 画像追加後の自動保存用
}

export default function MemberCard({ member, isEditing, onUpdate, onSave }: MemberCardProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [addingImage, setAddingImage] = useState(false)

  const handleClick = () => {
    if (!isEditing && !addingImage) {
      router.push(`/member/${member.id}`)
    }
  }

  const handleAddImageSuccess = (url: string) => {
    onUpdate(member.id, 'imageNo1', url)
  }

  const handleAddImageDone = () => {
    setAddingImage(false)
    // 次のレンダー後に保存を実行（state更新が反映されてから）
    setTimeout(() => onSave?.(), 50)
  }

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white rounded-lg shadow-md overflow-hidden ${!isEditing && !addingImage ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
        }`}
    >


      {/* プロフィール画像No.1 */}
      <div
        className="w-full aspect-square relative bg-black"
        onClick={(e) => (isEditing || addingImage) && e.stopPropagation()}
      >
        {isEditing ? (
          <ImageUploader
            currentImage={member.imageNo1}
            currentPosition={member.imageNo1Position}
            currentScale={member.imageNo1Scale}
            memberId={member.id}
            imageType="no1"
            label="プロフィール画像"
            variant="overlay"
            onUploadSuccess={(url) => onUpdate(member.id, 'imageNo1', url)}
            onPositionChange={(pos) => onUpdate(member.id, 'imageNo1Position', pos)}
            onScaleChange={(s) => onUpdate(member.id, 'imageNo1Scale', String(s))}
          />
        ) : addingImage ? (
          <ImageUploader
            currentImage={member.imageNo1}
            currentPosition={member.imageNo1Position}
            currentScale={member.imageNo1Scale}
            memberId={member.id}
            imageType="no1"
            label="プロフィール画像"
            variant="overlay"
            autoOpenFilePicker
            onUploadSuccess={handleAddImageSuccess}
            onPositionChange={(pos) => onUpdate(member.id, 'imageNo1Position', pos)}
            onScaleChange={(s) => {
              onUpdate(member.id, 'imageNo1Scale', String(s))
              handleAddImageDone()
            }}
            onDismiss={() => setAddingImage(false)}
          />
        ) : member.imageNo1 ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.imageNo1}
              alt={member.name}
              draggable={false}
              style={buildImageStyle(member.imageNo1Position, member.imageNo1Scale)}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingImage(true)
                }}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-md"
              >
                📷 画像追加
              </button>
            ) : (
              <span className="text-gray-500 text-sm">画像準備中</span>
            )}
          </div>
        )}
      </div>

      {/* 名前と一言 */}
      <div className="p-2 text-center">
        <h2 className="text-xl font-bold text-orange-primary mb-2">
          {isEditing ? (
            <input
              type="text"
              value={member.name}
              onChange={(e) => onUpdate(member.id, 'name', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-300 rounded px-2 py-1 text-center"
            />
          ) : (
            member.name
          )}
        </h2>
        <p className="text-gray-600 text-sm">
          {isEditing ? (
            <textarea
              value={member.tagline}
              onChange={(e) => onUpdate(member.id, 'tagline', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-300 rounded px-2 py-1 text-center"
              placeholder="一言を入力してください"
              rows={2}
            />
          ) : (
            member.tagline
          )}
        </p>
      </div>
    </div>
  )
}
