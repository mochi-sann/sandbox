class CreateTimeEntries < ActiveRecord::Migration[8.0]
  def change
    create_table :time_entries do |t|
      t.references :user, null: false, foreign_key: true
      t.references :todo, null: false, foreign_key: true
      t.datetime :start_time
      t.datetime :end_time
      t.integer :duration

      t.timestamps
    end
  end
end
