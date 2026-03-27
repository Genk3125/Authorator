# Authrator

GitHub リポジトリの保護ブランチを監視し、非権限者の push/merge/branch 作成を即リバート・即削除する Bot。

## 機能

- **保護ブランチ監視**: 指定パターン (glob) にマッチするブランチへの不正 push を即リバート
- **マージ監視**: 非権限者による保護ブランチへのマージを即リバート
- **ブランチ作成監視**: 権限のないユーザーが作成したブランチを即削除
- **コメント通知**: 全アクションに理由コメントを自動投稿
- **権限管理**: ユーザー単位で保護ブランチ・ブランチ作成権限を細かく設定
- **Web ダッシュボード**: パスワード認証付き管理画面

## 技術スタック

- Next.js (App Router) + TypeScript
- Upstash Redis (設定・ログ保存)
- Octokit (GitHub API)
- Tailwind CSS
- Vercel デプロイ

## セットアップ

### 1. GitHub App を作成

GitHub Settings > Developer settings > GitHub Apps から新規作成:

- **Webhook URL**: `https://your-domain.vercel.app/api/github/webhooks`
- **Permissions**:
  - Repository: Contents (Read & Write)
  - Repository: Issues (Read & Write)
  - Repository: Pull Requests (Read & Write)
- **Events**: Push, Pull Request, Create

### 2. Upstash Redis を作成

[Upstash Console](https://console.upstash.com/) で Redis データベースを作成し、REST URL と Token を取得。

### 3. 環境変数を設定

```env
APP_ID=your_github_app_id
PRIVATE_KEY=your_github_app_private_key
WEBHOOK_SECRET=your_webhook_secret
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
JWT_SECRET=your_random_secret
```

### 4. デプロイ

```bash
npm install
npm run build
# Vercel にデプロイ
vercel --prod
```

### 5. 初期設定

1. デプロイ先 URL にアクセス
2. 初回は管理パスワードを設定
3. ダッシュボードでリポジトリを追加
4. 保護ブランチ・権限者を設定

## 開発

```bash
npm install
npm run dev
```

ローカル開発時は [smee.io](https://smee.io/) で Webhook をトンネリングしてテスト可能。
