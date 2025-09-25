
# ライセンス / セットアップ
```sh
# 依存関係のインストール
uv sync

# ライセンス一覧(JSON)の生成
uv run pip-licenses --from=mixed --with-authors --with-urls \
  --format=json --output-file=licenses.json
```

# アプリの起動
```sh
uv run python app.py   # または main.py
```

# ビルド（配布用バイナリ）
PyInstaller を `uvx` で呼び出してビルドします。
```sh
# 1ファイル実行形式（推奨）
make build            # dist/my-gui (OSに応じた拡張子)

# ディレクトリ形式（デバッグしやすい）
make build-dir        # dist/my-gui/

# 後片付け
make clean
```
任意のエントリポイントやアプリ名にしたい場合:
```sh
make build ENTRY=main.py APP_NAME=my-app
```

# 画像処理（Pillow）
- 「画像を開く」で画像を読み込み
- 「グレースケールに変換」でプレビュー更新
- 「画像を保存」で変換後または元画像を保存

# URLから画像を読み込む
- 「画像URL」にURLを貼って「URLを読み込む」を押下
- 一部サイトはヘッダ要件等で取得できない場合があります
