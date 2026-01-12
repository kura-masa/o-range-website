'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onTranscriptComplete: (transcript: string) => void
  buttonText?: string
  className?: string
}

export default function VoiceRecorder({
  onTranscriptComplete,
  buttonText = '音声で報告',
  className = '',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Web Speech APIのサポート確認
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        setIsSupported(false)
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'ja-JP'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + ' '
          } else {
            interimTranscript += transcriptPart
          }
        }

        setTranscript((prev) => prev + finalTranscript)
      }

      recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscript('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      if (transcript) {
        onTranscriptComplete(transcript)
      }
    }
  }

  const handleCancel = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      setTranscript('')
    }
  }

  if (!isSupported) {
    return (
      <div className={`text-center p-4 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-600 text-sm">
          お使いのブラウザは音声認識に対応していません。
          <br />
          Chrome、Edge、Safariをご利用ください。
        </p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
          {buttonText}
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-500">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-bold">録音中...</span>
            </div>
          </div>

          {transcript && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{transcript}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={stopRecording}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              完了してAI要約
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-lg transition-all"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
