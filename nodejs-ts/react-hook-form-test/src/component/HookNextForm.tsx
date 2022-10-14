import { Box, Button, Input, Stack, Text } from "@mantine/core";
import React from "react";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";

export type hookFormProps = {};
type FormValue = { name: string };
export const HookNextForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValue>({
    mode: "onChange",
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
            <Input
              {...register("name", {
                required: "入力してください",
                minLength: {
                  value: 6,
                  message: `6文字以上で入力してください。`,
                },
                maxLength: {
                  value: 32,
                  message: `32文字以内で入力してください。`,
                },
                // pattern: /[a-zA-Z0-9!@#$%^&*()_+\\-=\\]\\[\\{\\}\\|]/,
                // validate: {
                //   minLength: (value) =>
                //     value && value.length > 8 ? true : false,
                //
                //   maxLength: (value) => value && value.length < 256,
                //   hasSymbol: (value) =>
                //     value && new RegExp(/^\d{3}-?\d{4}$/g).exec(value)
                //       ? true
                //       : false,
                // },
              })}
            />

            <pre>{JSON.stringify(errors.name?.message)}</pre>
            <ErrorMessage
              errors={errors}
              name="name"
              render={({ messages }) =>
                messages &&
                Object.entries(messages).map(([type, message], key) => (
                  <Text sx={{ color: "red" }} key={key}></Text>
                ))
              }
            />
          </Box>
          <Button type="submit">submit</Button>
        </Stack>
      </form>
    </div>
  );
};
