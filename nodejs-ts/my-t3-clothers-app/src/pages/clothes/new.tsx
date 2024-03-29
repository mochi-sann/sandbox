import { type NextPage } from "next";
import Head from "next/head";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";

import { useRouter } from "next/router";
const ZFormValueSchema = z.object({
  name: z.string(),
  price: z.number(),
  image_file: z.custom<FileList>().transform((file) => file[0]),
});
const NewPage: NextPage = () => {
  const ClothesMutation = api.clothes.new.useMutation();
  const rounter = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof ZFormValueSchema>>({
    resolver: zodResolver(ZFormValueSchema),
  });
  const onSubmitForm = handleSubmit(async (formData) => {
    const Value = formData;
    console.log(Value)
    try {
      await ClothesMutation.mutateAsync({
        name: Value.name,
        price: Value.price,
        image: Value.image_file || null
      });

      await rounter.push("/clothes");
    } catch (error) {
      alert(error);
    }
  });

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="">
        <form onSubmit={onSubmitForm} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={"name"}
            className="input-bordered input w-full"
            {...register("name")}
          />
          {errors.name && JSON.stringify(errors.name)}

          <input
            placeholder={"price"}
            type="number"
            className="input-bordered input w-full"
            {...register("price", { valueAsNumber: true })}
          />
          <input

            placeholder={"image"}
            type="file"
            className="input-bordered input w-full"
            {...register("image_file")}
          />
          <input type="submit" className="btn w-full" disabled={!ClothesMutation.isIdle} />
        </form>
      </main>
    </>
  );
};

export default NewPage;
