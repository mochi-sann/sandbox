# mc-test

Minecraft風3Dボクセルゲーム。Vite + React + Three.js（@react-three/fiber）+ TypeScript。

## コマンド

```bash
pnpm dev        # 開発サーバ起動
pnpm build      # 型チェック + 本番ビルド
pnpm lint       # ESLint
pnpm typecheck  # TypeScript 型チェック（tsc -b --noEmit）
pnpm preview    # ビルド結果のプレビュー
```

## 技術スタック

- ビルド: Vite (rolldown-vite) + TypeScript strict
- 3D: Three.js + @react-three/fiber + @react-three/drei
- UI: React 19 DOM オーバーレイ
- 状態管理: zustand
- ストレージ: IndexedDB（idb ラッパ）
- 物理: 独自AABB
- Lint: ESLint flat config (typescript-eslint)

## ディレクトリ構造

```
src/
  main.tsx, App.tsx, App.css, index.css, vite-env.d.ts
  game/
    constants.ts          # チャンクサイズ、プレイヤー寸法、物理定数
    types.ts              # BlockId, PlayerState, ModifiedBlock, RaycastHit
    store.ts              # zustand グローバルステート（HUD/インベントリ/クラフト/ゲーム状態）
    registry/
      blocks.ts           # ブロック定義（id/name/color/solid/dropItem）
      items.ts            # アイテム定義（id/name/maxStack/isBlock）
      recipes.ts          # クラフトレシピ（shapeless）
    world/
      Chunk.ts            # Uint8Array ベースチャンク（16x128x16）
      World.ts            # チャンクMap、dirty、変更追跡、遠距離prune、生成キュー
      TerrainGenerator.ts # Value Noise + fBm 地形
      Mesher.ts           # フェースカリング
    core/
      GameLoop.ts         # 固定タイムステップ（1/60）+ rAF
      InputController.ts  # PointerLock + キー/マウス/ホイール
      PlayerController.ts # AABB物理、WASD、ジャンプ、しゃがみ、1人称/3人称
      raycast.ts          # Amanatides-Woo DDA ボクセルレイキャスト
    render/
      GameCanvas.tsx      # <Canvas> + シーン + ゲームループ + 自動セーブ
      CameraRig.ts        # 1人称/3人称カメラ追従
      ChunkMesh.tsx       # チャンクメッシュ（MeshLambertMaterial、共有）
      BlockHighlight.tsx  # 選択ブロックハイライト（EdgesGeometry）
    inventory/
      Inventory.ts        # スロット/スタック管理（ホットバー9+メイン27=36）
      InventoryUI.tsx     # インベントリ+クラフトUI（Eキー）
      Crafting.ts         # レシピマッチング（shapeless）
    save/
      db.ts               # IndexedDB ラッパ（idb）
      SaveRepository.ts   # 非同期 save/load
      saveSchema.ts       # versioned schema (v1)
    ui/
      Hud.tsx             # FPS/位置/クロスヘア/ヘルプ
      Hotbar.tsx          # ホットバーUI
      SlotView.tsx        # 共通スロット表示
      Menu.tsx            # スタート画面（新規/続きから）
```

## 操作

- WASD: 移動
- Space: ジャンプ
- Shift: しゃがみ
- マウス: 視点
- LMB: ブロック破壊
- RMB: ブロック設置
- ホイール: ホットバー選択
- E: インベントリ+クラフト
- F5: 1人称/3人称切替

## 開発フェーズ

- Phase 0-3: 足場、ワールド描画、プレイヤー移動、ブロック操作
- Phase 4-6: インベントリ、クラフト、セーブ/ロード
- Phase 7-11（予定）: 地形拡張、ライティング、テクスチャ/最適化、サバイバル、サウンド
