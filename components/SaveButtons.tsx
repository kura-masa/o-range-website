'use client'

import { useEdit } from '@/contexts/EditContext'

interface SaveButtonsProps {
  onSave: () => void
  onSaveAndExit: () => void
  onAdd?: () => void
  addButtonLabel?: string
}

export default function SaveButtons({ onSave, onSaveAndExit, onAdd, addButtonLabel }: SaveButtonsProps) {
  const { isEditMode, hasUnsavedChanges } = useEdit()

  // 編集モードでない場合は表示しない
  if (!isEditMode) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {onAdd && addButtonLabel && (
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
        >
          {addButtonLabel}
        </button>
      )}
      <button
        onClick={onSave}
        className="px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-dark transition-colors font-semibold shadow-lg"
      >
        保存
      </button>
      <button
        onClick={onSaveAndExit}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg"
      >
        完了
      </button>
      {hasUnsavedChanges && (
        <p className="text-xs text-orange-600 text-center mt-1 bg-white px-2 py-1 rounded shadow-lg">
          未保存
        </p>
      )}
    </div>
  )
}
