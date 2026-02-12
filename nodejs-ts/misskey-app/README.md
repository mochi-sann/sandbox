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
bun run start
```

起動すると1回投稿し、その後は `POST_INTERVAL_SEC` ごとに自動投稿します。

## トラブルシュート

- `OpenRouter API error (401): User not found.` が出る場合:
  - `OPENROUTER_API_KEY` を再発行して `.env` に入れ直してください
  - 前後に空白や引用符が入っていないか確認してください
  - 利用中の OpenRouter アカウントで発行したキーか確認してください
