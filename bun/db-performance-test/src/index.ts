import "dotenv/config";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { performance } from "node:perf_hooks";
import { db, schema } from "./db";
import {
  CreateTodoInput,
  CreateUserInput,
  createTodoInputSchema,
  createUserInputSchema,
  openApiDocument,
} from "./openapi";

const getPathFromUrl = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const formatDuration = (ms: number) => `${ms.toFixed(2)}ms`;

const swaggerExcludedMethods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "TRACE",
  "CONNECT",
  "ALL",
];

const jsonError = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const app = new Elysia()
  .derive(({ request }) => ({
    requestStart: performance.now(),
    requestPath: getPathFromUrl(request.url),
  }))
  .onAfterHandle(({ request, set, requestStart, requestPath }, value) => {
    const duration = performance.now() - requestStart;
    const status =
      value instanceof Response ? value.status : set.status ?? 200;

    console.info(
      `[HTTP] ${request.method} ${requestPath} ${status} ${formatDuration(duration)}`
    );

    return value;
  })
  .onError(({ request, error, requestStart, requestPath, code }) => {
    const duration = performance.now() - requestStart;
    const statusCode = typeof code === "number" ? code : 500;
    console.error(
      `[HTTP] ${request.method} ${requestPath} ${statusCode} ${formatDuration(
        duration
      )}`,
      error
    );
  })
  .use(
    swagger({
      documentation: openApiDocument,
      excludeMethods: swaggerExcludedMethods,
    })
  )
  .get("/", () => ({ status: "ok" }))
  .get("/openapi.json", () => openApiDocument, {
    detail: { hide: true },
  })
  .get("/users", async () => {
    return db.query.users.findMany({
      with: { todos: true },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  })
  .get("/users/:id", async ({ params }) => {
    const userId = Number(params.id);

    if (Number.isNaN(userId)) {
      return jsonError({ message: "Invalid user id" }, 400);
    }

    const user = await db.query.users.findFirst({
      where: (fields, operators) => operators.eq(fields.id, userId),
      with: { todos: true },
    });

    if (!user) {
      return jsonError({ message: "User not found" }, 404);
    }

    return user;
  })
  .post(
    "/users",
    async ({ body }) => {
      const parsed = createUserInputSchema.safeParse(body);

      if (!parsed.success) {
        return jsonError(
          { message: "Invalid request", issues: parsed.error.flatten() },
          400
        );
      }

      const payload: CreateUserInput = parsed.data;

      const [user] = await db
        .insert(schema.users)
        .values({ name: payload.name, email: payload.email })
        .returning();

      return new Response(JSON.stringify(user), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
  )
  .post("/todos", async ({ body }) => {
    const parsed = createTodoInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        { message: "Invalid request", issues: parsed.error.flatten() },
        400
      );
    }

    const payload: CreateTodoInput = parsed.data;

    const [todo] = await db
      .insert(schema.todos)
      .values({
        title: payload.title,
        userId: payload.userId,
        completed: payload.completed ?? false,
      })
      .returning();

    return new Response(JSON.stringify(todo), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  })
  .get("/todos", async () => {
    return db.query.todos.findMany({
      with: { user: true },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
  });

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port);

console.log(`🦊 Elysia is running at ${server.server?.hostname}:${server.server?.port}`);
