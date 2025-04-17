"use server";

export async function updateTodo(prevState: any, formData:any) {
  console.log(prevState, formData);
  // ...
  return { success: true, errors: {} };
}
