---
title: design
spec: 20251020-react-svg-delivery-performance
status: draft
phase: design
---

## 全体方針

React 18 + Vite をベースとした検証アプリケーションを構築し、同一 SVG セットに対して複数の配信手法を比較可能にする。測定対象は以下 3 手法を必須とし、追加手法をモジュールとして拡張できる構造をとる。

1. インライン JSX（`import svgContent from '?raw'` で取り込み）
2. `img` タグ参照（`public/` 配置 or `import` URL）
3. SVGR コンポーネント化（`@svgr/webpack` 相当を Vite プラグインで利用）

測定はビルド後の成果物サイズ（`dist/` 配下）および生成物内の各バンドルサイズを `rollup-plugin-visualizer` などで取得し、レポート生成スクリプトが JSON/Markdown を出力する。

## 設計要素

- **D-001 (R-001 対応)**: `assets/svg-samples/` ディレクトリの自動読み込み
  - `vite.config.ts` の `import.meta.glob` を利用し、`assets/svg-samples/**/*.svg` をビルド時・実行時に列挙。
  - SVG ファイル追加時は追加ビルド不要で認識される（ホットリロード対応）。

- **D-002 (R-002 対応)**: 表示レイヤーの手法別コンポーネント化
  - `src/renderers/` に `InlineSvgRenderer`, `ImgTagRenderer`, `SvgrRenderer` を配置。
  - キャッシュを避けるため、各 SVG を `n` 回 map で展開し key を `${id}-${index}` 形式で付与。
  - React Router で `/benchmark` ページを提供し、タブ切り替えで手法別結果を並列表示。

- **D-003 (R-003 対応)**: 表示回数 `n` の設定機構
  - `config/benchmark.config.ts` に `export const RENDER_COUNT = process.env.RENDER_COUNT ?? 50`。
  - `package.json` の npm script で `RENDER_COUNT=100 npm run build:benchmark` のように上書き可能にする。
  - UI 側でも `<input type="number">` で `n` を調整し、状態は URL クエリ（例: `?count=75`）に同期。

- **D-004 (R-004 対応)**: ビルドサイズ測定パイプライン
  - `npm run build:benchmark` 実行後に `node scripts/collect-size.js` を走らせる複合スクリプト。
  - `collect-size.js` は `dist/` 配下を再帰走査し、手法ごとのバンドルファイルを `manifest.json` から逆引きしてサイズ集計。
  - `reports/latest/size-summary.json` と `reports/latest/size-summary.md` を出力。

- **D-005 (R-005 対応)**: レポート UI とエクスポート
  - `src/pages/BenchmarkReport.tsx` が `reports/latest/size-summary.json` を fetch（開発時は Vite dev server のエイリアス）。
  - 表形式で総サイズ・平均サイズ・差分を表示し、CSV/JSON ダウンロードボタンを提供。
  - CLI 側は `collect-size.js` が要約を `console.table` で出力。

- **D-006 (R-006 対応)**: 測定再現性の確保
  - 測定スクリプトで 3 回ビルドをシリアル実行し、`reports/history/run-<timestamp>-<sequence>.json` に記録。
  - 自動で差分を計算し、ぶれが 1% を超えた場合は警告を表示し失敗（exit code 1）。

- **D-007 (R-007 対応)**: 依存ライブラリとセキュリティ
  - `package.json` で主要依存（React, Vite, @svgr/core 等）を `^` ではなく正確なバージョンで固定。
  - CI スクリプト例として `npm audit --production` 実行を README に記載し、重大/高リスク検出時は測定停止。
  - 外部送信を防ぐため、ネット接続を必要とする分析プラグインは使用しない。

- **D-008 (R-008 対応)**: 観測ログ
  - `collect-size.js` に測定時のメタデータ（`renderCount`, `svgFileList`, `rendererVersions`, `nodeVersion`, `elapsedMs`）を記録。
  - `reports/history/index.json` で履歴をインデックス化し、フロントエンドからフィルタリング可能にする。

## データフロー

```
Sequence Benchmark Measurement
1. User runs `npm run measure` (wraps build + collect-size)
2. Vite builds benchmark entry (`src/benchmark.tsx`)
3. Vite plugin glob loads SVG list (D-001)
4. Renderers generate DOM structures per method (D-002)
5. Build artifacts emitted to `dist/`
6. `collect-size.js` parses `dist/manifest.json`, reads file sizes (D-004)
7. Reports saved under `reports/latest` and `reports/history` (D-004/D-008)
8. CLI prints summary; UI fetches `reports/latest/size-summary.json` (D-005)
```

## エラーハンドリングとリトライ

- SVG 読み込み失敗時: `InlineSvgRenderer` は try/catch でエラーメッセージカード表示、`collect-size.js` は欠落ファイルをスキップし警告ログ。
- `collect-size.js` がサイズ取得に失敗した場合、1 回リトライし、それでも失敗なら処理全体を中断 (exit code 1)。
- 再現性チェック (D-006) で閾値超過時は詳細ログ (`reports/latest/anomaly.json`) を生成し原因調査を促す。

## ロギング・モニタリング

- `collect-size.js` は `logs/benchmark.log` へ INFO/ERROR レベルで記録。
- フロントエンドは `console.info` で測定パラメータを出力し、`NODE_ENV=production` ビルドではログをミニファイ。

## パフォーマンス配慮

- ビルドと測定は `--max-old-space-size=4096` を推奨（README 記載）。
- SVG をキャッシュするための memoization を renderer 単位で実施 (`useMemo` でパース結果キャッシュ)。
- `n` の上限を設定 (`RENDER_COUNT_MAX = 500`) し、超過時は UI で警告。

## セキュリティ配慮

- 動的に読み込む JSON/CSV は `Content-Type` チェックと `JSON.parse` の try/catch を実装。
- ローカルパスの出力にユーザー入力が含まれないよう `path.join` を使用しディレクトリトラバーサルを防止。

## 外部依存とバージョン

- React 18.3.x, React DOM 18.3.x
- Vite 5.4.x
- TypeScript 5.6.x
- `@svgr/rollup` 8.x (Vite で利用)
- `rollup-plugin-visualizer` 5.x

これらは `package.json` で exact version 固定し、README にアップデート手順を記載する。
