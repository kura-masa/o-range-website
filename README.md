# O-range Website MVP

スマートフォン特化のメンバー紹介と経過報告のWebサイト

## 機能

- **メンバー一覧**: チームメンバーの紹介
- **プロフィール詳細**: 各メンバーの詳細情報
- **経過報告**: メンバー限定の進捗共有（要ログイン）
- **管理機能**: インライン編集でコンテンツを更新

## 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Firebase (予定)

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

## ログイン

管理者機能を使用するには、以下のIDでログインできます：

- `admin`
- `orange-admin`
- `o-range`

## ディレクトリ構成

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # メンバー一覧画面
│   ├── member/[id]/       # メンバー詳細画面
│   └── reports/           # 経過報告画面
├── components/            # Reactコンポーネント
├── contexts/              # React Context（認証など）
├── lib/                   # ユーティリティとデータ
└── public/                # 静的ファイル
```

## Firebase連携

このプロジェクトはFirebase（Firestore + Storage）と連携できます。

### セットアップ方法

詳細な手順は **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** を参照してください。

**クイックスタート:**

1. Firebase Consoleでプロジェクトを作成
2. Firestore DatabaseとStorageを有効化
3. `.env.local`に設定を追加
4. 初期データを投入: `npx ts-node scripts/init-firebase.ts`

### Firebase未設定の場合

Firebase設定がない場合、自動的にローカルストレージにフォールバックします。

## デプロイ

このプロジェクトは **Firebase Hosting（静的サイト）** として構成されています。

### クイックデプロイ

```bash
# ビルド & デプロイを一度に実行
npm run deploy
```

### 詳細な手順

詳しいデプロイ手順は **[DEPLOY.md](./DEPLOY.md)** を参照してください。

```bash
# 1. Firebase プロジェクトIDを設定（.firebaserc）
# 2. ビルド
npm run build

# 3. デプロイ
firebase deploy --only hosting
```

### 静的サイトの特徴

✅ **高速配信** - CDN経由で超高速  
✅ **低コスト** - サーバーレスで安価  
✅ **Firebase 連携** - Storage/Firestore が動作  
✅ **即時反映** - 画像アップロードやデータ編集が即座に反映
