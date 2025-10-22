---
title: implementation-plan
spec: 20251020-react-svg-delivery-performance
status: draft
phase: implementation-planning
---

## 実装タスク一覧

- **I-001 (D-001)**: SVG アセットディレクトリとサンプル構築
  - 内容: `assets/svg-samples/` 作成、既存 SVG を配置、`vite.config.ts` で `import.meta.glob` 設定。
  - 担当: 未定
  - 見積: 4h
  - 依存: なし

- **I-002 (D-002)**: 表示レンダラーの実装
  - 内容: `src/renderers/InlineSvgRenderer.tsx` ほか 3 コンポーネントの作成、`BenchmarkPage` の UI 実装。
  - 担当: 未定
  - 見積: 8h
  - 依存: I-001

- **I-003 (D-003)**: レンダリング回数設定機構
  - 内容: `config/benchmark.config.ts`、環境変数処理、UI からの `n` 更新と URL 同期。
  - 担当: 未定
  - 見積: 5h
  - 依存: I-002

- **I-004 (D-004)**: ビルドサイズ測定スクリプト
  - 内容: `scripts/collect-size.ts` 実装、`package.json` スクリプト連携、`reports/latest` 出力。
  - 担当: 未定
  - 見積: 10h
  - 依存: I-001, I-002

- **I-005 (D-005)**: レポート UI/CLI 出力拡張
  - 内容: `BenchmarkReport.tsx` で JSON レポート読み込み、CSV/JSON エクスポートボタン追加、CLI 表示整備。
  - 担当: 未定
  - 見積: 6h
  - 依存: I-004

- **I-006 (D-006)**: 再現性チェックの自動化
  - 内容: 測定スクリプトで 3 回ビルドループ、差分検証、異常時ログ。
  - 担当: 未定
  - 見積: 4h
  - 依存: I-004

- **I-007 (D-007)**: セキュリティ/依存管理対応
  - 内容: `package.json` のバージョン固定、`npm audit` 用スクリプト、README 記載。
  - 担当: 未定
  - 見積: 3h
  - 依存: I-001

- **I-008 (D-008)**: 観測ログと履歴管理
  - 内容: `collect-size.ts` でメタデータ保存、`reports/history` 構造、`history/index.json` 管理。
  - 担当: 未定
  - 見積: 6h
  - 依存: I-004, I-006

## ロールバック・段階的リリース

- 初期リリースはローカル環境限定で実行し、CI/CD 連携は後続フェーズで検討。
- `npm run measure` に `--skip-history` オプションを設け、問題発生時は履歴出力を無効化可能。
- 既存アプリに影響しないよう、測定ページは `/benchmark` に限定し通常ビルドから切り離す (`npm run build:benchmark`)。

## リスクと回避策

- 測定時間増大: ビルドを手法ごとに並列化しない（再現性確保のため）、代替として SVG セット縮小や `n` 上限で調整。
- ファイルサイズ取得漏れ: `manifest.json` 依存に加え、`dist/` の実体サイズを `fs.stat` で二重確認。
- 依存アップデートでの破壊的変更: バージョン固定 + README に更新手順と検証コマンドを明記。
