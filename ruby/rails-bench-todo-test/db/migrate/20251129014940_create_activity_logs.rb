class CreateActivityLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :activity_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.string :entity_type
      t.integer :entity_id
      t.string :action
      t.json :details

      t.timestamps
    end
  end
end
