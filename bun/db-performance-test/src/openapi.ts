import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIV3 } from "openapi-types";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const isoExample = "2024-01-01T12:00:00.000Z";

export const todoSchema = registry.register(
  "Todo",
  z.object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    title: z.string().min(1),
    completed: z.boolean(),
    createdAt: z.string().openapi({
      example: isoExample,
      format: "date-time",
    }),
  })
);

export const userSchema = registry.register(
  "User",
  z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    email: z.string().email(),
    createdAt: z.string().openapi({
      example: isoExample,
      format: "date-time",
    }),
  })
);

export const userWithTodosSchema = registry.register(
  "UserWithTodos",
  userSchema.extend({
    todos: z.array(todoSchema),
  })
);

export const todoWithUserSchema = registry.register(
  "TodoWithUser",
  todoSchema.extend({
    user: userSchema,
  })
);

export const createUserInputSchema = registry.register(
  "CreateUserInput",
  z.object({
    name: z.string().min(1).openapi({ example: "Elysia User" }),
    email: z.string().email().openapi({ example: "elysia@example.com" }),
  })
);

export const createTodoInputSchema = registry.register(
  "CreateTodoInput",
  z.object({
    title: z.string().min(1).openapi({ example: "Write schema" }),
    userId: z.number().int().positive().openapi({ example: 1 }),
    completed: z.boolean().optional().openapi({ example: false }),
  })
);

const errorSchema = registry.register(
  "ErrorResponse",
  z.object({
    message: z.string(),
  })
);

registry.registerPath({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List all users with their todos",
  responses: {
    200: {
      description: "Array of users",
      content: {
        "application/json": {
          schema: z.array(userWithTodosSchema).openapi("UserListResponse"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Get single user with todos",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "1" }),
    }),
  },
  responses: {
    200: {
      description: "User with todos",
      content: {
        "application/json": {
          schema: userWithTodosSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/users",
  tags: ["Users"],
  summary: "Create user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createUserInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created user",
      content: {
        "application/json": {
          schema: userSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/todos",
  tags: ["Todos"],
  summary: "List todos with user data",
  responses: {
    200: {
      description: "Array of todos",
      content: {
        "application/json": {
          schema: z.array(todoWithUserSchema).openapi("TodoListResponse"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/todos",
  tags: ["Todos"],
  summary: "Create todo",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTodoInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created todo",
      content: {
        "application/json": {
          schema: todoSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Bun Drizzle API",
    version: "1.0.0",
    description: "Elysia + Drizzle API documented via Zod schemas",
  },
  servers: [
    {
      url: "http://localhost:3000",
    },
  ],
  tags: [
    { name: "Users", description: "User operations" },
    { name: "Todos", description: "Todo operations" },
  ],
}) as OpenAPIV3.Document;

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
