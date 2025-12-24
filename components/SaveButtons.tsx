'use client'

import { useEdit } from '@/contexts/EditContext'

interface SaveButtonsProps {
  onSave: () => void
  onSaveAndExit: () => void
}

export default function SaveButtons({ onSave, onSaveAndExit }: SaveButtonsProps) {
  const { isEditMode, hasUnsavedChanges } = useEdit()

  // 編集モードでない場合は表示しない
  if (!isEditMode) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 bg-white rounded-lg shadow-2xl p-4 border border-gray-200">
      <button
        onClick={onSave}
        className="px-6 py-3 bg-orange-primary text-white rounded-lg hover:bg-orange-dark transition-colors font-semibold shadow-md hover:shadow-lg"
      >
        💾 保存
      </button>
      <button
        onClick={onSaveAndExit}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md hover:shadow-lg"
      >
        ✓ 保存して終了
      </button>
      {hasUnsavedChanges && (
        <p className="text-xs text-orange-600 text-center mt-1">
          未保存の変更があります
        </p>
      )}
    </div>
  )
}
