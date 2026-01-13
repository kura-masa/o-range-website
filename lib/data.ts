export interface Member {
  id: string
  name: string
  nickname: string
  tagline: string
  imageNo1?: string
  imageNo2?: string
  birthDate?: string
  hometown?: string
  hobbies?: string
  thoughts?: string
  career?: string
}

export interface Report {
  id: string
  nickname: string
  currentTrial: string
  progress: string
  result: string
  teaser?: string // AI生成の見たくなるような書き出し（10文字程度）
}

export interface ReportHistory {
  weekId: string // 例: "2026-W02"
  savedAt: string // ISO 8601 timestamp
  reports: Report[]
  embeddings?: ReportEmbedding[] // RAG用の埋め込みベクトル
}

export interface ReportEmbedding {
  reportId: string
  nickname: string
  text: string // 結合されたテキスト
  embedding: number[] // 埋め込みベクトル
}

export interface Idea {
  id: string
  memberId: string // メンバーID
  memberName: string // メンバー名
  ideaName: string // アイデア名
  content: string // 内容
  rejectionReason?: string // 却下理由（オプショナル）
  createdAt: string // 作成日時 ISO 8601 timestamp
  updatedAt: string // 更新日時 ISO 8601 timestamp
}

// ====================================================================
// 注意: 初期データは削除されました
// すべてのデータはFirestoreで管理されています
// メンバーの追加はランディングページの「メンバー追加」機能を使用してください
// ====================================================================
