# Firebase App Hosting デプロイガイド

このプロジェクトは **Firebase App Hosting（動的サイト・SSR対応）** 用に設定されています。

## 📋 前提条件

- Node.js がインストールされていること
- Firebase CLI がインストールされていること
- Firebase プロジェクトが作成されていること
- Firebase App Hosting が有効化されていること

## 🚀 デプロイ手順

### 1. Firebase CLI のインストール（初回のみ）

```bash
npm install -g firebase-tools
```

### 2. Firebase にログイン

```bash
firebase login
```

### 3. Firebase プロジェクトの設定

`.firebaserc` ファイルを編集して、あなたのプロジェクトIDを設定：

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 4. デプロイ

```bash
# Firebase App Hostingへデプロイ
firebase deploy
```

または、GitHubと連携している場合は、mainブランチにプッシュすることで自動デプロイされます。

## ⚙️ Firebase App Hosting の仕組み

### Next.js 設定（next.config.js）

- **SSR（Server-Side Rendering）対応** - 動的にページを生成
- **API Routes 使用可能** - サーバーサイド処理が実行できる
- **環境変数** - `apphosting.yaml` で管理

### 環境変数設定（apphosting.yaml）

本番環境の環境変数は `apphosting.yaml` で管理されています：

```yaml
env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: your-api-key
    availability:
      - BUILD
      - RUNTIME
  - variable: NEXT_PUBLIC_GEMINI_API_KEY
    value: your-gemini-api-key
    availability:
      - BUILD
      - RUNTIME
```

- `BUILD` - ビルド時に利用可能
- `RUNTIME` - 実行時に利用可能

## 🔥 Firebase との連携

### 動的サイトで利用可能な機能：

✅ **Server-Side Rendering (SSR)**
- ページごとに動的にHTMLを生成
- SEO対策に有利

✅ **API Routes**
- `/pages/api/*` でサーバーサイド処理を実行
- データベースアクセスやAPIキーの安全な管理が可能

✅ **画像アップロード（Firebase Storage）**
- ブラウザから直接 Firebase Storage にアップロード
- サーバーサイドでも処理可能

✅ **データ保存（Firestore）**
- ブラウザから直接 Firestore にデータを読み書き
- サーバーサイドでも処理可能
- リアルタイム更新が可能

✅ **AI機能（Gemini API）**
- 音声報告の自動要約
- ティーザー生成
- RAG検索機能

## 🧪 ローカルでのテスト

デプロイ前にローカルで確認：

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認できます。

本番環境と同じ動作を確認するには：

```bash
# 本番ビルド
npm run build

# 本番サーバーを起動
npm run start
```

## 📊 デプロイ後の確認

デプロイが完了すると、以下のような情報が表示されます：

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

Hosting URL にアクセスして、サイトが正しく動作しているか確認してください。

## 🛠️ トラブルシューティング

### ビルドエラーが発生する場合

1. 依存関係を再インストール：
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Next.js のキャッシュをクリア：
```bash
rm -rf .next
npm run build
```

### デプロイできない場合

1. Firebase CLI のバージョンを確認：
```bash
firebase --version
```

2. ログイン状態を確認：
```bash
firebase login --reauth
```

3. プロジェクトIDを確認：
```bash
firebase projects:list
```

### 環境変数が反映されない場合

1. `apphosting.yaml` の設定を確認
2. 再デプロイを実行
3. Firebase Console で環境変数の設定を確認

## 📝 静的サイトとの違い

| 項目 | 静的サイト (Hosting) | 動的サイト (App Hosting) |
|------|---------------------|------------------------|
| **レンダリング** | ビルド時に全ページ生成 | リクエスト時に動的生成 |
| **API Routes** | ❌ 使用不可 | ✅ 使用可能 |
| **SSR** | ❌ 使用不可 | ✅ 使用可能 |
| **環境変数** | ビルド時のみ | ビルド時＋実行時 |
| **サーバー** | 不要 | Node.jsサーバーが起動 |
| **コスト** | 低い | やや高い |

## 🔗 参考リンク

- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Storage Web](https://firebase.google.com/docs/storage/web/start)
- [Firebase Firestore Web](https://firebase.google.com/docs/firestore/quickstart)
- [Google Gemini API](https://ai.google.dev/docs)
