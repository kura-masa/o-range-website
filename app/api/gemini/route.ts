import { NextRequest, NextResponse } from 'next/server'
import { 
  summarizeReportWithAI, 
  generateReportTeaser, 
  generateIdeaTitle,
  searchSimilarTexts,
  answerWithRAG
} from '@/lib/gemini'
import type { Report } from '@/lib/data'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'summarizeReport': {
        const { transcript } = params
        const summary = await summarizeReportWithAI(transcript, apiKey)
        return NextResponse.json({ summary })
      }

      case 'generateReportTeaser': {
        const { report } = params as { report: Report }
        const teaser = await generateReportTeaser(report, apiKey)
        return NextResponse.json({ teaser })
      }

      case 'generateIdeaTitle': {
        const { content } = params
        const title = await generateIdeaTitle(content, apiKey)
        return NextResponse.json({ title })
      }

      case 'searchSimilarTexts': {
        const { query, embeddings, topK } = params
        const results = await searchSimilarTexts(query, embeddings, apiKey, topK)
        return NextResponse.json({ results })
      }

      case 'answerWithRAG': {
        const { question, similarTexts } = params
        const answer = await answerWithRAG(question, similarTexts, apiKey)
        return NextResponse.json({ answer })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
