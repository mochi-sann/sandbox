import z from "zod";
import { ORPCError } from "@orpc/server";
import { db, eq, and } from "@my-better-t-app/db";
import { todo } from "@my-better-t-app/db/schema/todo";
import { protectedProcedure } from "../index";

const todoSchema = z.object({
	id: z.number(),
	text: z.string(),
	completed: z.boolean(),
	userId: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const todoRouter = {
	getAll: protectedProcedure
		.output(z.array(todoSchema))
		.handler(async ({ context }) => {
			return await db
				.select()
				.from(todo)
				.where(eq(todo.userId, context.session.user.id));
		}),

	create: protectedProcedure
		.input(z.object({ text: z.string().min(1) }))
		.output(todoSchema)
		.handler(async ({ input, context }) => {
			const [created] = await db
				.insert(todo)
				.values({
					text: input.text,
					userId: context.session.user.id,
				})
				.returning();

			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to create todo",
				});
			}

			return created;
		}),

	toggle: protectedProcedure
		.input(z.object({ id: z.number(), completed: z.boolean() }))
		.output(todoSchema)
		.handler(async ({ input, context }) => {
			const [updated] = await db
				.update(todo)
				.set({ completed: input.completed })
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)),
				)
				.returning();

			if (!updated) {
				throw new ORPCError("NOT_FOUND", {
					message: "Todo not found or access denied",
				});
			}

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.output(todoSchema)
		.handler(async ({ input, context }) => {
			const [deleted] = await db
				.delete(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)),
				)
				.returning();

			if (!deleted) {
				throw new ORPCError("NOT_FOUND", {
					message: "Todo not found or access denied",
				});
			}

			return deleted;
		}),
};
