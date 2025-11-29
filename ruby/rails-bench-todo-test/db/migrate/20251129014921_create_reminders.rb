class CreateReminders < ActiveRecord::Migration[8.0]
  def change
    create_table :reminders do |t|
      t.references :todo, null: false, foreign_key: true
      t.datetime :remind_at
      t.boolean :sent

      t.timestamps
    end
  end
end
