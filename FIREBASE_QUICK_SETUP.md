# 🔥 Firebase クイックセットアップガイド

## 問題の原因

現在、`.env.local` ファイルにFirebaseの設定が入っていないため、データがローカルストレージにのみ保存されています。別の端末では更新が反映されません。

## 解決手順

### ステップ1: Firebase Console で設定を取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「o-range-website」を選択
3. 左上の⚙️アイコン → 「プロジェクトの設定」
4. 下にスクロールして「マイアプリ」セクションを探す
5. Webアプリが登録されていない場合は、「</> アプリを追加」をクリック
6. 「Firebase SDK snippet」で「構成」を選択
7. 以下のような設定が表示されます：

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "o-range-website.firebaseapp.com",
  projectId: "o-range-website",
  storageBucket: "o-range-website.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

### ステップ2: .env.local に設定を記入

`.env.local` ファイルを開いて、取得した値を記入してください：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...（あなたのAPIキー）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=o-range-website.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=o-range-website
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=o-range-website.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:...
```

### ステップ3: Firestore Database を有効化

1. Firebase Console で「Firestore Database」をクリック
2. 「データベースを作成」をクリック
3. 本番環境モードで開始（セキュリティルールは後で設定）
4. ロケーションを選択（推奨: asia-northeast1 - Tokyo）

### ステップ4: Storage を有効化

1. Firebase Console で「Storage」をクリック
2. 「始める」をクリック
3. 本番環境モードで開始
4. ロケーションを選択（Firestoreと同じ）

### ステップ5: セキュリティルールを設定

#### Firestore Rules

Firebase Console → Firestore Database → ルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全員が読み取り可能、書き込みは認証済みユーザーのみ
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**注意**: このアプリでは簡易的な認証（ID入力のみ）を使っているため、実際には書き込みも全員許可する必要があります：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### Storage Rules

Firebase Console → Storage → ルール

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

### ステップ6: 初期データを投入

```bash
# ts-nodeをインストール（初回のみ）
npm install -D ts-node

# 初期データを投入
npx ts-node scripts/init-firebase.ts
```

成功すると以下のように表示されます：

```
🔥 Firestore初期化を開始します...
📝 メンバーデータを投入中...
  ✓ 倉永 将宏（マサ）
  ✓ 川村 忠敬（タダタカ）
  ✓ メンバー3
  ✓ メンバー4
📝 経過報告データを投入中...
  ✓ マサ
  ✓ タダタカ
✅ 初期データの投入が完了しました！
```

### ステップ7: 開発サーバーを再起動

```bash
# Ctrl+C で停止して再起動
npm run dev
```

### ステップ8: 動作確認

1. ブラウザで http://localhost:3000 を開く
2. ブラウザのコンソール（F12）を開く
3. 以下の警告が**出ない**ことを確認：
   - ❌ `Firebase is not configured. Using localStorage fallback.`
4. ログインして何か編集してみる
5. **別のブラウザまたはシークレットモード**で同じURLを開く
6. 編集内容が反映されていることを確認 ✅

## トラブルシューティング

### エラー: Permission denied

セキュリティルールで `allow write: if true;` になっているか確認してください。

### エラー: Firebase not configured

`.env.local` の値が正しく設定されているか、開発サーバーを再起動したか確認してください。

### データが反映されない

1. ブラウザのコンソールでエラーを確認
2. Firebase Console → Firestore Database でデータが保存されているか確認
3. ページをリロードしてみる

## デプロイ後の確認

静的サイトとしてデプロイした後も、Firebaseへのデータ保存は動作します：

1. `npm run deploy` でデプロイ
2. デプロイされたURL（https://o-range-website.web.app）にアクセス
3. ログインして編集
4. 別の端末でアクセスして確認

## まとめ

- ✅ `.env.local` に実際のFirebase設定を記入
- ✅ Firestore と Storage を有効化
- ✅ セキュリティルールを設定
- ✅ 初期データを投入
- ✅ 開発サーバーを再起動

これで、複数端末でデータが同期されるようになります！
