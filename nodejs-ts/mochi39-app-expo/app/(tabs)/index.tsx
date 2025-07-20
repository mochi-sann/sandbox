import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TodoList } from '@/components/TodoList';
import { AddTodoForm } from '@/components/AddTodoForm';
import { useTodoStorage } from '@/hooks/useTodoStorage';

export default function TodoScreen() {
  const {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
  } = useTodoStorage();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Todo アプリ
        </ThemedText>
        {totalCount > 0 && (
          <ThemedText style={styles.statsText}>
            {completedCount}/{totalCount} 完了
          </ThemedText>
        )}
      </ThemedView>

      <AddTodoForm onAddTodo={addTodo} />

      <ThemedView style={styles.listContainer}>
        <TodoList
          todos={todos}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    flex: 1,
    paddingTop: 8,
  },
});
