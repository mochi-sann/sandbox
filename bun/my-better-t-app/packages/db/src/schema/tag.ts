import { pgTable, text, serial, integer, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { todo } from "./todo";

export const tag = pgTable("tag", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	color: text("color").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const todoTag = pgTable(
	"todo_tag",
	{
		todoId: integer("todo_id")
			.notNull()
			.references(() => todo.id, { onDelete: "cascade" }),
		tagId: integer("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.todoId, t.tagId] })],
);

export const tagRelations = relations(tag, ({ many }) => ({
	todos: many(todoTag),
}));

export const todoTagRelations = relations(todoTag, ({ one }) => ({
	todo: one(todo, { fields: [todoTag.todoId], references: [todo.id] }),
	tag: one(tag, { fields: [todoTag.tagId], references: [tag.id] }),
}));
