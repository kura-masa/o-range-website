// プロフィールセクションのカテゴリ一覧
export const SECTION_CATEGORIES = ['趣味', '展望', '経歴', '制作物', 'やってみたいこと', '思い', '考え'] as const
export type SectionCategory = typeof SECTION_CATEGORIES[number]

export interface ProfileSection {
  category: SectionCategory
  content: string
}

export interface Member {
  id: string
  name: string
  nickname: string
  tagline: string
  imageNo1?: string
  imageNo2?: string
  imageNo1Position?: string // 画像中心位置 例: "50% 30%"
  imageNo2Position?: string // 画像中心位置 例: "50% 30%"
  imageNo1Scale?: number    // ズーム倍率 例: 1.5
  imageNo2Scale?: number    // ズーム倍率 例: 1.5
  birthDate?: string
  hometown?: string
  hobbies?: string
  sections?: ProfileSection[] // 選択式プロフィールセクション
  // 旧フィールド（互換性のため残存）
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
