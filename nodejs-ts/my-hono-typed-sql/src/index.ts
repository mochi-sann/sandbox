import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { get_users, getUsersWithPosts } from "@prisma/client/sql";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();
app.use(logger())
const prisma = new PrismaClient({
	log: ["info", "warn", "query", "error"],
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});
app.get("/users", async (c) => {
	const users = await prisma.$queryRawTyped(get_users());
	return c.json(users);
});

app.get("/users/postCount", async (c) => {
	const usersWithPostCounts = await prisma.$queryRawTyped(getUsersWithPosts());
	const users = usersWithPostCounts.map((value) => ({
		postCount: Number(value.postCount),
		name: value.name,
		id: value.id,
	}));

	return c.json(users);
});
app.get("/users/postCount/prisma", async (c) => {
	const usersWithPostCounts = await prisma.user.findMany({
		orderBy: [
			{
				posts: {
					_count: "desc",
				},
			},
		],
		select: {
			id: true,
			name: true,
			_count: {
				select: {
					posts: true,
				},
			},
		},

	});

	return c.json(usersWithPostCounts);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});
