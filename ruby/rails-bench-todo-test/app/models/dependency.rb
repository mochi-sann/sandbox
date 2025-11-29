class Dependency < ApplicationRecord
  belongs_to :todo
  belongs_to :depends_on_todo, class_name: "Todo"
end
