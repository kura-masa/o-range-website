'use client'

import { Member } from '@/lib/data'
import { useRouter } from 'next/navigation'
import ImageUploader, { buildImageStyle } from './ImageUploader'

function getImageStyle(position?: string, scale?: number): React.CSSProperties {
  const parts = (position || '50% 50%').split(' ')
  const x = parseFloat(parts[0]); const px = isNaN(x) ? 50 : x
  const y = parseFloat(parts[1]); const py = isNaN(y) ? 50 : y
  return buildImageStyle(px, py, scale ?? 1)
}

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
        ) : member.imageNo1 ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.imageNo1}
              alt={member.name}
              draggable={false}
              style={getImageStyle(member.imageNo1Position, member.imageNo1Scale)}
            />
          </div>
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
