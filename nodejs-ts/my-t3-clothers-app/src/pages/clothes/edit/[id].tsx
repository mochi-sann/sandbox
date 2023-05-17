import { type GetServerSidePropsContext, type NextPage } from "next";

import { prisma } from "@/server/db";
import { type clothers } from "@prisma/client";
import { isConvertibleToNumber } from "@/utils/IsNumberString";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/utils/api";
import { useRouter } from "next/router";

const ZFormValueSchemaEdit = z.object({
  name: z.string(),
  price: z.number(),
  // image_file: z.custom<FileList>().transform((file) => file[0]),
});
const ClotheEditPage: NextPage<{ data: clothers | null }> = (props) => {
  const ClothesUpdateMutaion = api.clothes.update.useMutation();
  const rounter = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof ZFormValueSchemaEdit>>({
    resolver: zodResolver(ZFormValueSchemaEdit),
    defaultValues: { name: props.data?.name, price: props.data?.price },
  });




  const onSubmitForm = handleSubmit(async (formData) => {
    try {
      await ClothesUpdateMutaion.mutateAsync({
        name: formData.name,
        price: formData.price,
        id: props.data?.id as number,
      })

      await rounter.push("/clothes");
    } catch (error) {
      alert(error);
    }
  });

  return (
    <main>
      <p>hello world</p>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>

      <form onSubmit={onSubmitForm} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder={"name"}
          className="input-bordered input w-full"
          {...register("name")}
        />
        {errors.name && JSON.stringify(errors.name)}

        <input
          type="number"
          placeholder={"price"}
          className="input-bordered input w-full"
          {...register("price", { valueAsNumber: true })}
        />
        <input type="submit" className="btn w-full"  disabled={!ClothesUpdateMutaion.isIdle} />
      </form>
    </main>
  );
};
export default ClotheEditPage;

export async function getServerSideProps(
  context: GetServerSidePropsContext<{ id: string }>
) {
  const ClothesId = context.params?.id as string;
  if (!isConvertibleToNumber(ClothesId)) {
    return {
      notFound: true,
    };
  }
  const data = await prisma.clothers.findUnique({
    where: { id: Number(ClothesId) },
    select: {
      id: true,
      img: true,
      name: true,
      carts: true,
      price: true,
    },
  });
  // nullを返すと404になる
  if (!data) {
    return {
      notFound: true,
    };
  }
  return { props: { data: data }, notFound: false };

  // Fetch data from external API
}
