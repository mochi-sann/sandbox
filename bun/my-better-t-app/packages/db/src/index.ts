import { drizzle } from "drizzle-orm/node-postgres";
import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";
import * as auth from "./schema/auth";
import * as todo from "./schema/todo";
import * as tag from "./schema/tag";
import chalk from "chalk";
import { highlightMeta, highlightSql } from "./utils/logHilight";

export {
  eq,
  and,
  isNull,
  isNotNull,
  desc,
  asc,
  not,
  ilike,
  or,
  exists,
} from "drizzle-orm";

class CustomLogWriter implements LogWriter {
  write(message: string) {
    const output =
      message.includes("SELECT") || message.includes("INSERT")
        ? highlightSql(message)
        : highlightMeta(message);

    console.log(`${chalk.cyan("[SQL]")} ${output}`);

    const sql = highlightSql(message);

    console.log(`${chalk.gray("[db]")} ${chalk.cyanBright("SQL")}\n${sql}\n`);
  }
}

const logger = new DefaultLogger({ writer: new CustomLogWriter() });

export const db = drizzle(process.env.DATABASE_URL || "", {
  schema: { ...auth, ...todo, ...tag },
  logger,
});
