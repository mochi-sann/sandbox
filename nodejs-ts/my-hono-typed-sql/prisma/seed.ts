import { PrismaClient, type Post } from "@prisma/client";
import { faker, fakerJA } from "@faker-js/faker";

const prisma = new PrismaClient();

const seed = process.env.FAKER_SEED
	? faker.seed(+process.env.FAKER_SEED)
	: faker.seed();
console.log(`faker's seed: ${seed}`);

async function main() {
	// Create 10 users with random data
	for (let i = 0; i < 100; i++) {
		const posts = [];
		const randomTimes = Math.floor(Math.random() * (50 + 1));

		console.log(`Looping ${randomTimes} times`);

		// ランダムな回数分ループ
		for (let i = 0; i < randomTimes; i++) {
			posts.push({
				title: fakerJA.lorem.sentence(),
				content: fakerJA.lorem.paragraph({ min: 0, max: 10 }),
				published: fakerJA.datatype.boolean(),
				createdAt: fakerJA.date.anytime(),
				updatedAt: fakerJA.date.past({
					years: 1,
				}),
			});
		}
		const user = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				name: fakerJA.person.firstName(),

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
