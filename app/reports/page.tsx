'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEdit } from '@/contexts/EditContext'
import { useNotification } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'
import { Report, ReportHistory } from '@/lib/data'
import { getReports, saveReports, saveReportsToHistory, getReportsHistoryList, getReportsHistory, getAllEmbeddings } from '@/lib/firestore'
import { summarizeReportWithAI, searchSimilarTexts, answerWithRAG, generateReportTeaser } from '@/lib/gemini-client'
import SaveButtons from '@/components/SaveButtons'
import VoiceRecorder from '@/components/VoiceRecorder'
import HamburgerMenu from '@/components/HamburgerMenu'

export default function ReportsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { isEditMode, disableEditMode, setHasUnsavedChanges } = useEdit()
  const { showToast, confirmAction } = useNotification()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [originalReports, setOriginalReports] = useState<Report[]>([]) // 変更検知用
  const [loading, setLoading] = useState(true)
  const [processingVoice, setProcessingVoice] = useState<string | null>(null)
  const [historyList, setHistoryList] = useState<ReportHistory[]>([])
  const [selectedHistory, setSelectedHistory] = useState<string>('current')
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current')
  const [showRAGSearch, setShowRAGSearch] = useState(false)
  const [ragQuery, setRagQuery] = useState('')
  const [ragAnswer, setRagAnswer] = useState('')
  const [ragSearching, setRagSearching] = useState(false)
  const [currentReportIndex, setCurrentReportIndex] = useState(0)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null) // 詳細表示用
  const [isModalEditing, setIsModalEditing] = useState(false) // モーダル内の編集状態
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null) // 長押しタイマー
  const [showSpinner, setShowSpinner] = useState(false) // 保存時のスピナー表示

  useEffect(() => {
    if (authLoading) return // 認証情報の読み込み中は何もしない
    
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    loadReports()
    loadHistoryList()
  }, [isAuthenticated, authLoading, router])


  const loadReports = async () => {
    setLoading(true)
    try {
      // Firebaseから直接取得
      const data = await getReports()
      setReports(data)
      setOriginalReports(JSON.parse(JSON.stringify(data))) // ディープコピーで保存
      console.log(`✅ Loaded ${data.length} reports from Firebase`)
    } catch (error) {
      console.error('Error loading reports:', error)
      setReports([])
      setOriginalReports([])
    } finally {
      setLoading(false)
    }
  }

  const loadHistoryList = async () => {
    try {
      const history = await getReportsHistoryList()
      setHistoryList(history)
      console.log(`✅ Loaded ${history.length} history records`)
    } catch (error) {
      console.error('Error loading history:', error)
      setHistoryList([])
    }
  }

  const handleSaveToHistory = async () => {
    console.log('💾 履歴保存ボタンがクリックされました')

    confirmAction({
      title: '履歴として保存',
      message: '現在の報告内容を今週の履歴として保存しますか？保存後、全メンバーの報告内容が空になります。',
      confirmLabel: '保存する（埋め込み付き）',
      variant: 'primary',
      onConfirm: async () => {
        console.log('✅ 確認ボタンが押されました - 保存処理を開始します')
        try {
          console.log('📢 トースト表示: 保存中...')
          showToast('info', '保存中...埋め込み生成には時間がかかります')

          console.log('📤 saveReportsToHistory を呼び出し中...')
          const weekId = await saveReportsToHistory(undefined, true) // 埋め込み生成を有効化

          console.log('✅ 保存完了:', weekId)
          
          // 全メンバーの報告内容を空にする
          console.log('🧹 報告内容をクリア中...')
          const clearedReports = reports.map(report => ({
            ...report,
            currentTrial: '',
            progress: '',
            result: '',
            teaser: ''
          }))
          
          await saveReports(clearedReports)
          setReports(clearedReports)
          setOriginalReports(JSON.parse(JSON.stringify(clearedReports)))
          console.log('✅ 報告内容クリア完了')
          
          console.log('📢 トースト表示: 保存完了')
          showToast('success', `週次報告を履歴として保存しました（${weekId}）`)

          console.log('🔄 履歴リストを再読み込み中...')
          await loadHistoryList() // 履歴リストを再読み込み
          console.log('✅ 履歴リスト再読み込み完了')
        } catch (error) {
          console.error('❌ Error saving to history:', error)
          console.log('📢 トースト表示: エラー')
          showToast('error', '履歴保存に失敗しました')
        }
      },
      onCancel: () => {
        console.log('❌ キャンセルボタンが押されました')
      }
    })
  }

  // 詳細表示モーダルを開く
  const openReportDetail = (reportId: string) => {
    setSelectedReportId(reportId)
    setIsModalEditing(false) // 開く時は閲覧モード
  }

  // 詳細表示モーダルを閉じる
  const closeReportDetail = () => {
    setSelectedReportId(null)
    setIsModalEditing(false)
  }

  // モーダル内で編集モードに切り替え
  const startModalEditing = () => {
    setIsModalEditing(true)
  }

  // モーダル内で保存（編集モード終了）
  const saveModalEdit = async () => {
    const startTime = Date.now()
    setShowSpinner(true)
    
    try {
      // UI表示用に仮teaserを設定
      const reportsWithTempTeasers = reports.map((currentReport) => {
        const originalReport = originalReports.find(r => r.id === currentReport.id)
        const isNew = !originalReport
        const isChanged = originalReport && (
          originalReport.currentTrial !== currentReport.currentTrial ||
          originalReport.progress !== currentReport.progress ||
          originalReport.result !== currentReport.result
        )
        
        if ((isNew || isChanged) && 
            (currentReport.currentTrial || currentReport.progress || currentReport.result)) {
          return { ...currentReport, teaser: '魅力的な見出しを作成中...' }
        }
        return currentReport
      })
      
      // Firestore保存用に仮teaserを除外
      const reportsToSave = reportsWithTempTeasers.map((report) => {
        if (report.teaser === '魅力的な見出しを作成中...') {
          const { teaser, ...rest } = report
          return rest // teaserを除外
        }
        return report
      })
      
      // Firestoreに保存（仮teaserなし）
      await saveReports(reportsToSave)
      
      // 最低0.1秒はスピナーを表示
      const elapsed = Date.now() - startTime
      if (elapsed < 100) {
        await new Promise(resolve => setTimeout(resolve, 100 - elapsed))
      }
      
      // UI上では仮teaserを表示
      setReports(reportsWithTempTeasers)
      setOriginalReports(JSON.parse(JSON.stringify(reportsToSave))) // Firestoreの状態と一致させる
      setHasUnsavedChanges(false)
      showToast('success', '経過報告を保存しました')
      
      // モーダルを閉じる
      setIsModalEditing(false)
      closeReportDetail()
      
      // バックグラウンドでteaser生成
      generateTeasersInBackground(reportsWithTempTeasers, originalReports)
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    } finally {
      setShowSpinner(false)
    }
  }

  // カード長押し開始
  const handleLongPressStart = (reportId: string) => {
    // 履歴表示中は長押し削除を無効化
    if (viewMode === 'history') return
    
    const timer = setTimeout(() => {
      handleLongPressDelete(reportId)
    }, 800) // 800ms長押しで削除確認
    setLongPressTimer(timer)
  }

  // カード長押し終了
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // 長押しによる削除確認
  const handleLongPressDelete = (reportId: string) => {
    const target = reports.find((r) => r.id === reportId)
    const label = target?.nickname ? `「${target.nickname}」` : 'この'

    confirmAction({
      title: '削除しますか？',
      message: `${label} の経過報告を削除しますか？`,
      confirmLabel: '削除する',
      cancelLabel: 'キャンセル',
      variant: 'danger',
      onConfirm: () => {
        // 1段階目のダイアログが閉じるまで少し待つ
        setTimeout(() => {
          // 2段階目の確認
          confirmAction({
            title: '本当に削除しますか？',
            message: `このメンバー情報が削除されますが本当に削除しますか？`,
            confirmLabel: '削除',
            cancelLabel: 'キャンセル',
            variant: 'danger',
            onConfirm: () => {
              setReports((prev) => {
                const newReports = prev.filter((r) => r.id !== reportId)
                setHasUnsavedChanges(true)
                showToast('info', '報告を削除しました（保存して確定してください）')
                return newReports
              })
            }
          })
        }, 100) // 100ms遅延
      }
    })
  }

  const handleRAGSearch = async () => {
    console.log('🔍 RAG検索開始', { query: ragQuery })

    if (!ragQuery.trim()) {
      console.log('❌ 質問が空です')
      showToast('error', '質問を入力してください')
      return
    }

    setRagSearching(true)
    setRagAnswer('')
    console.log('⏳ 検索状態を開始に設定')

    try {
      // 全履歴から埋め込みを取得
      console.log('📦 埋め込みデータを取得中...')
      const allEmbeddings = await getAllEmbeddings()
      console.log('📦 取得した埋め込み数:', allEmbeddings.length)

      if (allEmbeddings.length === 0) {
        console.log('❌ 埋め込みデータがありません')
        showToast('error', 'RAG検索用のデータがありません。履歴を保存する際に埋め込みを生成してください。')
        setRagSearching(false)
        return
      }

      showToast('info', `${allEmbeddings.length}件の報告から検索中...`)

      // 類似文書を検索
      console.log('🔎 類似文書を検索中...')
      const similarDocs = await searchSimilarTexts(ragQuery, allEmbeddings, 5)
      console.log('🔎 類似文書:', similarDocs.length, '件')

      // RAGで回答を生成
      console.log('🤖 AI回答を生成中...')
      const answer = await answerWithRAG(ragQuery, similarDocs)
      console.log('✅ AI回答生成完了:', answer.substring(0, 50) + '...')

      setRagAnswer(answer)
      showToast('success', '回答を生成しました')
    } catch (error) {
      console.error('❌ RAG検索エラー:', error)
      showToast('error', `RAG検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setRagSearching(false)
      console.log('✅ 検索処理完了')
    }
  }

  const handleViewHistory = async (weekId: string) => {
    if (weekId === 'current') {
      setViewMode('current')
      setSelectedHistory('current')
      await loadReports()
    } else {
      setLoading(true)
      try {
        const history = await getReportsHistory(weekId)
        if (history) {
          setReports(history.reports)
          setSelectedHistory(weekId)
          setViewMode('history')
          showToast('info', `${weekId} の履歴を表示中`)
        } else {
          showToast('error', '履歴が見つかりませんでした')
        }
      } catch (error) {
        console.error('Error loading history:', error)
        showToast('error', '履歴の読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSave = async () => {
    const startTime = Date.now()
    setShowSpinner(true)
    
    try {
      // UI表示用に仮teaserを設定
      const reportsWithTempTeasers = reports.map((currentReport) => {
        const originalReport = originalReports.find(r => r.id === currentReport.id)
        const isNew = !originalReport
        const isChanged = originalReport && (
          originalReport.currentTrial !== currentReport.currentTrial ||
          originalReport.progress !== currentReport.progress ||
          originalReport.result !== currentReport.result
        )
        
        if ((isNew || isChanged) && 
            (currentReport.currentTrial || currentReport.progress || currentReport.result)) {
          return { ...currentReport, teaser: '魅力的な見出しを作成中...' }
        }
        return currentReport
      })
      
      // Firestore保存用に仮teaserを除外
      const reportsToSave = reportsWithTempTeasers.map((report) => {
        if (report.teaser === '魅力的な見出しを作成中...') {
          const { teaser, ...rest } = report
          return rest // teaserを除外
        }
        return report
      })
      
      // Firestoreに保存（仮teaserなし）
      await saveReports(reportsToSave)
      
      // 最低0.1秒はスピナーを表示
      const elapsed = Date.now() - startTime
      if (elapsed < 100) {
        await new Promise(resolve => setTimeout(resolve, 100 - elapsed))
      }
      
      // UI上では仮teaserを表示
      setReports(reportsWithTempTeasers)
      setOriginalReports(JSON.parse(JSON.stringify(reportsToSave))) // Firestoreの状態と一致させる
      setHasUnsavedChanges(false)
      showToast('success', '経過報告を保存しました')
      
      // バックグラウンドでteaser生成
      generateTeasersInBackground(reportsWithTempTeasers, originalReports)
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    } finally {
      setShowSpinner(false)
    }
  }

  const handleSaveAndExit = async () => {
    const startTime = Date.now()
    setShowSpinner(true)
    
    try {
      // UI表示用に仮teaserを設定
      const reportsWithTempTeasers = reports.map((currentReport) => {
        const originalReport = originalReports.find(r => r.id === currentReport.id)
        const isNew = !originalReport
        const isChanged = originalReport && (
          originalReport.currentTrial !== currentReport.currentTrial ||
          originalReport.progress !== currentReport.progress ||
          originalReport.result !== currentReport.result
        )
        
        if ((isNew || isChanged) && 
            (currentReport.currentTrial || currentReport.progress || currentReport.result)) {
          return { ...currentReport, teaser: '魅力的な見出しを作成中...' }
        }
        return currentReport
      })
      
      // Firestore保存用に仮teaserを除外
      const reportsToSave = reportsWithTempTeasers.map((report) => {
        if (report.teaser === '魅力的な見出しを作成中...') {
          const { teaser, ...rest } = report
          return rest // teaserを除外
        }
        return report
      })
      
      // Firestoreに保存（仮teaserなし）
      await saveReports(reportsToSave)
      
      // 最低0.1秒はスピナーを表示
      const elapsed = Date.now() - startTime
      if (elapsed < 100) {
        await new Promise(resolve => setTimeout(resolve, 100 - elapsed))
      }
      
      // UI上では仮teaserを表示
      setReports(reportsWithTempTeasers)
      setOriginalReports(JSON.parse(JSON.stringify(reportsToSave))) // Firestoreの状態と一致させる
      setHasUnsavedChanges(false)
      showToast('success', '経過報告を保存して編集モードを終了しました')
      disableEditMode()
      
      // バックグラウンドでteaser生成
      generateTeasersInBackground(reportsWithTempTeasers, originalReports)
    } catch (error) {
      console.error('Error saving:', error)
      showToast('error', '保存に失敗しました')
    } finally {
      setShowSpinner(false)
    }
  }

  // バックグラウンドでteaserを生成する関数
  const generateTeasersInBackground = async (
    current: Report[],
    original: Report[]
  ) => {
    // 変更されたレポートを特定
    const changedReports = current.filter((currentReport) => {
      const originalReport = original.find(r => r.id === currentReport.id)
      const isNew = !originalReport
      const isChanged = originalReport && (
        originalReport.currentTrial !== currentReport.currentTrial ||
        originalReport.progress !== currentReport.progress ||
        originalReport.result !== currentReport.result
      )
      return (isNew || isChanged) && 
             (currentReport.currentTrial || currentReport.progress || currentReport.result)
    })

    if (changedReports.length === 0) {
      return
    }

    console.log(`🤖 バックグラウンドでteaser生成開始: ${changedReports.length}件`)

    // 各レポートのteaserを順次生成
    for (const report of changedReports) {
      try {
        console.log(`🤖 teaser生成中: ${report.nickname || '新規'}`)
        const teaser = await generateReportTeaser(report)
        console.log(`✅ teaser生成完了: ${teaser}`)
        
        // Firestoreを更新
        const updatedReport = { ...report, teaser }
        await saveReports(current.map(r => r.id === report.id ? updatedReport : r))
        
        // UIをリアルタイムで更新
        setReports(prev => prev.map(r => r.id === report.id ? updatedReport : r))
        setOriginalReports(prev => prev.map(r => r.id === report.id ? updatedReport : r))
      } catch (error) {
        console.error('teaser生成エラー:', error)
        // エラー時はフォールバックteaserを使用
        const fallbackTeaser = (report.currentTrial || report.progress || report.result || '').substring(0, 30) + '...'
        const fallbackReport = { ...report, teaser: fallbackTeaser }
        await saveReports(current.map(r => r.id === report.id ? fallbackReport : r))
        setReports(prev => prev.map(r => r.id === report.id ? fallbackReport : r))
        setOriginalReports(prev => prev.map(r => r.id === report.id ? fallbackReport : r))
      }
    }

    console.log(`✅ 全てのteaser生成完了`)
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

    setReports((prev) => {
      const newReports = [...prev, newReport]
      // 新しく追加されたメンバーを表示（配列の最後のインデックス）
      setCurrentReportIndex(newReports.length - 1)
      return newReports
    })
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
        const deletedIndex = currentReportIndex
        
        setReports((prev) => {
          const newReports = prev.filter((r) => r.id !== id)
          
          // 削除後のインデックスを調整
          if (newReports.length === 0) {
            // 全て削除された場合
            setCurrentReportIndex(0)
          } else if (deletedIndex === 0) {
            // 一番左（最初）の人が削除された場合は、そのまま0（右隣）を表示
            setCurrentReportIndex(0)
          } else {
            // それ以外の場合は、左の人（deletedIndex - 1）を表示
            setCurrentReportIndex(deletedIndex - 1)
          }
          
          return newReports
        })
        
        setHasUnsavedChanges(true)
        showToast('info', '報告を削除リストに追加しました（保存して確定してください）')
      }
    })
  }

  const handleVoiceInput = async (reportId: string, transcript: string) => {
    setProcessingVoice(reportId)

    try {
      showToast('info', 'AIで要約中...しばらくお待ちください')

      const summary = await summarizeReportWithAI(transcript)

      // 報告内容を更新
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
              ...r,
              currentTrial: summary.currentTrial,
              progress: summary.progress,
              result: summary.result,
            }
            : r
        )
      )

      setHasUnsavedChanges(true)
      showToast('success', '音声入力を要約して反映しました！保存してください。')
    } catch (error) {
      console.error('音声入力エラー:', error)
      showToast('error', 'AI要約に失敗しました。再度お試しください。')
    } finally {
      setProcessingVoice(null)
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-center text-gray-600">読み込み中...</p>
      </div>
    )
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
    <>
      <HamburgerMenu onAddMember={handleAddReport} hideEditButton={true} />
      
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        {/* ヘッダー - コンパクト化 */}
        <header className="mb-4 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-primary mb-1">経過報告</h1>
        </header>

      {/* コントロールパネル - コンパクト化 */}
      <div className="mb-4 bg-white rounded-lg shadow-md p-3 sm:p-4">
        {/* 週選択 */}
        <div className="mb-3">
          <label htmlFor="history-select" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
            📅 週を選択
          </label>
          <select
            id="history-select"
            value={selectedHistory}
            onChange={(e) => handleViewHistory(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary"
          >
            <option value="current">📍 最新</option>
            {historyList.map((history) => (
              <option key={history.weekId} value={history.weekId}>
                📦 {history.weekId} ({new Date(history.savedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
              </option>
            ))}
          </select>
        </div>

        {/* ボタングループ - 横並び */}
        <div className="flex gap-2">
          {/* 履歴保存ボタン */}
          {viewMode === 'current' && isAuthenticated && (
            <button
              onClick={handleSaveToHistory}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              <span>💾アーカイブ</span>
            </button>
          )}

          {/* AI検索ボタン */}
          <button
            onClick={() => setShowRAGSearch(!showRAGSearch)}
            className={`${viewMode === 'current' && isAuthenticated ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm`}
          >
            <span>🤖</span>
            <span>{showRAGSearch ? '閉じる' : 'AI検索'}</span>
          </button>
        </div>

        {/* 履歴表示中の警告 - コンパクト化 */}
        {viewMode === 'history' && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs sm:text-sm text-yellow-800">
            ⚠️ 過去の履歴（読み取り専用）
          </div>
        )}
      </div>

      {/* AI検索パネル - コンパクト化 */}
      {showRAGSearch && (
        <div className="mb-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-purple-200">
          <h2 className="text-lg sm:text-xl font-bold text-purple-700 mb-2 sm:mb-3">🔍 AI検索</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            過去の報告から関連情報を検索
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                質問を入力
              </label>
              <textarea
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="例: Next.jsについて誰が報告？"
                className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 min-h-[70px] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={ragSearching}
              />
            </div>

            <button
              onClick={() => {
                console.log('🖱️ 検索ボタンがクリックされました')
                handleRAGSearch()
              }}
              disabled={ragSearching || !ragQuery.trim()}
              className="w-full bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ragSearching ? '🔄 検索中...' : '🚀 検索する'}
            </button>

            {ragAnswer && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">💡 AI回答</h3>
                <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{ragAnswer}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* カードリスト表示 */}
      <div className="space-y-3">
        {reports.map((report) => (
          <div 
            key={report.id} 
            onClick={() => {
              openReportDetail(report.id)
            }}
            onTouchStart={() => handleLongPressStart(report.id)}
            onTouchEnd={handleLongPressEnd}
            onMouseDown={() => handleLongPressStart(report.id)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            className="relative bg-white rounded-lg shadow-md p-4 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02]"
          >
            
            {/* 一覧表示：名前 + ティーザー */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-orange-primary flex-shrink-0">
                {report.nickname || '名前未設定'}
              </h2>
              <p className="text-gray-600 text-sm flex-1">
                {report.teaser || 'まだ報告がありません'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 詳細表示モーダル */}
      {selectedReportId && (() => {
        const selectedReport = reports.find(r => r.id === selectedReportId)
        if (!selectedReport) return null

        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeReportDetail}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                {/* タイトル */}
                {isModalEditing ? (
                  <input
                    type="text"
                    value={selectedReport.nickname}
                    onChange={(e) => handleUpdateReport(selectedReport.id, 'nickname', e.target.value)}
                    className="w-full text-xl font-bold text-orange-primary bg-transparent border-none outline-none focus:outline-none"
                    placeholder="メンバー名を入力"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-orange-primary">
                    {selectedReport.nickname || '名前未設定'}
                  </h2>
                )}
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* 編集モード時の音声入力 */}
                {isModalEditing && (
                  <div>
                    <VoiceRecorder
                      onTranscriptComplete={(transcript) => handleVoiceInput(selectedReport.id, transcript)}
                      buttonText={processingVoice === selectedReport.id ? 'AI要約中...' : '🎤 音声で報告を入力'}
                      className={processingVoice === selectedReport.id ? 'opacity-50 pointer-events-none' : ''}
                    />
                  </div>
                )}

                {/* 今試していること */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-base">今試していること</h3>
                  {isModalEditing ? (
                    <textarea
                      value={selectedReport.currentTrial}
                      onChange={(e) => handleUpdateReport(selectedReport.id, 'currentTrial', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 min-h-[100px] text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary"
                      placeholder="現在試している内容を入力してください"
                    />
                  ) : (
                    <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">
                      {selectedReport.currentTrial || 'まだ入力されていません'}
                    </p>
                  )}
                </div>

                {/* 経過報告 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-base">経過報告</h3>
                  {isModalEditing ? (
                    <textarea
                      value={selectedReport.progress}
                      onChange={(e) => handleUpdateReport(selectedReport.id, 'progress', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary"
                      placeholder="経過を入力してください"
                    />
                  ) : (
                    <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">
                      {selectedReport.progress || 'まだ入力されていません'}
                    </p>
                  )}
                </div>

                {/* 結果報告・考察 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-base">結果報告・考察</h3>
                  {isModalEditing ? (
                    <textarea
                      value={selectedReport.result}
                      onChange={(e) => handleUpdateReport(selectedReport.id, 'result', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary"
                      placeholder="結果や考察を入力してください"
                    />
                  ) : (
                    <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">
                      {selectedReport.result || 'まだ入力されていません'}
                    </p>
                  )}
                </div>
              </div>

              {/* ボタン（下部に移動） */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <button
                    onClick={isModalEditing ? saveModalEdit : closeReportDetail}
                    className="flex-[3] bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    {isModalEditing ? '保存' : '閉じる'}
                  </button>
                  {!isModalEditing && isAuthenticated && viewMode === 'current' && (
                    <button
                      onClick={startModalEditing}
                      className="flex-1 bg-orange-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                    >
                      編集
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 保存時のスピナー */}
      {showSpinner && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-primary"></div>
        </div>
      )}

      </div>
    </>
  )
}
