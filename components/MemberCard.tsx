'use client'

import { Member } from '@/lib/data'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ImageUploader from './ImageUploader'

interface MemberCardProps {
  member: Member
  isEditing: boolean
  onUpdate: (id: string, field: keyof Member, value: string) => void
  onDelete?: (id: string) => void
}

export default function MemberCard({ member, isEditing, onUpdate, onDelete }: MemberCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (!isEditing) {
      router.push(`/member/${member.id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white rounded-lg shadow-md overflow-hidden ${!isEditing ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
        }`}
    >
      {isEditing && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(member.id)
          }}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 z-10"
        >
          削除
        </button>
      )}

      {/* プロフィール画像No.1 */}
      <div
        className="w-full aspect-square relative bg-gray-200"
        onClick={(e) => isEditing && e.stopPropagation()}
      >
        {isEditing ? (
          <ImageUploader
            currentImage={member.imageNo1}
            memberId={member.id}
            imageType="no1"
            label="プロフィール画像"
            variant="overlay"
            onUploadSuccess={(url) => onUpdate(member.id, 'imageNo1', url)}
          />
        ) : member.imageNo1 ? (
          <Image
            src={member.imageNo1}
            alt={member.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500 text-sm">画像準備中</span>
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
