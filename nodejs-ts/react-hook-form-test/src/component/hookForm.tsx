import { Box, Button, Input, Stack, Text } from "@mantine/core";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ErrorMessage } from "@hookform/error-message";

export type hookFormProps = {};
const schema = z.object({
  name: z.string()
    .min(8, { message: "10文字以上入力してください" })
    .max(100, { message: "100文字以下にしてください" })
    .nonempty({ message: "必須項目です" })
    .regex(/\d+/, {
      message: "数字が含まれる必要があります",
    }).regex(/[a-z]/, { message: "小文字の英数字が含まれる必要があります" })
    .regex(/[A-Z]/, { message: "大文字ののアルファベットが含まれる必要があります" }),
  age: z.number(),
});

export const HookForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    criteriaMode: "all",
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
            <Input {...register("name")} />
            <ErrorMessage
              errors={errors}
              name="name"
              render={({ messages }) =>
                messages &&
                Object.entries(messages).map(([type, message], key) => (
                  <Text sx={{ color: "red" }} key={type}>
                    {JSON.stringify(messages)}
                  </Text>
                ))}
            />
          </Box>
          <Box>
            <label>Last Name</label>
            <Input {...register("age")} type="number" />
          </Box>
          <Button type="submit">登録</Button>
        </Stack>
      </form>
    </div>
  );
};
