class CreateTodoStatusHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :todo_status_histories do |t|
      t.references :todo, null: false, foreign_key: true
      t.boolean :old_status
      t.boolean :new_status
      t.datetime :changed_at
      t.references :changed_by_user, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
