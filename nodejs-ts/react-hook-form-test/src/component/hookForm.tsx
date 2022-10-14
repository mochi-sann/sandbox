import { Box, Button, Input, Stack, Text } from "@mantine/core";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ErrorMessage } from "@hookform/error-message";

export type hookFormProps = {};
const schema = z.object({
  name: z
    .string()
    .min(8, { message: "10文字以上入力してください" })
    .max(100, { message: "100文字以下にしてください" })
    .regex(/(?=.*[a-z])/, { message: "小文字を含めてください。" })
    .regex(/(?=.*[A-Z])/, { message: "大文字を含めてください。" })
    .regex(/(?=.*[0-9])/, { message: "数字を含めてください。" })
    .regex(/(?=.*[!])/, { message: "数字を含めてください。" }),

  age: z.number(),
});

export const HookForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
            errors.name?{errors.name && JSON.stringify(errors.name?.message)}
            <ErrorMessage
              errors={errors}
              name="name"
              render={({ messages }) =>
                messages &&
                Object.entries(messages).map(([type, message], key) => (
                  <Text sx={{ color: "red" }} key={type}>
                    {JSON.stringify(messages, null, 2)}
                  </Text>
                ))
              }
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
