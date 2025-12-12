import { z } from "zod";
import { db, eq, and } from "@my-better-t-app/db";
import { project } from "@my-better-t-app/db/schema/project";
import { protectedProcedure } from "../index";
import { ORPCError } from "@orpc/server";

const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectRouter = {
  list: protectedProcedure.output(z.array(projectSchema)).handler(async ({ context }) => {
    return await db.select().from(project).where(eq(project.userId, context.session.user.id));
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .output(projectSchema)
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(project)
        .values({
          name: input.name,
          description: input.description,
          userId: context.session.user.id,
        })
        .returning();

      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to create project",
        });
      }
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .output(projectSchema)
    .handler(async ({ input, context }) => {
      const { id, ...updates } = input;
      const [updated] = await db
        .update(project)
        .set(updates)
        .where(and(eq(project.id, id), eq(project.userId, context.session.user.id)))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .output(projectSchema)
    .handler(async ({ input, context }) => {
      const [deleted] = await db
        .delete(project)
        .where(and(eq(project.id, input.id), eq(project.userId, context.session.user.id)))
        .returning();

      if (!deleted) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      return deleted;
    }),
};
