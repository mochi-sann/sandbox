# 設計

## 全体方針
- Railsのtasks#indexページをReact + TypeScriptで実装する。既存テンプレートはReactコンテナと最低限のSSR向け要素のみ残す。
- Reactアプリは`app/javascript/react/`以下に配置し、エントリーポイントを`app/javascript/application.tsx`から読み込む。
- Turboナビゲーションと競合しないようStimulusコントローラでReactのマウント/アンマウントを管理する。
- データ取得・更新はRails側にJSONレスポンスを追加することで対応し、既存HTML/Turboレスポンスは後方互換維持する。

## 技術選定
- バンドラ: `jsbundling-rails` + `esbuild`を採用。`package.json`を新規追加し、React/TypeScriptビルドを`bin/dev`で実行できるようにする。
- TypeScript: `tsconfig.json`を作成し、`jsx`は`react-jsx`設定。
- 型/リンティング: まずはTypeScript + `eslint-config-react-app`の導入を検討するが、初回は最小構成(ESLint導入は実装計画で検討)。

## Rails側変更
- `tasks#index`に`respond_to`でJSON形式を追加し、ページング/フィルタリング用パラメータ(`page`, `status`, `query`など)を許容。
- `tasks#toggle`, `tasks#update`, `tasks#destroy`, `tasks#create`にJSONレスポンスを追加し、React側から`fetch`で利用できるようにする。
- Turbo Streamテンプレートは当面温存し、Hotwireページからの呼び出しを維持。
- ルーティングは既存のまま。JSON形式にアクセスする場合は`Accept: application/json`もしくは`.json`拡張子。

## React構成
- ディレクトリ: `app/javascript/react/`配下。
  - `components/TaskList.tsx`: 表示メインコンポーネント。
  - `components/TaskItem.tsx`: 単一タスク行。
  - `components/TaskFilters.tsx`: フィルタ/検索UI。
  - `hooks/useTasks.ts`: データ取得・操作ロジック。
  - `types.ts`: APIレスポンス型定義。
  - `api.ts`: fetchラッパ。
- 状態管理: React内の`useReducer`または`useState` + `useEffect`で十分。API通信は`fetch` + `AbortController`でTurbo遷移時に中断。
- ローディング・エラー状態をstateとして保持しUI表示。
- ページネーションは既存`PER_PAGE`設定を利用したRailsからのメタ情報（例: `total_pages`, `page`）をJSONで返し、それをReactで描画。

## Turbo/Stimulus連携
- `app/javascript/controllers/task_list_controller.ts`を新設し、`connect`時にReactDOM.createRootでマウント、`disconnect`時にunmount。
- Turbo訪問時の再マウント問題に対応するため、`turbo:before-cache`イベントでアンマウント。
- `<div data-controller="task-list" data-task-list-props-value="{...}" />`のように初回描画用のプロップスを埋め込む。初回はRails側で`gon`的なデータではなく、空状態でReactがAPI呼び出しを行う。

## ビルド/配信
- `application.js`を`application.ts`へリネームし、TypeScriptエントリに移行。
- `import "./react/entrypoints/task_list";`を追加してStimulusコントローラが読み込まれるようにする。
- `yarn build`および`yarn build --watch`(bin/devに組込み)で`app/assets/builds`へ出力。

## テスト戦略
- Rails: コントローラテストまたはリクエストテストでJSONレスポンス検証。
- フロントエンド: Jest + React Testing Library導入を検討。最低限、`useTasks`のロジックとタスク一覧の描画スナップショットを追加。
- E2Eは後続課題としつつ、手動テスト手順をREADMEに記載。

## マイグレーション計画
1. ビルド基盤整備（package.json, tsconfig, esbuild設定更新）。
2. RailsコントローラをJSON対応化。
3. Stimulusコントローラ + Reactエントリポイント追加。
4. Reactコンポーネント実装とスタイリング調整。
5. テスト/README更新。

## 互換性・段階的移行
- 既存Turboテンプレートは段階的に削除予定だが、今回コミットでは保持しリンク切れを避ける。
- React版が安定した後、HTMLレスポンスは最小構成（divコンテナ）に縮退する。
- 他ページでは従来のHotwire挙動をそのまま維持。
