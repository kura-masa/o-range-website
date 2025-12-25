'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'
import { Report, getReportsList } from '@/lib/data'
import { getReports, saveReports } from '@/lib/firestore'
import SaveButtons from '@/components/SaveButtons'

export default function ReportsPage() {
  const { isAuthenticated } = useAuth()
  const { isEditMode, disableEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast, confirmAction } = useNotification()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    loadReports()
  }, [isAuthenticated, router])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Firebaseから直接取得
      const data = await getReports()
      setReports(data)
      console.log(`✅ Loaded ${data.length} reports from Firebase`)
    } catch (error) {
      console.error('Error loading reports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await saveReports(reports)
      setHasUnsavedChanges(false)
      showToast('success', '経過報告を保存しました')
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    }
  }

  const handleSaveAndExit = async () => {
    try {
      await saveReports(reports)
      setHasUnsavedChanges(false)
      showToast('success', '経過報告を保存して編集モードを終了しました')
      disableEditMode()
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    }
  }

  const handleUpdateReport = (id: string, field: keyof Report, value: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    setHasUnsavedChanges(true)
  }

  const handleAddReport = () => {
    const id = `report-${Date.now()}`
    const newReport: Report = {
      id,
      nickname: '',
      currentTrial: '',
      progress: '',
      result: '',
    }

    setReports((prev) => [...prev, newReport])
    setHasUnsavedChanges(true)
  }

  const handleDeleteReport = (id: string) => {
    const target = reports.find((r) => r.id === id)
    const label = target?.nickname ? `「${target.nickname}」` : 'この'

    confirmAction({
      title: '報告の削除',
      message: `${label} の経過報告を削除しますか？（保存するまでサーバーには反映されません）`,
      confirmLabel: '削除する',
      variant: 'danger',
      onConfirm: () => {
        setReports((prev) => prev.filter((r) => r.id !== id))
        setHasUnsavedChanges(true)
        showToast('info', '報告を削除リストに追加しました（保存して確定してください）')
      }
    })
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-orange-primary mb-2">経過報告</h1>
        <p className="text-gray-600">メンバー限定 - 現在進行中の取り組み</p>
      </header>

      <div className="space-y-6">
        {reports.map((report) => (
          <div key={report.id} className="relative bg-white rounded-lg shadow-md p-6">
            {isEditMode && (
              <button
                type="button"
                onClick={() => handleDeleteReport(report.id)}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
              >
                削除
              </button>
            )}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-orange-primary">
                {isEditMode ? (
                  <input
                    type="text"
                    value={report.nickname}
                    onChange={(e) => handleUpdateReport(report.id, 'nickname', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  report.nickname
                )}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">今試していること</h3>
                {isEditMode ? (
                  <textarea
                    value={report.currentTrial}
                    onChange={(e) => handleUpdateReport(report.id, 'currentTrial', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 min-h-[80px]"
                    placeholder="現在試している内容を入力してください"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{report.currentTrial}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">経過報告</h3>
                {isEditMode ? (
                  <textarea
                    value={report.progress}
                    onChange={(e) => handleUpdateReport(report.id, 'progress', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 min-h-[100px]"
                    placeholder="経過を入力してください"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{report.progress}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">結果報告・考察</h3>
                {isEditMode ? (
                  <textarea
                    value={report.result}
                    onChange={(e) => handleUpdateReport(report.id, 'result', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 min-h-[100px]"
                    placeholder="結果や考察を入力してください"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{report.result}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAuthenticated && isEditMode && (
        <SaveButtons
          onSave={handleSave}
          onSaveAndExit={handleSaveAndExit}
          onAdd={handleAddReport}
          addButtonLabel="＋ 追加"
        />
      )}
    </div>
  )
}
