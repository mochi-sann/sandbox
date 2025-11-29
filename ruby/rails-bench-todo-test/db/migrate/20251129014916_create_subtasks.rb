class CreateSubtasks < ActiveRecord::Migration[8.0]
  def change
    create_table :subtasks do |t|
      t.references :todo, null: false, foreign_key: true
      t.string :title
      t.boolean :completed

      t.timestamps
    end
  end
end
