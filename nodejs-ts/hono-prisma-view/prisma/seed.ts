import { PrismaClient, type User } from "@prisma/client";
import { faker, fakerJA } from "@faker-js/faker";

const prisma = new PrismaClient({
  log: ["query", "info", "warn"],
});

const seed = process.env.FAKER_SEED
  ? faker.seed(+process.env.FAKER_SEED)
  : faker.seed(100);

console.log(`faker's seed: ${seed}`);

async function main() {
  for (let index = 0; index < 10; index++) {
    const tag = await prisma.tag.create({
      data: {
        name: fakerJA.word.words(),
      },
    });

    console.log("Tag Created:", tag);
  }

  // 既存のToDoにタグを関連付け
  const users: User[] = [];
  // Create 10 users with random data
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: fakerJA.person.firstName(),
        createdAt: faker.date.between({
          from: "2019-01-01T00:00:00.000Z",
          to: "2030-01-01T00:00:00.000Z",
        }),
      },
    });
    // console.log(...[user, "👀 [seed.ts:37]: user"].reverse());
    for (let j = 0; j < 10; j++) {
      const post = await prisma.todo.create({
        data: {
          title: fakerJA.word.sample(),
          description: fakerJA.lorem.lines(),
          isCompleted: fakerJA.datatype.boolean(),
          createdAt: faker.date.between({
            from: "2019-01-01T00:00:00.000Z",
            to: "2030-01-01T00:00:00.000Z",
          }),
          updatedAt: faker.date.between({
            from: "2019-01-01T00:00:00.000Z",
            to: "2030-01-01T00:00:00.000Z",
          }),

          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      // console.log(...[post, "👀 [seed.ts:60]: post"].reverse());
      const newTodoTag = await prisma.todoTag.createMany({
        data: [
          {
            todoId: post.id,
            tagId: 2,
          },
          {
            todoId: post.id,
            tagId: 1,
          },
        ],
      });
      // console.log(...[newTodoTag, "👀 [seed.ts:47]: newTodoTab"].reverse());

      // console.log(...[post, "👀 [seed.ts:35]: post"].reverse());
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
