import { Hono } from "hono";
import { createTable, kysely } from "./database";

const app = new Hono();

app.get("/todos", async (c) => {
  try {
    const todos = await kysely
      .selectFrom("todos")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return c.json({ todos });
  } catch (error) {
    return c.json({ error: "Failed to fetch todos" }, 500);
  }
});

app.get("/todos/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const todo = await kysely
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!todo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    return c.json({ todo });
  } catch (error) {
    return c.json({ error: "Failed to fetch todo" }, 500);
  }
});

app.post("/todos", async (c) => {
  try {
    const { title, description } = await c.req.json();

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    const result = await kysely
      .insertInto("todos")
      .values({
        title,
        description: description || null,
        completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    const todo = await kysely
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", Number(result[0].insertId))
      .executeTakeFirst();

    return c.json({ todo }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create todo" }, 500);
  }
});

app.put("/todos/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { title, description, completed } = await c.req.json();

    const existingTodo = await kysely
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    await kysely
      .updateTable("todos")
      .set({
        title: title || existingTodo.title,
        description:
          description !== undefined ? description : existingTodo.description,
        completed: completed !== undefined ? completed : existingTodo.completed,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();

    const updatedTodo = await kysely
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return c.json({ todo: updatedTodo });
  } catch (error) {
    return c.json({ error: "Failed to update todo" }, 500);
  }
});

app.delete("/todos/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existingTodo = await kysely
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    await kysely.deleteFrom("todos").where("id", "=", id).execute();

    return c.json({ message: "Todo deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete todo" }, 500);
  }
});

createTable().then(() => {
  console.log("Database initialized");
});

export default app;
