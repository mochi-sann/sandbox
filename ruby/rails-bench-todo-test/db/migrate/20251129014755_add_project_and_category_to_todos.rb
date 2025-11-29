class AddProjectAndCategoryToTodos < ActiveRecord::Migration[8.0]
  def change
    add_reference :todos, :project, null: true, foreign_key: true
    add_reference :todos, :category, null: true, foreign_key: true
  end
end
