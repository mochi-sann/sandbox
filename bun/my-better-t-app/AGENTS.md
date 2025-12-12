# Repository Guidelines

## プロジェクト構成と配置
- ルートは Turborepo + Bun ワークスペース。アプリは `apps/`, 共有コードは `packages/` に分離。
- `apps/web`: React + TanStack Start の SSR フロント。UI コンポーネントとテーマ切替がここに集約。
- `apps/server`: Elysia + ORPC の API。エントリは `apps/server/src/index.ts`、環境変数は `apps/server/.env` を参照。
- `packages/api` (ビジネス/API 型), `packages/auth` (認証設定), `packages/db` (Drizzle スキーマとマイグレーション), `packages/config` (共有設定) が再利用モジュール。

## ビルド・開発・DB コマンド
- 依存インストール: `bun install`
- 全体開発: `bun run dev` (web:3001, server:3000)。個別は `bun run dev:web` / `bun run dev:server`。
- ビルド: `bun run build`。型チェック: `bun run check-types`。
- DB: `bun run db:start` で Docker PostgreSQL 起動、`bun run db:push` でスキーマ反映、`bun run db:studio` で Drizzle Studio、`bun run db:down` で停止/削除。

## コーディングスタイル・命名
- 言語は TypeScript/ESM、インデント 2 スペース。不要なデフォルトエクスポートは避け、機能単位で命名。
- Lint は `oxlint` を使用 (`bun run check`)。`.husky/pre-commit` 経由で lint-staged がステージ済みファイルに走るため、コミット前に警告を解消。
- React コンポーネントは `PascalCase.tsx`、カスタムフックは `useXxx.ts`、ユーティリティは `*.ts` で機能別配置。Tailwind v4 のユーティリティをまとめすぎず、既存のクラス順を尊重。

## テスト指針
- UI テストは Testing Library + jsdom が `apps/web` に導入済み。`apps/web/src` 配下に `*.test.tsx` を置き、`bun test path/to/file.test.tsx` で実行可能 (プロジェクト共通の test スクリプトは未設定)。
- サーバの振る舞いテストを追加する場合は Bun のネイティブテストか Elysia のハンドラを直接呼び出す形で小さく分割し、モックより実 DB/HTTP を避けたユニットを優先。

## コミットと PR
- 既存ログは短文 (`update` など) が多いため、今後は `feat:`, `fix:`, `chore:` などのプリフィックス + 簡潔な命令形 50～72 文字を推奨。関連 Issue があれば本文に `Refs #123` を追記。
- PR では変更概要、テスト結果 (実行したコマンド)、UI 変更時のスクリーンショット/動画、DB 変更時の `db:push` 実行有無とロールバック方法を記載。

## 環境・セキュリティ
- 秘密情報は `.env*` にのみ配置し、コミット禁止。ローカル DB は `packages/db/docker-compose.yml` に従い、不要時は `bun run db:down` で停止。
- `bunfig.toml` のバージョンは `bun@1.2.20` を前提。新規パッケージ追加時はワークスペース依存 (`workspace:*`/`catalog:`) の整合を確認。
