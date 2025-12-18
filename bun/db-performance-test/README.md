# Elysia with Bun runtime

## Getting Started
To get started with this template, simply paste this command into your terminal:
```bash
bun create elysia ./elysia-example
```

## Development

```bash
bun install
cp .env.example .env # 必要に応じて接続情報を調整
docker compose up -d # PostgreSQL 起動
bun run db:push # Drizzle 経由でテーブル作成
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.
Swagger UI / OpenAPI: http://localhost:3000/swagger
