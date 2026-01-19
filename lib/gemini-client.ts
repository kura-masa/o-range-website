// クライアントサイドからGemini API Routeを呼ぶためのヘルパー関数
import type { Report } from '@/lib/data'
import type { ReportSummary } from '@/lib/gemini'

/**
 * 音声テキストをGemini AIで要約し、報告フォーマットに変換
 */
export async function summarizeReportWithAI(transcript: string): Promise<ReportSummary> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'summarizeReport', transcript })
  })

  if (!response.ok) {
    throw new Error('Failed to summarize report')
  }

  const data = await response.json()
  return data.summary
}

/**
 * レポートから魅力的なティーザーを生成
 */
export async function generateReportTeaser(report: Report): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generateReportTeaser', report })
  })

  if (!response.ok) {
    throw new Error('Failed to generate teaser')
  }

  const data = await response.json()
  return data.teaser
}

/**
 * アイデアから魅力的なタイトルを生成
 */
export async function generateIdeaTitle(content: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generateIdeaTitle', content })
  })

  if (!response.ok) {
    throw new Error('Failed to generate title')
  }

  const data = await response.json()
  return data.title
}

/**
 * 類似テキストを検索
 */
export async function searchSimilarTexts(
  query: string,
  embeddings: Array<{ text: string; embedding: number[] }>,
  topK: number = 5
): Promise<Array<{ text: string; similarity: number }>> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'searchSimilarTexts', query, embeddings, topK })
  })

  if (!response.ok) {
    throw new Error('Failed to search similar texts')
  }

  const data = await response.json()
  return data.results
}

/**
 * RAGで質問に答える
 */
export async function answerWithRAG(
  question: string,
  similarTexts: Array<{ text: string; similarity: number }>
): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'answerWithRAG', question, similarTexts })
  })

  if (!response.ok) {
    throw new Error('Failed to answer question')
  }

  const data = await response.json()
  return data.answer
}
