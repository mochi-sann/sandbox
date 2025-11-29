FactoryBot.define do
  factory :todo_status_history do
    todo { nil }
    old_status { false }
    new_status { false }
    changed_at { "2025-11-29 10:49:45" }
    changed_by_user { nil }
  end
end
