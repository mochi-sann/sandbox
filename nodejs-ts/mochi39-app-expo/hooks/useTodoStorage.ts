import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Todo } from '@/components/TodoList';

const STORAGE_KEY = 'todos';

export function useTodoStorage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    try {
      const storedTodos = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedTodos) {
        const parsedTodos = JSON.parse(storedTodos);
        const todosWithDates = parsedTodos.map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
        }));
        setTodos(todosWithDates);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTodos = useCallback(async (newTodos: Todo[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
    } catch (error) {
      console.error('Failed to save todos:', error);
    }
  }, []);

  const addTodo = useCallback(
    (text: string) => {
      const newTodo: Todo = {
        id: Date.now().toString() + Math.random().toString(),
        text: text.trim(),
        completed: false,
        createdAt: new Date(),
      };
      const updatedTodos = [newTodo, ...todos];
      setTodos(updatedTodos);
      saveTodos(updatedTodos);
    },
    [todos, saveTodos]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      const updatedTodos = todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      setTodos(updatedTodos);
      saveTodos(updatedTodos);
    },
    [todos, saveTodos]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      const updatedTodos = todos.filter((todo) => todo.id !== id);
      setTodos(updatedTodos);
      saveTodos(updatedTodos);
    },
    [todos, saveTodos]
  );

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}