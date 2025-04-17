"use client";

import { useActionState } from "react";
import { updateTodo } from "../lib/serverAction";

export default function EditTodoForm({ todo }) {
  const [state, formAction] = useActionState(
    async (prevState, formData) => {
      // ← ここが重要！サーバー側で値を安全に追加
      formData.set("todoId", todo.id);
      return await updateTodo(prevState, formData);
    },
    {
      success: false,
      errors: {},
    },
  );

  return (
    <form action={formAction}>
      <input type="text" name="title" defaultValue={todo.title} />
      <button type="submit">更新</button>
    </form>
  );
}
