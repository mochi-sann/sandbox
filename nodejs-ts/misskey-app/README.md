# misskey-app

OpenRouter (`openai/gpt-oss-20b`) で生成したテキストを Misskey に定期投稿するデモBOTです。

## セットアップ

```bash
bun install
cp .env.example .env
```

`.env` に以下を設定してください。

- `OPENROUTER_API_KEY`: OpenRouter APIキー
- `OPENROUTER_MODEL`: 既定は `openai/gpt-oss-20b`
- `MISSKEY_BASE_URL`: MisskeyインスタンスURL（例: `https://misskey.io`）
- `MISSKEY_API_TOKEN`: 投稿権限を持つMisskeyのAPIトークン
- `POST_INTERVAL_SEC`: 投稿間隔（秒）

## 実行

```bash
bun run index.ts
```

起動すると1回投稿し、その後は `POST_INTERVAL_SEC` ごとに自動投稿します。
