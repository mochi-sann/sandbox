import { Box, Button, Input, Stack } from "@mantine/core";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

export type hookFormProps = {};
const schema = z.object({
  name: z.string().min(10, { message: "10文字以上入力してください" }),
  age: z.number(),
});

export const HookForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    console.log({ errors });
  });

  return (
    <div>
      <form onSubmit={onSubmit}>
        <Stack spacing={"xs"}>
          <Box>
            <label>First Name</label>
            <input {...register("name")} />
            {errors.name}
          </Box>
          <Box>
            <label>Last Name</label>
            <input {...register("age")} type="number" />
          </Box>
          <Button type="submit">登録</Button>
        </Stack>
      </form>
    </div>
  );
};
