FactoryBot.define do
  factory :todo do
    title { "MyTodo" }
    completed { false }
    association :project
    # category is optional, so we don't include it by default to simplify
  end
end
