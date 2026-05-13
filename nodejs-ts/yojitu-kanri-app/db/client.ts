import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://yojitu:yojitu@localhost:5432/yojitu_kanri'

export const sql = postgres(databaseUrl)
export const db = drizzle(sql, { schema })
