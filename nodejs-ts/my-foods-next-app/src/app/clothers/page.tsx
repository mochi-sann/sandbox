import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";

async function getData() {
  const clothes = await prisma.clothers.findMany();
  return { clothes };
}

export default async function NewFoodPage() {
  const { clothes } = await getData();
  return (
    <main>
      <Link href={"/clothers/new"} className="link link-accent">
        new
      </Link>
      {/* tableにclothesを表示 */}
      <table className="table">
        <thead>
          <th>id</th>
          <th>name</th>
          <th>price</th>
          <th>編集</th>
        </thead>
        <tbody>
          {clothes.map((clothe) => (
            <tr key={clothe.id}>
              <td>{clothe.id}</td>
              <td>{clothe.name}</td>
              <td>{clothe.price}</td>
              <td>
                <Link href={"/clothers/edit/" + clothe.id}>編集</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
