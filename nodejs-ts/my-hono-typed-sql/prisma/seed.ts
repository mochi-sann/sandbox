import { PrismaClient, type Post } from "@prisma/client";
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Create 10 users with random data
  for (let i = 0; i < 100; i++) {
    const posts = []
    const randomTimes = Math.floor(Math.random() * (100 + 1));

    console.log(`Looping ${randomTimes} times`);

    // ランダムな回数分ループ
    for (let i = 0; i < randomTimes; i++) {
      posts.push({
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        published: faker.datatype.boolean(),
      },
      )
    }
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.firstName(),
        posts: {
          create: posts,
        },
      },
    });
    console.log(`Created user with id: ${user.id}`);
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

