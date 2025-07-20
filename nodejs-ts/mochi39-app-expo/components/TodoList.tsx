import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { TodoItem } from './TodoItem';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoListProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export function TodoList({ todos, onToggleTodo, onDeleteTodo }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          まだタスクがありません
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          上の入力欄から新しいタスクを追加してください
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TodoItem
          todo={item}
          onToggle={() => onToggleTodo(item.id)}
          onDelete={() => onDeleteTodo(item.id)}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.4,
  },
  listContent: {
    paddingVertical: 8,
  },
});