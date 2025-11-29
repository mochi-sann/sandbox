class CreateDependencies < ActiveRecord::Migration[8.0]
  def change
    create_table :dependencies do |t|
      t.references :todo, null: false, foreign_key: true
      t.references :depends_on_todo, null: false, foreign_key: { to_table: :todos }

      t.timestamps
    end
  end
end
