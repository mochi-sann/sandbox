# React Three Fiber (R3F) TypeScript Boilerplate

React Three Fiber + TypeScript で 3D Web アプリを始めるための実践的なボイラープレートです。

## 現在の実装内容（MVP）

- Vite + React + strict TypeScript
- `three` / `@react-three/fiber` / `@react-three/drei` 導入済み
- レスポンシブ対応の `Canvas` シーン
- `OrbitControls` を使ったカメラ制御
- 開発時のみ表示される `r3f-perf` パフォーマンスパネル
- カスタム hooks
  - `useViewport`
  - `useReducedMotion`
  - `useFrameLimiter`
  - `useTextureLoader`
- パフォーマンス設定ヘルパー（DPR・シャドウ切替）
- Vitest + React Testing Library テスト基盤

## 拡張予定（次フェーズ）

- Geometry instancing の実例
- LOD（Level of Detail）運用テンプレート
- Scene graph 可視化ツール
- Material editor / animation timeline などの高度な開発UI

## セットアップ

```bash
npm install
npm run dev
```

## スクリプト

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:watch
npm run test:coverage
```

## ディレクトリ構成

```txt
src/
  components/
    debug/
    scene/
  hooks/
  lib/r3f/
  styles/
  test/
```

## 対応方針

- 対象ブラウザ: モダンブラウザ（Chrome / Edge / Safari / Firefox の最新世代）
- テストランナー: Vitest（Jest ではなく Vitest を採用）
