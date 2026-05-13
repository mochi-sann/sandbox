import 'dotenv/config'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sql } from '../db/client.ts'

await migrate(db, { migrationsFolder: './drizzle' })
await sql.end()
