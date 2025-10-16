### Todo API

このプロジェクトは FastAPI 製の Todo 管理 API です。SQLite による永続化と OpenAPI ドキュメントを提供し、`httpx.AsyncClient` を用いた統合テストが付属します。

#### セットアップ
- 依存関係のインストール: `uv sync`
- 開発サーバー起動: `uv run uvicorn main:app --reload`
  - デフォルトで `http://127.0.0.1:8000` が立ち上がり、`/docs` と `/redoc` で OpenAPI を確認できます。
- SQLite データベース: プロジェクト直下の `todos.db` に永続化されます。不要であれば削除または `.gitignore` 登録を検討してください。

#### テスト
- API 統合テスト: `uv run pytest`
  - テストではメモリ上の SQLite を使用するため、本番データベースを変更しません。
