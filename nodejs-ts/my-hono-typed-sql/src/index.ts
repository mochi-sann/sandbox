import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { getUsersWithPosts } from "@prisma/client/sql";
import { Hono } from "hono";

const app = new Hono();
const prisma = new PrismaClient()

app.get("/", (c) => {
  return c.text("Hello Hono!");
});
app.get("/users", async (c) => {
  const usersWithPostCounts = await prisma.$queryRawTyped(getUsersWithPosts())
  let users = usersWithPostCounts.map(value => ({
    postCount: Number(value.postCount)
    , name: value.name, id: value.id

  }))
  console.log(...[users, '👀 [index.ts:19]: users'].reverse());

  return c.json(users);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
