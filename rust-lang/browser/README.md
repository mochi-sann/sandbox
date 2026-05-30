# browser — Rust 製ミニブラウザエンジン

Rust で最小のブラウザエンジンを **段階的に** 構築する学習用プロジェクトです。
Matt Brubeck の ["Let's build a browser engine!" (robinson)](https://limpet.net/mbrubeck/2014/08/08/toy-layout-engine-1.html)
を下敷きに、HTML/CSS のごく小さなサブセットを解釈して 1 枚の画像に描画するまでの
レンダリングパイプラインを実装していきます。

## レンダリングパイプライン

```text
  HTML  ──parse──▶  DOM tree
  CSS   ──parse──▶  Stylesheet
                      │
        DOM + CSS ──▶ Style tree (styled nodes)
                      │
                 Layout tree (boxes with geometry)
                      │
                 Display list ──paint──▶ pixels (image)
```

各モジュールがパイプラインの 1 ステージに対応します。

| モジュール (`src/`) | 役割 |
| --- | --- |
| `dom`      | DOM ノード (要素 / テキスト) のツリー表現 |
| `html`     | HTML ソース文字列 → DOM ツリーへのパーサ |
| `css`      | CSS のデータモデルとパーサ (`Stylesheet` 等) |
| `style`    | DOM + CSS を合成したスタイルツリー (computed values) |
| `layout`   | スタイルツリー → ボックスツリー (位置・寸法 + テキストの行折り返し) |
| `painting` | レイアウトツリー → 描画コマンド → ピクセル/画像 (グリフ描画含む) |
| `font`     | DejaVu Sans フォントのラスタライズ (`fontdue` ラッパ) |
| `net`      | http(s) URL から HTML/CSS を取得する HTTP クライアント (`ureq`) |
| `gui`      | レンダリング結果をネイティブウィンドウに表示 (`winit` + `softbuffer`) |

## 構成

ライブラリ (`src/lib.rs`) とバイナリ (`src/main.rs`) の両方を持つ構成です。
エンジン本体はライブラリとして提供し、`main.rs` はそれを駆動する CLI です。

```
browser/
├── Cargo.toml
├── README.md
├── src/
│   ├── lib.rs        # クレートのエントリ。pub mod 宣言
│   ├── main.rs       # CLI ドライバ (全段を結線)
│   ├── dom.rs
│   ├── html.rs
│   ├── css.rs
│   ├── style.rs
│   ├── layout.rs
│   ├── painting.rs
│   ├── font.rs        # フォントのラスタライズ (fontdue)
│   ├── net.rs         # http(s) フェッチ (ureq)
│   └── gui.rs         # ネイティブウィンドウ表示 (winit + softbuffer)
├── examples/
│   ├── sample.html   # 動作確認用サンプル HTML
│   └── sample.css    # 動作確認用サンプル CSS
└── tests/
    ├── scaffold.rs   # モジュール構成のスモークテスト
    └── integration.rs # パイプライン全体の E2E テスト
```

## 段階的な構築ステージ

1. **Scaffold**: Cargo プロジェクトの足場とモジュール構成の雛形を作成。
2. **DOM**: `dom` モジュールでノードツリーを定義。
3. **HTML parser**: `html` で HTML を DOM に変換。
4. **CSS parser**: `css` で CSS をパースしデータモデルを構築。
5. **Style tree**: `style` で DOM と CSS を合成し computed values を求める。
6. **Layout**: `layout` でブロック/インラインのボックスツリーと幾何を計算。
7. **Painting**: `painting` で表示リストを生成しピクセル/画像に描画。
8. **Integration**: CLI で HTML+CSS を読み、PNG を出力する E2E を完成。
9. **Text**: `font` + インラインレイアウトでテキストを行折り返しし、グリフを
   アルファブレンドして描画 (複数フォントサイズ・継承された文字色に対応)。
10. **Networking**: `net` で `http(s)` URL から HTML/CSS を取得可能に
    (ローカルファイルと URL を引数ごとに自動判別)。
11. **GUI Window** (現在): `gui` でレンダリング結果をネイティブウィンドウに表示。

### 依存クレート

| クレート | バージョン | 用途 |
| --- | --- | --- |
| `image`     | 0.25 | キャンバスの PNG エンコード |
| `fontdue`   | 0.9  | フォントのグリフラスタライズ |
| `ureq`      | 3    | http(s) からの HTML/CSS 取得 (rustls 既定) |
| `winit`     | 0.30 | ウィンドウ生成とイベントループ (`ApplicationHandler`) |
| `softbuffer`| 0.4  | CPU ピクセルバッファをウィンドウへ転送 |

## 使い方

```sh
# ビルド
cargo build

# テスト (ユニット + 統合テスト)
cargo test

# サンプルをレンダリング (引数なし: examples/sample.* → output.png, 800x600)
cargo run

# 任意の HTML/CSS を指定して PNG を出力
cargo run -- <html> <css> <out.png> [width] [height]
# 例:
cargo run -- examples/sample.html examples/sample.css out.png 400 400

# URL から HTML/CSS を取得して描画 (http(s) を自動判別)
cargo run -- https://example.com/index.html https://example.com/style.css out.png

# ネイティブウィンドウに表示 (PNG は出力しない。閉じるか Esc で終了)
cargo run -- --gui
cargo run -- examples/sample.html examples/sample.css --gui

# ヘルプ
cargo run -- --help
```

`HTML` / `CSS` 引数はローカルファイルパスでも `http(s)` URL でも構いません
(`net::is_url` で自動判別します)。`--gui` はフラグなので位置引数の順序には影響せず、
任意の位置に置けます。`--gui` 指定時は PNG ではなくウィンドウ表示になります。

### CLI 引数

| 引数 | 説明 | デフォルト |
| --- | --- | --- |
| `HTML`    | 入力 HTML のパス または http(s) URL | `examples/sample.html` |
| `CSS`     | 入力 CSS のパス または http(s) URL  | `examples/sample.css` |
| `OUT.png` | 出力 PNG ファイルのパス (`--gui` 時は無視) | `output.png` |
| `WIDTH`   | ビューポート幅 (px)      | `800` |
| `HEIGHT`  | キャンバス高さ (px)      | `600` |
| `--gui`   | ネイティブウィンドウに表示 (フラグ) | (なし) |

CLI は内部で `html::parse → css::parse → style::style_tree → layout::layout_tree →
painting::paint → Canvas::save_png` を順に呼び出してパイプライン全体を駆動します。

### 制限事項

- CSS パーサはコメント (`/* ... */`) 未対応。サンプルもコメントなしで記述しています。
- インラインレイアウトは行単位のみ。1 つの段落内のテキストはブロックの `font-size` を
  共有し、`<span>` など個別スタイルのインライン要素は親のテキスト行に平坦化されます
  (段落内での混在スタイルは未対応)。長い単語の途中改行も未対応。
- 空白処理は単純な collapse-and-trim (`white-space: pre` 等は未対応)。
- 長さ単位は `px` のみ。グリフはアルファブレンドしますが、ソリッド矩形は上書き塗り。
- `net::fetch` はボディを UTF-8 として読み、タイムアウト/リダイレクト上限やリンク
  された CSS の相対 URL 解決は未対応。
- `--gui` は WSLg など表示サーバが必要。ウィンドウはキャンバスを左上に等倍表示します
  (スケーリングなし)。ヘッドレス環境ではハングし得るため、CI/テストでは起動しません。
- バックエンド選択: `WAYLAND_DISPLAY` が設定されていれば Wayland を優先します
  (winit は既定で X11 を選ぶため、WSLg のように `DISPLAY` が到達不能な X サーバを
  指していると `Broken pipe` で失敗するのを避ける目的)。`WINIT_UNIX_BACKEND=x11` /
  `=wayland` で明示的に上書きできます。

## ライセンス

MIT
