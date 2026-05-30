# browser — Rust 製ミニブラウザエンジン

Rust で本格派寄りのブラウザエンジンを **段階的に** 構築する学習用プロジェクトです。
Matt Brubeck の ["Let's build a browser engine!" (robinson)](https://limpet.net/mbrubeck/2014/08/08/toy-layout-engine-1.html)
を下敷きに、HTML/CSS のサブセットを解釈してネイティブウィンドウに描画し、
リンククリックで再ナビゲーションするところまでを実装しています。

## レンダリングパイプライン

```text
  URL/file ──fetch──▶ bytes ──decode──▶ HTML 文字列
  HTML  ──parse──▶  DOM tree
  CSS   ──parse──▶  Stylesheet (UA 既定 + ページ内 <style>)
                      │
        DOM + CSS ──▶ Style tree (cascade + 継承 + computed values)
                      │
                 Layout tree (box model + block/inline + text shaping)
                      │
                 Display list ──paint(tiny-skia)──▶ Pixmap
                      │
            ┌─────────┴──────────┐
        PNG 出力            winit ウィンドウ表示 + リンク遷移
```

## ワークスペース構成

単一クレートから Cargo ワークスペースへ移行済みです。各エンジン機能が独立した
ライブラリクレート (`crates/*`) になり、CLI バイナリ (`apps/browser`) がそれらを束ねます。
パッケージ名は `browser-<name>`、ライブラリ名は `browser_<name>` です。

```text
browser/
├── Cargo.toml                 # [workspace] / 共有メタデータ / 共有依存
├── crates/
│   ├── dom/      browser-dom     DOM Node/NodeType/ElementData 型と text/elem
│   ├── html/     browser-html    再帰下降 HTML パーサ → DOM
│   ├── css/      browser-css     CSS パーサ/モデル (!important, shorthand, Px/Em/%)
│   ├── style/    browser-style   スタイルツリー (cascade + 継承 + computed + em/%)
│   ├── text/     browser-text    フォント読込・rustybuzz シェーピング・fontdue ラスタライズ
│   ├── layout/   browser-layout  box model + block/inline レイアウト + 折り返し
│   ├── paint/    browser-paint   ディスプレイリスト + tiny-skia ラスタライズ + PNG
│   ├── net/      browser-net     URL parse/resolve・http(s)/file fetch・charset decode
│   └── shell/    browser-shell   winit+softbuffer ウィンドウ + ナビゲーション + hit-test
└── apps/
    └── browser/  browser         CLI ドライバ (URL/ファイル → PNG または --gui)
```

クレート間の依存はおおむね上から下へ単方向です
(`shell` は `dom/html/css/style/layout/paint/net` に依存し、`apps/browser` が全体を束ねます)。

## マイルストーンの達成内容 (M1–M4)

- **M1 — エンジン基盤**: DOM / HTML パーサ / CSS パーサ / スタイルツリー / box model
  レイアウト / ディスプレイリスト描画 / PNG 出力。ワークスペース化。
- **M2 — カスケード**: `!important`・specificity・source order による本物のカスケード、
  color/font-size などの継承、initial 値テーブル、`em`/`%` の font-size 解決。
- **M3 — テキスト & ペイント**: rustybuzz によるシェーピング (advance/offset を px へ)、
  fontdue による glyph ラスタライズ、tiny-skia (`Pixmap`) による矩形/ボーダー/テキスト描画。
- **M4 — シェル & ナビゲーション**: winit + softbuffer のネイティブウィンドウ表示、
  ウィンドウリサイズ・スクロール対応、`<a href>` のヒットテストとリンククリック遷移、
  履歴 (戻る)、URL 解決 (相対 href を現在ページ基準で resolve)。

## 本格派の依存

| クレート | 用途 |
|----------|------|
| [`url`](https://crates.io/crates/url) | URL parse / 相対参照の resolve |
| [`encoding_rs`](https://crates.io/crates/encoding_rs) | charset を見た best-effort テキストデコード |
| [`ureq`](https://crates.io/crates/ureq) | http(s) fetch (rustls TLS, gzip, redirect) |
| [`rustybuzz`](https://crates.io/crates/rustybuzz) | テキストシェーピング (advance / cluster) |
| [`fontdue`](https://crates.io/crates/fontdue) | glyph ラスタライズ (カバレッジ bitmap) |
| [`tiny-skia`](https://crates.io/crates/tiny-skia) | 2D ラスタライズ (`Pixmap`) + PNG エンコード |
| [`winit`](https://crates.io/crates/winit) 0.30 | ウィンドウ / イベントループ |
| [`softbuffer`](https://crates.io/crates/softbuffer) 0.4 | CPU ピクセルバッファをウィンドウへ転送 |
| [`image`](https://crates.io/crates/image) | 互換 Canvas の PNG 出力 (補助) |

フォントは `crates/text/assets/DejaVuSans.ttf` を `include_bytes!` で埋め込んでいます。

## 使い方

ビルド・テスト:

```bash
cargo build --workspace
cargo test  --workspace
```

### ファイル / URL を PNG にレンダリング

```bash
# 既定 (examples/sample.html + examples/sample.css) を 800x600 で output.png に出力
cargo run -p browser

# HTML/CSS/出力先/幅/高さを指定
cargo run -p browser -- page.html style.css out.png 1024 768

# URL からも取得可能 (http/https)
cargo run -p browser -- https://example.com/ style.css out.png
```

### ナビゲーション可能なウィンドウ (`--gui`)

`--gui` を付けると、HTML 引数 (URL またはローカルパス) を起点に **対話的な**
ブラウザウィンドウを開きます。CSS 引数はこのモードでは無視され、
ページ内の `<style>` と組み込みのユーザエージェント既定スタイルシートが使われます。

```bash
cargo run -p browser -- page.html --gui
cargo run -p browser -- https://example.com/ --gui
```

操作:

| 操作 | 動作 |
|------|------|
| `<a href>` を左クリック | そのリンクへ遷移 (相対 href は現在ページ基準で解決) |
| Backspace / ブラウザ Back キー | 履歴を 1 つ戻る |
| マウスホイール | ページを縦スクロール |
| Esc / 閉じるボタン | 終了 |

### スタイルのダンプ (`--dump-style`)

```bash
cargo run -p browser -- page.html style.css --dump-style
```

DOM ツリーに各ノードの computed style (cascade + 継承) を注釈して標準出力に表示します。

## アーキテクチャ上の判断

- **ヒットテストの window 非依存化**: `browser_shell::hit_test(layout, x, y)` と
  `collect_links(layout)` はウィンドウを開かずに動作し、単体テストできます。
  実行中のウィンドウは描画後にリンク矩形の所有スナップショット (`Vec<LinkArea>`) を
  作り、クリック時はそれを `hit_test_links` で引きます。これにより
  「DOM/style/layout を借用する LayoutBox」を event loop 越しに保持せずに済みます。
- **arena DOM 未採用**: 本プロジェクトの DOM は `Node` が `Vec<Node>` で子を所有する
  単純な所有ツリーです。学習用途では親リンクや任意ノード参照が不要で、
  借用チェッカと素直に付き合えるこの形が読みやすいため、`id`/arena 方式
  (例: `indextree`) は採用していません。双方向リンクや DOM 変更 (スクリプト) が
  必要になった段階で再検討します。

## 既知の制限 (今後)

- **Flexbox / Grid 未実装**: レイアウトは block + 単純な inline 折り返しのみ。
- **JavaScript 未実装**: DOM は静的。スクリプト実行やイベント・DOM 変更はありません。
- **`<link rel="stylesheet">` の外部 CSS 取得は未配線**: `--gui` はページ内 `<style>`
  と UA 既定のみを読みます (`net::resolve` は用意済みなので将来 `<link>` を辿れます)。
- 複雑スクリプト / 合字 / RTL・BiDi、web-font 読み込み、`line-height` のレイアウト消費、
  半透明背景の真のアルファ合成、サブピクセル AA は未対応。
- `--gui` の表示はビューポート幅でレイアウトした文書の上端を等倍表示し、
  ホイールで縦スクロールします (横スクロール・ズームなし)。
