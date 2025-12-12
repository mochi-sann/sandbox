import { drizzle } from "drizzle-orm/node-postgres";
import * as auth from "./schema/auth";
import * as todo from "./schema/todo";
import * as tag from "./schema/tag";

export { eq, and } from "drizzle-orm";

export const db = drizzle(process.env.DATABASE_URL || "", {
	schema: { ...auth, ...todo, ...tag },
});
