
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

# 画像処理（Pillow）
- 「画像を開く」で画像を読み込み
- 「グレースケールに変換」でプレビュー更新
- 「画像を保存」で変換後または元画像を保存

# URLから画像を読み込む
- 「画像URL」にURLを貼って「URLを読み込む」を押下
- 一部サイトはヘッダ要件等で取得できない場合があります
