# Firebase連携セットアップガイド

## 1. Firebaseプロジェクトの作成

### 1.1 プロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `o-range-website`）
4. Google アナリティクスは任意で設定
5. プロジェクトを作成

### 1.2 Webアプリの追加
1. プロジェクトの概要ページで「ウェブ」アイコン（</>）をクリック
2. アプリのニックネーム入力（例: `O-range Website`）
3. Firebase Hostingの設定はスキップ可能
4. 「アプリを登録」をクリック
5. **設定情報をコピーしておく**（後で使用）

## 2. Firestoreの設定

### 2.1 Firestore Database作成
1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. **ロケーションを選択**: `asia-northeast1` (東京) を推奨
4. **セキュリティルールを選択**:
   - 開発中: 「テストモードで開始」
   - 本番: 「本番モードで開始」（後でルールを設定）

### 2.2 セキュリティルールの設定（推奨）

開発時は以下のルールでOK:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全て読み取り可能（公開情報）
    match /{document=**} {
      allow read: if true;
      allow write: if false; // 本番では適切な認証を実装
    }
  }
}
```

本番用（基本的なセキュリティ）:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // メンバー情報は誰でも読める
    match /members/{memberId} {
      allow read: if true;
      allow write: if request.auth != null; // 認証済みユーザーのみ
    }
    
    // 経過報告は認証済みユーザーのみ
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 3. Firebase Storageの設定

### 3.1 Storage作成
1. 左メニューから「Storage」を選択
2. 「始める」をクリック
3. セキュリティルールはデフォルトでOK
4. ロケーションは `asia-northeast1` を選択

### 3.2 セキュリティルール（推奨）

開発時:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if false; // 管理画面からのみアップロード
    }
  }
}
```

本番用:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // メンバー画像
    match /members/{memberId}/{imageFile} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 20 * 1024 * 1024 // 20MB以下
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 4. 環境変数の設定

### 4.1 `.env.local`ファイルを作成

プロジェクトルートに`.env.local`を作成し、Firebase Consoleからコピーした設定を貼り付け:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**重要**: `.env.local`は`.gitignore`に含まれているため、Gitにコミットされません。

## 5. 初期データの投入

### 5.1 開発用依存関係のインストール
```bash
npm install -D ts-node @types/node
```

### 5.2 初期データスクリプトの実行
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

## 6. 動作確認

### 6.1 開発サーバー起動
```bash
npm run dev
```

### 6.2 確認項目
- [ ] メンバー一覧が表示される
- [ ] メンバー詳細が表示される
- [ ] ログイン後、編集モードが使える
- [ ] 編集内容が保存される（Firestoreを確認）
- [ ] 経過報告が表示される
- [ ] 画像アップロードが動作する（編集モード時）

### 6.3 Firestore Consoleで確認
1. Firebase Console → Firestore Database
2. `members`コレクションと`reports`コレクションが作成されている
3. 各ドキュメントにデータが入っている

## 7. トラブルシューティング

### エラー: "Firebase is not configured"
→ `.env.local`が正しく設定されているか確認
→ 開発サーバーを再起動

### エラー: "Permission denied"
→ Firestoreのセキュリティルールを確認
→ 開発時は「テストモード」で起動

### 画像アップロードできない
→ Firebase Storageが有効化されているか確認
→ Storageのセキュリティルールを確認

### データが保存されない
→ ブラウザのコンソールでエラーを確認
→ Firestoreのセキュリティルールを確認

## 8. Firebase Hostingへのデプロイ（任意）

### 8.1 Firebase CLIのインストール
```bash
npm install -g firebase-tools
```

### 8.2 ログインと初期化
```bash
firebase login
firebase init hosting
```

### 8.3 ビルドとデプロイ
```bash
npm run build
firebase deploy --only hosting
```

## 次のステップ

✅ Firebase連携完了！

これで以下が可能になりました:
- データがFirestoreに保存される
- 複数デバイスでデータを共有
- 画像をFirebase Storageに保存
- リアルタイムでデータを同期

さらに改善したい場合:
- Firebase Authenticationで本格的なユーザー認証
- Cloud Functionsでサーバーサイド処理
- Firebase Hostingで本番公開
