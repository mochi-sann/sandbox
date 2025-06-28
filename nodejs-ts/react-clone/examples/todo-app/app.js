import { h, renderComponent, useState, useEffect } from '../../src/index.js';

// Todo Item Component
function TodoItem({ todo, onToggle, onDelete }) {
  return h('div', 
    { 
      className: `todo-item ${todo.completed ? 'completed' : ''}` 
    },
    h('input', {
      type: 'checkbox',
      checked: todo.completed,
      onChange: () => onToggle(todo.id)
    }),
    h('span', {}, todo.text),
    h('button', {
      className: 'delete-btn',
      onClick: () => onDelete(todo.id)
    }, '削除')
  );
}

// Counter Component  
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Counter mounted or count changed:', count);
    
    return () => {
      console.log('Counter cleanup for count:', count);
    };
  }, [count]);
  
  return h('div', { className: 'counter' },
    h('p', {}, `カウンター: ${count}`),
    h('button', {
      onClick: () => setCount(count + 1)
    }, '+1'),
    h('button', {
      onClick: () => setCount(count - 1)
    }, '-1')
  );
}

// Main App Component
function App() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    console.log('App mounted, todos count:', todos.length);
  }, [todos.length]);
  
  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo = {
        id: Date.now(),
        text: inputValue,
        completed: false
      };
      setTodos([...todos, newTodo]);
      setInputValue('');
    }
  };
  
  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };
  
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  const completedCount = todos.filter(todo => todo.completed).length;
  
  return h('div', { className: 'container' },
    h('h1', {}, 'React Clone - Todo App'),
    
    // Counter section
    h(Counter),
    
    // Input section
    h('div', { className: 'input-section' },
      h('input', {
        type: 'text',
        value: inputValue,
        placeholder: '新しいタスクを入力...',
        onInput: (e) => setInputValue(e.target.value),
        onKeyPress: (e) => {
          if (e.key === 'Enter') {
            addTodo();
          }
        }
      }),
      h('button', {
        className: 'add-btn',
        onClick: addTodo
      }, '追加')
    ),
    
    // Stats
    h('div', { className: 'counter' },
      `総タスク数: ${todos.length}, 完了: ${completedCount}, 残り: ${todos.length - completedCount}`
    ),
    
    // Todo list
    h('div', {},
      ...todos.map(todo => 
        h(TodoItem, {
          key: todo.id,
          todo,
          onToggle: toggleTodo,
          onDelete: deleteTodo
        })
      )
    )
  );
}

// Mount the app
const container = document.getElementById('app');
renderComponent(h(App), container);