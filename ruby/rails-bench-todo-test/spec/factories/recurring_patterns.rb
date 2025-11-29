FactoryBot.define do
  factory :recurring_pattern do
    todo { nil }
    recurrence_type { "MyString" }
    interval { 1 }
    day_of_week { 1 }
    day_of_month { 1 }
  end
end
