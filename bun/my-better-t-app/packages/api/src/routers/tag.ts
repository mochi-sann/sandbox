import { z } from "zod";
import { db, eq, and } from "@my-better-t-app/db";
import { tag } from "@my-better-t-app/db/schema/tag";
import { protectedProcedure } from "../index";
import { ORPCError } from "@orpc/server";

const tagSchema = z.object({
	id: z.number(),
	name: z.string(),
	color: z.string(),
	userId: z.string(),
});

export const tagRouter = {
	list: protectedProcedure
		.output(z.array(tagSchema))
		.handler(async ({ context }) => {
			return await db
				.select()
				.from(tag)
				.where(eq(tag.userId, context.session.user.id));
		}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1), color: z.string().min(1) }))
		.output(tagSchema)
		.handler(async ({ input, context }) => {
			const [created] = await db
				.insert(tag)
				.values({
					name: input.name,
					color: input.color,
					userId: context.session.user.id,
				})
				.returning();

			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to create tag",
				});
			}
			return created;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.output(tagSchema)
		.handler(async ({ input, context }) => {
			const [deleted] = await db
				.delete(tag)
				.where(
					and(eq(tag.id, input.id), eq(tag.userId, context.session.user.id)),
				)
				.returning();

			if (!deleted) {
				throw new ORPCError("NOT_FOUND", { message: "Tag not found" });
			}
			return deleted;
		}),
};
