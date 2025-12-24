# セットアップガイド

## 1. 依存関係のインストール

```bash
npm install
```

## 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## 3. 動作確認

### メンバー一覧画面
- 河村航希さん（写真は準備中）
- 倉永将宏さん（写真が表示される）
- 準備中のメンバー枠×2

### ログイン機能
1. 右上のハンバーガーメニューをクリック
2. 「管理者ログイン」を選択
3. 以下のいずれかのIDを入力:
   - `admin`
   - `orange-admin`
   - `o-range`

### 編集機能
1. ログイン後、ハンバーガーメニューに「編集する」が表示される
2. 「編集する」をクリックすると編集モードになる
3. 各フィールドをクリックして編集可能
4. 右下の「保存」または「保存して終了」ボタンで保存

### メンバー限定情報
1. ログイン後、ハンバーガーメニューから「メンバー限定情報」を選択
2. 経過報告画面が表示される
3. 「こう」と「マサ」の経過報告が閲覧・編集可能

## 4. Firebase設定（本番環境用）

### 4.1 Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Webアプリを追加

### 4.2 環境変数の設定

`.env.local.example`を`.env.local`にコピーして、Firebaseの設定値を入力してください。

```bash
cp .env.local.example .env.local
```

### 4.3 Firestoreの設定

1. Firebase Consoleで「Firestore Database」を作成
2. セキュリティルールを設定（開発時はテストモード、本番時は適切なルールを設定）

### 4.4 Firebase Storageの設定

1. Firebase Consoleで「Storage」を有効化
2. 画像アップロード用のバケットを作成

## 5. デプロイ

### Next.jsのビルド

```bash
npm run build
```

### Firebase Hostingへのデプロイ

```bash
# Firebase CLIのインストール（初回のみ）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトの初期化（初回のみ）
firebase init

# デプロイ
firebase deploy
```

## トラブルシューティング

### 画像が表示されない
- `public`フォルダに画像が配置されているか確認
- 画像のパスが正しいか確認（`/ファイル名.jpg`）

### ログイン状態が保持されない
- ブラウザのローカルストレージが有効か確認
- プライベートブラウジングモードでは動作しない可能性があります

### 編集内容が保存されない
- 現在はローカルストレージに保存されます
- Firebase連携後はFirestoreに保存されます
