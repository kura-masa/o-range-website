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
}

// 初期データ
const initialMembers: Member[] = [
  {
    id: 'kawamura',
    name: '河村航希',
    nickname: 'こう',
    tagline: '挑戦し続けることで、新しい可能性を切り開いていきます~~~~',
    imageNo1: undefined, // 準備中
    imageNo2: undefined,
    birthDate: '1995年4月15日',
    hometown: '東京都',
    hobbies: '読書、プログラミング',
    thoughts: '常に学び続け、技術を通じて社会に貢献したいと考えています。新しいことにチャレンジすることが大好きで、失敗を恐れずに前進し続けることを信条としています。',
    career: '大学でコンピュータサイエンスを専攻後、IT企業でエンジニアとして3年間勤務。現在はO-rangeの活動を通じて、新しい価値創造に取り組んでいます。\n\n今後は、テクノロジーとビジネスの架け橋となり、革新的なサービスを生み出していきたいと考えています。'
  },
  {
    id: 'kuranaga',
    name: '倉永将宏',
    nickname: 'マサ',
    tagline: '創造力と実行力で、アイデアを形にしていきます',
    imageNo1: '/倉永将宏(マサ)No.1.JPG',
    imageNo2: undefined, // 準備中
    birthDate: '1993年7月22日',
    hometown: '福岡県',
    hobbies: 'デザイン、写真撮影',
    thoughts: 'ビジュアルコミュニケーションの力を信じています。デザインを通じて、人々の心に響くメッセージを届けることが私の使命です。',
    career: '美術大学でグラフィックデザインを学び、広告代理店でデザイナーとして5年間活動。O-rangeではクリエイティブディレクターとして、ブランディングやビジュアル戦略を担当しています。\n\n今後は、デザインの力で社会課題の解決に貢献し、より良い未来を創造していきたいと思っています。'
  },
  {
    id: 'member3',
    name: '準備中',
    nickname: '準備中',
    tagline: '準備中です',
    imageNo1: undefined,
    imageNo2: undefined,
    birthDate: undefined,
    hometown: undefined,
    hobbies: undefined,
    thoughts: undefined,
    career: undefined,
  },
  {
    id: 'member4',
    name: '準備中',
    nickname: '準備中',
    tagline: '準備中です',
    imageNo1: undefined,
    imageNo2: undefined,
    birthDate: undefined,
    hometown: undefined,
    hobbies: undefined,
    thoughts: undefined,
    career: undefined,
  }
]

const initialReports: Report[] = [
  {
    id: 'report-kou',
    nickname: 'こう',
    currentTrial: 'Next.jsを使用した新しいWebアプリケーションの開発に挑戦しています。',
    progress: 'プロトタイプの実装が完了し、現在ユーザーテストを実施中です。フィードバックをもとに改善を進めています。',
    result: '初期テストでは好評で、特にUIの使いやすさが高く評価されました。次のステップとして、パフォーマンスの最適化に取り組む予定です。'
  },
  {
    id: 'report-masa',
    nickname: 'マサ',
    currentTrial: '新しいブランドアイデンティティのデザインシステムを構築しています。',
    progress: 'カラーパレットとタイポグラフィの選定が完了。現在、コンポーネントライブラリの作成を進めています。',
    result: 'クライアントからの反応は上々で、モダンでありながら親しみやすいデザインが評価されています。今後は実装ガイドラインの整備を行います。'
  }
]

// データ取得関数
export async function getMembersList(): Promise<Member[]> {
  // 初回はローカルストレージから、次回以降はFirestoreから
  const stored = localStorage.getItem('members')
  if (stored) {
    return JSON.parse(stored)
  }
  // 初期データを返す（Firestore未設定時）
  return initialMembers
}

export async function getMemberById(id: string): Promise<Member | null> {
  const stored = localStorage.getItem(`member_${id}`)
  if (stored) {
    return JSON.parse(stored)
  }
  
  const members = await getMembersList()
  return members.find(m => m.id === id) || null
}

export async function getReportsList(): Promise<Report[]> {
  const stored = localStorage.getItem('reports')
  if (stored) {
    return JSON.parse(stored)
  }
  return initialReports
}

// 初期データを取得（Firebase初期化用）
export function getInitialMembers(): Member[] {
  return initialMembers
}

export function getInitialReports(): Report[] {
  return initialReports
}
