import { z } from "zod";
import { db, eq, and } from "@my-better-t-app/db";
import { user } from "@my-better-t-app/db/schema/auth";
import { todo } from "@my-better-t-app/db/schema/todo";
import { tag } from "@my-better-t-app/db/schema/tag";
import { protectedProcedure } from "../index";
import { ORPCError } from "@orpc/server";

export const userRouter = {
  deleteAccount: protectedProcedure
    .output(z.object({ scheduledDeletionAt: z.date() }))
    .handler(async ({ context }) => {
      const now = new Date();
      const [updated] = await db
        .update(user)
        .set({ deletedAt: now })
        .where(eq(user.id, context.session.user.id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "User not found" });
      }

      // In a real system, we'd schedule a job to hard delete after X days.
      // For now, we just mark it as deleted.
      return { scheduledDeletionAt: now };
    }),

  exportData: protectedProcedure
    .output(
      z.object({
        user: z.any(),
        todos: z.array(z.any()),
        tags: z.array(z.any()),
      }),
    )
    .handler(async ({ context }) => {
      const userData = await db.query.user.findFirst({
        where: eq(user.id, context.session.user.id),
      });

      const todos = await db.query.todo.findMany({
        where: eq(todo.userId, context.session.user.id),
        with: {
          tags: { with: { tag: true } },
        },
      });

      const tags = await db.query.tag.findMany({
        where: eq(tag.userId, context.session.user.id),
      });

      return {
        user: userData,
        todos,
        tags,
      };
    }),
};
