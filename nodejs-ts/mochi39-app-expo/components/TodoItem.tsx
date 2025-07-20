import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Todo } from './TodoList';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'タスクを削除',
      'このタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[styles.todoItem, todo.completed && styles.completedItem]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.checkbox}>
          {todo.completed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
        </ThemedView>
        <ThemedText
          style={[
            styles.todoText,
            todo.completed && styles.completedText,
          ]}
          numberOfLines={0}
        >
          {todo.text}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.deleteText}>🗑️</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  todoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  completedItem: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 18,
  },
});