# Kysely Hono Todo App

A Todo application built with Hono and Kysely with automatic schema-based migrations.

## Features

- RESTful API with Hono
- Type-safe database queries with Kysely
- SQLite database
- Schema-based automatic migration generation
- TypeScript support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize the schema:
```bash
npm run schema:init
```

3. Generate initial migration:
```bash
npm run schema:generate
```

4. Run migrations:
```bash
npm run migrate:up
```

5. Start the development server:
```bash
npm run dev
```

## Schema Management

### Define Your Schema

Edit the `src/schema.ts` file to define your database schema:

```typescript
export const SCHEMA_DEFINITION: TableDefinition[] = [
  {
    name: 'todos',
    columns: [
      {
        name: 'id',
        type: 'integer',
        primaryKey: true,
        autoIncrement: true,
      },
      {
        name: 'title',
        type: 'text',
        nullable: false,
      },
      // ... more columns
    ],
  },
];
```

### Generate Migrations

After modifying the schema, generate migrations automatically:

```bash
npm run schema:generate
```

This will:
1. Compare your current schema with the previous snapshot
2. Generate a migration file in the `migrations/` directory
3. Update the schema snapshot

### Available Commands

- `npm run schema:init` - Initialize schema snapshot
- `npm run schema:generate` - Generate migration from schema changes
- `npm run schema:diff` - Show schema differences without generating migration
- `npm run migrate:up` - Run pending migrations
- `npm run migrate:down` - Rollback last migration

## API Endpoints

- `GET /todos` - Get all todos
- `GET /todos/:id` - Get a specific todo
- `POST /todos` - Create a new todo
- `PUT /todos/:id` - Update a todo
- `DELETE /todos/:id` - Delete a todo

## Example Usage

### Create a todo:
```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Kysely", "description": "Learn how to use Kysely with Hono"}'
```

### Get all todos:
```bash
curl http://localhost:3000/todos
```

## Schema Workflow

1. **Modify Schema**: Edit `src/schema.ts` to add/remove/modify tables and columns
2. **Generate Migration**: Run `npm run schema:generate` to create migration files
3. **Apply Migration**: Run `npm run migrate:up` to apply changes to the database
4. **Develop**: Continue developing with the updated schema

The system automatically tracks schema changes and generates appropriate migration files, making database schema management seamless and version-controlled.