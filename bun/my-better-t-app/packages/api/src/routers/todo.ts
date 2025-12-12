import z from "zod";
import { ORPCError } from "@orpc/server";
import { db, eq, and, isNull, or, ilike, exists } from "@my-better-t-app/db";
import { todo } from "@my-better-t-app/db/schema/todo";
import { todoTag, tag } from "@my-better-t-app/db/schema/tag";
import { protectedProcedure } from "../index";

const todoSchema = z.object({
  id: z.number(),
  text: z.string(),
  body: z.string().nullable(),
  completed: z.boolean(),
  userId: z.string(),
  dueAt: z.date().nullable(),
  startAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  priority: z.string().nullable(),
  isStarred: z.boolean(),
  estimatedMinutes: z.number().nullable(),
  actualMinutes: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        color: z.string(),
      }),
    )
    .default([]),
});

export const todoRouter = {
  getAll: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .output(z.array(todoSchema))
    .handler(async ({ input, context }) => {
      const search = input?.search;
      const todos = await db.query.todo.findMany({
        where: and(
          eq(todo.userId, context.session.user.id),
          isNull(todo.deletedAt),
          search
            ? or(
                ilike(todo.text, `%${search}%`),
                ilike(todo.body, `%${search}%`),
                exists(
                  db
                    .select()
                    .from(todoTag)
                    .innerJoin(tag, eq(todoTag.tagId, tag.id))
                    .where(and(eq(todoTag.todoId, todo.id), ilike(tag.name, `%${search}%`))),
                ),
              )
            : undefined,
        ),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      return todos.map((t) => ({
        ...t,
        tags: t.tags.map((tt) => tt.tag),
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        body: z.string().optional(),
        dueAt: z.date().optional(),
        startAt: z.date().optional(),
        priority: z.string().optional(),
        isStarred: z.boolean().optional(),
        estimatedMinutes: z.number().optional(),
        tags: z.array(z.number()).optional(),
      }),
    )
    .output(todoSchema)
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(todo)
        .values({
          text: input.text,
          body: input.body,
          userId: context.session.user.id,
          dueAt: input.dueAt,
          startAt: input.startAt,
          priority: input.priority,
          isStarred: input.isStarred ?? false,
          estimatedMinutes: input.estimatedMinutes,
        })
        .returning();

      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to create todo",
        });
      }

      if (input.tags && input.tags.length > 0) {
        await db.insert(todoTag).values(
          input.tags.map((tagId) => ({
            todoId: created.id,
            tagId,
          })),
        );
      }

      const fullTodo = await db.query.todo.findFirst({
        where: eq(todo.id, created.id),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!fullTodo) throw new ORPCError("INTERNAL_SERVER_ERROR");

      return {
        ...fullTodo,
        tags: fullTodo.tags.map((tt) => tt.tag),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        text: z.string().optional(),
        body: z.string().nullable().optional(),
        completed: z.boolean().optional(),
        dueAt: z.date().nullable().optional(),
        startAt: z.date().nullable().optional(),
        priority: z.string().nullable().optional(),
        isStarred: z.boolean().optional(),
        estimatedMinutes: z.number().nullable().optional(),
        actualMinutes: z.number().nullable().optional(),
        tags: z.array(z.number()).optional(),
      }),
    )
    .output(todoSchema)
    .handler(async ({ input, context }) => {
      const { id, tags, ...updates } = input;
      const [updated] = await db
        .update(todo)
        .set(updates)
        .where(and(eq(todo.id, id), eq(todo.userId, context.session.user.id)))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Todo not found or access denied",
        });
      }

      if (tags !== undefined) {
        await db.delete(todoTag).where(eq(todoTag.todoId, id));
        if (tags.length > 0) {
          await db.insert(todoTag).values(
            tags.map((tagId) => ({
              todoId: id,
              tagId,
            })),
          );
        }
      }

      const fullTodo = await db.query.todo.findFirst({
        where: eq(todo.id, id),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!fullTodo) throw new ORPCError("INTERNAL_SERVER_ERROR");

      return {
        ...fullTodo,
        tags: fullTodo.tags.map((tt) => tt.tag),
      };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .output(todoSchema)
    .handler(async ({ input, context }) => {
      const [updated] = await db
        .update(todo)
        .set({
          completed: input.completed,
          completedAt: input.completed ? new Date() : null,
        })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Todo not found or access denied",
        });
      }

      const fullTodo = await db.query.todo.findFirst({
        where: eq(todo.id, updated.id),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!fullTodo) throw new ORPCError("INTERNAL_SERVER_ERROR");

      return {
        ...fullTodo,
        tags: fullTodo.tags.map((tt) => tt.tag),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .output(todoSchema)
    .handler(async ({ input, context }) => {
      const [deleted] = await db
        .update(todo)
        .set({ deletedAt: new Date() })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning();

      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Todo not found or access denied",
        });
      }

      const fullTodo = await db.query.todo.findFirst({
        where: eq(todo.id, deleted.id),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!fullTodo) return { ...deleted, tags: [] };

      return {
        ...fullTodo,
        tags: fullTodo.tags.map((tt) => tt.tag),
      };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .output(todoSchema)
    .handler(async ({ input, context }) => {
      const [restored] = await db
        .update(todo)
        .set({ deletedAt: null })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning();

      if (!restored) {
        throw new ORPCError("NOT_FOUND", {
          message: "Todo not found or access denied",
        });
      }

      const fullTodo = await db.query.todo.findFirst({
        where: eq(todo.id, restored.id),
        with: {
          tags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!fullTodo) throw new ORPCError("INTERNAL_SERVER_ERROR");

      return {
        ...fullTodo,
        tags: fullTodo.tags.map((tt) => tt.tag),
      };
    }),
};
