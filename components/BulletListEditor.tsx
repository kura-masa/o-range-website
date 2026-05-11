'use client'

import { useRef, useLayoutEffect } from 'react'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

// 各行の頭に「◎ 」を表示するテキストエリア
// データ層には◎を含まないクリーンな内容（行は \n 区切り）を保持
export default function BulletListEditor({ value, onChange, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const pendingCursorRef = useRef<number | null>(null)

  const displayValue = value.split('\n').map(l => `◎ ${l}`).join('\n')

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && taRef.current) {
      const pos = pendingCursorRef.current
      try {
        taRef.current.setSelectionRange(pos, pos)
      } catch {}
      pendingCursorRef.current = null
    }
  })

  // (lineIdx, offsetInLine) を計算
  const findLine = (text: string, pos: number) => {
    const lines = text.split('\n')
    let lineIdx = 0
    let offsetInLine = pos
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].length
      if (offsetInLine <= lineLen) {
        lineIdx = i
        return { lineIdx, offsetInLine, lines }
      }
      offsetInLine -= lineLen + 1
      lineIdx = i + 1
    }
    return { lineIdx, offsetInLine, lines }
  }

  const stripPrefix = (l: string) =>
    l.startsWith('◎ ') ? l.slice(2) : l.startsWith('◎') ? l.slice(1) : l

  // クリーンな lines 配列での (lineIdx, offsetInContent) → 表示値でのカーソル位置
  const toDisplayPos = (cleanLines: string[], lineIdx: number, offsetInContent: number) => {
    let pos = 0
    for (let i = 0; i < lineIdx; i++) pos += (cleanLines[i]?.length ?? 0) + 2 + 1
    pos += 2 + offsetInContent
    return pos
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Backspace') return
    const ta = e.currentTarget
    const start = ta.selectionStart ?? 0
    const endPos = ta.selectionEnd ?? 0
    if (start !== endPos) return
    const { lineIdx, offsetInLine, lines: displayLines } = findLine(ta.value, start)
    const dispLine = displayLines[lineIdx] ?? ''
    if (!dispLine.startsWith('◎ ')) return
    if (offsetInLine > 2) return // ◎ 領域でなければ通常Backspace

    const cleanLines = displayLines.map(stripPrefix)
    const thisContent = cleanLines[lineIdx] ?? ''

    if (lineIdx === 0) {
      // 先頭行：空の◎なら行ごと削除、それ以外は何もしない（誤消去防止）
      if (thisContent === '' && cleanLines.length > 1) {
        e.preventDefault()
        const newLines = cleanLines.slice(1)
        pendingCursorRef.current = toDisplayPos(newLines, 0, 0)
        onChange(newLines.join('\n'))
      } else {
        e.preventDefault()
      }
      return
    }

    // 非先頭行：上の行末と連結（◎は消す）
    e.preventDefault()
    const prevContent = cleanLines[lineIdx - 1] ?? ''
    const merged = prevContent + thisContent
    const newLines = [...cleanLines]
    newLines.splice(lineIdx - 1, 2, merged)
    pendingCursorRef.current = toDisplayPos(newLines, lineIdx - 1, prevContent.length)
    onChange(newLines.join('\n'))
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplay = e.target.value
    const cursorPos = e.target.selectionStart ?? 0
    const newDisplayLines = newDisplay.split('\n')
    const cleanLines = newDisplayLines.map(stripPrefix)

    // 現カーソル位置から (lineIdx, offsetInLine) を求める
    let cursorLineIdx = 0
    let cursorOffsetInLine = cursorPos
    for (let i = 0; i < newDisplayLines.length; i++) {
      const lineLen = newDisplayLines[i].length
      if (cursorOffsetInLine <= lineLen) {
        cursorLineIdx = i
        break
      }
      cursorOffsetInLine -= lineLen + 1
      cursorLineIdx = i + 1
    }
    const dispAtCursor = newDisplayLines[cursorLineIdx] ?? ''
    const presentPrefixLen = dispAtCursor.startsWith('◎ ')
      ? 2
      : dispAtCursor.startsWith('◎')
      ? 1
      : 0
    const cursorInContent = Math.max(0, cursorOffsetInLine - presentPrefixLen)
    pendingCursorRef.current = toDisplayPos(cleanLines, cursorLineIdx, cursorInContent)
    onChange(cleanLines.join('\n'))
  }

  return (
    <textarea
      ref={taRef}
      value={displayValue}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      rows={Math.max(3, value.split('\n').length)}
      className="w-full bg-[#111118] border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-200 outline-none placeholder-gray-600 resize-y leading-relaxed"
      placeholder={placeholder ?? '◎ ここに書いてください'}
    />
  )
}
