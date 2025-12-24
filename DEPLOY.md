# Firebase Hosting デプロイガイド

このプロジェクトは **Firebase Hosting（静的サイト）** 用に設定されています。

## 📋 前提条件

- Node.js がインストールされていること
- Firebase CLI がインストールされていること
- Firebase プロジェクトが作成されていること

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

### 4. ビルド & デプロイ

```bash
# ビルドとデプロイを一度に実行
npm run deploy
```

または、個別に実行：

```bash
# ビルドのみ
npm run build

# デプロイのみ
firebase deploy --only hosting
```

## 📁 ビルド出力

- ビルドされたファイルは `out/` フォルダに生成されます
- Firebase Hosting は `out/` フォルダの内容を配信します

## ⚙️ 静的エクスポートの仕組み

### Next.js 設定（next.config.js）

- `output: 'export'` - 静的HTMLとしてエクスポート
- `images.unoptimized: true` - 画像最適化を無効化（静的サイトでは不要）
- `trailingSlash: true` - URL末尾のスラッシュを追加

### Firebase 設定（firebase.json）

- `public: "out"` - ビルド出力フォルダを指定
- `cleanUrls: true` - URLから `.html` を削除
- `trailingSlash: false` - URL末尾のスラッシュを削除

## 🔥 Firebase との連携

### 静的サイトでも以下の機能が動作します：

✅ **画像アップロード（Firebase Storage）**
- ブラウザから直接 Firebase Storage にアップロード
- サーバーサイド処理は不要

✅ **データ保存（Firestore）**
- ブラウザから直接 Firestore にデータを読み書き
- リアルタイム更新が可能

✅ **即時反映**
- ユーザーが編集した内容は即座に Firebase に保存される
- 他のユーザーがページを開くと最新データが表示される

### Firebase 設定（.env.local）

環境変数ファイル `.env.local` に Firebase の設定を記述：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 🧪 ローカルでのテスト

デプロイ前にローカルで確認：

```bash
# ビルド
npm run build

# Firebase Hosting エミュレータで確認
firebase serve
```

ブラウザで http://localhost:5000 を開いて確認できます。

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
rm -rf .next out
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

## 📝 注意事項

- **静的サイト** なので、Server Components や API Routes は使用できません
- すべてのページは **ビルド時に生成** されます
- 動的ルート（`/member/[id]`）のパスは `generateStaticParams` で事前に定義する必要があります
- Firebase Storage と Firestore はクライアントサイドで動的に動作します

## 🔗 参考リンク

- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase Storage Web](https://firebase.google.com/docs/storage/web/start)
- [Firebase Firestore Web](https://firebase.google.com/docs/firestore/quickstart)
