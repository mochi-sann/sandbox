import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

interface AddTodoFormProps {
  onAddTodo: (text: string) => void;
}

export function AddTodoForm({ onAddTodo }: AddTodoFormProps) {
  const [text, setText] = useState('');
  const colorScheme = useColorScheme();

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      Alert.alert('エラー', 'タスクの内容を入力してください');
      return;
    }
    if (trimmedText.length > 100) {
      Alert.alert('エラー', 'タスクは100文字以内で入力してください');
      return;
    }
    onAddTodo(trimmedText);
    setText('');
  };

  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              color: isDark ? '#FFFFFF' : '#000000',
              backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
              borderColor: isDark ? '#48484A' : '#C6C6C8',
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="新しいタスクを入力..."
          placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
          multiline
          numberOfLines={2}
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={true}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            text.trim().length === 0 && styles.addButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={text.trim().length === 0}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.addButtonText}>追加</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <ThemedText style={styles.characterCount}>
        {text.length}/100
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 96,
    marginRight: 12,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  addButtonDisabled: {
    backgroundColor: '#C6C6C8',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  characterCount: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'right',
    marginRight: 4,
  },
});