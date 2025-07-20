export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;