class CreateRecurringPatterns < ActiveRecord::Migration[8.0]
  def change
    create_table :recurring_patterns do |t|
      t.references :todo, null: false, foreign_key: true
      t.string :recurrence_type
      t.integer :interval
      t.integer :day_of_week
      t.integer :day_of_month

      t.timestamps
    end
  end
end
