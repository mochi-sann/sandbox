import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";

const app = new Hono();
const prisma = new PrismaClient()

app.get("/", (c) => {
  return c.text("Hello Hono!");
});
app.get("/todos", async  (c) => {
  const todos = await prisma.todo.findMany();
  console.log(...[todos, '👀 [index.ts:13]: todos'].reverse());
  return c.json(todos);
});
app.get("/todos-users", async  (c) => {
  const todos = await prisma.todoTag.findMany();
  console.log(...[todos, '👀 [index.ts:13]: todos'].reverse());
  return c.json(todos);
});
app.get("/todos/view", async  (c) => {
  const todos = await prisma.todo_list_with_user.findMany();
  console.log(...[todos, '👀 [index.ts:13]: todos'].reverse());
  return c.json(todos);
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
