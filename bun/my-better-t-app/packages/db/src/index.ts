import { drizzle } from "drizzle-orm/node-postgres";
import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";
import { Pool } from "pg";
import * as auth from "./schema/auth";
import * as todo from "./schema/todo";
import * as tag from "./schema/tag";
import * as audit from "./schema/audit";
import * as project from "./schema/project";
import chalk from "chalk";
import { highlightMeta, highlightSql } from "./utils/logHilight";

export { eq, and, isNull, isNotNull, desc, asc, not, ilike, or, exists } from "drizzle-orm";

class CustomLogWriter implements LogWriter {
  write(message: string) {
    const output =
      message.includes("SELECT") || message.includes("INSERT")
        ? highlightSql(message)
        : highlightMeta(message);

    console.log(`${chalk.gray("[db]")} ${chalk.cyanBright("SQL")}\n${output}\n`);
  }
}

const logger = new DefaultLogger({ writer: new CustomLogWriter() });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "",
});

const originalQuery = pool.query.bind(pool);
pool.query = (async (...args: any[]) => {
  const start = performance.now();
  // @ts-ignore
  const result = await originalQuery(...args);
  const end = performance.now();
  const duration = (end - start).toFixed(2);
  console.log(`${chalk.gray("[db]")} ${chalk.greenBright(`Duration: ${duration}ms`)}`);
  return result;
}) as any;

export const db = drizzle(pool, {
  schema: { ...auth, ...todo, ...tag, ...audit, ...project },
  logger,
});
