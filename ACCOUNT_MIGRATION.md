# Googleアカウント変更後のFirebase/Google Cloud再設定ガイド

Googleアカウントを変更した場合、新しいアカウントでFirebaseとGoogle Cloudのプロジェクトを一から作成します。

> [!NOTE]
> このガイドは、旧アカウントにアクセスできない場合を想定しています。
> 初期データは自動スクリプトで投入できるため、データ移行の心配は不要です。

---

## 🔄 新しいアカウントでのセットアップ手順

### ステップ1: 新しいFirebaseプロジェクトの作成

1. **新しいGoogleアカウント**で[Firebase Console](https://console.firebase.google.com/)にログイン

2. 「プロジェクトを追加」をクリック

3. プロジェクト名を入力
   - 推奨: `o-range-website` (同じ名前でOK)
   - または別の名前でも可能

4. Google アナリティクスは任意で設定（スキップ可）

5. プロジェクトを作成

### ステップ2: Webアプリの登録

1. プロジェクトの概要ページで「ウェブ」アイコン（`</>`）をクリック

2. アプリのニックネームを入力
   - 例: `O-range Website`

3. Firebase Hostingの設定はスキップ

4. 「アプリを登録」をクリック

5. **表示される設定情報をコピー**（後で使用）
   ```
   apiKey: "AIza..."
   authDomain: "your-project.firebaseapp.com"
   projectId: "your-project-id"
   storageBucket: "your-project.appspot.com"
   messagingSenderId: "123456789"
   appId: "1:123456789:web:abc123"
   ```

### ステップ3: Firestore Databaseの設定

1. 左メニューから「Firestore Database」を選択

2. 「データベースを作成」をクリック

3. **ロケーションを選択**: `asia-northeast1` (東京)

4. **セキュリティルールを選択**: 「テストモードで開始」
   - 開発中は誰でも読み書き可能
   - 後で本番用ルールに変更可能

5. 「有効にする」をクリック

### ステップ4: Firebase Storageの設定

1. 左メニューから「Storage」を選択

2. 「始める」をクリック

3. セキュリティルールはデフォルトでOK

4. ロケーションは `asia-northeast1` を選択

5. 「完了」をクリック

### ステップ5: ローカルプロジェクトの設定更新

#### 5.1 `.env.local`ファイルの更新

プロジェクトルートの`.env.local`ファイルを開き、ステップ2でコピーした新しい設定情報に書き換えます:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...（新しい値）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-new-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-new-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-new-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Gemini API Keyはそのまま
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAXi85CVpPVXHYzYcD-A8sNBogFrWb0N54
```

#### 5.2 `.firebaserc`ファイルの更新

`.firebaserc`ファイルを開き、新しいプロジェクトIDに変更:

```json
{
  "projects": {
    "default": "your-new-project-id"
  }
}
```

### ステップ6: Firebase CLIの再認証

新しいGoogleアカウントでFirebase CLIにログインし直します:

```bash
# 既存のログアウト
firebase logout

# 新しいアカウントでログイン
firebase login
```

ブラウザが開くので、**新しいGoogleアカウント**でログインしてください。

### ステップ7: 初期データの投入

新しいFirestoreに初期データを投入します:

```bash
npx ts-node scripts/init-firebase.ts
```

成功すると以下のように表示されます:
```
🔥 Firestore初期化を開始します...
📝 メンバーデータを投入中...
  ✓ 河村航希
  ✓ 倉永将宏
  ✓ 準備中
  ✓ 準備中
📝 経過報告データを投入中...
  ✓ こう
  ✓ マサ
✅ 初期データの投入が完了しました！
```

### ステップ8: 動作確認

```bash
# 開発サーバー起動
npm run dev
```

以下を確認:
- [ ] メンバー一覧が表示される
- [ ] メンバー詳細が表示される
- [ ] ログイン後、編集モードが使える
- [ ] 編集内容が保存される
- [ ] 経過報告が表示される
- [ ] 画像アップロードが動作する

---

## 🚀 デプロイ設定（Firebase Hosting使用時）

Firebase Hostingを使っている場合、新しいプロジェクトに再デプロイが必要です:

```bash
# プロジェクトの再初期化（必要に応じて）
firebase init hosting

# ビルド
npm run build

# デプロイ
firebase deploy --only hosting
```

---

## ⚠️ 注意事項

### 旧プロジェクトについて

- 旧アカウントにアクセスできない場合、旧プロジェクトのデータは取得できません
- 初期データスクリプト（`scripts/init-firebase.ts`）で基本的なデータは自動投入されます
- 追加で作成していたデータがある場合は、新しいプロジェクトで再作成が必要です

### カスタムドメイン設定

Firebase Hostingでカスタムドメインを使っている場合:
1. 新しいプロジェクトでドメインを再設定
2. DNS設定を更新

### 認証機能を使っている場合

Firebase Authenticationを使っている場合:
1. 新しいプロジェクトで認証プロバイダーを再設定
2. ユーザーデータの移行が必要

---

## 📞 トラブルシューティング

### エラー: "Firebase is not configured"
→ `.env.local`を更新後、開発サーバーを再起動してください

### エラー: "Permission denied"
→ Firestoreのセキュリティルールが「テストモード」になっているか確認

### Firebase CLIでプロジェクトが見つからない
→ `firebase login`で正しいアカウントにログインしているか確認
→ `firebase projects:list`で利用可能なプロジェクトを確認

### データが表示されない
→ 初期データスクリプトが正常に実行されたか確認
→ Firebase Consoleでデータが投入されているか確認

---

## ✅ 完了チェックリスト

- [ ] 新しいFirebaseプロジェクトを作成
- [ ] Webアプリを登録
- [ ] Firestore Databaseを有効化
- [ ] Firebase Storageを有効化
- [ ] `.env.local`を更新
- [ ] `.firebaserc`を更新
- [ ] Firebase CLIで再ログイン
- [ ] 初期データを投入
- [ ] App Hosting 用のシークレット（GEMINI_API_KEY）を設定
- [ ] 開発サーバーで動作確認
- [ ] デプロイ（必要に応じて）

これで新しいGoogleアカウントでのFirebase/Google Cloud設定が完了です！🎉

---

## 🔐 補足: App Hosting のシークレット設定

Gemini API を使用する場合、App Hosting にシークレットを登録する必要があります。

### 手順

1. **シークレットの登録**
   ```bash
   firebase apphosting:secrets:set GEMINI_API_KEY
   ```
   ※プロンプトが表示されたら、`.env.local` にある `NEXT_PUBLIC_GEMINI_API_KEY` の値を入力してください。

2. **権限の付与**
   ```bash
   firebase apphosting:secrets:grantaccess GEMINI_API_KEY
   ```

3. **再デプロイ**
   設定後、Firebase Console から手動で「再デプロイ」を行うか、再度 GitHub へプッシュしてください。
