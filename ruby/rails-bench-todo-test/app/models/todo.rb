class Todo < ApplicationRecord
  belongs_to :project, optional: true
  belongs_to :category, optional: true

  has_many :taggings, dependent: :destroy
  has_many :tags, through: :taggings

  has_many :assignments, dependent: :destroy
  has_many :users, through: :assignments

  has_many :dependencies, dependent: :destroy
  has_many :dependent_todos, through: :dependencies, source: :depends_on_todo
  # Inverse dependencies (todos that depend on this one)
  has_many :inverse_dependencies, class_name: "Dependency", foreign_key: "depends_on_todo_id", dependent: :destroy
  has_many :blocking_todos, through: :inverse_dependencies, source: :todo

  has_many :comments, dependent: :destroy
  has_many :subtasks, dependent: :destroy
  has_many :reminders, dependent: :destroy
  has_one :recurring_pattern, dependent: :destroy
  has_many :time_entries, dependent: :destroy
  has_many :status_histories, class_name: "TodoStatusHistory", dependent: :destroy

  validates :title, presence: true
end
