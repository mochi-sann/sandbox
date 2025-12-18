import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

config();

const connectionString =
  process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/bun_app";

const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client, { schema });
export { schema };
