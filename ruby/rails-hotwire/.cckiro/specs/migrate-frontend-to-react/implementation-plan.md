# 実装計画

## 1. ビルド環境整備
- `package.json`, `yarn.lock`を追加し、React/TypeScript/esbuild関連パッケージを導入する。
- `tsconfig.json`, `esbuild.config.js`(必要に応じて)を作成し、`jsbundling-rails`がTypeScriptを扱えるよう設定。
- `app/javascript/application.js`を`application.ts`へ移行し、適切なエントリポイントに更新。
- `bin/dev`に`yarn build --watch`を組み込み、開発環境でのホットリロードを確認。

## 2. Rails側のJSON API対応
- `TasksController`に各アクションのJSONレスポンスを追加（`index`, `create`, `update`, `destroy`, `toggle`）。
- ページネーションメタデータやエラー内容をJSONで返すフォーマットを策定。
- 既存HTML/Turboレスポンスは維持し、後方互換を確認。
- コントローラテスト/リクエストテストでJSONレスポンスの形式を検証。

## 3. ReactマウントポイントとStimulus連携
- `app/views/tasks/index.html.erb`をReactコンテナ中心の構造に更新。
- `app/javascript/controllers/task_list_controller.ts`を作成し、Turboイベントに合わせてReactをマウント/アンマウント。
- Turboキャッシュ用に`turbo:before-cache`でのクリーンアップ処理を実装。

## 4. React + TypeScriptコンポーネント実装
- `app/javascript/react/`配下に`api.ts`, `types.ts`, `hooks/useTasks.ts`, `components/TaskList.tsx`等を実装。
- API呼び出し用に`fetch`ラッパを整備し、ローディング/エラー/空状態/ページネーションを実装。
- 既存スタイルやクラス名を踏襲しつつ、必要なCSS調整を行う。
- ユーザー操作（フィルタ/ソート/ステータス更新）がRails APIと同期することを手動確認。

## 5. テストとドキュメント
- Railsリクエストテストを追加してJSONレスポンスを検証。
- Jest + React Testing Library（または最小限のテストセットアップ）を導入し、`useTasks`や主要コンポーネントのテストを作成。
- READMEまたは開発者向けドキュメントにReact化手順と開発フローを追記。
- 動作確認手順（ブラウザでの確認方法、必要コマンド）を記録。
