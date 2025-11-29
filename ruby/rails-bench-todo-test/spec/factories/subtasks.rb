FactoryBot.define do
  factory :subtask do
    todo { nil }
    title { "MyString" }
    completed { false }
  end
end
