# ChatGPT Clone

![CI](https://github.com/wiyota/chat-gpt-clone/actions/workflows/ci.yml/badge.svg)

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
pnpm --filter @chat/web test:e2e

# CI をローカルで試す（act が必要）
act -j check --env ACT=true
act -j e2e --env ACT=true
```

## 環境変数

`.env` を各ワークスペースに作成してください。

### apps/server/.env

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:5173
```

### apps/web/.env

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

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
