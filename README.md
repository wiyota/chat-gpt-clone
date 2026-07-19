# ChatGPT Clone

![CI](https://github.com/wiyota/chat-gpt-clone/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT%20%2F%20Apache--2.0-blue)
![Node.js](https://img.shields.io/badge/node-22-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-11.14.0-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-446b9e?logo=solid&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)

このプロジェクトは、[Singularity Society — ChatGPTクローンで学ぶ LLMアプリ開発入門](https://singularitysociety.github.io/societys_statement/development/chatgpt_clone/README.html) を元に、SolidJS + TanStack Query + Hono + Supabase + OpenAI を組み合わせて実装した、ChatGPT のような対話アプリです。

## 概要

ブラウザからメッセージを送ると、サーバー経由で OpenAI API を呼び出し、返答をストリーミングで表示します。会話はユーザーごとに Supabase に保存され、後から再開したり、タイトルを編集・削除したりできます。

## 主な機能

- Google OAuth でのサインイン（Supabase Auth）
- 会話の作成・一覧・選択・削除
- 会話タイトルの自動生成と手動編集
- ストリーミング（SSE）による 1 チャンクずつの返答表示
- ストリーミング中の中断（Stop）
- LLM の API キーはサーバーにのみ保持
- ユーザーごとの利用量制限
- 長期記憶（会話から抽出した事実の保存と再利用）
- ツール呼び出し（function calling）
- マークダウン表示
- ダークモード対応

## 技術スタック

| レイヤー       | 技術                                                   |
| -------------- | ------------------------------------------------------ |
| フロントエンド | SolidJS, TanStack Query, Tailwind CSS v4, shadcn-solid |
| サーバー       | Hono, TypeBox, OpenAI SDK                              |
| 認証・DB       | Supabase Auth, PostgreSQL, RLS                         |
| リンター       | oxlint, oxlint-tailwindcss                             |
| フォーマッター | oxfmt                                                  |

## 前提条件

以下を事前にインストール・準備してください。

| ツール / サービス                                              | 用途                          | インストール手順                                                                                                                                          |
| -------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/) 22.x                            | 実行環境                      | [公式ダウンロード](https://nodejs.org/)                                                                                                                   |
| [pnpm](https://pnpm.io/ja/) 11.14.0 以上                       | パッケージマネージャー        | `corepack enable && corepack prepare pnpm@11.14.0 --activate` または [公式ドキュメント](https://pnpm.io/ja/installation)                                  |
| [Supabase](https://supabase.com/) プロジェクト                 | 認証・データベース            | [Supabase ダッシュボード](https://supabase.com/dashboard)でプロジェクトを作成                                                                             |
| [OpenAI API キー](https://platform.openai.com/)                | LLM 呼び出し                  | [API keys ページ](https://platform.openai.com/api-keys)で取得                                                                                             |
| [Google OAuth クライアント](https://console.cloud.google.com/) | Google サインイン             | [Supabase Auth の Google プロバイダー設定](https://supabase.com/docs/guides/auth/social-login/auth-google)に従って設定                                    |
| （推奨） [Docker](https://www.docker.com/)                     | Supabase CLI のローカル開発用 | [Docker Desktop](https://www.docker.com/products/docker-desktop) または [Supabase CLI インストール](https://supabase.com/docs/guides/cli/getting-started) |

## データベーススキーマの適用

Supabase プロジェクト作成後、`supabase/migrations/` 以下の SQL を実行してテーブルと RLS ポリシーを作成してください。

### 方法 A: Supabase ダッシュボードの SQL Editor（学習用に最速）

1. [Supabase ダッシュボード](https://supabase.com/dashboard)でプロジェクトを開く。
2. 左サイドバーから **SQL Editor** を開き、**New query** をクリック。
3. `supabase/migrations/0001_initial_schema.sql`、`0002_add_summaries_table.sql`、`0003_add_memories_table.sql` の内容を順番にコピーして貼り付ける。
4. **Run** をクリック。
5. **Table Editor** で `conversations`、`messages`、`usage`、`summaries`、`memories` などのテーブルが作成されたことを確認。
6. 各テーブルの **Policies** で RLS が有効になっていることを確認。

詳細は [`docs/supabase-setup.md`](./docs/supabase-setup.md) も参照してください。

### 方法 B: Supabase CLI（継続的な開発向け）

[Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) をインストール済みの場合：

```sh
# 初回のみ: ローカルプロジェクトをリモートの Supabase プロジェクトに紐付ける
supabase link --project-ref <project-ref>

# マイグレーションを適用
supabase db push
```

新しいマイグレーションを追加する場合：

```sh
supabase migration new add_summary_column
```

上記コマンドで `supabase/migrations/` に新しい SQL ファイルが作成されます。編集後、`supabase db push` で適用できます。

詳細は [`docs/supabase-setup.md`](./docs/supabase-setup.md) も参照してください。

## 環境変数

`.env.example` をコピーして `.env` を作成してください。

```sh
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

コピー後、それぞれの `.env` に自分の Supabase / OpenAI の値を記入します。

### apps/server/.env

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:5173
CONTEXT_WINDOW_TOKENS=4000
RECENT_MESSAGES_TO_KEEP=6
DAILY_TOKEN_BUDGET=10000
MEMORY_MAX_FACTS=10
```

### apps/web/.env

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> > 本番運用やチーム開発では、`.env` を Git にコミットせず、[dotenvx](https://dotenvx.com/)、[GitHub Secrets](https://docs.github.com/ja/actions/security-guides/using-secrets-in-github-actions)、[Doppler](https://www.doppler.com/) などを使って暗号化・集中管理することを推奨します。

## セキュリティ運用メモ

- 本番環境では、サーバー前面のリバースプロキシまたは CDN で以下を追加してください。
  - HTTPS / HSTS
  - `Content-Security-Policy`（SolidJS + Vite では `'unsafe-inline'` / `'unsafe-eval'` が必要になりやすいため、nonce ベースまたは厳格なポリシー設計が推奨されます）
  - `Strict-Transport-Security`
- `NODE_ENV` を `production` に設定しないと、エラー詳細や予算ガード無効化、LLM ストリーミングログなどが開発モードのままになる可能性があります。本番では必ず `NODE_ENV=production` を指定してください。

## 開発環境のセットアップ

```sh
# 依存関係をインストール
pnpm install

# 型チェック
pnpm typecheck

# リンター / フォーマッターの実行
pnpm lint
pnpm format

# 開発サーバーの起動
pnpm dev
```

## テスト

```sh
# 全ワークスペースの単体テスト
pnpm test

# フロントエンドの E2E テスト
pnpm test:e2e
```

### E2E テストについて

E2E テストは実際の Supabase / OpenAI API に接続しません。ブラウザ内で `page.route` を使って API レスポンスをモックし、認証には特別な `e2e-token` を使用しています。CI では `E2E=true` を設定することで、サーバー側もモック Supabase クライアントを使用し、ネットワーク接続を伴わない状態でテストを実行しています。

## プロジェクト構成

```
.
├── apps/
│   ├── server/          # Hono サーバー
│   └── web/             # SolidJS フロントエンド
├── packages/
│   └── shared/          # 共有 TypeScript 型
├── design/
│   ├── adr/             # アーキテクチャ決定記録
│   └── requirements.md  # 要件定義
├── supabase/
│   └── migrations/      # データベースマイグレーション
└── README.md            # このファイル
```

## ライセンス

このリポジトリは MIT ライセンスと Apache License 2.0 のデュアルライセンスで提供されています。詳細は以下のファイルを参照してください。

- [LICENSE-MIT](./LICENSE-MIT)
- [LICENSE-APACHE](./LICENSE-APACHE)

いずれかのライセンス条項に従って本リポジトリを利用できます。

## 参考資料

- [Singularity Society — ChatGPTクローンで学ぶ LLMアプリ開発入門](https://singularitysociety.github.io/societys_statement/development/chatgpt_clone/README.html) — 本プロジェクトの元となった教材
