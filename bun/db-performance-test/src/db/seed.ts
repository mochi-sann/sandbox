import "dotenv/config";
import { faker } from "@faker-js/faker";
import { db, schema } from ".";

const USER_COUNT = Number(process.env.SEED_USER_COUNT ?? 10_000);
const TODOS_PER_USER = Number(process.env.SEED_TODO_COUNT ?? 20);
const USER_BATCH_SIZE = Math.max(
  1,
  Number(process.env.SEED_USER_BATCH_SIZE ?? 1000),
);
const TODO_BATCH_SIZE = Math.max(
  1,
  Number(process.env.SEED_TODO_BATCH_SIZE ?? 5000),
);

type NewUser = typeof schema.users.$inferInsert;
type NewTodo = typeof schema.todos.$inferInsert;

const resetDatabase = async () => {
  await db.delete(schema.todos);
  await db.delete(schema.users);
};

const createUsers = async () => {
  const users: NewUser[] = Array.from({ length: USER_COUNT }, (_, index) => ({
    name: faker.person.fullName(),
    email: `user-${index + 1}@example.com`,
  }));

  const insertedUsers: Array<{ id: number }> = [];

  for (let i = 0; i < users.length; i += USER_BATCH_SIZE) {
    const chunk = users.slice(i, i + USER_BATCH_SIZE);
    const created = await db.insert(schema.users).values(chunk).returning();
    insertedUsers.push(...created);
  }

  return insertedUsers;
};

const createTodos = async (users: Array<{ id: number }>) => {
  const todoBatch: NewTodo[] = [];

  for (const user of users) {
    for (let i = 0; i < TODOS_PER_USER; i += 1) {
      todoBatch.push({
        title: faker.hacker.phrase(),
        userId: user.id,
        completed: faker.datatype.boolean({ probability: 0.4 }),
        status: faker.number.int({ min: 0, max: 2 }),
      });

      if (todoBatch.length >= TODO_BATCH_SIZE) {
        await db.insert(schema.todos).values(todoBatch);
        todoBatch.length = 0;
      }
    }
  }

  if (todoBatch.length > 0) {
    await db.insert(schema.todos).values(todoBatch);
  }
};

const main = async () => {
  console.log(
    `Seeding database with ${USER_COUNT} users and ${TODOS_PER_USER} todos per user...`,
  );

  await resetDatabase();
  const users = await createUsers();
  await createTodos(users);

  console.log("Seed complete.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
