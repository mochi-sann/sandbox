import { renderComponent, useEffect, useState } from "@react-clone/core";
import { h } from "@react-clone/core";

// Todo Item Component
function TodoItem({ todo, onToggle, onDelete }) {
  return h(
    "div",
    {
      className: `todo-item ${todo.completed ? "completed" : ""}`,
    },
    h("input", {
      type: "checkbox",
      checked: todo.completed,
      onChange: () => onToggle(todo.id),
    }),
    h("span", {}, todo.text),
    h(
      "button",
      {
        className: "delete-btn",
        onClick: () => onDelete(todo.id),
      },
      "削除",
    ),
  );
}

// Counter Component
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Counter mounted or count changed:", count);

    return () => {
      console.log("Counter cleanup for count:", count);
    };
  }, [count]);

  return h(
    "div",
    { className: "counter" },
    h("p", {}, `カウンター: ${count}`),
    h(
      "button",
      {
        onClick: () => setCount(prev => prev + 1),
      },
      "+1",
    ),
    h(
      "button",
      {
        onClick: () => setCount(prev => prev - 1),
      },
      "-1",
    ),
  );
}

// Main App Component
function App() {
  console.log("🏗️ App component called");
  const [todos, setTodos] = useState([]);
  console.log("🏗️ todos useState returned:", todos);
  const [inputValue, setInputValue] = useState("");
  console.log("🏗️ inputValue useState returned:", inputValue, "setInputValue:", typeof setInputValue);

  useEffect(() => {
    console.log("App mounted, todos count:", todos.length);
  }, [todos.length]);

  const addTodo = () => {
    console.log("Adding todo:", inputValue);
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      const newTodo = {
        id: Date.now(),
        text: trimmedValue,
        completed: false,
      };
      setTodos([...todos, newTodo]);
      setInputValue("");
    } else {
      console.log("Empty input, not adding todo");
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const completedCount = todos.filter((todo) => todo.completed).length;

  return h(
    "div",
    { className: "container" },
    h("h1", {}, "React Clone - Todo App"),
    // Counter section
    h(Counter),
    h("div",{className: "divider"}, inputValue),
    // Input section
    h(
      "div",
      { className: "input-section" },
      h("input", {
        type: "text",
        value: inputValue,
        placeholder: "新しいタスクを入力...",
        onInput: (e) => {
          console.log("Input event:", e.target.value);
          console.log("🚀 About to call setInputValue with:", e.target.value);
          setInputValue(e.target.value);
          console.log("🚀 setInputValue called with:", e.target.value);
        },
        onChange: (e) => {
          console.log("Change event:", e.target.value);
          console.log("🚀 About to call setInputValue (onChange) with:", e.target.value);
          setInputValue(e.target.value);
          console.log("🚀 setInputValue (onChange) called with:", e.target.value);
        },
        onKeyDown: (e) => {
          console.log("Key down:", e.key);
          if (e.key === "Enter") {
            e.preventDefault();
            addTodo();
          }
        },
      }),
      h(
        "button",
        {
          className: "add-btn",
          onClick: addTodo,
        },
        "追加",
      ),
    ),
    // Stats
    h(
      "div",
      { className: "counter" },
      `総タスク数: ${todos.length}, 完了: ${completedCount}, 残り: ${
        todos.length - completedCount
      }`,
    ),
    // Todo list
    h(
      "div",
      {},
      ...todos.map((todo) =>
        h(TodoItem, {
          key: todo.id,
          todo,
          onToggle: toggleTodo,
          onDelete: deleteTodo,
        })
      ),
    ),
  );
}

// Mount the app
const container = document.getElementById("app");
renderComponent(h(App), container);
