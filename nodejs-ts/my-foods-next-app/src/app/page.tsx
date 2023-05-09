import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
