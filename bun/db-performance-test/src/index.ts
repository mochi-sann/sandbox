import "dotenv/config";
import { Elysia, t } from "elysia";
import { db, schema } from "./db";

const app = new Elysia()
  .get("/", () => ({ status: "ok" }))
  .get("/users", async () => {
    return db.query.users.findMany({
      with: { todos: true },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  })
  .get("/users/:id", async ({ params }) => {
    const userId = Number(params.id);

    if (Number.isNaN(userId)) {
      return new Response("Invalid user id", { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: (fields, operators) => operators.eq(fields.id, userId),
      with: { todos: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    return user;
  })
  .post(
    "/users",
    async ({ body }) => {
      const [user] = await db
        .insert(schema.users)
        .values({ name: body.name, email: body.email })
        .returning();

      return user;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
      }),
    }
  )
  .post(
    "/todos",
    async ({ body }) => {
      const [todo] = await db
        .insert(schema.todos)
        .values({
          title: body.title,
          userId: body.userId,
          completed: body.completed ?? false,
        })
        .returning();

      return todo;
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        userId: t.Number(),
        completed: t.Optional(t.Boolean()),
      }),
    }
  )
  .get("/todos", async () => {
    return db.query.todos.findMany({
      with: { user: true },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  });

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port);

console.log(`🦊 Elysia is running at ${server.server?.hostname}:${server.server?.port}`);
