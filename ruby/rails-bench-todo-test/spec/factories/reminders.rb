FactoryBot.define do
  factory :reminder do
    todo { nil }
    remind_at { "2025-11-29 10:49:21" }
    sent { false }
  end
end
