import { Generated } from "kysely";

export interface Todo {
  id: Generated<number>;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  todos: Todo;
}
