# SVG Delivery Benchmark

React + Vite で SVG 配信手法（インライン JSX / img タグ / SVGR コンポーネント）を比較し、ビルド成果物サイズを測定するリポジトリです。

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

## 計測フロー

```bash
# 例: 100 回レンダリングして測定
RENDER_COUNT=100 npm run measure
```

`npm run measure` は以下を実行します:

1. `npm run build:benchmark` を 3 回連続で実施
2. `dist/benchmark/assets` のバンドル/アセットサイズを集計
3. `reports/latest/size-summary.(json|md)` を更新し履歴を `reports/history` に保存
4. 結果サマリを CLI に表示し、差分が 1% を超えると警告

## レポート閲覧

開発サーバーを起動し、`/report` にアクセスすると最新結果の表・CSV/JSON ダウンロードが利用できます。

## テスト

```bash
npm run test
```

## 依存関係

- Node.js 18+
- React 18.3.x
- Vite 5.4.x
- `@svgr/rollup` 経由で SVG を React コンポーネント化

## ディレクトリ構成

```
assets/svg-samples/   SVG サンプル
config/               レンダリング回数などの設定
logs/                 測定ログ
public/reports/       レポートの配信用コピー
reports/              測定結果と履歴
scripts/              測定・集計スクリプト
src/                  React アプリケーション
```
