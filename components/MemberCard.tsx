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
      className={`relative bg-white rounded-lg shadow-md p-4 flex gap-4 items-start ${
        !isEditing ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      }`}
    >
      {isEditing && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(member.id)
          }}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
        >
          削除
        </button>
      )}
      {/* プロフィール画像No.1 */}
      <div
        className={isEditing ? 'w-20 flex-shrink-0' : 'w-20 h-20 flex-shrink-0'}
        onClick={(e) => isEditing && e.stopPropagation()}
      >
        {isEditing ? (
          <div className="-ml-1 -mt-1">
            <ImageUploader
              currentImage={member.imageNo1}
              memberId={member.id}
              imageType="no1"
              label="プロフィール画像"
              variant="compact"
              onUploadSuccess={(url) => onUpdate(member.id, 'imageNo1', url)}
            />
          </div>
        ) : member.imageNo1 ? (
          <Image
            src={member.imageNo1}
            alt={member.name}
            width={80}
            height={80}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-500 text-xs text-center">準備中</span>
          </div>
        )}
      </div>

      {/* 名前と一言 */}
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-lg font-bold text-orange-primary mb-1">
          {isEditing ? (
            <input
              type="text"
              value={member.name}
              onChange={(e) => onUpdate(member.id, 'name', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          ) : (
            member.name
          )}
        </h2>
        <p className="text-gray-600 text-sm">
          {isEditing ? (
            <input
              type="text"
              value={member.tagline}
              onChange={(e) => onUpdate(member.id, 'tagline', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-300 rounded px-2 py-1"
              placeholder="一言を入力してください"
            />
          ) : (
            member.tagline
          )}
        </p>
      </div>
    </div>
  )
}
