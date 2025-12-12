import z from "zod";
import { ORPCError } from "@orpc/server";
import { db, eq, and } from "@my-better-t-app/db";
import { todo } from "@my-better-t-app/db/schema/todo";
import { todoTag } from "@my-better-t-app/db/schema/tag";
import { protectedProcedure } from "../index";

const todoSchema = z.object({
  id: z.number(),
  text: z.string(),
  body: z.string().nullable(),
  completed: z.boolean(),
  userId: z.string(),
  dueAt: z.date().nullable(),
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
  getAll: protectedProcedure.output(z.array(todoSchema)).handler(async ({ context }) => {
    const todos = await db.query.todo.findMany({
      where: eq(todo.userId, context.session.user.id),
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

      // Fetch full object with tags to return
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
        // Replace tags
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
        .set({ completed: input.completed })
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
        .delete(todo)
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning();

      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Todo not found or access denied",
        });
      }

      // Return with empty tags as it's deleted
      return { ...deleted, tags: [] };
    }),
};
