'use client'

import { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

// 1行 = 1 input の「行コントロール型」箇条書きエディタ
// - ◎ は input の値に含まない（独立した装飾要素）
// - Enter で新規行追加（PCで動く / Androidは + ボタンで代替）
// - 空行で Backspace → 行削除 + 前行末にフォーカス（iOS/PC では動く / Android は × ボタンで救済）
// - ↑↓ 矢印で行間移動
// - 各行に × ボタン、末尾に + ボタン
export default function BulletListEditor({ value, onChange, placeholder }: Props) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const focusTargetRef = useRef<{ index: number; caret: 'start' | 'end' } | null>(null)

  const lines = value.length > 0 ? value.split('\n') : ['']

  useEffect(() => {
    if (focusTargetRef.current) {
      const { index, caret } = focusTargetRef.current
      const el = inputRefs.current[index]
      if (el) {
        el.focus()
        const pos = caret === 'end' ? el.value.length : 0
        try {
          el.setSelectionRange(pos, pos)
        } catch {}
      }
      focusTargetRef.current = null
    }
  })

  const update = (next: string[]) => {
    onChange(next.join('\n'))
  }

  const handleLineChange = (i: number, newValue: string) => {
    const next = [...lines]
    next[i] = newValue
    update(next)
  }

  const handleAddBelow = (i: number) => {
    const next = [...lines]
    next.splice(i + 1, 0, '')
    focusTargetRef.current = { index: i + 1, caret: 'start' }
    update(next)
  }

  const handleAddAtEnd = () => {
    const next = [...lines, '']
    focusTargetRef.current = { index: next.length - 1, caret: 'start' }
    update(next)
  }

  const handleRemove = (i: number) => {
    if (lines.length === 1) {
      // 最後の1行は空にするのみ（完全消去はしない）
      update([''])
      focusTargetRef.current = { index: 0, caret: 'start' }
      return
    }
    const next = lines.filter((_, idx) => idx !== i)
    const focusIdx = Math.max(0, i - 1)
    focusTargetRef.current = { index: focusIdx, caret: 'end' }
    update(next)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME変換中は無視
    if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return

    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddBelow(i)
      return
    }

    if (e.key === 'Backspace') {
      const el = e.currentTarget
      // 空行 + 行頭 → 行削除して前の行末へ
      if (el.value === '' && lines.length > 1) {
        e.preventDefault()
        handleRemove(i)
        return
      }
      // 非空行の先頭でBackspace → 前の行末に連結
      if ((el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0 && i > 0) {
        e.preventDefault()
        const prev = lines[i - 1] ?? ''
        const cur = lines[i] ?? ''
        const merged = prev + cur
        const next = [...lines]
        next.splice(i - 1, 2, merged)
        focusTargetRef.current = { index: i - 1, caret: 'end' }
        // ▼ caret: 'end' だと末尾固定。連結点(=prevの末尾)に当てるため少し調整
        // 末尾固定でも prev + cur の連結点付近に近い。完全な連結点位置を望むなら独自ロジックを追加
        update(next)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      if (i < lines.length - 1) {
        e.preventDefault()
        inputRefs.current[i + 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowUp') {
      if (i > 0) {
        e.preventDefault()
        inputRefs.current[i - 1]?.focus()
      }
      return
    }
  }

  return (
    <div className="w-full bg-[#111118] border border-gray-700 rounded-lg px-2 py-2 space-y-1">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-1.5 group">
          <button
            type="button"
            onClick={() => handleRemove(i)}
            aria-label="この行を削除"
            className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors text-xs select-none"
            style={{ userSelect: 'none' }}
          >
            ×
          </button>
          <span className="text-orange-primary flex-shrink-0 text-sm select-none" style={{ userSelect: 'none' }}>
            ◎
          </span>
          <input
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            value={line}
            onChange={(e) => handleLineChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600 py-1"
            placeholder={i === 0 ? (placeholder ?? 'ここに書いてください') : ''}
            style={{ fontSize: '16px' }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddAtEnd}
        className="ml-7 mt-2 px-3 py-1.5 text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
      >
        ＋ 行を追加
      </button>
    </div>
  )
}
