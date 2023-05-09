import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

async function getData() {
  const foods = await prisma.foods.findMany();
  console.log({ foods });
  return foods;
}

export default async function Home() {
  const foods = await getData();
  return (
    <main>
      <p>hello world</p>
      <Link href={"/foods/new"}></Link>
      <pre>{JSON.stringify(foods, null, 2)}</pre>
      <table></table>
    </main>
  );
}
