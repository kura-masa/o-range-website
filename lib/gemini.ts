// Google Gemini API を使った音声テキストの要約と構造化

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ReportSummary {
  currentTrial: string
  progress: string
  result: string
}

/**
 * 音声テキストをGemini AIで要約し、報告フォーマットに変換
 */
export async function summarizeReportWithAI(
  transcript: string,
  apiKey: string
): Promise<ReportSummary> {
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `
あなたは週次報告会の議事録作成アシスタントです。
以下の音声テキストは、メンバーが今週の活動を口頭で報告したものです。
これを以下の3つの項目に分けて、簡潔にまとめてください。

【音声テキスト】
${transcript}

【出力形式】
以下のJSON形式で出力してください。他の文章は含めないでください。

{
  "currentTrial": "今試していること（現在取り組んでいる課題や試行）",
  "progress": "経過報告（今週やったこと、進捗状況）",
  "result": "結果報告・考察（得られた結果、気づき、次のアクション）"
}

【ポイント】
- 各項目は2〜4文程度で簡潔にまとめる
- 具体的な数字や固有名詞はできるだけ残す
- 「です・ます」調で統一
- 情報が不足している項目は「今週の報告なし」とする
`.trim()

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // JSONを抽出（マークダウンのコードブロックに囲まれている可能性がある）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI応答からJSON形式を抽出できませんでした')
    }

    const summary: ReportSummary = JSON.parse(jsonMatch[0])

    // 空の項目をデフォルト値で埋める
    return {
      currentTrial: summary.currentTrial || '今週の報告なし',
      progress: summary.progress || '今週の報告なし',
      result: summary.result || '今週の報告なし',
    }
  } catch (error) {
    console.error('Gemini API エラー:', error)
    throw new Error('AI要約に失敗しました。再度お試しください。')
  }
}

/**
 * 経過報告から見たくなるような書き出し（ティーザー）を生成
 * @param report - 経過報告のオブジェクト
 * @param apiKey - Gemini APIキー
 * @returns 10文字程度の魅力的な書き出し
 */
export async function generateReportTeaser(
  report: { currentTrial: string; progress: string; result: string },
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `
あなたは本の帯や背表紙を書くプロのコピーライターです。
以下の経過報告から、「なんだろう！読みたい！」と思わせる魅力的な書き出しを生成してください。

【経過報告】
今試していること: ${report.currentTrial}
経過報告: ${report.progress}
結果報告・考察: ${report.result}

【出力ルール】
- 必ず18文字以上20文字以内の短い文章を生成
- 20文字に近づけることを最優先（19文字または20文字を目指す）
- 18文字や19文字の場合は、できるだけ20文字に近づけるよう調整
- 本の帯のように、好奇心を刺激する言い回し
- 意外性や成果を感じさせる表現
- 具体的な技術名やキーワードを含める
- 「！」や「？」などの記号は使わない
- 文章だけを出力（説明や前置きは不要）

良い例:
- "Next.js、ついに解決"
- "UIが劇的に進化した日"
- "Firebase、こう使えば"
- "3日で完成させた秘訣"
- "エラーが教えてくれたこと"
- "デザイン、振り出しから"

悪い例:
- "Next.jsを勉強中" （平凡）
- "プログラミングしました" （抽象的）
- "頑張りました" （具体性なし）
`.trim()

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let teaser = response.text().trim()

    // 余計な文字を削除（引用符、改行など）
    teaser = teaser.replace(/^["'「『]|["'」』]$/g, '').replace(/\n/g, '').trim()

    // 20文字を超える場合は切り詰める
    if (teaser.length > 20) {
      teaser = teaser.substring(0, 20)
    }

    // 最後に「...」を追加
    return teaser ? `${teaser}...` : '報告あり...'
  } catch (error) {
    console.error('ティーザー生成エラー:', error)
    return '報告あり...' // エラー時はデフォルト値
  }
}

/**
 * APIキーの検証
 */
export function validateGeminiApiKey(apiKey: string): boolean {
  return apiKey.startsWith('AIza') && apiKey.length > 30
}

// ========================================
// RAG機能：埋め込み生成と検索
// ========================================

export interface EmbeddingResult {
  text: string
  embedding: number[]
}

/**
 * テキストから埋め込みベクトルを生成
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

  try {
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error) {
    console.error('埋め込み生成エラー:', error)
    throw new Error('埋め込み生成に失敗しました')
  }
}

/**
 * コサイン類似度を計算
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('ベクトルの長さが一致しません')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 複数のテキストから関連度の高いものを検索
 */
export async function searchSimilarTexts(
  query: string,
  documents: EmbeddingResult[],
  apiKey: string,
  topK: number = 5
): Promise<Array<{ text: string; score: number }>> {
  // クエリの埋め込みを生成
  const queryEmbedding = await generateEmbedding(query, apiKey)

  // 各ドキュメントとの類似度を計算
  const similarities = documents.map((doc) => ({
    text: doc.text,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }))

  // スコア降順でソートして上位K件を返す
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * RAGを使って質問に回答
 */
export async function answerWithRAG(
  question: string,
  relevantDocs: Array<{ text: string; score: number }>,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // 関連文書をコンテキストとして整形
  const context = relevantDocs
    .map((doc, i) => `[文書${i + 1}] (関連度: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
    .join('\n\n')

  const prompt = `
あなたは過去の週次報告を検索して回答するアシスタントです。
以下の関連文書を参考に、質問に答えてください。

【関連する過去の報告】
${context}

【質問】
${question}

【回答ルール】
- 上記の関連文書の内容に基づいて回答してください
- 具体的な週やメンバー名を含めて回答してください
- 関連文書に情報がない場合は「該当する報告が見つかりませんでした」と回答してください
- 簡潔で分かりやすい日本語で回答してください
`.trim()

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('RAG回答生成エラー:', error)
    throw new Error('回答生成に失敗しました')
  }
}

/**
 * アイデアの内容からタイトルを生成
 */
export async function generateIdeaTitle(content: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    console.warn('⚠️ Gemini API not configured. Using fallback title.')
    return content.substring(0, 30) + (content.length > 30 ? '...' : '')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `以下のアイデアの内容から、簡潔で魅力的なタイトルを生成してください。
タイトルは15文字以内で、アイデアの核心を表現してください。
タイトルのみを出力し、他の説明は不要です。

【アイデアの内容】
${content}

【タイトル】`

    const result = await model.generateContent(prompt)
    const title = result.response.text().trim()

    // タイトルが長すぎる場合は切り詰める
    if (title.length > 30) {
      return title.substring(0, 30)
    }

    return title
  } catch (error) {
    console.error('❌ Error generating idea title:', error)
    // エラー時はフォールバック
    return content.substring(0, 30) + (content.length > 30 ? '...' : '')
  }
}
