import { pgTable, text, boolean, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { todoTag } from "./tag";

export const todo = pgTable("todo", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  body: text("body"),
  completed: boolean("completed").default(false).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  deletedAt: timestamp("deleted_at"),
  priority: text("priority").default("P2"),
  isStarred: boolean("is_starred").default(false).notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const subtask = pgTable("subtask", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false).notNull(),
  todoId: integer("todo_id")
    .notNull()
    .references(() => todo.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const todoRelations = relations(todo, ({ many }) => ({
  tags: many(todoTag),
  subtasks: many(subtask),
}));

export const subtaskRelations = relations(subtask, ({ one }) => ({
  todo: one(todo, {
    fields: [subtask.todoId],
    references: [todo.id],
  }),
}));
