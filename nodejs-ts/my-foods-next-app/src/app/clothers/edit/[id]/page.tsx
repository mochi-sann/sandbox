import { prisma } from "@/lib/prisma";

async function getData(id: number) {
  const data = await prisma.clothers.findUnique({
    where: {
      id: id,
    },
  });
  return data;
}

export default async function Page(props: { params: { id: string } }) {
  const data = await getData(Number(props.params.id));
  return (
    <main>
      <h1>edit : {props.params.id} </h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
