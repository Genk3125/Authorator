# Authorator

GitHub リポジトリの保護ブランチを監視し、非権限者の push / merge / branch 作成を即リバート・即削除する Bot。

## 機能

- **保護ブランチ監視** — glob パターン (`main`, `release/*`, `debug/*` 等) で柔軟に指定
- **push リバート** — 非権限者が保護ブランチへ push → 即座に `before` SHA へ force revert
- **マージリバート** — 非権限者が保護ブランチへマージ → merge commit の親 SHA へ revert
- **ブランチ削除** — ブランチ作成権限のないユーザーが新規ブランチを作成 → 即削除
- **コメント通知** — 全アクションに理由コメントを自動投稿
- **権限管理** — ユーザー単位で保護ブランチ push 権限・ブランチ作成権限を個別設定
- **二重認証** — GitHub OAuth + パスワードの二重認証でダッシュボードを保護
- **管理者ホワイトリスト** — GitHub ユーザー単位でダッシュボードアクセスを制御
- **ヘルスチェック** — `/api/health` で Redis・GitHub App の接続状態を確認

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Framework | Next.js 15 (App Router) + TypeScript |
| DB | Upstash Redis |
| GitHub API | Octokit (GitHub App) |
| 認証 | GitHub OAuth + bcrypt + JWT |
| CSS | Tailwind CSS v4 |
| Deploy | Vercel |

## クイックスタート

### 1. Upstash Redis を作成

[Upstash Console](https://console.upstash.com/) で Redis データベースを作成。

### 2. Vercel にデプロイ

```bash
git clone https://github.com/Genk3125/Authorator.git
cd Authorator
npm install
npx vercel --prod
```

### 3. 環境変数を設定 (Vercel Dashboard)

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Auth (ランダム文字列を生成)
JWT_SECRET=

# GitHub App (Step 4 で自動取得)
APP_ID=
PRIVATE_KEY=
WEBHOOK_SECRET=

# GitHub OAuth (Step 4 で取得)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 4. GitHub App を作成

デプロイ先の `/setup` にアクセス → URL を入力 → 「GitHub App を作成する」ボタンで自動作成。
表示される `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET` を Vercel 環境変数に追加。

GitHub App 設定画面 → OAuth → `GITHUB_CLIENT_ID` と `GITHUB_CLIENT_SECRET` を取得して追加。

### 5. 初期セットアップ

1. `/login` にアクセス
2. 管理者の GitHub ユーザー名 + 管理パスワードを設定
3. ダッシュボードでリポジトリを追加
4. 保護ブランチ・権限者を設定
5. GitHub App をリポジトリにインストール

## API エンドポイント

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/github/webhooks` | Webhook 受信 | Signature |
| GET | `/api/health` | ヘルスチェック | なし |
| POST | `/api/auth` | ログイン / 初期セットアップ | Rate limit |
| GET | `/api/auth` | 認証状態確認 | なし |
| GET | `/api/auth/github` | OAuth 開始 | なし |
| GET | `/api/auth/github/callback` | OAuth コールバック | State |
| POST | `/api/auth/logout` | ログアウト | なし |
| PUT | `/api/auth/password` | パスワード変更 | JWT |
| GET/POST/DELETE | `/api/auth/admins` | 管理者管理 | JWT |
| GET/POST | `/api/settings/repos` | リポジトリ一覧/追加 | JWT |
| GET/PUT/DELETE | `/api/settings/repos/[owner]/[repo]` | リポ設定 | JWT |
| GET | `/api/settings/repos/[owner]/[repo]/logs` | アクションログ | JWT |

## 権限モデル

```
権限者 (authorizedUsers)
  └─ 全保護ブランチへの push / merge が可能
  └─ ブランチの自由作成が可能

非権限者
  └─ PR 作成は可能
  └─ 個別に許可されたブランチへの push は可能
  └─ 保護ブランチへの直接 push / merge は即リバート
  └─ ブランチ作成は個別許可制 (canCreateBranch)
```

## 開発

```bash
npm install
npm run dev
```

ローカル Webhook テストには [smee.io](https://smee.io/) を使用。

## ライセンス

MIT
