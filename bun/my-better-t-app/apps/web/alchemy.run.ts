import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });

const app = await alchemy("my-better-t-app");

export const web = await TanStackStart("web", {
	bindings: {
		DATABASE_URL: alchemy.secret(process.env.DATABASE_URL),
		CORS_ORIGIN: process.env.CORS_ORIGIN || "",
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
	},
	dev: {
		command: "bun run dev",
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
