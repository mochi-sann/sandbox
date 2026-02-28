# React Three Fiber Boilerplate

学習・デモ配布向けの React Three Fiber ボイラープレートです。`core` と `extended` を分離し、最小構成から段階的に機能を追加できます。

## セットアップ

```bash
npm install
npm run dev
```

## 含まれる機能

### Core

- React + TypeScript + Vite + React Three Fiber
- 共通 `SceneCanvas`（カメラ、ライト、トーンマッピング、DPR設定）
- シーン切替（サンプル2種）
- `Suspense` + 進捗ベースのローディング UI
- Debug モード（OrbitControls / Grid / Axes / Stats）
- 品質制御（high / medium / low）
- FPS ベースの adaptive quality
- アセットレジストリ（`getModelPath`, `preloadModel`, `preloadAll`）

### Extended (Optional)

- `@react-three/postprocessing` を使ったエフェクト雛形
- `@react-three/rapier` を使った物理雛形
- `leva`（UI パラメータ調整）

## ディレクトリ

```txt
src/
  app/
    config.ts
  state/
    sceneStore.ts
  three/
    assets/
    core/
    scenes/
    extended/
  ui/
```

## 新しいシーンの追加

1. `src/three/scenes/MyScene.tsx` を作成
2. `src/three/scenes/sceneModules.tsx` に `SceneModule` を追加
3. 必要であれば `preload` を登録

## 型インターフェース

- `App3DConfig`: Canvas と描画品質の共通設定
- `SceneModule`: シーンの登録仕様 (`id`, `title`, `Component`, `preload?`)

## メモ

- `preloadAll()` はデモ用に `/public/models` へモデル配置する想定です。
- デフォルトでは軽量なジオメトリシーンを使うため、初回ロードは軽くなっています。
