import { drizzle } from "drizzle-orm/node-postgres";
import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";
import * as auth from "./schema/auth";
import * as todo from "./schema/todo";
import * as tag from "./schema/tag";

export { eq, and, isNull, isNotNull, desc, asc, not } from "drizzle-orm";

class CustomLogWriter implements LogWriter {
  write(message: string) {
    console.log(`\x1b[36m[SQL]\x1b[0m ${message}`);
  }
}

const logger = new DefaultLogger({ writer: new CustomLogWriter() });

export const db = drizzle(process.env.DATABASE_URL || "", {
  schema: { ...auth, ...todo, ...tag },
  logger,
});
