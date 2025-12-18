import "dotenv/config";
import { faker } from "@faker-js/faker";
import { db, schema } from ".";

const USER_COUNT = Number(process.env.SEED_USER_COUNT ?? 5);
const TODOS_PER_USER = Number(process.env.SEED_TODO_COUNT ?? 3);

const resetDatabase = async () => {
  await db.delete(schema.todos);
  await db.delete(schema.users);
};

const createUsers = async () => {
  const users = Array.from({ length: USER_COUNT }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
  }));

  return db.insert(schema.users).values(users).returning();
};

const createTodos = async (users: Array<{ id: number }>) => {
  const todos = users.flatMap((user) =>
    Array.from({ length: TODOS_PER_USER }, () => ({
      title: faker.hacker.phrase(),
      userId: user.id,
      completed: faker.datatype.boolean({ probability: 0.4 }),
    }))
  );

  if (todos.length === 0) {
    return;
  }

  await db.insert(schema.todos).values(todos);
};

const main = async () => {
  console.log(
    `Seeding database with ${USER_COUNT} users and ${TODOS_PER_USER} todos per user...`
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
