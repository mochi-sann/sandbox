///| Data structures

/// TODOアイテムの構造体
struct TodoItem {
  id : Int
  title : String
  completed : Bool
  description : String
}

/// TODO管理システム
struct TodoManager {
  mut todos : Array[TodoItem]
  mut next_id : Int
}

///| Constructor

/// TodoManagerの初期化
fn TodoManager::new() -> TodoManager {
  { todos: [], next_id: 1 }
}

///| Core operations

/// 新しいTODOを追加
fn TodoManager::add(self : TodoManager, title : String, description : String) -> Int {
  let id = self.next_id
  let todo = { id, title, completed: false, description }
  self.todos.push(todo)
  self.next_id = self.next_id + 1
  id
}

/// TODOを完了済みにする
fn TodoManager::complete(self : TodoManager, id : Int) -> Bool {
  for i = 0; i < self.todos.length(); i = i + 1 {
    if self.todos[i].id == id {
      self.todos[i] = { ..self.todos[i], completed: true }
      return true
    }
  }
  false
}

/// TODOを削除
fn TodoManager::remove(self : TodoManager, id : Int) -> Bool {
  let mut index = -1
  for i = 0; i < self.todos.length(); i = i + 1 {
    if self.todos[i].id == id {
      index = i
      break
    }
  }
  if index >= 0 {
    self.todos.remove(index)
    true
  } else {
    false
  }
}

/// すべてのTODOを取得
fn TodoManager::list(self : TodoManager) -> Array[TodoItem] {
  self.todos
}

/// 未完了のTODOを取得
fn TodoManager::list_pending(self : TodoManager) -> Array[TodoItem] {
  let result = []
  for i = 0; i < self.todos.length(); i = i + 1 {
    if not(self.todos[i].completed) {
      result.push(self.todos[i])
    }
  }
  result
}

///| Display

/// TodoItemを文字列として表示
fn TodoItem::to_string(self : TodoItem) -> String {
  let status = if self.completed { "[✓]" } else { "[ ]" }
  "\{status} \{self.id}. \{self.title} - \{self.description}"
}

///| Main

fn init {
  let manager = TodoManager::new()
  
  // サンプルTODOを追加
  ignore(manager.add("MoonBitを学ぶ", "公式ドキュメントを読む"))
  ignore(manager.add("テストを書く", "snapshot testingを試す"))
  ignore(manager.add("コードをフォーマット", "moon fmtを実行する"))
  
  // すべてのTODOを表示
  println("=== すべてのTODO ===")
  let todos = manager.list()
  for i = 0; i < todos.length(); i = i + 1 {
    println(todos[i].to_string())
  }
  
  // 1つ目のTODOを完了
  
  println("\n=== 未完了のTODO ===")
  let pending = manager.list_pending()
  for i = 0; i < pending.length(); i = i + 1 {
    println(pending[i].to_string())
  }
}